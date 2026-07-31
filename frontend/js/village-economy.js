(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodVillageEconomy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const RESOURCE_IDS = Object.freeze(["wood", "ore"]);
  const CLOCK_ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000;
  const LARGE_FORWARD_JUMP_MS = 30 * 24 * 60 * 60 * 1000;
  const HUNT_PASSIVE_RESERVE_MINUTES = 60;
  const FINAL_STAGE_REWARD_MULTIPLIER = 4;
  const NORMAL_STAGE_COUNT = 14;

  function finiteNonNegative(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
  }

  function integerNonNegative(value) {
    return Math.floor(finiteNonNegative(value));
  }

  function levelValue(values, level) {
    if (!Array.isArray(values)) return 0;
    const index = Math.max(0, Math.min(values.length - 1, Math.floor(Number(level) || 0)));
    return finiteNonNegative(values[index]);
  }

  function capacities(storehouseDef, level) {
    return Object.freeze(Object.fromEntries(RESOURCE_IDS.map((resource) => [
      resource,
      integerNonNegative(levelValue(storehouseDef?.capacities?.[resource], level)),
    ])));
  }

  function passiveRates(buildingDefs, plots) {
    const byId = new Map((buildingDefs || []).map((def) => [def.id, def]));
    const rates = { wood: 0, ore: 0 };
    for (const plot of plots || []) {
      const def = plot ? byId.get(plot.id) : null;
      if (!def || !RESOURCE_IDS.includes(def.resource)) continue;
      rates[def.resource] += levelValue(def.passiveRates, plot.level);
    }
    return Object.freeze(rates);
  }

  function applyCappedGain(balance, cap, amount) {
    const current = integerNonNegative(balance);
    const maximum = integerNonNegative(cap);
    const requested = integerNonNegative(amount);
    const accepted = Math.min(requested, Math.max(0, maximum - current));
    return Object.freeze({
      balance: current + accepted,
      accepted,
      lost: requested - accepted,
    });
  }

  function costShortfall(balances, cost) {
    const missing = {};
    for (const [resource, rawAmount] of Object.entries(cost || {})) {
      const amount = finiteNonNegative(rawAmount);
      const held = finiteNonNegative(balances?.[resource]);
      if (held < amount) missing[resource] = amount - held;
    }
    return Object.freeze(missing);
  }

  function canAffordCost(balances, cost) {
    return Object.keys(costShortfall(balances, cost)).length === 0;
  }

  function spendCostAtomically(balances, cost) {
    const current = Object.fromEntries(Object.entries(balances || {}).map(([resource, amount]) => [
      resource,
      finiteNonNegative(amount),
    ]));
    const missing = costShortfall(current, cost);
    if (Object.keys(missing).length) {
      return Object.freeze({ accepted: false, balances: Object.freeze(current), missing });
    }
    const next = { ...current };
    for (const [resource, rawAmount] of Object.entries(cost || {})) {
      next[resource] = finiteNonNegative(next[resource]) - finiteNonNegative(rawAmount);
    }
    return Object.freeze({ accepted: true, balances: Object.freeze(next), missing });
  }

  function accrue(input) {
    const nowMs = Math.max(0, Math.floor(Number(input?.nowMs) || 0));
    const savedAtMs = Math.max(0, Math.floor(Number(input?.lastAccruedAtMs) || 0));
    const balances = Object.fromEntries(RESOURCE_IDS.map((resource) => [resource, integerNonNegative(input?.balances?.[resource])]));
    const fractions = Object.fromEntries(RESOURCE_IDS.map((resource) => [resource, finiteNonNegative(input?.fractions?.[resource]) % 1]));
    const discardFractions = Object.fromEntries(RESOURCE_IDS.map((resource) => [resource, finiteNonNegative(input?.discardFractions?.[resource]) % 1]));
    const caps = Object.fromEntries(RESOURCE_IDS.map((resource) => [resource, integerNonNegative(input?.caps?.[resource])]));
    const rates = Object.fromEntries(RESOURCE_IDS.map((resource) => [resource, finiteNonNegative(input?.rates?.[resource])]));
    const gained = { wood: 0, ore: 0 };
    const lost = { wood: 0, ore: 0 };

    if (!savedAtMs || !nowMs) {
      return Object.freeze({
        balances: Object.freeze(balances),
        fractions: Object.freeze(fractions),
        discardFractions: Object.freeze(discardFractions),
        gained: Object.freeze(gained),
        lost: Object.freeze(lost),
        lastAccruedAtMs: nowMs || savedAtMs,
        clockStatus: "initialized",
        largeForwardJump: false,
      });
    }

    if (nowMs < savedAtMs) {
      const rollback = savedAtMs - nowMs;
      return Object.freeze({
        balances: Object.freeze(balances),
        fractions: Object.freeze(fractions),
        discardFractions: Object.freeze(discardFractions),
        gained: Object.freeze(gained),
        lost: Object.freeze(lost),
        lastAccruedAtMs: savedAtMs,
        clockStatus: rollback > CLOCK_ROLLBACK_TOLERANCE_MS ? "rollback" : "minorRollback",
        largeForwardJump: false,
      });
    }

    const elapsedMs = nowMs - savedAtMs;
    const elapsedMinutes = elapsedMs / 60000;
    for (const resource of RESOURCE_IDS) {
      const generated = fractions[resource] + rates[resource] * elapsedMinutes;
      const whole = Math.floor(generated + 1e-12);
      const result = applyCappedGain(balances[resource], caps[resource], whole);
      balances[resource] = result.balance;
      gained[resource] = result.accepted;
      const binFull = result.balance >= caps[resource];
      const generatedFraction = generated - whole;
      if (binFull) {
        const discarded = discardFractions[resource] + result.lost + generatedFraction;
        lost[resource] = Math.floor(discarded + 1e-12);
        discardFractions[resource] = discarded - lost[resource];
        fractions[resource] = 0;
      } else {
        lost[resource] = result.lost;
        fractions[resource] = generatedFraction;
      }
    }

    return Object.freeze({
      balances: Object.freeze(balances),
      fractions: Object.freeze(fractions),
      discardFractions: Object.freeze(discardFractions),
      gained: Object.freeze(gained),
      lost: Object.freeze(lost),
      lastAccruedAtMs: nowMs,
      clockStatus: "ok",
      largeForwardJump: elapsedMs > LARGE_FORWARD_JUMP_MS,
    });
  }

  function stageReward(def, level, finalStage = false) {
    if (!def?.stageYield) return 0;
    const scale = levelValue(def.stageScales, level);
    const multiplier = finalStage ? FINAL_STAGE_REWARD_MULTIPLIER : 1;
    return Math.max(1, Math.round(def.stageYield * scale * multiplier));
  }

  function fullRunProducerReward(def, level) {
    return NORMAL_STAGE_COUNT * stageReward(def, level, false) + stageReward(def, level, true);
  }

  function projectedFullRunRewards(buildingDefs, plots) {
    const byId = new Map((buildingDefs || []).map((def) => [def.id, def]));
    const rewards = { wood: 0, ore: 0 };
    for (const plot of plots || []) {
      const def = plot ? byId.get(plot.id) : null;
      if (!def || !RESOURCE_IDS.includes(def.resource)) continue;
      rewards[def.resource] += fullRunProducerReward(def, plot.level);
    }
    return Object.freeze(rewards);
  }

  function huntRisk(input) {
    const projected = Object.fromEntries(RESOURCE_IDS.map((resource) => [resource, integerNonNegative(input?.projected?.[resource])]));
    const rates = Object.fromEntries(RESOURCE_IDS.map((resource) => [resource, finiteNonNegative(input?.rates?.[resource])]));
    const balances = Object.fromEntries(RESOURCE_IDS.map((resource) => [resource, integerNonNegative(input?.balances?.[resource])]));
    const caps = Object.fromEntries(RESOURCE_IDS.map((resource) => [resource, integerNonNegative(input?.caps?.[resource])]));
    const free = {};
    const passiveReserve = {};
    const required = {};
    const atRisk = {};
    for (const resource of RESOURCE_IDS) {
      free[resource] = Math.max(0, caps[resource] - balances[resource]);
      passiveReserve[resource] = Math.ceil(rates[resource] * HUNT_PASSIVE_RESERVE_MINUTES - 1e-12);
      required[resource] = projected[resource] + passiveReserve[resource];
      atRisk[resource] = Math.max(0, required[resource] - free[resource]);
    }
    return Object.freeze({
      projected: Object.freeze(projected),
      passiveReserve: Object.freeze(passiveReserve),
      free: Object.freeze(free),
      required: Object.freeze(required),
      atRisk: Object.freeze(atRisk),
      risky: RESOURCE_IDS.some((resource) => atRisk[resource] > 0),
    });
  }

  function huntRiskIncreased(previous, next) {
    if (!previous?.atRisk || !next?.atRisk) return true;
    return RESOURCE_IDS.some((resource) => (
      integerNonNegative(next.atRisk[resource]) > integerNonNegative(previous.atRisk[resource])
    ));
  }

  function minutesToFull(balance, fraction, cap, rate) {
    const perMinute = finiteNonNegative(rate);
    if (perMinute <= 0) return Infinity;
    const remaining = Math.max(0, integerNonNegative(cap) - integerNonNegative(balance) - (finiteNonNegative(fraction) % 1));
    return remaining / perMinute;
  }

  return Object.freeze({
    RESOURCE_IDS,
    CLOCK_ROLLBACK_TOLERANCE_MS,
    LARGE_FORWARD_JUMP_MS,
    HUNT_PASSIVE_RESERVE_MINUTES,
    FINAL_STAGE_REWARD_MULTIPLIER,
    NORMAL_STAGE_COUNT,
    levelValue,
    capacities,
    passiveRates,
    applyCappedGain,
    costShortfall,
    canAffordCost,
    spendCostAtomically,
    accrue,
    stageReward,
    fullRunProducerReward,
    projectedFullRunRewards,
    huntRisk,
    huntRiskIncreased,
    minutesToFull,
  });
});
