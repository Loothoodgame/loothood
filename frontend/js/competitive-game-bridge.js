(function (root, factory) {
  const projection = typeof module === "object" && module.exports
    ? require("./competitive-combat-projection")
    : root?.LoothoodCompetitiveCombatProjection;
  const api = factory(projection);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodCompetitiveGameBridge = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (PROJECTION) {
  "use strict";

  if (!PROJECTION) throw new Error("Loothood competitive combat projection is required.");

  const BRIDGE_VERSION = "loothood-competitive-game-bridge-v1";
  const ACTIVE_STATES = Object.freeze(["COMBAT", "DECISION", "PAUSED", "FINALIZING", "TERMINAL", "FAULT"]);

  function fail(code, message = code, cause = null) {
    const error = new Error(message);
    error.code = code;
    error.cause = cause;
    throw error;
  }

  function invariant(condition, code, message) {
    if (!condition) fail(code, message);
  }

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function createBridge(callbacks = {}) {
    const onScene = typeof callbacks.onScene === "function" ? callbacks.onScene : () => {};
    const onState = typeof callbacks.onState === "function" ? callbacks.onState : () => {};
    const onDecision = typeof callbacks.onDecision === "function" ? callbacks.onDecision : () => {};
    const onTerminal = typeof callbacks.onTerminal === "function" ? callbacks.onTerminal : () => {};
    const onFault = typeof callbacks.onFault === "function" ? callbacks.onFault : () => {};
    let controller = null;
    let scene = null;
    let state = "IDLE";
    let fault = null;
    let finalResult = null;
    let paused = false;

    function snapshot() {
      return Object.freeze({
        bridgeVersion: BRIDGE_VERSION,
        state,
        active: ACTIVE_STATES.includes(state),
        paused,
        attemptId: controller?.ticket?.attemptId || null,
        phase: controller?.session?.run?.phase || "UNSTARTED",
        outcome: controller?.session?.run?.outcome || null,
        scene,
        fault: fault ? Object.freeze({ code: fault.code || "COMPETITIVE_BRIDGE_FAULT", message: fault.message }) : null,
        finalResult: clone(finalResult),
      });
    }

    function publishState() {
      const value = snapshot();
      onState(value);
      return value;
    }

    function project() {
      invariant(controller?.session?.run, "BRIDGE_NOT_ATTACHED", "Attach a verified Season attempt first.");
      const next = PROJECTION.projectRun(controller.session.run, scene);
      if (next.missingTelegraphs.length) {
        fail("COMPETITIVE_TELEGRAPH_INCOMPLETE", `Missing authoritative telegraph geometry: ${next.missingTelegraphs.join(", ")}`);
      }
      scene = next;
      onScene(scene);
      return scene;
    }

    function moveToRunPhase() {
      const run = controller.session.run;
      if (run.phase === "COMBAT") {
        state = paused ? "PAUSED" : "COMBAT";
      } else if (["AWAITING_UPGRADE", "AWAITING_RELIC"].includes(run.phase)) {
        paused = false;
        state = "DECISION";
        onDecision(scene);
      } else if (run.phase === "TERMINAL") {
        paused = false;
        state = "TERMINAL";
        onTerminal(scene);
      } else {
        fail("COMPETITIVE_PHASE_UNSUPPORTED", `Unsupported competitive phase ${run.phase}.`);
      }
      return publishState();
    }

    function trap(error) {
      fault = error instanceof Error ? error : new Error(String(error));
      paused = true;
      state = "FAULT";
      onFault(fault, scene);
      publishState();
      return false;
    }

    function attach(nextController) {
      invariant(state === "IDLE", "BRIDGE_ALREADY_ATTACHED", "Competitive bridge already owns an attempt.");
      invariant(nextController?.session?.run && typeof nextController.advance === "function",
        "BAD_COMPETITIVE_CONTROLLER", "A started verifier attempt controller is required.");
      controller = nextController;
      fault = null;
      finalResult = null;
      paused = false;
      try {
        project();
        moveToRunPhase();
        return snapshot();
      } catch (error) {
        trap(error);
        throw error;
      }
    }

    function setPaused(value) {
      invariant(state !== "IDLE", "BRIDGE_NOT_ATTACHED", "Attach a verified Season attempt first.");
      invariant(!["TERMINAL", "FINALIZING"].includes(state), "BRIDGE_NOT_PAUSABLE", "This attempt can no longer be paused.");
      if (state === "FAULT") return snapshot();
      paused = Boolean(value);
      moveToRunPhase();
      return snapshot();
    }

    function advance(dt, input = { x: 0, y: 0 }) {
      if (state !== "COMBAT" || paused) return 0;
      try {
        controller.setInput(input.x, input.y);
        const ticks = controller.advance(dt);
        project();
        moveToRunPhase();
        return ticks;
      } catch (error) {
        trap(error);
        return 0;
      }
    }

    function choose(choiceIds) {
      invariant(state === "DECISION", "BRIDGE_NOT_AWAITING_DECISION", "No Season reward decision is pending.");
      invariant(Array.isArray(choiceIds) && choiceIds.length >= 1 && choiceIds.length <= 2,
        "BAD_BRIDGE_DECISION", "Choose one or two offered rewards.");
      const run = controller.session.run;
      const decision = {
        afterStage: run.stagesCleared,
        kind: run.phase === "AWAITING_RELIC" ? "relic" : "upgrade",
        choiceIds: [...choiceIds],
      };
      try {
        controller.choose(decision);
        project();
        moveToRunPhase();
        return snapshot();
      } catch (error) {
        trap(error);
        throw error;
      }
    }

    function previewReshuffleRecovery() {
      invariant(state === "DECISION" && controller.session.run.phase === "AWAITING_RELIC",
        "RESHUFFLE_PREVIEW_UNAVAILABLE", "No relic decision is pending.");
      invariant(typeof controller.session.previewReshuffleRecovery === "function",
        "RESHUFFLE_PREVIEW_UNAVAILABLE", "Reshuffle recovery preview is unavailable.");
      return clone(controller.session.previewReshuffleRecovery());
    }

    function abandon() {
      invariant(["COMBAT", "DECISION", "PAUSED", "FAULT"].includes(state),
        "BRIDGE_NOT_ABANDONABLE", "This attempt cannot be abandoned.");
      try {
        controller.abandon();
        fault = null;
        paused = false;
        project();
        moveToRunPhase();
        return snapshot();
      } catch (error) {
        trap(error);
        throw error;
      }
    }

    async function finalize() {
      invariant(state === "TERMINAL", "BRIDGE_NOT_TERMINAL", "Finish or leave the attempt first.");
      state = "FINALIZING";
      publishState();
      try {
        finalResult = await controller.finalize();
        state = "TERMINAL";
        publishState();
        return clone(finalResult);
      } catch (error) {
        trap(error);
        throw error;
      }
    }

    return Object.freeze({
      attach,
      setPaused,
      advance,
      choose,
      previewReshuffleRecovery,
      abandon,
      finalize,
      snapshot,
    });
  }

  return Object.freeze({ BRIDGE_VERSION, ACTIVE_STATES, createBridge });
});
