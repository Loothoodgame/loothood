(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodCompetitiveIronOathRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "loothood-competitive-iron-oath-v1";
  const TICK_RATE = 60;
  const COORDINATE_SCALE = 10;
  const RULES = Object.freeze({
    channelHideTicks: 7,
    finalWheelDurationTicks: 600,
    finalWheelShots: 104,
    wheelDirectionCount: 20,
    phaseTwoPreludeTicks: 84,
    brutePreludeTicks: 66,
    bruteInitialPreludeTicks: 36,
    bruteBreatherTicks: 180,
    laneTelegraphTicks: 43,
    laneChargeTicks: 25,
    laneChargeCount: 5,
    chargeArmDistance: 10 * COORDINATE_SCALE,
    chargeDamageHundredths: 3312,
    ordinaryChargeTelegraphTicks: 42,
    ordinaryChargeTicks: 37,
    ordinaryChargeRecoveryTicks: 33,
    ordinaryChargeSpeedUnitsPerTick: 38,
    sweepPoseTicks: 18,
    sweepDamageTick: 10,
    sweepRecoveryTicks: 33,
    sweepReach: 86 * COORDINATE_SCALE,
    sweepHalfAngleRadians: Math.PI * 0.36,
    sweepDamageScaleBps: 5800,
  });

  const WHEEL_DIRECTIONS = Object.freeze([
    [0, -1000], [309, -951], [588, -809], [809, -588], [951, -309],
    [1000, 0], [951, 309], [809, 588], [588, 809], [309, 951],
    [0, 1000], [-309, 951], [-588, 809], [-809, 588], [-951, 309],
    [-1000, 0], [-951, -309], [-809, -588], [-588, -809], [-309, -951],
  ].map((direction) => Object.freeze(direction)));
  const FINAL_WHEEL_SHOT_TICKS = Object.freeze(Array.from(
    { length: RULES.finalWheelShots },
    (_, index) => Math.ceil((index + 1) * RULES.finalWheelDurationTicks / RULES.finalWheelShots),
  ));

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

  function validatePoint(point, code) {
    invariant(point && typeof point === "object", code);
    safeInteger(point.x, code);
    safeInteger(point.y, code);
  }

  function finalWheelShotTicks() {
    return FINAL_WHEEL_SHOT_TICKS;
  }

  function wheelDirection(shotIndex, direction = 1) {
    safeInteger(shotIndex, "BAD_WHEEL_SHOT_INDEX");
    invariant(shotIndex >= 0, "BAD_WHEEL_SHOT_INDEX");
    invariant(direction === 1 || direction === -1, "BAD_WHEEL_DIRECTION");
    const raw = direction * shotIndex;
    const index = ((raw % WHEEL_DIRECTIONS.length) + WHEEL_DIRECTIONS.length) % WHEEL_DIRECTIONS.length;
    return WHEEL_DIRECTIONS[index];
  }

  function validateArena(arena) {
    invariant(arena && typeof arena === "object", "BAD_ARENA");
    for (const key of ["width", "height", "padding"]) safeInteger(arena[key], "BAD_ARENA");
    invariant(arena.width > 0 && arena.height > 0 && arena.padding >= 0, "BAD_ARENA");
  }

  function occupiedLane(arena, point, vertical) {
    validateArena(arena);
    validatePoint(point, "BAD_LANE_POINT");
    invariant(typeof vertical === "boolean", "BAD_LANE_AXIS");
    const minimum = arena.padding;
    const span = (vertical ? arena.width : arena.height) - arena.padding * 2;
    const coordinate = (vertical ? point.x : point.y) - minimum;
    return clamp(Math.floor(coordinate * 3 / span), 0, 2);
  }

  function laneGeometry(arena, bossRadius, lane, vertical, forward) {
    validateArena(arena);
    safeInteger(bossRadius, "BAD_BOSS_RADIUS");
    safeInteger(lane, "BAD_LANE");
    invariant(bossRadius > 0 && lane >= 0 && lane <= 2, "BAD_LANE");
    invariant(typeof vertical === "boolean" && typeof forward === "boolean", "BAD_LANE_DIRECTION");
    const coverageMinX = arena.padding;
    const coverageMinY = arena.padding;
    const coverageWidth = arena.width - arena.padding * 2;
    const coverageHeight = arena.height - arena.padding * 2;
    const centerX = roundRatio(arena.width, 2);
    const centerY = roundRatio(arena.height, 2);
    const travelHalfWidth = roundRatio((arena.width - 2 * (arena.padding + bossRadius)) * 7, 20);
    const travelHalfHeight = roundRatio((arena.height - 2 * (arena.padding + bossRadius)) * 7, 20);
    if (vertical) {
      const x = coverageMinX + roundRatio(lane * coverageWidth, 3);
      const centerLaneX = coverageMinX + roundRatio((2 * lane + 1) * coverageWidth, 6);
      return {
        x,
        y: coverageMinY,
        width: roundRatio(coverageWidth, 3),
        height: coverageHeight,
        startX: centerLaneX,
        startY: forward ? centerY - travelHalfHeight : centerY + travelHalfHeight,
        endX: centerLaneX,
        endY: forward ? centerY + travelHalfHeight : centerY - travelHalfHeight,
      };
    }
    const y = coverageMinY + roundRatio(lane * coverageHeight, 3);
    const centerLaneY = coverageMinY + roundRatio((2 * lane + 1) * coverageHeight, 6);
    return {
      x: coverageMinX,
      y,
      width: coverageWidth,
      height: roundRatio(coverageHeight, 3),
      startX: forward ? centerX - travelHalfWidth : centerX + travelHalfWidth,
      startY: centerLaneY,
      endX: forward ? centerX + travelHalfWidth : centerX - travelHalfWidth,
      endY: centerLaneY,
    };
  }

  function squaredDistanceToSegment(point, start, end) {
    validatePoint(point, "BAD_COLLISION_POINT");
    validatePoint(start, "BAD_COLLISION_SEGMENT");
    validatePoint(end, "BAD_COLLISION_SEGMENT");
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared <= 0) {
      const px = point.x - start.x;
      const py = point.y - start.y;
      return px * px + py * py;
    }
    const numerator = (point.x - start.x) * dx + (point.y - start.y) * dy;
    const progress = clamp(numerator / lengthSquared, 0, 1);
    const nearestX = start.x + dx * progress;
    const nearestY = start.y + dy * progress;
    const px = point.x - nearestX;
    const py = point.y - nearestY;
    return px * px + py * py;
  }

  function sweptCircleIntersects(point, start, end, combinedRadius) {
    safeInteger(combinedRadius, "BAD_COLLISION_RADIUS");
    invariant(combinedRadius > 0, "BAD_COLLISION_RADIUS");
    return squaredDistanceToSegment(point, start, end) <= combinedRadius * combinedRadius;
  }

  function armedChargeSegment(options) {
    invariant(options && typeof options === "object", "BAD_CHARGE_SEGMENT");
    validatePoint(options.start, "BAD_CHARGE_SEGMENT");
    validatePoint(options.end, "BAD_CHARGE_SEGMENT");
    validatePoint(options.player, "BAD_PLAYER_POINT");
    const previousTravel = safeInteger(options.previousTravel, "BAD_CHARGE_TRAVEL");
    const playerRadius = safeInteger(options.playerRadius, "BAD_PLAYER_RADIUS");
    const bossRadius = safeInteger(options.bossRadius, "BAD_BOSS_RADIUS");
    invariant(previousTravel >= 0 && playerRadius > 0 && bossRadius > 0, "BAD_CHARGE_SEGMENT");
    const dx = options.end.x - options.start.x;
    const dy = options.end.y - options.start.y;
    const frameTravel = Math.round(Math.hypot(dx, dy));
    const totalTravel = previousTravel + frameTravel;
    if (frameTravel <= 0 || totalTravel < RULES.chargeArmDistance) {
      return { armed: false, hit: false, frameTravel, totalTravel, start: { ...options.end } };
    }
    const remainingToArm = Math.max(0, RULES.chargeArmDistance - previousTravel);
    const armedStart = {
      x: options.start.x + roundRatio(dx * remainingToArm, frameTravel),
      y: options.start.y + roundRatio(dy * remainingToArm, frameTravel),
    };
    return {
      armed: true,
      hit: sweptCircleIntersects(options.player, armedStart, options.end, playerRadius + bossRadius),
      frameTravel,
      totalTravel,
      start: armedStart,
    };
  }

  function sweepIntersects(options) {
    invariant(options && typeof options === "object", "BAD_SWEEP");
    validatePoint(options.boss, "BAD_BOSS_POINT");
    validatePoint(options.player, "BAD_PLAYER_POINT");
    const playerRadius = safeInteger(options.playerRadius, "BAD_PLAYER_RADIUS");
    invariant(playerRadius > 0 && Number.isFinite(options.facingRadians), "BAD_SWEEP");
    const dx = options.player.x - options.boss.x;
    const dy = options.player.y - options.boss.y;
    const distance = Math.hypot(dx, dy);
    if (distance > RULES.sweepReach + playerRadius) return false;
    if (distance <= playerRadius) return true;
    const bodyPadding = Math.asin(clamp(playerRadius / distance, 0, 1));
    const playerAngle = Math.atan2(dy, dx);
    let difference = playerAngle - options.facingRadians;
    while (difference > Math.PI) difference -= Math.PI * 2;
    while (difference < -Math.PI) difference += Math.PI * 2;
    return Math.abs(difference) <= RULES.sweepHalfAngleRadians + bodyPadding;
  }

  return Object.freeze({
    VERSION,
    TICK_RATE,
    COORDINATE_SCALE,
    RULES,
    WHEEL_DIRECTIONS,
    FINAL_WHEEL_SHOT_TICKS,
    finalWheelShotTicks,
    wheelDirection,
    occupiedLane,
    laneGeometry,
    squaredDistanceToSegment,
    sweptCircleIntersects,
    armedChargeSegment,
    sweepIntersects,
  });
});
