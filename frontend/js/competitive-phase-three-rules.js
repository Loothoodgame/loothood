(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodCompetitivePhaseThreeRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "loothood-competitive-phase-three-v1";
  const TICK_RATE = 60;
  const COORDINATE_SCALE = 10;
  const RULES = Object.freeze({
    segmentCount: 4,
    openingRitualTicks: 24 * TICK_RATE,
    openingLaneIntervalTicks: 3 * TICK_RATE,
    laneTelegraphTicks: 43,
    minimumLaneTelegraphTicks: 32,
    laneChargeTicks: 25,
    chargeArmDistance: 10 * COORDINATE_SCALE,
    segmentOneRampageTicks: 348,
    segmentOneWindowTicks: 312,
    segmentTwoRampageTicks: 288,
    segmentTwoWindowTicks: 228,
    segmentThreeBreatherTicks: 192,
    aftershockWarningTicks: 43,
    aftershockImpactTicks: 14,
    eruptionWarningTicks: 47,
    eruptionImpactTicks: 17,
    verticalEruptionCount: 6,
    horizontalEruptionCount: 8,
    segmentTransitionGraceTicks: 45,
    segmentFourDrainNumerator: 3,
    segmentFourDrainDenominator: 100 * TICK_RATE,
    timberfallGridColumns: 5,
    timberfallGridRows: 4,
    timberfallDangerCells: 13,
    timberfallSafeCells: 7,
    timberfallWaveIntervalTicks: 78,
    timberfallWarningTicks: 69,
  });

  const SEGMENT_FLOORS_BPS = Object.freeze([7500, 5000, 2500, 0]);
  const SEGMENT_THREE_TIER_FLOORS_BPS = Object.freeze([4375, 3750, 3125, 2500]);
  const SEGMENT_THREE_CHARGE_COUNTS = Object.freeze([6, 6, 8, 8]);

  function fail(code, detail) {
    const error = new Error(detail || code);
    error.code = code;
    throw error;
  }

  function invariant(condition, code, detail) {
    if (!condition) fail(code, detail);
  }

  function safeInteger(value, code) {
    invariant(Number.isSafeInteger(value), code);
    return value;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function roundRatio(numerator, denominator) {
    invariant(Number.isSafeInteger(numerator) && Number.isSafeInteger(denominator) && denominator > 0, "BAD_INTEGER_RATIO");
    if (numerator >= 0) return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
    return -Math.floor((-numerator + Math.floor(denominator / 2)) / denominator);
  }

  function validateArena(arena) {
    invariant(arena && typeof arena === "object", "BAD_ARENA");
    for (const key of ["width", "height", "padding"]) safeInteger(arena[key], "BAD_ARENA");
    invariant(arena.padding >= 0 && arena.width > arena.padding * 2 && arena.height > arena.padding * 2, "BAD_ARENA");
  }

  function validatePoint(point, code) {
    invariant(point && typeof point === "object", code);
    safeInteger(point.x, code);
    safeInteger(point.y, code);
  }

  function segmentForHp(hpHundredths, maximumHpHundredths) {
    safeInteger(hpHundredths, "BAD_PHASE_THREE_HP");
    safeInteger(maximumHpHundredths, "BAD_PHASE_THREE_HP");
    invariant(hpHundredths >= 0 && maximumHpHundredths > 0 && hpHundredths <= maximumHpHundredths, "BAD_PHASE_THREE_HP");
    if (hpHundredths * 4 > maximumHpHundredths * 3) return 1;
    if (hpHundredths * 2 > maximumHpHundredths) return 2;
    if (hpHundredths * 4 > maximumHpHundredths) return 3;
    return 4;
  }

  function segmentFloorHundredths(maximumHpHundredths, segment) {
    safeInteger(maximumHpHundredths, "BAD_PHASE_THREE_HP");
    safeInteger(segment, "BAD_PHASE_THREE_SEGMENT");
    invariant(maximumHpHundredths > 0 && segment >= 1 && segment <= 4, "BAD_PHASE_THREE_SEGMENT");
    return roundRatio(maximumHpHundredths * SEGMENT_FLOORS_BPS[segment - 1], 10000);
  }

  function segmentThreeTier(hpHundredths, maximumHpHundredths) {
    safeInteger(hpHundredths, "BAD_PHASE_THREE_HP");
    safeInteger(maximumHpHundredths, "BAD_PHASE_THREE_HP");
    invariant(maximumHpHundredths > 0 && hpHundredths >= segmentFloorHundredths(maximumHpHundredths, 3)
      && hpHundredths <= segmentFloorHundredths(maximumHpHundredths, 2), "BAD_SEGMENT_THREE_HP");
    if (hpHundredths * 10000 > maximumHpHundredths * 4375) return 1;
    if (hpHundredths * 10000 > maximumHpHundredths * 3750) return 2;
    if (hpHundredths * 10000 > maximumHpHundredths * 3125) return 3;
    return 4;
  }

  function segmentThreeTierFloorHundredths(maximumHpHundredths, tier) {
    safeInteger(maximumHpHundredths, "BAD_PHASE_THREE_HP");
    safeInteger(tier, "BAD_BERSERK_TIER");
    invariant(maximumHpHundredths > 0 && tier >= 1 && tier <= 4, "BAD_BERSERK_TIER");
    return roundRatio(maximumHpHundredths * SEGMENT_THREE_TIER_FLOORS_BPS[tier - 1], 10000);
  }

  function tierPattern(tier) {
    safeInteger(tier, "BAD_BERSERK_TIER");
    invariant(tier >= 1 && tier <= 4, "BAD_BERSERK_TIER");
    return Object.freeze({
      tier,
      chargeCount: SEGMENT_THREE_CHARGE_COUNTS[tier - 1],
      aftershocks: tier >= 2,
      eruptions: tier >= 4,
    });
  }

  function occupiedLane(arena, player, vertical) {
    validateArena(arena);
    validatePoint(player, "BAD_PLAYER_POINT");
    invariant(typeof vertical === "boolean", "BAD_LANE_AXIS");
    const minimum = arena.padding;
    const span = (vertical ? arena.width : arena.height) - minimum * 2;
    const coordinate = (vertical ? player.x : player.y) - minimum;
    return clamp(Math.floor(coordinate * 3 / span), 0, 2);
  }

  function laneGeometry(arena, lane, vertical) {
    validateArena(arena);
    safeInteger(lane, "BAD_LANE");
    invariant(lane >= 0 && lane <= 2 && typeof vertical === "boolean", "BAD_LANE");
    const width = arena.width - arena.padding * 2;
    const height = arena.height - arena.padding * 2;
    if (vertical) {
      return Object.freeze({
        x: arena.padding + roundRatio(width * lane, 3),
        y: arena.padding,
        width: roundRatio(width, 3),
        height,
      });
    }
    return Object.freeze({
      x: arena.padding,
      y: arena.padding + roundRatio(height * lane, 3),
      width,
      height: roundRatio(height, 3),
    });
  }

  function laneTelegraphTicks(chargeIndex) {
    safeInteger(chargeIndex, "BAD_CHARGE_INDEX");
    invariant(chargeIndex >= 0, "BAD_CHARGE_INDEX");
    return Math.max(RULES.minimumLaneTelegraphTicks, RULES.laneTelegraphTicks - Math.floor(chargeIndex * 12 / 5));
  }

  function eruptionCenters(lane, vertical) {
    invariant(lane && typeof lane === "object", "BAD_LANE_GEOMETRY");
    for (const key of ["x", "y", "width", "height"]) safeInteger(lane[key], "BAD_LANE_GEOMETRY");
    const count = vertical ? RULES.verticalEruptionCount : RULES.horizontalEruptionCount;
    return Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze({
      x: vertical
        ? lane.x + roundRatio(lane.width, 2)
        : lane.x + roundRatio(lane.width * (index * 2 + 1), count * 2),
      y: vertical
        ? lane.y + roundRatio(lane.height * (index * 2 + 1), count * 2)
        : lane.y + roundRatio(lane.height, 2),
    })));
  }

  return Object.freeze({
    VERSION,
    TICK_RATE,
    COORDINATE_SCALE,
    RULES,
    SEGMENT_FLOORS_BPS,
    SEGMENT_THREE_TIER_FLOORS_BPS,
    SEGMENT_THREE_CHARGE_COUNTS,
    clamp,
    roundRatio,
    segmentForHp,
    segmentFloorHundredths,
    segmentThreeTier,
    segmentThreeTierFloorHundredths,
    tierPattern,
    occupiedLane,
    laneGeometry,
    laneTelegraphTicks,
    eruptionCenters,
  });
});
