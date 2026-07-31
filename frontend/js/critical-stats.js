(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LOOTHOOD_CRITICAL_STATS = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function finiteNonNegative(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
  }

  function sumSources(sources) {
    return Object.values(sources || {}).reduce((sum, value) => sum + finiteNonNegative(value), 0);
  }

  function resolve({ chanceSources = {}, normalCriticalDamage = 2 } = {}) {
    const rawChance = sumSources(chanceSources);
    const effectiveChance = Math.min(1, rawChance);
    const overcritBonus = Math.max(0, rawChance - 1);
    const normalMultiplier = finiteNonNegative(normalCriticalDamage);
    return Object.freeze({
      rawChance,
      effectiveChance,
      overcritBonus,
      normalMultiplier,
      effectiveMultiplier: normalMultiplier + overcritBonus,
    });
  }

  return Object.freeze({ resolve, sumSources });
});
