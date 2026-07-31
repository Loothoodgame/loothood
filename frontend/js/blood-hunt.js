(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodBloodHunt = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_LANE_COUNT = 5;

  function clampInteger(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, Math.floor(Number(value) || 0)));
  }

  function combinations(values, count, start = 0, chosen = [], result = []) {
    if (chosen.length === count) {
      result.push([...chosen]);
      return result;
    }
    for (let index = start; index <= values.length - (count - chosen.length); index += 1) {
      chosen.push(values[index]);
      combinations(values, count, index + 1, chosen, result);
      chosen.pop();
    }
    return result;
  }

  function separationScore(lanes) {
    let score = 0;
    for (let left = 0; left < lanes.length; left += 1) {
      for (let right = left + 1; right < lanes.length; right += 1) {
        score += Math.abs(lanes[left] - lanes[right]);
      }
    }
    return score;
  }

  function shiftedGap(playerLane, laneCount = DEFAULT_LANE_COUNT) {
    const normalizedCount = Math.max(2, Math.floor(laneCount));
    const normalizedLane = clampInteger(playerLane, 0, normalizedCount - 1);
    return clampInteger(
      normalizedLane + (normalizedLane >= Math.floor(normalizedCount / 2) ? -1 : 1),
      0,
      normalizedCount - 1
    );
  }

  function escapeLanes(options = {}) {
    const laneCount = Math.max(2, Math.floor(options.laneCount || DEFAULT_LANE_COUNT));
    const playerLane = clampInteger(options.playerLane, 0, laneCount - 1);
    const escapeCount = clampInteger(options.escapeCount || 1, 1, laneCount - 1);
    const requestedPrimary = Number.isInteger(options.primaryLane) ? options.primaryLane : shiftedGap(playerLane, laneCount);
    const primaryLane = requestedPrimary === playerLane || requestedPrimary < 0 || requestedPrimary >= laneCount
      ? shiftedGap(playerLane, laneCount)
      : requestedPrimary;
    const available = Array.from({ length: laneCount }, (_, lane) => lane).filter((lane) => lane !== playerLane);
    const candidates = combinations(available, escapeCount).filter((lanes) => lanes.includes(primaryLane));
    if (!candidates.length) throw new Error("Blood Hunt escape topology has no legal lane set");
    const bestScore = Math.max(...candidates.map(separationScore));
    const best = candidates
      .filter((lanes) => separationScore(lanes) === bestScore)
      .sort((left, right) => left.join("").localeCompare(right.join("")));
    const variant = Math.abs(Math.floor(Number(options.variant) || 0));
    return Object.freeze([...best[variant % best.length]].sort((left, right) => left - right));
  }

  function pincerEscapeLanes(options = {}) {
    const laneCount = Math.max(2, Math.floor(options.laneCount || DEFAULT_LANE_COUNT));
    const playerLane = clampInteger(options.playerLane, 0, laneCount - 1);
    const forwardGaps = [...new Set((options.forwardGaps || []).map((lane) => clampInteger(lane, 0, laneCount - 1)))]
      .sort((left, right) => left - right);
    if (!forwardGaps.length || forwardGaps.length >= laneCount) {
      throw new Error("Blood Hunt pincer requires a partial forward gap set");
    }
    const escapeCount = clampInteger(options.escapeCount || forwardGaps.length, 1, laneCount - 1);
    const variant = Math.abs(Math.floor(Number(options.variant) || 0));
    const shared = forwardGaps[variant % forwardGaps.length];
    const previouslyBlocked = Array.from({ length: laneCount }, (_, lane) => lane)
      .filter((lane) => !forwardGaps.includes(lane))
      .sort((left, right) => {
        const leftPlayerPenalty = left === playerLane ? 1 : 0;
        const rightPlayerPenalty = right === playerLane ? 1 : 0;
        if (leftPlayerPenalty !== rightPlayerPenalty) return leftPlayerPenalty - rightPlayerPenalty;
        const distanceDelta = Math.abs(right - shared) - Math.abs(left - shared);
        return distanceDelta || left - right;
      });
    const gaps = [shared];
    for (let index = 0; gaps.length < escapeCount && index < previouslyBlocked.length; index += 1) {
      gaps.push(previouslyBlocked[(index + variant) % previouslyBlocked.length]);
    }
    for (const lane of forwardGaps) {
      if (gaps.length >= escapeCount) break;
      if (!gaps.includes(lane)) gaps.push(lane);
    }
    return Object.freeze([...new Set(gaps)].sort((left, right) => left - right));
  }

  function phaseTwoEscapeLaneCount(hp, maxHp) {
    return 3;
  }

  function phaseOnePacing(stage) {
    return Object.freeze(Number(stage) <= 5
      ? { escapeLaneCount: 3, warning: 1.1, waveInterval: 1.2, houndSpeed: 380 }
      : { escapeLaneCount: 3, warning: 1, waveInterval: 1.1, houndSpeed: 400 });
  }

  function phaseTwoPacing(stage, hp, maxHp) {
    const ratio = Number(maxHp) > 0 ? Number(hp) / Number(maxHp) : 0;
    if (Number(stage) <= 5) {
      return Object.freeze(ratio <= 0.5
        ? { escapeLaneCount: 3, warning: 1, waveInterval: 0.88, houndSpeed: 420 }
        : { escapeLaneCount: 3, warning: 1.08, waveInterval: 0.96, houndSpeed: 400 });
    }
    return Object.freeze(ratio <= 0.5
      ? { escapeLaneCount: 3, warning: 0.94, waveInterval: 0.82, houndSpeed: 435 }
      : { escapeLaneCount: 3, warning: 1.02, waveInterval: 0.9, houndSpeed: 415 });
  }

  return Object.freeze({
    DEFAULT_LANE_COUNT,
    shiftedGap,
    escapeLanes,
    pincerEscapeLanes,
    phaseOnePacing,
    phaseTwoEscapeLaneCount,
    phaseTwoPacing,
  });
});
