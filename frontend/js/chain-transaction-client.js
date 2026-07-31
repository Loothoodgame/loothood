(function (root, factory) {
  const api = factory(root?.LoothoodAccountClient);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodChainTransactionClient = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (accountClient) {
  "use strict";

  const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
  const HEX_PATTERN = /^0x(?:[a-fA-F0-9]{2})*$/;
  const HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;
  const ALLOWANCE_SELECTOR = "0xdd62ed3e";
  const APPROVE_SELECTOR = "0x095ea7b3";

  class ChainWalletError extends Error {
    constructor(code, message, { cause = null } = {}) {
      super(message);
      this.name = "ChainWalletError";
      this.code = code;
      this.cause = cause;
    }
  }

  function normalizeAddress(value) {
    const address = String(value || "").trim().toLowerCase();
    if (!ADDRESS_PATTERN.test(address)) {
      throw new ChainWalletError("invalid_wallet_address", "The wallet address is invalid.");
    }
    return address;
  }

  function normalizeChainId(value) {
    const chainId = Number(value);
    if (!Number.isSafeInteger(chainId) || chainId <= 0) {
      throw new ChainWalletError("invalid_chain_id", "The prepared transaction has an invalid chain.");
    }
    return chainId;
  }

  function quantityToHex(value, label) {
    let quantity;
    try {
      quantity = BigInt(value);
    } catch {
      throw new ChainWalletError("invalid_transaction_value", `${label} is invalid.`);
    }
    if (quantity < 0n) {
      throw new ChainWalletError("invalid_transaction_value", `${label} is invalid.`);
    }
    return `0x${quantity.toString(16)}`;
  }

  function uintValue(value, label) {
    let quantity;
    try { quantity = BigInt(value); } catch {
      throw new ChainWalletError("invalid_token_amount", `${label} is invalid.`);
    }
    if (quantity < 0n || quantity >= (1n << 256n)) {
      throw new ChainWalletError("invalid_token_amount", `${label} is invalid.`);
    }
    return quantity;
  }

  function addressWord(value) {
    return normalizeAddress(value).slice(2).padStart(64, "0");
  }

  function uintWord(value, label) {
    return uintValue(value, label).toString(16).padStart(64, "0");
  }

  function validatePayment(prepared, transaction) {
    const payment = prepared?.payment;
    if (!payment || !["$HB", "WETH"].includes(payment.token)) {
      throw new ChainWalletError("invalid_payment", "The prepared token payment is missing.");
    }
    const tokenAddress = normalizeAddress(payment.tokenAddress);
    const spender = normalizeAddress(payment.spender || transaction.contractAddress);
    if (spender !== transaction.contractAddress) {
      throw new ChainWalletError(
        "invalid_payment_spender",
        "The payment-token spender does not match the transaction.",
      );
    }
    const amount = uintValue(payment.amountWei, `${payment.token} payment amount`);
    if (amount <= 0n) {
      throw new ChainWalletError("invalid_token_amount", `${payment.token} payment amount is invalid.`);
    }
    return Object.freeze({ token: payment.token, tokenAddress, spender, amount });
  }

  function validatePreparedTransaction(value) {
    const transaction = value?.transaction || value;
    const chainId = normalizeChainId(transaction?.chainId);
    const contractAddress = normalizeAddress(transaction?.contractAddress);
    const data = String(transaction?.data || "");
    if (!HEX_PATTERN.test(data) || data.length < 10) {
      throw new ChainWalletError("invalid_transaction_data", "The prepared transaction calldata is invalid.");
    }
    return Object.freeze({
      chainId,
      contractAddress,
      data,
      value: quantityToHex(transaction?.valueWei ?? "0", "Transaction value"),
    });
  }

  function providerFrom(entry) {
    const provider = entry?.provider || entry;
    if (!provider || typeof provider.request !== "function") {
      throw new ChainWalletError("wallet_unavailable", "The selected wallet is unavailable.");
    }
    return provider;
  }

  function walletFailure(error, fallbackCode, fallbackMessage) {
    if (error instanceof ChainWalletError) return error;
    if (error?.code === 4001) {
      return new ChainWalletError("wallet_request_rejected", "The wallet request was cancelled.", { cause: error });
    }
    return new ChainWalletError(fallbackCode, fallbackMessage, { cause: error });
  }

  async function ensureChain(provider, chainId) {
    const expected = `0x${chainId.toString(16)}`;
    let active;
    try {
      active = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
    } catch (error) {
      throw walletFailure(error, "wallet_chain_read_failed", "The wallet chain could not be checked.");
    }
    if (active === expected) return;
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: expected }],
      });
    } catch (error) {
      throw walletFailure(error, "wallet_chain_switch_failed", "Switch the wallet to Robinhood Chain to continue.");
    }
    const confirmed = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
    if (confirmed !== expected) {
      throw new ChainWalletError("wallet_chain_mismatch", "The wallet is not connected to the required chain.");
    }
  }

  async function requestPayer(provider, expectedAddress) {
    let accounts;
    try {
      accounts = await provider.request({ method: "eth_accounts" });
    } catch (_) {
      accounts = null;
    }
    if (Array.isArray(accounts) && accounts.length > 0) {
      const payer = normalizeAddress(accounts[0]);
      if (expectedAddress && payer !== normalizeAddress(expectedAddress)) {
        throw new ChainWalletError(
          "wallet_account_mismatch",
          "Select the wallet linked to this Loothood account before continuing.",
        );
      }
      return payer;
    }
    try {
      accounts = await provider.request({ method: "eth_requestAccounts" });
    } catch (error) {
      throw walletFailure(error, "wallet_connection_failed", "The wallet could not connect.");
    }
    const payer = normalizeAddress(Array.isArray(accounts) ? accounts[0] : null);
    if (expectedAddress && payer !== normalizeAddress(expectedAddress)) {
      throw new ChainWalletError(
        "wallet_account_mismatch",
        "Select the wallet linked to this Loothood account before continuing.",
      );
    }
    return payer;
  }

  async function sendPreparedTransaction(providerEntry, prepared, { expectedAddress = null } = {}) {
    const provider = providerFrom(providerEntry);
    const transaction = validatePreparedTransaction(prepared);
    await ensureChain(provider, transaction.chainId);
    const payer = await requestPayer(provider, expectedAddress);
    let transactionHash;
    try {
      transactionHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: payer,
          to: transaction.contractAddress,
          data: transaction.data,
          value: transaction.value,
        }],
      });
    } catch (error) {
      throw walletFailure(error, "wallet_transaction_failed", "The wallet could not submit the transaction.");
    }
    if (!HASH_PATTERN.test(String(transactionHash || ""))) {
      throw new ChainWalletError("wallet_transaction_hash_invalid", "The wallet returned an invalid transaction hash.");
    }
    return Object.freeze({ transactionHash: String(transactionHash).toLowerCase(), payer });
  }

  async function readAllowance(provider, tokenAddress, owner, spender) {
    let result;
    try {
      result = await provider.request({
        method: "eth_call",
        params: [{
          from: owner,
          to: tokenAddress,
          data: `${ALLOWANCE_SELECTOR}${addressWord(owner)}${addressWord(spender)}`,
        }, "latest"],
      });
    } catch (error) {
      throw walletFailure(error, "wallet_allowance_read_failed", "The token allowance could not be checked.");
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(String(result || ""))) {
      throw new ChainWalletError("wallet_allowance_invalid", "The payment token returned an invalid allowance.");
    }
    return BigInt(result);
  }

  async function sendErc20Approval(provider, { tokenAddress, owner, spender, amount }) {
    let transactionHash;
    try {
      transactionHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: owner,
          to: tokenAddress,
          data: `${APPROVE_SELECTOR}${addressWord(spender)}${uintWord(amount, "token approval amount")}`,
          value: "0x0",
        }],
      });
    } catch (error) {
      throw walletFailure(error, "wallet_approval_failed", "The token approval was not submitted.");
    }
    if (!HASH_PATTERN.test(String(transactionHash || ""))) {
      throw new ChainWalletError("wallet_transaction_hash_invalid", "The wallet returned an invalid approval hash.");
    }
    return String(transactionHash).toLowerCase();
  }

  async function sendPreparedTokenTransaction(providerEntry, prepared, { expectedAddress = null } = {}) {
    const provider = providerFrom(providerEntry);
    const transaction = validatePreparedTransaction(prepared);
    const payment = validatePayment(prepared, transaction);
    await ensureChain(provider, transaction.chainId);
    const payer = await requestPayer(provider, expectedAddress);
    const allowance = await readAllowance(provider, payment.tokenAddress, payer, payment.spender);
    const approvalTransactionHash = allowance < payment.amount
      ? await sendErc20Approval(provider, {
        tokenAddress: payment.tokenAddress,
        owner: payer,
        spender: payment.spender,
        amount: payment.amount,
      })
      : null;
    const submitted = await sendPreparedTransaction(provider, prepared, { expectedAddress: payer });
    return Object.freeze({ ...submitted, approvalTransactionHash });
  }

  async function sendPreparedPaymentTransaction(
    providerEntry,
    prepared,
    { expectedAddress = null } = {},
  ) {
    if (prepared?.payment?.token !== "ETH") {
      return sendPreparedTokenTransaction(providerEntry, prepared, { expectedAddress });
    }
    const transaction = validatePreparedTransaction(prepared);
    const amount = uintValue(prepared.payment.amountWei, "ETH payment amount");
    if (amount <= 0n || transaction.value !== quantityToHex(amount, "ETH payment amount")) {
      throw new ChainWalletError(
        "invalid_native_payment",
        "The prepared ETH payment does not match the transaction value.",
      );
    }
    const submitted = await sendPreparedTransaction(
      providerEntry,
      prepared,
      { expectedAddress },
    );
    return Object.freeze({ ...submitted, approvalTransactionHash: null });
  }

  async function signPreparedTypedData(
    providerEntry,
    prepared,
    { expectedAddress = null } = {},
  ) {
    const provider = providerFrom(providerEntry);
    const typedData = prepared?.typedData;
    const chainId = normalizeChainId(typedData?.domain?.chainId);
    const verifyingContract = normalizeAddress(typedData?.domain?.verifyingContract);
    if (!typedData?.primaryType || !typedData?.types?.[typedData.primaryType]
      || !typedData?.message || typeof typedData.message !== "object") {
      throw new ChainWalletError("invalid_typed_data", "The prepared signature request is invalid.");
    }
    await ensureChain(provider, chainId);
    const payer = await requestPayer(provider, expectedAddress);
    const request = {
      domain: { ...typedData.domain, verifyingContract },
      primaryType: typedData.primaryType,
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        ...typedData.types,
      },
      message: typedData.message,
    };
    let signature;
    try {
      signature = await provider.request({
        method: "eth_signTypedData_v4",
        params: [payer, JSON.stringify(request)],
      });
    } catch (error) {
      throw walletFailure(
        error,
        "wallet_signature_failed",
        "The Entry Ticket controller signature was not completed.",
      );
    }
    if (!/^0x[a-fA-F0-9]{130}$/.test(String(signature || ""))) {
      throw new ChainWalletError("wallet_signature_invalid", "The wallet returned an invalid signature.");
    }
    return Object.freeze({ payer, signature: String(signature).toLowerCase() });
  }

  return Object.freeze({
    ChainWalletError,
    ensureChain,
    readAllowance,
    requestPayer,
    sendPreparedPaymentTransaction,
    sendPreparedTokenTransaction,
    sendPreparedTransaction,
    signPreparedTypedData,
    validatePreparedTransaction,
  });
});
