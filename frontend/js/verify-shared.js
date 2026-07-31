/* Shared verification maths — one copy for the server and for the browser.
 *
 * WHY THIS FILE EXISTS. The LOOTHOOD promise reads "don't trust us, check for
 * yourself". That is worth something only if the visitor recomputes the result
 * with THEIR OWN code on THEIR OWN machine and arrives at the same number.
 * Which means the whole of the verification maths has to be reachable from the
 * browser — and, at the same time, be the very same maths the server counted
 * with. Two copies of one thing always drift apart; the only question is when.
 *
 * Hence the UMD wrapper: in the browser it lands on globalThis, under Node the
 * server requires it and uses that same copy. Nobody has a version of their
 * own — there is one version.
 *
 * Randomness is derived through Web Crypto rather than node:crypto, because
 * Web Crypto exists in both worlds. The price for that is asynchrony in a
 * place where a synchronous HMAC would have been enough on the server.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodVerifyShared = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const cryptoApi = () => globalThis.crypto;

  /**
   * Canonical representation: keys are sorted at every level.
   *
   * Key order in JSON means nothing, yet a fingerprint would depend on it — and
   * then the server and the browser would compute DIFFERENT hashes of the very
   * same object. We already got burned by this in equipment.js, where affixes
   * were compared through JSON.stringify and every item that came back from
   * Postgres was declared a forgery.
   */
  function canonicalJson(value) {
    if (value === null || value === undefined) return "null";
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
    if (typeof value === "object") {
      return `{${Object.keys(value).sort()
        .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function toHex(buffer) {
    return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    return toHex(await cryptoApi().subtle.digest("SHA-256", bytes));
  }

  /** Fingerprint of an object in exactly the form the server publishes it. */
  async function fingerprint(value) {
    return `sha256:${await sha256Hex(canonicalJson(value))}`;
  }

  /**
   * Randomness values derived from a pull secret.
   *
   * Repeats randomValuesFromSecret from src/catalogue.js. The HMAC key is the
   * secret itself as a utf8 STRING, not as hexadecimal bytes: that is exactly
   * how Node takes it, and a mismatch here would yield completely different
   * numbers with no error surfacing at all.
   *
   * Six bytes are folded into an integer below 2^48 and divided by 2^48 — the
   * value lands strictly in [0, 1). Eight per pull, with room to spare: a
   * legendary needs up to four.
   */
  async function randomValuesFromSecret(secret, count) {
    const needed = Math.max(16, count * 8);
    const key = await cryptoApi().subtle.importKey(
      "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const values = [];
    let block = 0;
    while (values.length < needed) {
      const signature = new Uint8Array(await cryptoApi().subtle.sign(
        "HMAC", key, new TextEncoder().encode(`draw:${block}`)));
      for (let i = 0; i + 6 <= signature.length && values.length < needed; i += 6) {
        let n = 0;
        // Folded by hand rather than through BigInt: 2^48 fits in a double
        // without losing precision, and ordinary arithmetic is safe here.
        for (let j = 0; j < 6; j += 1) n = n * 256 + signature[i + j];
        values.push(n / 281474976710656);
      }
      block += 1;
    }
    return values;
  }

  /**
   * Manifest of the standard banner. Assembled from the catalogue and NOT
   * accepted from the server: were the pool to arrive from outside, the server
   * could name any set of legendaries after the fact, and verification would
   * stop verifying anything at all.
   */
  function standardManifest(equipment, release) {
    const pool = equipment.legendaryEffects
      .filter((e) => e.implemented && release.isStandardGachaEffect(e.id))
      .map((e) => e.id);
    return {
      id: "loothood-standard-pool",
      version: "1",
      tier: "standard",
      generatorVersion: equipment.generatorVersion,
      effectCatalogueVersion: equipment.catalogueVersion,
      allowedLegendaryEffectIds: pool,
    };
  }

  /**
   * Run transcript rebuilt from the packets that were sent in.
   *
   * A packet is a slice of the recording: input by tick, and on a stage
   * boundary the player's decision as well. The client cuts the recording into
   * packets so that the evidence leaves as the run goes, rather than as one
   * bundle at the end. Here the packets are glued back into the shape replayRun
   * understands.
   *
   * Packet boundaries fall on arbitrary ticks, so gluing can produce a slightly
   * more fragmented list of segments than the client had. That does not affect
   * the simulation: a segment specifies input by tick, not by how many segments
   * there happen to be.
   */
  function transcriptFromPackets(packets, transcriptVersion) {
    const stages = [];
    const decisions = [];
    let current = [];
    let currentStage = null;
    let endReason = "";

    for (const packet of packets) {
      if (currentStage === null) currentStage = packet.stage;
      if (packet.stage !== currentStage && current.length) {
        stages.push({ stage: currentStage, endTick: current[current.length - 1].endTick, segments: current });
        current = [];
        currentStage = packet.stage;
      }
      for (const segment of packet.segments || []) {
        const previous = current[current.length - 1];
        if (previous && previous.endTick === segment.startTick && previous.x === segment.x && previous.y === segment.y) {
          previous.endTick = segment.endTick;
        } else {
          current.push({ startTick: segment.startTick, endTick: segment.endTick, x: segment.x, y: segment.y });
        }
      }
      if (packet.stageEnd === "advance" || packet.stageEnd === "terminal") {
        if (current.length) {
          stages.push({ stage: currentStage, endTick: current[current.length - 1].endTick, segments: current });
          current = [];
        }
        currentStage = null;
      }
      if (packet.decision) decisions.push(packet.decision);
      if (packet.terminalReason) endReason = packet.terminalReason;
    }
    if (current.length && currentStage !== null) {
      stages.push({ stage: currentStage, endTick: current[current.length - 1].endTick, segments: current });
    }
    return {
      transcriptVersion,
      endReason: endReason || "ABANDONED",
      stages: stages,
      decisions: decisions,
    };
  }

  return Object.freeze({
    canonicalJson,
    sha256Hex,
    fingerprint,
    randomValuesFromSecret,
    standardManifest,
    transcriptFromPackets,
  });
});
