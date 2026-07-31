(function (root, factory) {
  const runSession = typeof module === "object" && module.exports
    ? require("./competitive-run-session")
    : root?.LoothoodCompetitiveRunSession;
  const api = factory(runSession);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodCompetitiveVerifierClient = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (RUN_SESSION) {
  "use strict";

  if (!RUN_SESSION) throw new Error("Loothood competitive run session is required.");

  const CLIENT_VERSION = "loothood-competitive-verifier-client-v1";
  const PROTOCOL_VERSION = 3;
  const EMPTY_HASH = `sha256:${"0".repeat(64)}`;
  const ATTEMPT_PATTERN = /^attempt_[A-Za-z0-9_-]{12,128}$/;

  class CompetitiveVerifierClientError extends Error {
    constructor(code, message, cause = null) {
      super(message);
      this.name = "CompetitiveVerifierClientError";
      this.code = code;
      this.cause = cause;
    }
  }

  function invariant(condition, code, message = code) {
    if (condition) return;
    throw new CompetitiveVerifierClientError(code, message);
  }

  function isPlainObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function canonicalize(value) {
    if (value === null) return "null";
    if (typeof value === "string") return JSON.stringify(value);
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "number") {
      invariant(Number.isSafeInteger(value), "non_canonical_number", "Competitive payload numbers must be safe integers.");
      return String(value);
    }
    if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
    invariant(isPlainObject(value), "non_canonical_value", "Competitive payload contains an unsupported value.");
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => {
      invariant(value[key] !== undefined, "non_canonical_value", `Competitive payload field ${key} is undefined.`);
      return `${JSON.stringify(key)}:${canonicalize(value[key])}`;
    }).join(",")}}`;
  }

  async function sha256(value, cryptoApi = globalThis.crypto) {
    invariant(typeof cryptoApi?.subtle?.digest === "function", "secure_hash_unavailable", "Secure browser hashing is unavailable.");
    const bytes = new TextEncoder().encode(canonicalize(value));
    const digest = new Uint8Array(await cryptoApi.subtle.digest("SHA-256", bytes));
    return `sha256:${[...digest].map((entry) => entry.toString(16).padStart(2, "0")).join("")}`;
  }

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function assertSeasonResponse(season) {
    invariant(isPlainObject(season), "invalid_season_manifest", "Season verification data is unavailable.");
    const envelope = season.manifestEnvelope;
    const manifest = envelope?.manifest;
    invariant(isPlainObject(envelope) && isPlainObject(manifest), "invalid_season_manifest", "Season manifest is incomplete.");
    invariant(season.protocolVersion === PROTOCOL_VERSION && envelope.protocolVersion === PROTOCOL_VERSION,
      "verifier_protocol_mismatch", "Season verification protocol is incompatible.");
    invariant(season.seasonId === manifest.seasonId
      && season.gameBuild === manifest.gameBuild
      && season.coreVersion === manifest.coreVersion
      && season.rulesetId === manifest.rulesetId,
    "season_manifest_mismatch", "Season verification summary does not match its manifest.");
    return manifest;
  }

  async function makePacket(attemptId, packetIndex, draft, cryptoApi = globalThis.crypto) {
    invariant(ATTEMPT_PATTERN.test(String(attemptId || "")), "invalid_attempt", "Competitive attempt identity is invalid.");
    invariant(isPlainObject(draft), "invalid_packet_draft", "Competitive packet draft is invalid.");
    const payload = {
      protocolVersion: PROTOCOL_VERSION,
      attemptId,
      packetIndex,
      idempotencyKey: `packet_${String(packetIndex).padStart(8, "0")}`,
      stage: draft.stage,
      startTick: draft.startTick,
      endTick: draft.endTick,
      segments: clone(draft.segments),
      stageEnd: draft.stageEnd,
      decision: clone(draft.decision),
      terminalReason: draft.terminalReason,
    };
    return { ...payload, packetHash: await sha256(payload, cryptoApi) };
  }

  class CompetitiveAttemptController {
    constructor({ api, idempotencyKey, cryptoApi = globalThis.crypto, nowMs } = {}) {
      invariant(api
        && typeof api.loadVerifierSeason === "function"
        && typeof api.issueVerifierAttempt === "function"
        && typeof api.submitVerifierPacket === "function"
        && typeof api.finalizeVerifierAttempt === "function",
      "verifier_api_unavailable", "Competitive verifier service is unavailable.");
      invariant(typeof idempotencyKey === "function", "idempotency_unavailable", "Secure request identity is unavailable.");
      this.api = api;
      this.idempotencyKey = idempotencyKey;
      this.cryptoApi = cryptoApi;
      this.nowMs = nowMs;
      this.season = null;
      this.ticket = null;
      this.session = null;
      this.packetCache = [];
      this.receipts = [];
      this.sentPacketCount = 0;
      this.finalReceiptHash = EMPTY_HASH;
      this.flushPromise = Promise.resolve();
      this.flushScheduled = false;
      this.transportError = null;
      this.finalResult = null;
    }

    assertReady() {
      invariant(this.session && this.ticket, "attempt_not_started", "Start a verified Season attempt first.");
      if (this.transportError) throw this.transportError;
    }

    async begin({ loadout, wallet, entryTicketId }) {
      invariant(!this.session, "attempt_already_started", "This controller already owns a Season attempt.");
      const season = await this.api.loadVerifierSeason();
      const manifest = assertSeasonResponse(season);
      const issued = await this.api.issueVerifierAttempt({ loadout, wallet, entryTicketId }, this.idempotencyKey("season-attempt"));
      const ticket = issued?.ticket;
      invariant(isPlainObject(ticket) && ATTEMPT_PATTERN.test(String(ticket.attemptId || "")),
        "invalid_attempt_ticket", "Verifier returned an invalid attempt ticket.");
      invariant(ticket.protocolVersion === PROTOCOL_VERSION
        && ticket.seasonId === manifest.seasonId
        && ticket.manifestHash === season.manifestEnvelope.manifestHash
        && ticket.coreVersion === manifest.coreVersion
        && ticket.rulesetId === manifest.rulesetId,
      "attempt_manifest_mismatch", "Attempt ticket does not match the active Season manifest.");
      this.season = clone(season);
      this.ticket = clone(ticket);
      this.session = RUN_SESSION.createSession({ manifest, loadout: ticket.loadout, nowMs: this.nowMs });
      return this.snapshot();
    }

    snapshot() {
      return Object.freeze({
        clientVersion: CLIENT_VERSION,
        attemptId: this.ticket?.attemptId || null,
        seasonId: this.ticket?.seasonId || null,
        phase: this.session?.run?.phase || "UNSTARTED",
        outcome: this.session?.run?.outcome || null,
        sentPacketCount: this.sentPacketCount,
        queuedPacketCount: Math.max(0, (this.session?.packets()?.length || 0) - this.sentPacketCount),
        finalized: Boolean(this.finalResult),
      });
    }

    setInput(x, y) {
      this.assertReady();
      return this.session.setInput(x, y);
    }

    tick(input) {
      this.assertReady();
      const phase = this.session.tick(input);
      this.scheduleFlush();
      return phase;
    }

    advance(dt) {
      this.assertReady();
      const ticks = this.session.advance(dt);
      this.scheduleFlush();
      return ticks;
    }

    choose(decision) {
      this.assertReady();
      const phase = this.session.choose(decision);
      this.scheduleFlush();
      return phase;
    }

    abandon() {
      this.assertReady();
      const outcome = this.session.abandon();
      this.scheduleFlush();
      return outcome;
    }

    scheduleFlush() {
      if (!this.session || this.session.packets().length <= this.sentPacketCount) return this.flushPromise;
      if (this.flushScheduled) return this.flushPromise;
      this.flushScheduled = true;
      this.flushPromise = this.flushPromise.then(() => this.flushPackets()).catch((error) => {
        this.transportError = error instanceof CompetitiveVerifierClientError
          ? error
          : new CompetitiveVerifierClientError("verifier_transport_failed", "Season evidence could not be secured.", error);
        return this.snapshot();
      }).finally(() => {
        this.flushScheduled = false;
        if (!this.transportError && this.session?.packets().length > this.sentPacketCount) {
          queueMicrotask(() => this.scheduleFlush());
        }
      });
      return this.flushPromise;
    }

    async flushPackets() {
      invariant(this.session && this.ticket, "attempt_not_started", "Start a verified Season attempt first.");
      while (this.sentPacketCount < this.session.packets().length) {
        const drafts = this.session.packets();
        const packetIndex = this.sentPacketCount;
        const draft = drafts[packetIndex];
        const packet = this.packetCache[packetIndex]
          || await makePacket(this.ticket.attemptId, packetIndex, draft, this.cryptoApi);
        this.packetCache[packetIndex] = packet;
        const response = await this.api.submitVerifierPacket(this.ticket.attemptId, {
          ticket: this.ticket,
          packet,
        });
        const receipt = response?.receipt;
        invariant(isPlainObject(receipt)
          && receipt.attemptId === this.ticket.attemptId
          && receipt.packetIndex === packetIndex
          && receipt.packetHash === packet.packetHash
          && receipt.previousReceiptHash === this.finalReceiptHash,
        "invalid_packet_receipt", "Verifier returned an invalid evidence receipt.");
        this.receipts[packetIndex] = clone(receipt);
        this.finalReceiptHash = await sha256(receipt, this.cryptoApi);
        this.sentPacketCount += 1;
      }
      return this.snapshot();
    }

    async retryTransport() {
      invariant(this.session && this.ticket, "attempt_not_started", "Start a verified Season attempt first.");
      this.transportError = null;
      this.flushPromise = Promise.resolve();
      this.flushScheduled = false;
      return this.scheduleFlush();
    }

    async finalize() {
      this.assertReady();
      invariant(this.session.run.phase === "TERMINAL", "attempt_not_terminal", "Finish or leave the Season attempt first.");
      if (this.finalResult) return clone(this.finalResult);
      await this.scheduleFlush();
      if (this.transportError) throw this.transportError;
      const replay = this.session.replayLocal();
      const claimedStateHash = await sha256(replay, this.cryptoApi);
      this.finalResult = await this.api.finalizeVerifierAttempt(this.ticket.attemptId, {
        ticket: this.ticket,
        finalReceiptHash: this.finalReceiptHash,
        claimedScore: replay.totalScore,
        claimedStateHash,
      });
      return clone(this.finalResult);
    }
  }

  return Object.freeze({
    CLIENT_VERSION,
    PROTOCOL_VERSION,
    EMPTY_HASH,
    CompetitiveVerifierClientError,
    CompetitiveAttemptController,
    canonicalize,
    sha256,
    makePacket,
  });
});
