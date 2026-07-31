(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodAccountClient = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
  // The default is the CURRENT domain, not somebody else's.
  //
  // What used to sit here was a hardcoded foreign domain: if the meta tag
  // carrying the API address ever went missing, our players would have gone off
  // and registered on an outside server. On top of that it welded the client to
  // one single domain.
  //
  // The correct default is our own origin, because Vercel rewrites /api/* to
  // Railway on its own side: as far as the browser is concerned the request is
  // always same-origin. That is why one and the same file works on
  // loothood.vercel.app, on loothood.xyz, and on localhost without a single
  // edit.
  const DEFAULT_API_ORIGIN = (typeof location !== "undefined" && location.origin
    && location.origin !== "null")
    ? location.origin
    : "https://loothood.xyz";
  const ROBINHOOD_CHAIN = Object.freeze({
    chainId: 4663,
    chainIdHex: "0x1237",
    chainName: "Robinhood Chain",
    nativeCurrency: Object.freeze({
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    }),
    rpcUrls: Object.freeze(["https://rpc.mainnet.chain.robinhood.com"]),
    blockExplorerUrls: Object.freeze(["https://robinhoodchain.blockscout.com"]),
  });

  class AccountClientError extends Error {
    constructor(statusCode, code, message, { retryable = false, cause = null, details = null } = {}) {
      super(message);
      this.name = "AccountClientError";
      this.statusCode = statusCode;
      this.code = code;
      this.retryable = retryable;
      this.cause = cause;
      this.details = details;
    }
  }

  function normalizeApiOrigin(value) {
    const candidate = String(value || DEFAULT_API_ORIGIN).trim();
    let parsed;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new TypeError("Account API origin must be an absolute URL");
    }
    if (!["https:", "http:"].includes(parsed.protocol)
      || parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new TypeError("Account API origin is invalid");
    }
    parsed.pathname = "/";
    return parsed.origin;
  }

  function secureIdempotencyKey(prefix = "account") {
    const cryptoApi = globalThis.crypto;
    if (typeof cryptoApi?.randomUUID === "function") {
      return `${prefix}-${cryptoApi.randomUUID()}`;
    }
    if (typeof cryptoApi?.getRandomValues === "function") {
      const bytes = new Uint8Array(24);
      cryptoApi.getRandomValues(bytes);
      return `${prefix}-${[...bytes].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
    }
    throw new AccountClientError(0, "secure_random_unavailable", "Secure browser randomness is unavailable.");
  }

  function normalizeAddress(value) {
    const address = String(value || "").trim().toLowerCase();
    if (!ADDRESS_PATTERN.test(address)) {
      throw new AccountClientError(400, "invalid_wallet_address", "The wallet returned an invalid address.");
    }
    return address;
  }

  function maskAddress(value) {
    const address = normalizeAddress(value);
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }

  function walletErrorCode(error) {
    const candidates = [
      error?.code,
      error?.data?.code,
      error?.data?.originalError?.code,
      error?.cause?.code,
    ];
    for (const candidate of candidates) {
      const code = Number(candidate);
      if (Number.isInteger(code)) return code;
    }
    return null;
  }

  async function readWalletChain(provider) {
    let chainId;
    try {
      chainId = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
    } catch (error) {
      throw new AccountClientError(
        400,
        "wallet_chain_unavailable",
        "The selected wallet cannot connect to Robinhood Chain.",
        { cause: error },
      );
    }
    if (!/^0x[0-9a-f]+$/.test(chainId)) {
      throw new AccountClientError(
        400,
        "wallet_chain_invalid",
        "The selected wallet returned an invalid network.",
      );
    }
    return chainId;
  }

  async function requestRobinhoodChain(provider, method, params) {
    try {
      return await provider.request({ method, params });
    } catch (error) {
      const code = walletErrorCode(error);
      if (code === 4001) {
        throw new AccountClientError(
          400,
          "wallet_chain_rejected",
          "Switching to Robinhood Chain was cancelled.",
          { cause: error },
        );
      }
      throw error;
    }
  }

  async function ensureRobinhoodChain(provider) {
    const expected = ROBINHOOD_CHAIN.chainIdHex;
    if (await readWalletChain(provider) === expected) return expected;
    try {
      await requestRobinhoodChain(provider, "wallet_switchEthereumChain", [{
        chainId: expected,
      }]);
    } catch (error) {
      if (error instanceof AccountClientError) throw error;
      if (walletErrorCode(error) !== 4902) {
        throw new AccountClientError(
          400,
          "wallet_chain_unsupported",
          "The selected wallet does not support Robinhood Chain.",
          { cause: error },
        );
      }
      try {
        await requestRobinhoodChain(provider, "wallet_addEthereumChain", [{
          chainId: expected,
          chainName: ROBINHOOD_CHAIN.chainName,
          nativeCurrency: ROBINHOOD_CHAIN.nativeCurrency,
          rpcUrls: [...ROBINHOOD_CHAIN.rpcUrls],
          blockExplorerUrls: [...ROBINHOOD_CHAIN.blockExplorerUrls],
        }]);
        if (await readWalletChain(provider) !== expected) {
          await requestRobinhoodChain(provider, "wallet_switchEthereumChain", [{
            chainId: expected,
          }]);
        }
      } catch (addError) {
        if (addError instanceof AccountClientError) throw addError;
        throw new AccountClientError(
          400,
          "wallet_chain_unsupported",
          "The selected wallet could not add Robinhood Chain.",
          { cause: addError },
        );
      }
    }
    if (await readWalletChain(provider) !== expected) {
      throw new AccountClientError(
        400,
        "wallet_chain_mismatch",
        "Select Robinhood Chain in your wallet before continuing.",
      );
    }
    return expected;
  }

  class AccountApi {
    constructor({ baseUrl = DEFAULT_API_ORIGIN, fetchImpl = null, timeoutMs = 15_000 } = {}) {
      const nativeFetch = globalThis.fetch;
      const resolvedFetch = fetchImpl || nativeFetch;
      if (typeof resolvedFetch !== "function") throw new TypeError("Account API requires fetch");
      this.baseUrl = normalizeApiOrigin(baseUrl);
      this.fetchImpl = fetchImpl ? resolvedFetch : resolvedFetch.bind(globalThis);
      this.timeoutMs = timeoutMs;
      this.csrfToken = null;
      this.session = null;
    }

    async request(path, {
      method = "GET",
      body,
      csrf = false,
      idempotencyKey = null,
      signal = null,
    } = {}) {
      const controller = !signal && typeof AbortController === "function" ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : null;
      const headers = { Accept: "application/json" };
      if (body !== undefined) headers["Content-Type"] = "application/json";
      if (csrf) {
        if (!this.csrfToken) {
          throw new AccountClientError(401, "csrf_unavailable", "Your secure session needs to be refreshed.");
        }
        headers["X-Loothood-CSRF"] = this.csrfToken;
      }
      if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
      let response;
      try {
        response = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method,
          credentials: "include",
          cache: "no-store",
          headers,
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: signal || controller?.signal,
        });
      } catch (error) {
        throw new AccountClientError(
          0,
          error?.name === "AbortError" ? "account_request_timeout" : "account_service_unreachable",
          error?.name === "AbortError"
            ? "Account services took too long to respond."
            : "Account services could not be reached.",
          { retryable: true, cause: error },
        );
      } finally {
        if (timer) clearTimeout(timer);
      }
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok) {
        throw new AccountClientError(
          response.status,
          payload?.error?.code || "account_request_failed",
          payload?.error?.message || "The account request could not be completed.",
          {
            retryable: Boolean(payload?.error?.retryable) || response.status >= 500,
            details: payload?.error?.details || null,
          },
        );
      }
      return payload || {};
    }

    rememberSession(result) {
      if (result?.authenticated === true && result.account) {
        this.session = result;
        if (typeof result.csrfToken === "string" && result.csrfToken.length >= 32) {
          this.csrfToken = result.csrfToken;
        }
      }
      return result;
    }

    async inspectSession() {
      const result = await this.request("/api/v1/account/session");
      if (result.authenticated === true) this.rememberSession(result);
      else {
        this.session = null;
        this.csrfToken = null;
      }
      return result;
    }

    async csrfMutation(path, options) {
      const expectedProfileId = this.session?.account?.profileId || null;
      try {
        return await this.request(path, { ...options, csrf: true });
      } catch (error) {
        if (!(error instanceof AccountClientError) || error.code !== "csrf_invalid") throw error;
        const refreshed = await this.inspectSession();
        if (refreshed?.authenticated !== true) {
          throw new AccountClientError(401, "authentication_required", "Log in to continue.");
        }
        if (expectedProfileId && refreshed.account?.profileId !== expectedProfileId) {
          throw new AccountClientError(
            409,
            "session_profile_changed",
            "The active account changed in another browser tab. Reload before continuing.",
          );
        }
        return this.request(path, { ...options, csrf: true });
      }
    }

    loadCloudSave() {
      return this.request("/api/v1/account/save");
    }

    loadServiceStatus() {
      return this.request("/api/v1/status");
    }

    updateCloudSave(body, idempotencyKey) {
      return this.csrfMutation("/api/v1/account/save", {
        method: "PUT",
        body,
        idempotencyKey,
      });
    }

    loadValueLedger() {
      return this.request("/api/v1/gacha/state");
    }

    loadVerifierSeason() {
      return this.request("/api/v1/verifier/season");
    }

    loadCurrentSeason() {
      return this.request("/api/v1/seasons/current");
    }

    loadSeasonAccount() {
      return this.request("/api/v1/seasons/me");
    }

    loadSeasonLeaderboard(seasonKey) {
      return this.request(`/api/v1/seasons/${encodeURIComponent(seasonKey)}/leaderboard`);
    }

    issueVerifierAttempt(body, idempotencyKey) {
      return this.csrfMutation("/api/v1/verifier/attempts", {
        method: "POST",
        body,
        idempotencyKey,
      });
    }

    submitVerifierPacket(attemptId, body) {
      return this.csrfMutation(`/api/v1/verifier/attempts/${encodeURIComponent(attemptId)}/packets`, {
        method: "POST",
        body,
      });
    }

    finalizeVerifierAttempt(attemptId, body) {
      return this.csrfMutation(`/api/v1/verifier/attempts/${encodeURIComponent(attemptId)}/finalize`, {
        method: "POST",
        body,
      });
    }

    requestGachaDraw(body, idempotencyKey) {
      return this.csrfMutation("/api/v1/gacha/draws", {
        method: "POST",
        body,
        idempotencyKey,
      });
    }

    loadGachaDraw(drawRequestId) {
      return this.request(`/api/v1/gacha/draws/${encodeURIComponent(drawRequestId)}`);
    }

    settleGachaDraw(drawRequestId) {
      return this.csrfMutation(`/api/v1/gacha/draws/${encodeURIComponent(drawRequestId)}/settle`, {
        method: "POST",
      });
    }

    requestEquipmentCraft(body, idempotencyKey) {
      return this.csrfMutation("/api/v1/equipment/crafts", {
        method: "POST",
        body,
        idempotencyKey,
      });
    }

    loadEquipmentCraft(craftRequestId) {
      return this.request(`/api/v1/equipment/crafts/${encodeURIComponent(craftRequestId)}`);
    }

    settleEquipmentCraft(craftRequestId) {
      return this.csrfMutation(`/api/v1/equipment/crafts/${encodeURIComponent(craftRequestId)}/settle`, {
        method: "POST",
      });
    }

    salvageEquipment(equipmentAssetId, idempotencyKey) {
      return this.csrfMutation(`/api/v1/equipment/${encodeURIComponent(equipmentAssetId)}/salvage`, {
        method: "POST",
        idempotencyKey,
      });
    }

    setEquipmentLoadout(slot, body, idempotencyKey) {
      return this.csrfMutation(`/api/v1/equipment/loadout/${encodeURIComponent(slot)}`, {
        method: "PUT",
        body,
        idempotencyKey,
      });
    }

    setEquipmentProtection(equipmentAssetId, body, idempotencyKey) {
      return this.csrfMutation(`/api/v1/equipment/${encodeURIComponent(equipmentAssetId)}/protection`, {
        method: "PUT",
        body,
        idempotencyKey,
      });
    }

    acquireEquipmentRunLease(body, idempotencyKey) {
      return this.csrfMutation("/api/v1/equipment/run-leases", {
        method: "POST",
        body,
        idempotencyKey,
      });
    }

    releaseEquipmentRunLease(leaseId, body, idempotencyKey) {
      return this.csrfMutation(`/api/v1/equipment/run-leases/${encodeURIComponent(leaseId)}/release`, {
        method: "POST",
        body,
        idempotencyKey,
      });
    }

    prepareLimitedTicketPurchase(body) {
      return this.csrfMutation("/api/v1/chain/limited-tickets/quote", {
        method: "POST",
        body,
      });
    }

    prepareMarketplaceListing(body) {
      return this.csrfMutation("/api/v1/chain/marketplace/listings/authorization", {
        method: "POST",
        body,
      });
    }

    prepareMarketplaceCancellation(body) {
      return this.csrfMutation("/api/v1/chain/marketplace/listings/cancellation", {
        method: "POST",
        body,
      });
    }

    prepareMarketplacePurchase(body) {
      return this.csrfMutation("/api/v1/chain/marketplace/purchases/quote", {
        method: "POST",
        body,
      });
    }

    prepareEquipmentService(body) {
      return this.csrfMutation("/api/v1/chain/equipment-services/quote", {
        method: "POST",
        body,
      });
    }

    prepareSeasonEntryPurchase(body) {
      return this.csrfMutation("/api/v1/chain/seasons/entries/purchase-authorization", {
        method: "POST",
        body,
      });
    }

    prepareSeasonEntryActivation(body) {
      return this.csrfMutation("/api/v1/chain/seasons/entries/activation-authorization", {
        method: "POST",
        body,
      });
    }

    prepareSeasonCompletionAttestation(body) {
      return this.csrfMutation("/api/v1/chain/seasons/completions/attestation", {
        method: "POST",
        body,
      });
    }

    prepareSeasonCompletionTransaction(body) {
      return this.csrfMutation("/api/v1/chain/seasons/completions/transaction", {
        method: "POST",
        body,
      });
    }

    // Creates a revision attempt without touching the chain. The paid path
    // opens the attempt through /chain/equipment-services/quote together with a
    // quote for the transfer; here Scrap pays for it, so no intermediary is
    // needed.
    createEquipmentRevision(body, idempotencyKey) {
      return this.csrfMutation("/api/v1/equipment/revisions", {
        method: "POST",
        body,
        idempotencyKey,
      });
    }

    loadEquipmentRevision(revisionAttemptId) {
      return this.request(`/api/v1/equipment/revisions/${encodeURIComponent(revisionAttemptId)}`);
    }

    acceptEquipmentRevision(revisionAttemptId, idempotencyKey) {
      return this.csrfMutation(`/api/v1/equipment/revisions/${encodeURIComponent(revisionAttemptId)}/accept`, {
        method: "POST",
        idempotencyKey,
      });
    }

    keepOriginalEquipmentRevision(revisionAttemptId, idempotencyKey) {
      return this.csrfMutation(`/api/v1/equipment/revisions/${encodeURIComponent(revisionAttemptId)}/keep-original`, {
        method: "POST",
        idempotencyKey,
      });
    }

    // Marketplace without the chain: prices are denominated in Scrap and the
    // settlement happens on the server. The paid path higher up in this file
    // prepares the token transfers and is left untouched.
    createMarketplaceListing(body, idempotencyKey) {
      return this.csrfMutation("/api/v1/marketplace/listings", {
        method: "POST",
        body,
        idempotencyKey,
      });
    }

    cancelMarketplaceListing(listingId, idempotencyKey) {
      return this.csrfMutation(`/api/v1/marketplace/listings/${encodeURIComponent(listingId)}/cancel`, {
        method: "POST",
        idempotencyKey,
      });
    }

    purchaseMarketplaceListing(listingId, idempotencyKey) {
      return this.csrfMutation(`/api/v1/marketplace/listings/${encodeURIComponent(listingId)}/purchase`, {
        method: "POST",
        idempotencyKey,
      });
    }

    loadMarketplaceListings(filters = {}) {
      const params = new URLSearchParams();
      if (filters.slot && filters.slot !== "all") params.set("slot", filters.slot);
      if (filters.rarity && filters.rarity !== "all") params.set("rarity", filters.rarity);
      if (Array.isArray(filters.includeStats) && filters.includeStats.length) {
        params.set("includeStats", filters.includeStats.join(","));
      }
      if (Array.isArray(filters.excludeStats) && filters.excludeStats.length) {
        params.set("excludeStats", filters.excludeStats.join(","));
      }
      const query = params.toString();
      return this.request(`/api/v1/marketplace/listings${query ? `?${query}` : ""}`);
    }

    resolveMarketplaceRecipient(playerId) {
      return this.request(`/api/v1/marketplace/recipients/${encodeURIComponent(playerId)}`);
    }

    async createGuest(idempotencyKey = secureIdempotencyKey("guest")) {
      return this.rememberSession(await this.request("/api/v1/account/guest", {
        method: "POST",
        body: {},
        idempotencyKey,
      }));
    }

    async register({ username, password, passwordConfirmation }, idempotencyKey = secureIdempotencyKey("register")) {
      return this.rememberSession(await this.request("/api/v1/account/register", {
        method: "POST",
        body: { username, password, passwordConfirmation },
        idempotencyKey,
      }));
    }

    async login({ username, password }) {
      return this.rememberSession(await this.request("/api/v1/account/login", {
        method: "POST",
        body: { username, password },
      }));
    }

    async recover({ recoveryKey, newPassword, newPasswordConfirmation }) {
      return this.rememberSession(await this.request("/api/v1/account/recovery/recover", {
        method: "POST",
        body: { recoveryKey, newPassword, newPasswordConfirmation },
      }));
    }

    walletProviderConfig() {
      return this.request("/api/v1/account/wallet/providers/config");
    }

    walletChallenge(address) {
      return this.request("/api/v1/account/wallet/challenge", {
        method: "POST",
        body: { address: normalizeAddress(address), purpose: "login" },
      });
    }

    async verifyWallet({ challengeId, message, signature }) {
      const result = await this.request("/api/v1/account/wallet/verify", {
        method: "POST",
        body: { challengeId, message, signature },
      });
      return result?.authenticated === true ? this.rememberSession(result) : result;
    }

    async confirmWalletAccount({ challengeId, creationToken }) {
      return this.rememberSession(await this.request("/api/v1/account/wallet/create/confirm", {
        method: "POST",
        body: { challengeId, creationToken },
      }));
    }
  }

  function providerKey(detail) {
    return String(detail?.info?.uuid || detail?.info?.rdns || detail?.info?.name || "").trim();
  }

  class Eip6963Registry {
    constructor({ target = globalThis.window, discoveryMs = 500 } = {}) {
      if (!target?.addEventListener || !target?.dispatchEvent) {
        throw new TypeError("EIP-6963 discovery requires a browser event target");
      }
      this.target = target;
      this.discoveryMs = discoveryMs;
      this.providers = new Map();
      this.started = false;
      this.onAnnouncement = (event) => {
        const detail = event?.detail;
        const key = providerKey(detail);
        if (!key || !detail?.provider || typeof detail.provider.request !== "function") return;
        this.providers.set(key, Object.freeze({ info: Object.freeze({
          uuid: String(detail.info?.uuid || key),
          name: String(detail.info?.name || "Browser wallet").slice(0, 80),
          rdns: String(detail.info?.rdns || "").slice(0, 120),
        }), provider: detail.provider }));
      };
    }

    start() {
      if (this.started) return;
      this.started = true;
      this.target.addEventListener("eip6963:announceProvider", this.onAnnouncement);
    }

    requestAnnouncements() {
      this.start();
      const event = typeof Event === "function"
        ? new Event("eip6963:requestProvider")
        : { type: "eip6963:requestProvider" };
      this.target.dispatchEvent(event);
    }

    async discover() {
      this.requestAnnouncements();
      await new Promise((resolve) => setTimeout(resolve, this.discoveryMs));
      return Object.freeze([...this.providers.values()].sort((left, right) => (
        left.info.name.localeCompare(right.info.name)
      )));
    }

    stop() {
      if (!this.started) return;
      this.target.removeEventListener("eip6963:announceProvider", this.onAnnouncement);
      this.started = false;
    }
  }

  async function connectAndSign(providerEntry, challengeFactory) {
    const provider = providerEntry?.provider;
    if (!provider || typeof provider.request !== "function") {
      throw new AccountClientError(400, "wallet_unavailable", "The selected wallet is unavailable.");
    }
    await ensureRobinhoodChain(provider);
    let accounts;
    try {
      accounts = await provider.request({ method: "eth_requestAccounts" });
    } catch (error) {
      throw new AccountClientError(
        400,
        error?.code === 4001 ? "wallet_request_rejected" : "wallet_request_failed",
        error?.code === 4001 ? "Wallet connection was cancelled." : "The wallet could not connect.",
        { cause: error },
      );
    }
    const address = normalizeAddress(Array.isArray(accounts) ? accounts[0] : null);
    const challenge = await challengeFactory(address);
    if (!challenge?.challengeId || !challenge?.message || normalizeAddress(challenge.address) !== address) {
      throw new AccountClientError(502, "wallet_challenge_invalid", "The wallet challenge was invalid.");
    }
    let signature;
    try {
      signature = await provider.request({
        method: "personal_sign",
        params: [challenge.message, address],
      });
    } catch (error) {
      throw new AccountClientError(
        400,
        error?.code === 4001 ? "wallet_signature_rejected" : "wallet_signature_failed",
        error?.code === 4001 ? "Wallet signature was cancelled." : "The wallet could not sign the login message.",
        { cause: error },
      );
    }
    if (!/^0x[a-fA-F0-9]{130}$/.test(String(signature || ""))) {
      throw new AccountClientError(400, "wallet_signature_invalid", "The wallet returned an invalid signature.");
    }
    return Object.freeze({ address, challenge, signature });
  }

  return Object.freeze({
    ADDRESS_PATTERN,
    AccountApi,
    AccountClientError,
    DEFAULT_API_ORIGIN,
    Eip6963Registry,
    ROBINHOOD_CHAIN,
    connectAndSign,
    ensureRobinhoodChain,
    maskAddress,
    normalizeAddress,
    normalizeApiOrigin,
    secureIdempotencyKey,
  });
});
