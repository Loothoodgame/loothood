/**
 * Wallet signature verification.
 *
 * WHY. A player pays for a Season entry ticket with an ordinary token transfer
 * to the treasury address. An ERC-20 transfer has no "from which player" field —
 * the server only sees the sender's address. There is exactly one honest way to
 * tie that address to an account: ask the player to SIGN a message with their
 * wallet. The signature proves ownership of the private key, and therefore of
 * the address.
 *
 * The same mechanism also provides wallet-based sign-in — with no password.
 *
 * WHAT EXACTLY GETS SIGNED. The client calls personal_sign, i.e. EIP-191: the
 * wallet does not sign the text directly, it first glues the prefix
 * \x19Ethereum Signed Message:\n<length> in front of it. That prefix exists
 * precisely so that a signed message cannot be passed off as a transaction —
 * which is why it is mandatory here too, otherwise the address simply will not
 * match.
 *
 * WHY NOBLE AND NOT ETHERS. We need a single operation — recover an address from
 * a signature. Pulling in a library weighing megabytes for that is pointless.
 * @noble/curves and @noble/hashes are what sits inside ethers and viem anyway,
 * just without everything else: an audited implementation of secp256k1 and
 * keccak.
 */
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { randomBytes } from "node:crypto";

/** The network the token lives in. The client demands exactly this chainId. */
export const NETWORK = Object.freeze({
  chainId: 4663,
  chainIdHex: "0x1237",
  chainName: "Robinhood Chain",
  nativeCurrency: Object.freeze({ name: "Ether", symbol: "ETH", decimals: 18 }),
  rpcUrls: Object.freeze(["https://rpc.mainnet.chain.robinhood.com"]),
  blockExplorerUrls: Object.freeze(["https://robinhoodchain.blockscout.com"]),
});

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/** The address in lower case — this is the form it is stored in, so that
 *  comparisons do not depend on how the wallet happened to spell it. */
export function normaliseAddress(value) {
  const text = String(value || "").trim();
  return ADDRESS_RE.test(text) ? text.toLowerCase() : null;
}

/**
 * The address in EIP-55 spelling: capital letters are placed according to the
 * hash of the address itself, which works as a checksum. This is the form shown
 * to the player — a typo is visible in it.
 */
export function toChecksumAddress(address) {
  const lower = normaliseAddress(address);
  if (!lower) return null;
  const body = lower.slice(2);
  const hash = Buffer.from(keccak_256(new TextEncoder().encode(body))).toString("hex");
  let result = "0x";
  for (let i = 0; i < body.length; i += 1) {
    result += parseInt(hash[i], 16) >= 8 ? body[i].toUpperCase() : body[i];
  }
  return result;
}

function addressFromPublicKey(uncompressed) {
  return `0x${Buffer.from(keccak_256(uncompressed.slice(1))).toString("hex").slice(-40)}`;
}

/**
 * Recover the address that signed a message.
 *
 * A RAKE I HAVE ALREADY STEPPED ON: in @noble/curves 2.x recoverPublicKey
 * returns a COMPRESSED key — 33 bytes with a 02 or 03 prefix. An Ethereum
 * address is computed from the FULL key, 65 bytes with the 04 prefix, and
 * without expanding it back through the curve point you get a perfectly
 * plausible but wrong address. The mistake raises no exception — the signature
 * just "does not match", and hunting down the reason can take a long while.
 *
 * Returns null if the signature cannot be parsed: any exception here means the
 * verification is refused, not that the server is broken.
 *
 * WHAT THIS FUNCTION DOES NOT DO — it DOES NOT VERIFY AUTHENTICITY. Almost any
 * 65 bytes recover some address: a corrupted signature will return not null but
 * a different, entirely plausible address. That is a property of ECDSA, not an
 * oversight.
 *
 * Hence the rule for the caller: the result MUST BE COMPARED against the address
 * that was named in the call. The check "the function returned something, so the
 * signature is valid" lets anybody through.
 */
export function addressFromSignature(message, signature) {
  try {
    const raw = String(signature || "").replace(/^0x/, "");
    if (raw.length !== 130) return null;                 // r + s + v
    const bytes = Buffer.from(raw, "hex");
    let v = bytes[64];
    if (v >= 27) v -= 27;                                // wallets send 27/28
    if (v !== 0 && v !== 1) return null;

    const messageBytes = new TextEncoder().encode(String(message));
    const prefix = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${messageBytes.length}`);
    const digest = keccak_256(new Uint8Array([...prefix, ...messageBytes]));

    // noble expects the recovery byte FIRST, Ethereum writes it last.
    const recoveredForm = new Uint8Array(65);
    recoveredForm[0] = v;
    recoveredForm.set(bytes.subarray(0, 64), 1);

    const compressed = secp256k1.recoverPublicKey(recoveredForm, digest, {
      prehash: false, format: "recovered",
    });
    const uncompressed = secp256k1.Point.fromBytes(compressed).toBytes(false);
    return normaliseAddress(addressFromPublicKey(uncompressed));
  } catch {
    return null;
  }
}

/**
 * The text the player will see in the wallet window.
 *
 * It is written in plain human language and states explicitly that the signature
 * costs nothing and moves nothing: a window full of incomprehensible bytes is
 * the first thing that makes people close the tab. The one-time number inside
 * prevents an old signature from being reused.
 */
export function challengeText({ address, nonce, purpose = "login", domain = "loothood.xyz" }) {
  return [
    `${domain} wants you to sign in with your wallet.`,
    "",
    `Address: ${toChecksumAddress(address)}`,
    `Purpose: ${purpose}`,
    `Nonce: ${nonce}`,
    "",
    "Signing costs nothing and moves no funds.",
  ].join("\n");
}

export function newNonce() {
  return randomBytes(16).toString("hex");
}
