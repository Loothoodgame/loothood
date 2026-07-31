(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodBossBalance = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ARROW_STORM_PATTERNS = Object.freeze({
    2: Object.freeze(["horizontal", "vertical"]),
    3: Object.freeze(["horizontal", "vertical", "triangle"]),
    4: Object.freeze(["horizontal", "vertical", "grid", "diamond", "zigzag"]),
    5: Object.freeze(["horizontal", "vertical", "quincunx", "openChevron", "staircase", "brokenPentagon"]),
    6: Object.freeze(["horizontal", "vertical", "grid", "staggeredTriples", "doubleChevron", "twinTriangles", "brokenHexagon"]),
  });

  function normalizedPatternCount(value) {
    return Math.max(2, Math.min(6, Math.floor(Number(value) || 2)));
  }

  function patternNames(count) {
    return ARROW_STORM_PATTERNS[normalizedPatternCount(count)];
  }

  function choosePattern(count, previous = "", variant = 0) {
    const available = patternNames(count).filter((name) => name !== previous);
    const index = Math.abs(Math.floor(Number(variant) || 0)) % available.length;
    return available[index];
  }

  function line(count, vertical = false) {
    return Array.from({ length: count }, (_, index) => {
      const offset = index - (count - 1) / 2;
      return vertical ? { x: 0, y: offset } : { x: offset, y: 0 };
    });
  }

  function patternOffsets(count, pattern) {
    const normalizedCount = normalizedPatternCount(count);
    if (pattern === "horizontal") return line(normalizedCount, false);
    if (pattern === "vertical") return line(normalizedCount, true);
    const byPattern = {
      triangle: [{ x: 0, y: -0.9 }, { x: -0.9, y: 0.7 }, { x: 0.9, y: 0.7 }],
      grid: normalizedCount === 4
        ? [{ x: -0.7, y: -0.7 }, { x: 0.7, y: -0.7 }, { x: -0.7, y: 0.7 }, { x: 0.7, y: 0.7 }]
        : [{ x: -0.9, y: -0.65 }, { x: 0, y: -0.65 }, { x: 0.9, y: -0.65 }, { x: -0.9, y: 0.65 }, { x: 0, y: 0.65 }, { x: 0.9, y: 0.65 }],
      diamond: [{ x: 0, y: -1 }, { x: 0.95, y: 0 }, { x: 0, y: 1 }, { x: -0.95, y: 0 }],
      zigzag: [{ x: -1.2, y: -0.55 }, { x: -0.4, y: 0.55 }, { x: 0.4, y: -0.55 }, { x: 1.2, y: 0.55 }],
      quincunx: [{ x: -0.95, y: -0.8 }, { x: 0.95, y: -0.8 }, { x: 0, y: 0 }, { x: -0.95, y: 0.8 }, { x: 0.95, y: 0.8 }],
      openChevron: [{ x: -1.2, y: -0.7 }, { x: -0.55, y: -0.15 }, { x: 0, y: 0.55 }, { x: 0.55, y: -0.15 }, { x: 1.2, y: -0.7 }],
      staircase: [{ x: -1.2, y: -0.8 }, { x: -0.6, y: -0.4 }, { x: 0, y: 0 }, { x: 0.6, y: 0.4 }, { x: 1.2, y: 0.8 }],
      brokenPentagon: [{ x: -0.95, y: -0.65 }, { x: 0, y: -1 }, { x: 0.95, y: -0.65 }, { x: 0.75, y: 0.65 }, { x: -0.75, y: 0.65 }],
      staggeredTriples: [{ x: -1, y: -0.6 }, { x: 0, y: -0.6 }, { x: 1, y: -0.6 }, { x: -0.65, y: 0.6 }, { x: 0.35, y: 0.6 }, { x: 1.35, y: 0.6 }],
      doubleChevron: [{ x: -1.15, y: -0.65 }, { x: -0.55, y: 0 }, { x: 0, y: 0.65 }, { x: 0.35, y: -0.65 }, { x: 0.95, y: 0 }, { x: 1.5, y: 0.65 }],
      twinTriangles: [{ x: -1, y: -0.7 }, { x: -1.55, y: 0.45 }, { x: -0.45, y: 0.45 }, { x: 1, y: -0.7 }, { x: 0.45, y: 0.45 }, { x: 1.55, y: 0.45 }],
      brokenHexagon: [{ x: -1, y: -0.55 }, { x: 0, y: -1 }, { x: 1, y: -0.55 }, { x: 1, y: 0.55 }, { x: 0.35, y: 1 }, { x: -1, y: 0.55 }],
    };
    return (byPattern[pattern] || line(normalizedCount, false)).slice(0, normalizedCount);
  }

  function phaseTwoCircleCount(hp, maxHp) {
    const ratio = Number(maxHp) > 0 ? Number(hp) / Number(maxHp) : 0;
    if (ratio > 0.75) return 3;
    if (ratio > 0.5) return 4;
    if (ratio > 0.25) return 5;
    return 6;
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

  function separatedSafeStrips(routes, preferred = [], safeCount = 3, stripCount = 9, excluded = []) {
    const count = Math.max(safeCount, Math.floor(stripCount));
    const excludedStrips = new Set((excluded || []).map((strip) => (
      Math.max(0, Math.min(count - 1, Math.floor(strip)))
    )));
    const normalized = [...new Map((routes || [])
      .filter((route) => Number.isFinite(route?.distance))
      .map((route) => [
        Math.max(0, Math.min(count - 1, Math.floor(route.strip))),
        {
          strip: Math.max(0, Math.min(count - 1, Math.floor(route.strip))),
          distance: Math.max(0, Number(route.distance) || 0),
        },
      ])
      .filter(([strip]) => !excludedStrips.has(strip))).values()];
    const candidates = combinations(normalized, safeCount).filter((choice) => {
      const strips = choice.map((route) => route.strip).sort((left, right) => left - right);
      return strips.every((strip, index) => index === 0 || strip - strips[index - 1] >= 2);
    });
    if (!candidates.length) return Object.freeze([]);
    const eligiblePreferred = preferred.filter((strip) => !excludedStrips.has(strip));
    const preferredRanks = new Map(eligiblePreferred.map((strip, index) => [strip, index]));
    candidates.sort((left, right) => {
      const leftStrips = left.map((route) => route.strip);
      const rightStrips = right.map((route) => route.strip);
      const primary = eligiblePreferred[0];
      const primaryDelta = Number(!leftStrips.includes(primary)) - Number(!rightStrips.includes(primary));
      if (primaryDelta) return primaryDelta;
      const distanceDelta = left.reduce((sum, route) => sum + route.distance, 0)
        - right.reduce((sum, route) => sum + route.distance, 0);
      if (distanceDelta) return distanceDelta;
      const preferredDelta = leftStrips.reduce((sum, strip) => sum + (preferredRanks.get(strip) ?? count), 0)
        - rightStrips.reduce((sum, strip) => sum + (preferredRanks.get(strip) ?? count), 0);
      return preferredDelta || leftStrips.join("").localeCompare(rightStrips.join(""));
    });
    return Object.freeze(candidates[0].map((route) => route.strip).sort((left, right) => left - right));
  }

  function rootSafeStrips(playerStrip, variant = 0, stripCount = 9) {
    const count = Math.max(6, Math.floor(stripCount));
    const player = Math.max(0, Math.min(count - 1, Math.floor(playerStrip)));
    const direction = Math.abs(Math.floor(variant)) % 2 === 0 ? 1 : -1;
    const candidates = [
      player,
      player + direction * 3,
      player - direction * 3,
      player + direction * 4,
      player - direction * 4,
      1,
      count - 2,
    ];
    const preferred = [...new Set(candidates.map((candidate) => Math.max(0, Math.min(count - 1, candidate))))];
    return separatedSafeStrips(
      Array.from({ length: count }, (_, strip) => ({ strip, distance: Math.abs(strip - player) })),
      preferred,
      3,
      count,
      [player]
    );
  }

  function connectedGridSafeIndices(points, seedIndex, safeCount) {
    if (!Array.isArray(points) || !points.length) return Object.freeze([]);
    const byCell = new Map(points.map((point, index) => [`${point.row}:${point.column}`, index]));
    const target = Math.max(1, Math.min(points.length, Math.floor(safeCount) || 1));
    const start = Math.max(0, Math.min(points.length - 1, Math.floor(seedIndex) || 0));
    const queue = [start];
    const visited = new Set([start]);
    const result = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
    while (queue.length && result.length < target) {
      const index = queue.shift();
      result.push(index);
      const point = points[index];
      for (const [rowDelta, columnDelta] of directions) {
        const neighbor = byCell.get(`${point.row + rowDelta}:${point.column + columnDelta}`);
        if (neighbor === undefined || visited.has(neighbor)) continue;
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
    return Object.freeze(result);
  }

  return Object.freeze({
    ARROW_STORM_PATTERNS,
    patternNames,
    choosePattern,
    patternOffsets,
    phaseTwoCircleCount,
    separatedSafeStrips,
    rootSafeStrips,
    connectedGridSafeIndices,
  });
});
