(function initEquipmentPulls(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodEquipmentPulls = api;
})(typeof window !== "undefined" ? window : globalThis, function equipmentPullsFactory() {
  "use strict";

  const HOUR_MS = 60 * 60 * 1000;

  function boundedCounter(value, maximum) {
    return Math.min(maximum, Math.max(0, Math.floor(Number(value) || 0)));
  }

  function pity(counter, maximum) {
    const max = Math.max(1, Math.floor(Number(maximum) || 1));
    const value = boundedCounter(counter, max);
    const fraction = value / max;
    return Object.freeze({
      value,
      maximum: max,
      fraction,
      percent: fraction * 100,
      remaining: Math.max(0, max - value),
      proximity: fraction >= 0.9 ? "critical" : fraction >= 0.8 ? "near" : "normal",
      heat: fraction >= 0.8 ? "hot" : fraction >= 0.5 ? "warm" : "green",
    });
  }

  function bannerTiming(endAt, now = Date.now()) {
    if (!endAt) return Object.freeze({ visible: false });
    const end = Date.parse(String(endAt));
    const current = Number(now);
    if (!Number.isFinite(end) || !Number.isFinite(current) || end <= current) {
      return Object.freeze({ visible: false });
    }
    const hoursRemaining = Math.max(1, Math.ceil((end - current) / HOUR_MS));
    const days = Math.floor(hoursRemaining / 24);
    const hours = hoursRemaining % 24;
    const duration = days > 0 ? `${days}d${hours ? ` ${hours}h` : ""}` : `${hoursRemaining}h`;
    return Object.freeze({
      visible: true,
      text: `Banner ends in ${duration}`,
      hoursRemaining,
      danger: hoursRemaining <= 72,
      lastDay: hoursRemaining <= 24,
    });
  }

  function createSpotlightRotation(items, random = Math.random) {
    const source = Array.isArray(items) ? items.filter(Boolean) : [];
    if (source.length < 3) throw new Error("Standard Legendary spotlight requires at least three items.");
    let remaining = [];

    function refill() {
      remaining = [...source];
      for (let index = remaining.length - 1; index > 0; index -= 1) {
        const roll = Number(random());
        if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error("Spotlight randomness must be in [0, 1).");
        const swap = Math.min(index, Math.floor(roll * (index + 1)));
        [remaining[index], remaining[swap]] = [remaining[swap], remaining[index]];
      }
    }

    function next() {
      if (!remaining.length) refill();
      const selected = [];
      while (selected.length < 3) {
        if (!remaining.length) refill();
        let index = remaining.findIndex((entry) => !selected.includes(entry));
        if (index < 0) index = 0;
        selected.push(remaining.splice(index, 1)[0]);
      }
      return Object.freeze(selected);
    }

    return Object.freeze({ next, poolSize: source.length });
  }

  return Object.freeze({ pity, bannerTiming, createSpotlightRotation });
});
