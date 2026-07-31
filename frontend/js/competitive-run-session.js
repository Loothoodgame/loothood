(function (root, factory) {
  const core = typeof module === "object" && module.exports
    ? require("./competitive-run-core")
    : root?.LoothoodCompetitiveRunCore;
  const api = factory(core);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodCompetitiveRunSession = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (CORE) {
  "use strict";

  if (!CORE) throw new Error("Loothood competitive run core is required.");

  const SESSION_VERSION = "loothood-competitive-run-session-v2";
  const FIXED_STEP_SECONDS = 1 / CORE.TICK_RATE;
  const MAX_PACKET_TICKS = 120;
  const MAX_PACKET_SEGMENTS = 64;

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function invariant(condition, code) {
    if (condition) return;
    const error = new Error(code);
    error.code = code;
    throw error;
  }

  function normalizedInput(x, y) {
    invariant(Number.isFinite(Number(x)) && Number.isFinite(Number(y)), "BAD_SESSION_INPUT");
    const rawX = Number(x);
    const rawY = Number(y);
    const length = Math.hypot(rawX, rawY);
    if (length <= 0.08) return { x: 0, y: 0 };
    const scale = Math.max(1, length);
    return {
      x: Math.max(-CORE.INPUT_AXIS_LIMIT, Math.min(CORE.INPUT_AXIS_LIMIT, Math.round(rawX / scale * CORE.INPUT_AXIS_LIMIT))),
      y: Math.max(-CORE.INPUT_AXIS_LIMIT, Math.min(CORE.INPUT_AXIS_LIMIT, Math.round(rawY / scale * CORE.INPUT_AXIS_LIMIT))),
    };
  }

  function createSession(options = {}) {
    const manifest = clone(options.manifest);
    const loadout = clone(options.loadout || CORE.FIXED_LOADOUT);
    CORE.validateManifest(manifest);
    CORE.validateFixedLoadout(loadout, manifest.loadoutPolicy);
    const nowMs = typeof options.nowMs === "function" ? options.nowMs : () => 0;
    const run = CORE.createRunState(manifest, loadout);
    const stageTranscripts = [];
    const packetDrafts = [];
    const decisions = [];
    let input = { x: 0, y: 0 };
    let stageSegments = [];
    let packetSegments = [];
    let accumulator = 0;
    let advanceCalls = 0;
    let fixedTicks = 0;
    let sessionMilliseconds = 0;
    let maximumAdvanceMilliseconds = 0;
    let terminalReason = "";

    function appendSegment(target, startTick, endTick, value) {
      const previous = target[target.length - 1];
      if (previous && previous.endTick === startTick && previous.x === value.x && previous.y === value.y) {
        previous.endTick = endTick;
      } else {
        target.push({ startTick, endTick, x: value.x, y: value.y });
      }
    }

    function recordInput(startTick, endTick, value) {
      appendSegment(stageSegments, startTick, endTick, value);
      appendSegment(packetSegments, startTick, endTick, value);
    }

    function queuePacket({ stage = run.stage, stageEnd = null, decision = null, terminalReason: reason = null } = {}) {
      if (!packetSegments.length) return false;
      const startTick = packetSegments[0].startTick;
      const endTick = packetSegments[packetSegments.length - 1].endTick;
      packetDrafts.push({
        stage,
        startTick,
        endTick,
        segments: clone(packetSegments),
        stageEnd,
        decision: clone(decision),
        terminalReason: reason,
      });
      packetSegments = [];
      return true;
    }

    function closeStageTranscript(stage) {
      invariant(stageSegments.length > 0, "STAGE_TRANSCRIPT_REQUIRES_INPUT");
      const endTick = stageSegments[stageSegments.length - 1].endTick;
      stageTranscripts.push({ stage, endTick, segments: clone(stageSegments) });
      stageSegments = [];
    }

    function packetLimitReached() {
      if (!packetSegments.length) return false;
      const ticks = packetSegments[packetSegments.length - 1].endTick - packetSegments[0].startTick;
      return ticks >= MAX_PACKET_TICKS || packetSegments.length >= MAX_PACKET_SEGMENTS;
    }

    function setInput(x, y) {
      input = normalizedInput(x, y);
      return clone(input);
    }

    function tick(value = input) {
      invariant(run.outcome === "RUNNING" && run.phase === "COMBAT", "SESSION_NOT_ACCEPTING_TICKS");
      CORE.validateTickInput(value);
      const stage = run.stage;
      const startTick = run.stageState.stageTick;
      CORE.simulateRunTick(run, value);
      const endTick = startTick + 1;
      recordInput(startTick, endTick, value);
      fixedTicks += 1;
      if (run.phase !== "COMBAT") {
        invariant(run.stage === stage, "SESSION_STAGE_CHANGED_WITHOUT_DECISION");
        closeStageTranscript(stage);
        if (run.phase === "TERMINAL") {
          terminalReason = "SIMULATED";
          queuePacket({ stageEnd: "terminal", terminalReason });
        }
      } else if (packetLimitReached()) {
        queuePacket();
      }
      return run.phase;
    }

    function advance(dt) {
      invariant(run.outcome === "RUNNING", "SESSION_ALREADY_TERMINAL");
      const startedAt = nowMs();
      accumulator += Math.max(0, Math.min(0.25, Number(dt) || 0));
      let steps = 0;
      while (accumulator + 1e-12 >= FIXED_STEP_SECONDS && run.phase === "COMBAT" && run.outcome === "RUNNING") {
        accumulator -= FIXED_STEP_SECONDS;
        tick(input);
        steps += 1;
      }
      advanceCalls += 1;
      const elapsed = Math.max(0, nowMs() - startedAt);
      sessionMilliseconds += elapsed;
      maximumAdvanceMilliseconds = Math.max(maximumAdvanceMilliseconds, elapsed);
      return steps;
    }

    function choose(decision) {
      invariant(run.outcome === "RUNNING" && ["AWAITING_UPGRADE", "AWAITING_RELIC"].includes(run.phase), "SESSION_NOT_ACCEPTING_DECISION");
      const completedStage = run.stage;
      CORE.applyRunDecision(run, decision);
      invariant(run.stage === completedStage + 1, "SESSION_STAGE_ADVANCE_MISMATCH");
      queuePacket({ stage: completedStage, stageEnd: "advance", decision });
      decisions.push(clone(decision));
      accumulator = 0;
      return run.phase;
    }

    function previewReshuffleRecovery() {
      return CORE.previewReshuffleRecovery(run);
    }

    function abandon() {
      invariant(run.outcome === "RUNNING", "SESSION_ALREADY_TERMINAL");
      if (run.phase === "COMBAT") {
        invariant(stageSegments.length > 0, "ABANDON_REQUIRES_RECORDED_TICK");
        const stage = run.stage;
        closeStageTranscript(stage);
        queuePacket({ stageEnd: "terminal", terminalReason: "ABANDONED" });
      } else {
        invariant(packetSegments.length > 0, "ABANDON_REQUIRES_PENDING_STAGE_INPUT");
        queuePacket({ stageEnd: "terminal", terminalReason: "ABANDONED" });
      }
      CORE.abandonRun(run);
      terminalReason = "ABANDONED";
      return run.outcome;
    }

    function transcript() {
      invariant(run.phase === "TERMINAL" && terminalReason, "SESSION_NOT_TERMINAL");
      return {
        transcriptVersion: CORE.RUN_TRANSCRIPT_VERSION,
        endReason: terminalReason,
        stages: clone(stageTranscripts),
        decisions: clone(decisions),
      };
    }

    function packets() {
      return clone(packetDrafts);
    }

    function replayLocal() {
      return CORE.replayRun(manifest, transcript(), loadout);
    }

    function report() {
      const averageMsPerTick = fixedTicks > 0 ? sessionMilliseconds / fixedTicks : 0;
      return {
        sessionVersion: SESSION_VERSION,
        coreVersion: CORE.CORE_VERSION,
        rulesetId: CORE.RULESET_ID,
        fixedTickRate: CORE.TICK_RATE,
        phase: run.phase,
        outcome: run.outcome,
        stage: run.stage,
        stagesRecorded: stageTranscripts.length,
        packetsRecorded: packetDrafts.length,
        decisionsRecorded: decisions.length,
        inputSegments: stageTranscripts.reduce((sum, packet) => sum + packet.segments.length, 0) + stageSegments.length,
        fixedTicks,
        performance: {
          advanceCalls,
          sessionMilliseconds,
          averageMsPerTick,
          maximumAdvanceMilliseconds,
          estimatedFrameBudgetPercentAt60Hz: averageMsPerTick / (1000 / 60) * 100,
        },
      };
    }

    return Object.freeze({
      manifest,
      loadout,
      run,
      setInput,
      tick,
      advance,
      choose,
      previewReshuffleRecovery,
      abandon,
      transcript,
      packets,
      replayLocal,
      report,
    });
  }

  return Object.freeze({
    SESSION_VERSION,
    FIXED_STEP_SECONDS,
    MAX_PACKET_TICKS,
    MAX_PACKET_SEGMENTS,
    normalizedInput,
    createSession,
  });
});
