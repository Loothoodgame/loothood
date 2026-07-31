(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodBossVictoryTimeline = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VICTORY_BPM = 112;
  const timings = Object.freeze({
    impactMs: 0,
    bossFadeMs: 900,
    victoryMs: 1200,
    chestDropMs: 1260,
    chestOpenMs: 1200 + 16 * 60 * 1000 / VICTORY_BPM,
    rewardRevealMs: 1200 + 16 * 60 * 1000 / VICTORY_BPM + 480,
  });

  function createScheduler({ setTimeout: schedule, clearTimeout: cancel }) {
    let generation = 0;
    let active = null;

    function clear() {
      generation += 1;
      if (!active) return generation;
      for (const timer of active.timers) cancel(timer);
      active = null;
      return generation;
    }

    function start(callbacks = {}) {
      clear();
      const token = generation;
      const timers = [];
      const queue = (delay, callback) => {
        if (typeof callback !== "function") return;
        timers.push(schedule(() => {
          if (!active || active.token !== token) return;
          callback(token);
        }, delay));
      };
      active = { token, timers };
      queue(timings.chestDropMs, callbacks.onDrop);
      queue(timings.chestOpenMs, callbacks.onOpen);
      queue(timings.rewardRevealMs, callbacks.onReveal);
      return token;
    }

    function complete(token) {
      if (!active || active.token !== token) return false;
      for (const timer of active.timers) cancel(timer);
      active = null;
      return true;
    }

    return Object.freeze({
      start,
      clear,
      complete,
      isCurrent: (token) => Boolean(active && active.token === token),
      get activeToken() { return active?.token ?? 0; },
    });
  }

  return Object.freeze({ VICTORY_BPM, timings, createScheduler });
});
