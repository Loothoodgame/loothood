(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodCompetitiveHuntersKnotRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "loothood-competitive-hunters-knot-v2";
  const TICK_RATE = 60;
  const COORDINATE_SCALE = 10;
  const BASIS_POINTS = 10000;
  const STRAIN_SCALE = 1000000;

  const RULES = Object.freeze({
    anchorHits: 3,
    anchorRadius: 18 * COORDINATE_SCALE,
    anchorOffset: 72 * COORDINATE_SCALE,
    anchorSlack: 82 * COORDINATE_SCALE,
    anchorLimit: 178 * COORDINATE_SCALE,
    anchorSnapStrain: 620000,
    anchorStrainDecayPerSecond: 1150000,
    followupDelayTicks: 90,
    phaseOneStormWaves: 3,
    phaseTwoStormWaves: 6,
    bruteStormWaves: 7,
    minimumStormWarningTicks: 39,
    stormImpactCoreBps: 4000,
    stormExternalPlacementMargin: 8 * COORDINATE_SCALE,
    stormReversalTicks: 180,
    stormReversalDamageBps: 20000,
    deadeyeTrackTicks: 102,
    deadeyeLockTicks: 27,
    deadeyeSpeedUnitsPerTick: 80,
    phaseTwoRecoveryTicks: 141,
    phaseTwoEnragedRecoveryTicks: 105,
  });

  const STORM_PATTERNS = Object.freeze({
    2: Object.freeze(["horizontal", "vertical"]),
    3: Object.freeze(["horizontal", "vertical", "triangle"]),
    4: Object.freeze(["horizontal", "vertical", "grid", "diamond", "zigzag"]),
    5: Object.freeze(["horizontal", "vertical", "quincunx", "openChevron", "staircase", "brokenPentagon"]),
    6: Object.freeze(["horizontal", "vertical", "grid", "staggeredTriples", "doubleChevron", "twinTriangles", "brokenHexagon"]),
  });
  const ESCAPE_DIRECTIONS = Object.freeze([
    [1000, 0], [966, 259], [866, 500], [707, 707], [500, 866], [259, 966],
    [0, 1000], [-259, 966], [-500, 866], [-707, 707], [-866, 500], [-966, 259],
    [-1000, 0], [-966, -259], [-866, -500], [-707, -707], [-500, -866], [-259, -966],
    [0, -1000], [259, -966], [500, -866], [707, -707], [866, -500], [966, -259],
  ].map((direction) => Object.freeze(direction)));

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

  function integerSqrt(value) {
    invariant(Number.isSafeInteger(value) && value >= 0, "BAD_INTEGER_SQRT");
    if (value < 2) return value;
    let left = 1;
    let right = Math.min(value, 94906265);
    while (left <= right) {
      const middle = Math.floor((left + right) / 2);
      const square = middle * middle;
      if (square === value) return middle;
      if (square < value) left = middle + 1;
      else right = middle - 1;
    }
    return right;
  }

  function normalizedStep(dx, dy, length) {
    safeInteger(dx, "BAD_DIRECTION");
    safeInteger(dy, "BAD_DIRECTION");
    safeInteger(length, "BAD_LENGTH");
    invariant(length >= 0, "BAD_LENGTH");
    const magnitude = integerSqrt(dx * dx + dy * dy);
    if (!magnitude) return { x: length, y: 0 };
    return {
      x: roundRatio(dx * length, magnitude),
      y: roundRatio(dy * length, magnitude),
    };
  }

  function validateArena(arena) {
    invariant(arena && typeof arena === "object", "BAD_ARENA");
    for (const key of ["width", "height", "padding"]) safeInteger(arena[key], "BAD_ARENA");
    invariant(arena.width > 0 && arena.height > 0 && arena.padding >= 0, "BAD_ARENA");
  }

  function validatePoint(point, code) {
    invariant(point && typeof point === "object", code);
    safeInteger(point.x, code);
    safeInteger(point.y, code);
  }

  function validateAnchor(anchor) {
    invariant(anchor?.version === VERSION && anchor.kind === "bossAnchor", "BAD_BOSS_ANCHOR");
    for (const key of [
      "ownerBossId", "x", "y", "radius", "hitsRemaining", "lastVolleyId",
      "strainMillionths", "slack", "limit",
    ]) safeInteger(anchor[key], "BAD_BOSS_ANCHOR");
    invariant(anchor.hitsRemaining >= 0 && anchor.hitsRemaining <= RULES.anchorHits, "BAD_BOSS_ANCHOR");
    invariant(anchor.slack > 0 && anchor.limit > anchor.slack, "BAD_BOSS_ANCHOR");
  }

  function createAnchor(options) {
    invariant(options && typeof options === "object", "BAD_ANCHOR_OPTIONS");
    validatePoint(options.player, "BAD_PLAYER_POINT");
    validatePoint(options.boss, "BAD_BOSS_POINT");
    validateArena(options.arena);
    const ownerBossId = safeInteger(options.ownerBossId, "BAD_BOSS_ID");
    const radius = options.radius === undefined ? RULES.anchorRadius : safeInteger(options.radius, "BAD_ANCHOR_RADIUS");
    const slack = options.slack === undefined ? RULES.anchorSlack : safeInteger(options.slack, "BAD_ANCHOR_SLACK");
    const limit = options.limit === undefined ? RULES.anchorLimit : safeInteger(options.limit, "BAD_ANCHOR_LIMIT");
    invariant(radius > 0 && slack > 0 && limit > slack, "BAD_ANCHOR_GEOMETRY");

    const centerX = roundRatio(options.arena.width, 2);
    const centerY = roundRatio(options.arena.height, 2);
    const fromCenterX = options.player.x - centerX;
    const fromCenterY = options.player.y - centerY;
    const centerDistance = integerSqrt(fromCenterX * fromCenterX + fromCenterY * fromCenterY);
    const direction = centerDistance > 24 * COORDINATE_SCALE
      ? normalizedStep(fromCenterX, fromCenterY, RULES.anchorOffset)
      : normalizedStep(options.player.x - options.boss.x, options.player.y - options.boss.y, RULES.anchorOffset);
    const minimumX = options.arena.padding + radius;
    const maximumX = options.arena.width - options.arena.padding - radius;
    const minimumY = options.arena.padding + radius;
    const maximumY = options.arena.height - options.arena.padding - radius;
    invariant(minimumX <= maximumX && minimumY <= maximumY, "BAD_ANCHOR_ARENA");

    return {
      version: VERSION,
      kind: "bossAnchor",
      active: true,
      ownerBossId,
      x: clamp(options.player.x + direction.x, minimumX, maximumX),
      y: clamp(options.player.y + direction.y, minimumY, maximumY),
      radius,
      hitsRemaining: RULES.anchorHits,
      lastVolleyId: -1,
      strainMillionths: 0,
      slack,
      limit,
      breakReason: "",
    };
  }

  function breakAnchor(anchor, reason) {
    validateAnchor(anchor);
    invariant(["shot", "strain", "storm", "recovered", "replaced", "moduleTransition"].includes(reason), "BAD_ANCHOR_BREAK_REASON");
    if (!anchor.active) return false;
    anchor.active = false;
    anchor.breakReason = reason;
    return true;
  }

  function registerVolleyHit(anchor, volleyId) {
    validateAnchor(anchor);
    safeInteger(volleyId, "BAD_VOLLEY_ID");
    invariant(volleyId >= 0, "BAD_VOLLEY_ID");
    if (!anchor.active) return { accepted: false, reason: "inactive", hitsRemaining: anchor.hitsRemaining, broken: true };
    if (anchor.lastVolleyId === volleyId) {
      return { accepted: false, reason: "duplicateVolley", hitsRemaining: anchor.hitsRemaining, broken: false };
    }
    anchor.lastVolleyId = volleyId;
    anchor.hitsRemaining = Math.max(0, anchor.hitsRemaining - 1);
    if (anchor.hitsRemaining === 0) breakAnchor(anchor, "shot");
    return {
      accepted: true,
      reason: anchor.active ? "hit" : "shot",
      hitsRemaining: anchor.hitsRemaining,
      broken: !anchor.active,
    };
  }

  function resistanceBps(extensionBps) {
    if (extensionBps <= 0) return 0;
    const normalized = Math.min(BASIS_POINTS, extensionBps) / BASIS_POINTS;
    let resistance = 1200 + Math.round(Math.pow(normalized, 1.7) * 6800);
    if (extensionBps > BASIS_POINTS) resistance += roundRatio((extensionBps - BASIS_POINTS) * 5000, BASIS_POINTS);
    return Math.min(9200, resistance);
  }

  function applyAnchorMovement(anchor, player, desiredVelocity, inputMoving) {
    validateAnchor(anchor);
    validatePoint(player, "BAD_PLAYER_POINT");
    validatePoint(desiredVelocity, "BAD_DESIRED_VELOCITY");
    invariant(typeof inputMoving === "boolean", "BAD_INPUT_MOVING");
    if (!anchor.active) {
      return { x: desiredVelocity.x, y: desiredVelocity.y, extensionBps: 0, resistanceBps: 0, snapped: false };
    }

    const dx = player.x - anchor.x;
    const dy = player.y - anchor.y;
    const distance = Math.max(1, integerSqrt(dx * dx + dy * dy));
    const outwardVelocity = roundRatio(desiredVelocity.x * dx + desiredVelocity.y * dy, distance);
    const extensionBps = clamp(
      roundRatio((distance - anchor.slack) * BASIS_POINTS, anchor.limit - anchor.slack),
      0,
      14500
    );
    const appliedResistanceBps = outwardVelocity > 0 ? resistanceBps(extensionBps) : 0;
    let x = desiredVelocity.x;
    let y = desiredVelocity.y;
    if (outwardVelocity > 0 && appliedResistanceBps > 0) {
      const outwardX = roundRatio(dx * outwardVelocity, distance);
      const outwardY = roundRatio(dy * outwardVelocity, distance);
      x -= roundRatio(outwardX * appliedResistanceBps, BASIS_POINTS);
      y -= roundRatio(outwardY * appliedResistanceBps, BASIS_POINTS);
    }

    if (inputMoving && outwardVelocity > 0 && distance * 100 >= anchor.limit * 97) {
      const gainPerSecond = 780000 + Math.max(0, extensionBps - 9000) * 150;
      anchor.strainMillionths += roundRatio(gainPerSecond, TICK_RATE);
    } else {
      anchor.strainMillionths = Math.max(
        0,
        anchor.strainMillionths - roundRatio(RULES.anchorStrainDecayPerSecond, TICK_RATE)
      );
    }

    const snapped = anchor.strainMillionths >= RULES.anchorSnapStrain;
    if (snapped) breakAnchor(anchor, "strain");
    return { x, y, extensionBps, resistanceBps: appliedResistanceBps, snapped };
  }

  function createFollowup(branch) {
    invariant(["storm", "deadeye"].includes(branch), "BAD_HUNTERS_KNOT_BRANCH");
    return {
      version: VERSION,
      branch,
      ticksRemaining: RULES.followupDelayTicks,
      started: false,
    };
  }

  function tickFollowup(followup) {
    invariant(followup?.version === VERSION && ["storm", "deadeye"].includes(followup.branch), "BAD_HUNTERS_KNOT_FOLLOWUP");
    safeInteger(followup.ticksRemaining, "BAD_HUNTERS_KNOT_FOLLOWUP");
    if (followup.started) return false;
    followup.ticksRemaining = Math.max(0, followup.ticksRemaining - 1);
    if (followup.ticksRemaining > 0) return false;
    followup.started = true;
    return true;
  }

  function phaseOneStormCircleCount(armor, maximumArmor) {
    safeInteger(armor, "BAD_ARMOR");
    safeInteger(maximumArmor, "BAD_ARMOR");
    invariant(armor >= 0 && maximumArmor > 0 && armor <= maximumArmor, "BAD_ARMOR");
    if (armor * 3 > maximumArmor * 2) return 2;
    if (armor * 3 > maximumArmor) return 3;
    return 4;
  }

  function phaseTwoStormCircleCount(hp, maximumHp) {
    safeInteger(hp, "BAD_BOSS_HP");
    safeInteger(maximumHp, "BAD_BOSS_HP");
    invariant(hp >= 0 && maximumHp > 0 && hp <= maximumHp, "BAD_BOSS_HP");
    if (hp * 4 > maximumHp * 3) return 3;
    if (hp * 2 > maximumHp) return 4;
    if (hp * 4 > maximumHp) return 5;
    return 6;
  }

  function phaseTwoRecoveryTicks(hp, maximumHp) {
    safeInteger(hp, "BAD_BOSS_HP");
    safeInteger(maximumHp, "BAD_BOSS_HP");
    invariant(hp >= 0 && maximumHp > 0 && hp <= maximumHp, "BAD_BOSS_HP");
    return hp * 2 <= maximumHp ? RULES.phaseTwoEnragedRecoveryTicks : RULES.phaseTwoRecoveryTicks;
  }

  function normalizedPatternCount(value) {
    safeInteger(value, "BAD_STORM_CIRCLE_COUNT");
    return clamp(value, 2, 6);
  }

  function stormPatternNames(count) {
    return STORM_PATTERNS[normalizedPatternCount(count)];
  }

  function chooseStormPattern(count, previous = "", variant = 0) {
    safeInteger(variant, "BAD_STORM_VARIANT");
    const available = stormPatternNames(count).filter((name) => name !== previous);
    return available[Math.abs(variant) % available.length];
  }

  function stormLineOffsets(count, vertical) {
    return Array.from({ length: count }, (_, index) => {
      const offset = (2 * index - (count - 1)) * 500;
      return vertical ? { x: 0, y: offset } : { x: offset, y: 0 };
    });
  }

  function stormPatternOffsets(count, pattern) {
    const normalizedCount = normalizedPatternCount(count);
    if (pattern === "horizontal") return stormLineOffsets(normalizedCount, false);
    if (pattern === "vertical") return stormLineOffsets(normalizedCount, true);
    const byPattern = {
      triangle: [[0, -900], [-900, 700], [900, 700]],
      grid: normalizedCount === 4
        ? [[-700, -700], [700, -700], [-700, 700], [700, 700]]
        : [[-900, -650], [0, -650], [900, -650], [-900, 650], [0, 650], [900, 650]],
      diamond: [[0, -1000], [950, 0], [0, 1000], [-950, 0]],
      zigzag: [[-1200, -550], [-400, 550], [400, -550], [1200, 550]],
      quincunx: [[-950, -800], [950, -800], [0, 0], [-950, 800], [950, 800]],
      openChevron: [[-1200, -700], [-550, -150], [0, 550], [550, -150], [1200, -700]],
      staircase: [[-1200, -800], [-600, -400], [0, 0], [600, 400], [1200, 800]],
      brokenPentagon: [[-950, -650], [0, -1000], [950, -650], [750, 650], [-750, 650]],
      staggeredTriples: [[-1000, -600], [0, -600], [1000, -600], [-650, 600], [350, 600], [1350, 600]],
      doubleChevron: [[-1150, -650], [-550, 0], [0, 650], [350, -650], [950, 0], [1500, 650]],
      twinTriangles: [[-1000, -700], [-1550, 450], [-450, 450], [1000, -700], [450, 450], [1550, 450]],
      brokenHexagon: [[-1000, -550], [0, -1000], [1000, -550], [1000, 550], [350, 1000], [-1000, 550]],
    };
    const offsets = byPattern[pattern];
    invariant(Boolean(offsets), "BAD_STORM_PATTERN");
    return offsets.slice(0, normalizedCount).map(([x, y]) => ({ x, y }));
  }

  function stormImpactCoreRadius(hazardRadius, playerRadius) {
    safeInteger(hazardRadius, "BAD_STORM_RADIUS");
    safeInteger(playerRadius, "BAD_PLAYER_RADIUS");
    invariant(hazardRadius > 0 && playerRadius > 0, "BAD_STORM_GEOMETRY");
    return Math.min(
      hazardRadius,
      Math.max(
        roundRatio(hazardRadius * RULES.stormImpactCoreBps, BASIS_POINTS),
        playerRadius + RULES.stormExternalPlacementMargin
      )
    );
  }

  function stormReversalResult(options) {
    invariant(options && typeof options === "object", "BAD_STORM_REVERSAL");
    validatePoint(options.hazard, "BAD_STORM_HAZARD");
    validatePoint(options.boss, "BAD_STORM_BOSS");
    const hazardRadius = safeInteger(options.hazard.radius, "BAD_STORM_RADIUS");
    const bossRadius = safeInteger(options.boss.radius, "BAD_BOSS_RADIUS");
    const playerRadius = safeInteger(options.playerRadius, "BAD_PLAYER_RADIUS");
    invariant(hazardRadius > 0 && bossRadius > 0 && playerRadius > 0, "BAD_STORM_GEOMETRY");
    const coreRadius = stormImpactCoreRadius(hazardRadius, playerRadius);
    const dx = options.hazard.x - options.boss.x;
    const dy = options.hazard.y - options.boss.y;
    const captureRadius = coreRadius + bossRadius;
    const reversed = dx * dx + dy * dy <= captureRadius * captureRadius;
    return {
      reversed,
      coreRadius,
      cancelRemainingStorm: reversed,
      breakAnchor: reversed,
      damageMultiplierBps: reversed ? RULES.stormReversalDamageBps : BASIS_POINTS,
      durationTicks: reversed ? RULES.stormReversalTicks : 0,
    };
  }

  return Object.freeze({
    VERSION,
    TICK_RATE,
    COORDINATE_SCALE,
    BASIS_POINTS,
    STRAIN_SCALE,
    RULES,
    STORM_PATTERNS,
    ESCAPE_DIRECTIONS,
    createAnchor,
    breakAnchor,
    registerVolleyHit,
    applyAnchorMovement,
    createFollowup,
    tickFollowup,
    phaseOneStormCircleCount,
    phaseTwoStormCircleCount,
    phaseTwoRecoveryTicks,
    stormPatternNames,
    chooseStormPattern,
    stormPatternOffsets,
    stormImpactCoreRadius,
    stormReversalResult,
  });
});
