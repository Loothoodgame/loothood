(function (root, factory) {
  const bossBalance = typeof module === "object" && module.exports
    ? require("./boss-balance")
    : root?.LoothoodBossBalance;
  const api = factory(bossBalance);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodCompetitiveDeepRootRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (BOSS_BALANCE) {
  "use strict";

  if (!BOSS_BALANCE) throw new Error("Loothood boss-balance rules are required.");

  const VERSION = "loothood-competitive-deep-root-v1";
  const TICK_RATE = 60;
  const COORDINATE_SCALE = 10;
  const RULES = Object.freeze({
    heartCount: 3,
    heartScore: 90,
    heartRespiteTicks: 45,
    wardenFadeTicks: 81,
    wardenReturnTicks: 99,
    stripCount: 9,
    safeStripCount: 3,
    routeMarginTicks: 24,
    clockStrikeTicks: 8,
    rootStrikeTicks: 10,
    ringStrikeTicks: 9,
    wardenClockSectors: 8,
    heartClockSectors: 6,
    bruteClockSectors: 10,
    wardenMarchWaves: 4,
    heartMarchWaves: 2,
    bruteMarchWaves: 5,
    wardenRingPulses: 5,
    heartRingPulses: 4,
    ringRadiusStep: 46 * COORDINATE_SCALE,
    ringMinimumRadius: 56 * COORDINATE_SCALE,
    ringHalfWidth: 44 * COORDINATE_SCALE,
    ringGapHalfAngle: 0.48,
    ringGapStep: 0.72,
  });

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

  function validatePoint(point, code = "BAD_POINT") {
    invariant(point && typeof point === "object", code);
    safeInteger(point.x, code);
    safeInteger(point.y, code);
  }

  function validateArena(arena) {
    invariant(arena && typeof arena === "object", "BAD_ARENA");
    safeInteger(arena.width, "BAD_ARENA");
    safeInteger(arena.height, "BAD_ARENA");
    safeInteger(arena.padding, "BAD_ARENA");
    invariant(arena.width > arena.padding * 2 && arena.height > arena.padding * 2 && arena.padding >= 0, "BAD_ARENA");
  }

  function clockWarningTicks(kind, step) {
    safeInteger(step, "BAD_CLOCK_STEP");
    invariant(step >= 0 && ["warden", "heart", "brute"].includes(kind), "BAD_CLOCK_KIND");
    if (kind === "warden") return Math.max(27, Math.round(36 - step * 0.6));
    return Math.max(20, Math.round(28.8 - step * 0.72));
  }

  function clockSector(options) {
    invariant(options && typeof options === "object", "BAD_CLOCK");
    validatePoint(options.origin, "BAD_CLOCK_ORIGIN");
    const count = safeInteger(options.count, "BAD_CLOCK_COUNT");
    const step = safeInteger(options.step, "BAD_CLOCK_STEP");
    const direction = safeInteger(options.direction, "BAD_CLOCK_DIRECTION");
    invariant(count > 0 && step >= 0 && step < count && (direction === 1 || direction === -1), "BAD_CLOCK");
    invariant(Number.isFinite(options.centerAngle) && Number.isFinite(options.arcSpan) && options.arcSpan > 0, "BAD_CLOCK");
    const start = options.centerAngle - direction * options.arcSpan / 2;
    return Object.freeze({
      angle: start + direction * (step + 0.5) * (options.arcSpan / count),
      halfAngle: Math.PI / count * 0.82,
    });
  }

  function angleDifference(left, right) {
    let difference = left - right;
    while (difference > Math.PI) difference -= Math.PI * 2;
    while (difference < -Math.PI) difference += Math.PI * 2;
    return difference;
  }

  function sectorHitsCircle(options) {
    invariant(options && typeof options === "object", "BAD_SECTOR_HIT");
    validatePoint(options.origin, "BAD_CLOCK_ORIGIN");
    validatePoint(options.target, "BAD_TARGET");
    const targetRadius = safeInteger(options.targetRadius, "BAD_TARGET_RADIUS");
    invariant(targetRadius >= 0 && Number.isFinite(options.angle) && Number.isFinite(options.halfAngle), "BAD_SECTOR_HIT");
    const dx = options.target.x - options.origin.x;
    const dy = options.target.y - options.origin.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= targetRadius) return true;
    const padding = Math.asin(clamp(targetRadius / distance, 0, 1));
    return Math.abs(angleDifference(Math.atan2(dy, dx), options.angle)) < options.halfAngle + padding;
  }

  function stripAtPoint(arena, point, vertical) {
    validateArena(arena);
    validatePoint(point);
    invariant(typeof vertical === "boolean", "BAD_STRIP_AXIS");
    const coordinate = vertical ? point.x : point.y;
    const minimum = arena.padding;
    const span = (vertical ? arena.width : arena.height) - minimum * 2;
    return clamp(Math.floor((coordinate - minimum) * RULES.stripCount / span), 0, RULES.stripCount - 1);
  }

  function stripGeometry(arena, strip, vertical) {
    validateArena(arena);
    safeInteger(strip, "BAD_STRIP");
    invariant(strip >= 0 && strip < RULES.stripCount && typeof vertical === "boolean", "BAD_STRIP");
    const span = (vertical ? arena.width : arena.height) - arena.padding * 2;
    const start = arena.padding + roundRatio(strip * span, RULES.stripCount);
    const end = arena.padding + roundRatio((strip + 1) * span, RULES.stripCount);
    return vertical
      ? Object.freeze({ x: start, y: arena.padding, width: end - start, height: arena.height - arena.padding * 2 })
      : Object.freeze({ x: arena.padding, y: start, width: arena.width - arena.padding * 2, height: end - start });
  }

  function selectSafeStrips(options) {
    invariant(options && typeof options === "object", "BAD_ROOT_MARCH");
    const playerStrip = safeInteger(options.playerStrip, "BAD_PLAYER_STRIP");
    const step = safeInteger(options.step, "BAD_ROOT_STEP");
    invariant(playerStrip >= 0 && playerStrip < RULES.stripCount && step >= 0, "BAD_ROOT_MARCH");
    invariant(Array.isArray(options.routes), "BAD_ROOT_ROUTES");
    const routes = options.routes
      .filter((route) => Number.isSafeInteger(route?.strip) && Number.isSafeInteger(route?.distance) && route.distance >= 0)
      .map((route) => ({ strip: route.strip, distance: route.distance }));
    const preferred = BOSS_BALANCE.rootSafeStrips(playerStrip, step, RULES.stripCount);
    const selected = BOSS_BALANCE.separatedSafeStrips(
      routes,
      preferred,
      RULES.safeStripCount,
      RULES.stripCount,
      [playerStrip],
    );
    const cancelled = selected.length !== RULES.safeStripCount;
    return Object.freeze({
      cancelled,
      safeStrips: Object.freeze(cancelled
        ? Array.from({ length: RULES.stripCount }, (_, strip) => strip)
        : [...selected]),
      reachableRoutes: selected.length,
      reachableCandidates: routes.length,
      playerStrip,
    });
  }

  function rootMarchWarningTicks(kind, step, farthestRouteDistance, moveUnitsPerTick) {
    safeInteger(step, "BAD_ROOT_STEP");
    safeInteger(farthestRouteDistance, "BAD_ROUTE_DISTANCE");
    safeInteger(moveUnitsPerTick, "BAD_MOVE_SPEED");
    invariant(step >= 0 && farthestRouteDistance >= 0 && moveUnitsPerTick > 0, "BAD_ROOT_WARNING");
    invariant(["warden", "heart", "brute"].includes(kind), "BAD_ROOT_KIND");
    const base = kind === "warden"
      ? Math.max(71, Math.round(84 - step * 3.6))
      : Math.max(62, Math.round(75 - step * 3.6));
    return Math.max(base, Math.ceil(farthestRouteDistance / moveUnitsPerTick) + RULES.routeMarginTicks);
  }

  function ringPulse(options) {
    invariant(options && typeof options === "object", "BAD_RING");
    validateArena(options.arena);
    validatePoint(options.origin, "BAD_RING_ORIGIN");
    const step = safeInteger(options.step, "BAD_RING_STEP");
    const direction = safeInteger(options.direction, "BAD_RING_DIRECTION");
    invariant(step >= 0 && (direction === 1 || direction === -1), "BAD_RING");
    invariant(["warden", "heart"].includes(options.kind) && Number.isFinite(options.gapAngle), "BAD_RING");
    const halfWidth = Math.min(
      options.arena.width / 2 - options.arena.padding,
      options.arena.height / 2 - options.arena.padding,
    );
    const initialRadius = roundRatio(Math.floor(halfWidth) * 92, 100);
    return Object.freeze({
      radius: Math.max(RULES.ringMinimumRadius, initialRadius - step * RULES.ringRadiusStep),
      gapAngle: options.gapAngle + direction * RULES.ringGapStep * step,
      warningTicks: options.kind === "warden" ? (step === 0 ? 47 : 42) : (step === 0 ? 40 : 35),
    });
  }

  function ringHitsCircle(options) {
    invariant(options && typeof options === "object", "BAD_RING_HIT");
    validatePoint(options.origin, "BAD_RING_ORIGIN");
    validatePoint(options.target, "BAD_TARGET");
    for (const [value, code] of [[options.radius, "BAD_RING_RADIUS"], [options.targetRadius, "BAD_TARGET_RADIUS"]]) {
      safeInteger(value, code);
    }
    invariant(options.radius > 0 && options.targetRadius >= 0 && Number.isFinite(options.gapAngle), "BAD_RING_HIT");
    const dx = options.target.x - options.origin.x;
    const dy = options.target.y - options.origin.y;
    const distance = Math.hypot(dx, dy);
    const outsideGap = Math.abs(angleDifference(Math.atan2(dy, dx), options.gapAngle)) > RULES.ringGapHalfAngle;
    return outsideGap && Math.abs(distance - options.radius) < RULES.ringHalfWidth + options.targetRadius;
  }

  return Object.freeze({
    VERSION,
    TICK_RATE,
    COORDINATE_SCALE,
    RULES,
    BOSS_BALANCE,
    clockWarningTicks,
    clockSector,
    sectorHitsCircle,
    stripAtPoint,
    stripGeometry,
    selectSafeStrips,
    rootMarchWarningTicks,
    ringPulse,
    ringHitsCircle,
  });
});
