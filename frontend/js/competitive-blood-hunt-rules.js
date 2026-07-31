(function (root, factory) {
  const topology = typeof module === "object" && module.exports
    ? require("./blood-hunt")
    : root?.LoothoodBloodHunt;
  const api = factory(topology);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodCompetitiveBloodHuntRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (TOPOLOGY) {
  "use strict";

  if (!TOPOLOGY) throw new Error("Loothood Blood Hunt topology is required.");

  const VERSION = "loothood-competitive-blood-hunt-v1";
  const TICK_RATE = 60;
  const COORDINATE_SCALE = 10;
  const RULES = Object.freeze({
    laneCount: 5,
    escapeLaneCount: 3,
    phaseOneWaveCount: 3,
    scentRecordTicks: 144,
    scentPointDistance: 18 * COORDINATE_SCALE,
    scentLockTicks: 43,
    phaseOnePursuitCount: 4,
    phaseOnePursuitSpacingTicks: 19,
    phaseTwoWaveCount: 7,
    lureRecordTicks: 123,
    phaseTwoPursuitCount: 5,
    phaseTwoPursuitSpacingTicks: 17,
    revealWindowTicks: 240,
    revealDamageBps: 20000,
    missRecoveryTicks: 33,
    shadowRadius: 24 * COORDINATE_SCALE,
    pursuitWarningTicks: 54,
    pursuitRadius: 21 * COORDINATE_SCALE,
    pursuitHalfWidth: 24 * COORDINATE_SCALE,
    pursuitHalfDepth: 22 * COORDINATE_SCALE,
    stakeCount: 4,
    stakeRadius: 18 * COORDINATE_SCALE,
    crossfireLineCount: 6,
    crossfireIntervalTicks: 39,
    crossfireWarningTicks: 39,
    crossfireHalfWidth: 24 * COORDINATE_SCALE,
    crossfireHalfDepth: 23 * COORDINATE_SCALE,
    crossfireSpeedPerSecond: 455 * COORDINATE_SCALE,
    minimumReachableExits: 2,
    chargeWarningTicks: 43,
    chargeSpeedPerSecond: 460 * COORDINATE_SCALE,
    chargeDurationTicks: 132,
    missRecoveryTicksBrute: 39,
    stakeWindowTicks: 180,
    stakeDamageBps: 20000,
  });

  const SHADOW_OFFSETS = Object.freeze([
    Object.freeze([-500, -460]), Object.freeze([0, -580]), Object.freeze([500, -460]),
    Object.freeze([-520, 60]), Object.freeze([520, 60]), Object.freeze([0, 460]),
  ]);
  const STAKE_OFFSETS = Object.freeze([
    Object.freeze([-560, -460]), Object.freeze([560, -460]),
    Object.freeze([-560, 460]), Object.freeze([560, 460]),
  ]);

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

  function pacing(stage, phase, lowHp = false) {
    safeInteger(stage, "BAD_STAGE");
    safeInteger(phase, "BAD_PHASE");
    invariant(stage === 5 || stage === 10 || stage === 15, "BAD_STAGE");
    invariant(phase === 1 || phase === 2, "BAD_PHASE");
    if (phase === 1) {
      return Object.freeze(stage <= 5
        ? { warningTicks: 66, intervalTicks: 72, speedPerSecond: 3800 }
        : { warningTicks: 60, intervalTicks: 66, speedPerSecond: 4000 });
    }
    if (stage <= 5) {
      return Object.freeze(lowHp
        ? { warningTicks: 60, intervalTicks: 53, speedPerSecond: 4200 }
        : { warningTicks: 65, intervalTicks: 58, speedPerSecond: 4000 });
    }
    return Object.freeze(lowHp
      ? { warningTicks: 56, intervalTicks: 49, speedPerSecond: 4350 }
      : { warningTicks: 61, intervalTicks: 54, speedPerSecond: 4150 });
  }

  function playerLane(arena, player, horizontal) {
    validateArena(arena);
    validatePoint(player, "BAD_PLAYER");
    invariant(typeof horizontal === "boolean", "BAD_AXIS");
    const minimum = arena.padding;
    const span = (horizontal ? arena.height : arena.width) - minimum * 2;
    const coordinate = (horizontal ? player.y : player.x) - minimum;
    return clamp(Math.floor(coordinate * RULES.laneCount / span), 0, RULES.laneCount - 1);
  }

  function pressureFronts(options) {
    invariant(options && typeof options === "object", "BAD_PRESSURE_FRONT");
    const { arena, player } = options;
    validateArena(arena);
    validatePoint(player, "BAD_PLAYER");
    const horizontal = Boolean(options.horizontal);
    const reverse = Boolean(options.reverse);
    const pincer = Boolean(options.pincer);
    const variant = safeInteger(options.variant || 0, "BAD_VARIANT");
    const occupied = playerLane(arena, player, horizontal);
    const gaps = TOPOLOGY.escapeLanes({
      playerLane: occupied,
      laneCount: RULES.laneCount,
      escapeCount: RULES.escapeLaneCount,
      variant,
    });
    const pincerGaps = pincer ? TOPOLOGY.pincerEscapeLanes({
      playerLane: occupied,
      laneCount: RULES.laneCount,
      escapeCount: RULES.escapeLaneCount,
      forwardGaps: gaps,
      variant,
    }) : [];
    const minimum = arena.padding;
    const span = (horizontal ? arena.height : arena.width) - minimum * 2;
    const outside = 36 * COORDINATE_SCALE;
    const runs = [];
    const createPath = (lane, backwards) => {
      const cross = minimum + roundRatio((lane * 2 + 1) * span, RULES.laneCount * 2);
      const forward = backwards ? -1 : 1;
      if (horizontal) {
        return forward > 0
          ? [{ x: minimum - outside, y: cross }, { x: arena.width - minimum + outside, y: cross }]
          : [{ x: arena.width - minimum + outside, y: cross }, { x: minimum - outside, y: cross }];
      }
      return forward > 0
        ? [{ x: cross, y: minimum - outside }, { x: cross, y: arena.height - minimum + outside }]
        : [{ x: cross, y: arena.height - minimum + outside }, { x: cross, y: minimum - outside }];
    };
    for (let lane = 0; lane < RULES.laneCount; lane += 1) {
      if (!gaps.includes(lane)) runs.push(Object.freeze({ lane, side: "forward", points: Object.freeze(createPath(lane, reverse)) }));
      if (pincer && !pincerGaps.includes(lane)) {
        runs.push(Object.freeze({ lane, side: "pincer", delayTicks: 42, points: Object.freeze(createPath(lane, !reverse)) }));
      }
    }
    return Object.freeze({
      horizontal,
      occupiedLane: occupied,
      escapeLanes: Object.freeze([...gaps]),
      pincerEscapeLanes: Object.freeze([...pincerGaps]),
      runs: Object.freeze(runs),
    });
  }

  function createTrail(ownerBossId, player, durationTicks) {
    safeInteger(ownerBossId, "BAD_BOSS_ID");
    validatePoint(player, "BAD_PLAYER");
    safeInteger(durationTicks, "BAD_TRAIL_DURATION");
    invariant(ownerBossId > 0 && durationTicks > 0, "BAD_TRAIL");
    return {
      ownerBossId,
      active: true,
      locked: false,
      ticksRemaining: durationTicks,
      lockTicksRemaining: 0,
      points: [{ x: player.x, y: player.y }],
    };
  }

  function recordTrailPoint(trail, player) {
    invariant(trail && trail.active && !trail.locked, "TRAIL_NOT_RECORDING");
    validatePoint(player, "BAD_PLAYER");
    const last = trail.points[trail.points.length - 1];
    const dx = player.x - last.x;
    const dy = player.y - last.y;
    if (dx * dx + dy * dy < RULES.scentPointDistance ** 2) return false;
    trail.points.push({ x: player.x, y: player.y });
    return true;
  }

  function lockTrail(trail, player) {
    invariant(trail && trail.active && !trail.locked, "TRAIL_NOT_RECORDING");
    validatePoint(player, "BAD_PLAYER");
    if (trail.points.length === 1) trail.points.push({ x: player.x + 1, y: player.y });
    trail.active = false;
    trail.locked = true;
    trail.ticksRemaining = 0;
    trail.lockTicksRemaining = RULES.scentLockTicks;
    return trail;
  }

  function polylineLength(points) {
    invariant(Array.isArray(points) && points.length >= 2, "BAD_POLYLINE");
    let length = 0;
    for (let index = 1; index < points.length; index += 1) {
      validatePoint(points[index - 1]);
      validatePoint(points[index]);
      length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
    }
    return Math.round(length);
  }

  function pointAlongPolyline(points, distance) {
    invariant(Array.isArray(points) && points.length >= 2, "BAD_POLYLINE");
    safeInteger(distance, "BAD_POLYLINE_DISTANCE");
    let remaining = Math.max(0, distance);
    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1];
      const to = points[index];
      validatePoint(from);
      validatePoint(to);
      const segmentLength = Math.max(1, Math.round(Math.hypot(to.x - from.x, to.y - from.y)));
      if (remaining <= segmentLength) {
        return Object.freeze({
          x: from.x + roundRatio((to.x - from.x) * remaining, segmentLength),
          y: from.y + roundRatio((to.y - from.y) * remaining, segmentLength),
          directionX: to.x - from.x,
          directionY: to.y - from.y,
          segmentLength,
          segmentIndex: index - 1,
        });
      }
      remaining -= segmentLength;
    }
    const last = points.at(-1);
    const previous = points.at(-2);
    return Object.freeze({
      x: last.x,
      y: last.y,
      directionX: last.x - previous.x,
      directionY: last.y - previous.y,
      segmentLength: Math.max(1, Math.round(Math.hypot(last.x - previous.x, last.y - previous.y))),
      segmentIndex: points.length - 2,
    });
  }

  function frontIntersectsCircle(front, target, targetRadius, halfWidth, halfDepth) {
    invariant(front && typeof front === "object", "BAD_FRONT");
    validatePoint(front, "BAD_FRONT");
    validatePoint(target, "BAD_TARGET");
    for (const [value, code] of [
      [front.directionX, "BAD_FRONT"], [front.directionY, "BAD_FRONT"], [front.segmentLength, "BAD_FRONT"],
      [targetRadius, "BAD_TARGET_RADIUS"], [halfWidth, "BAD_FRONT_SIZE"], [halfDepth, "BAD_FRONT_SIZE"],
    ]) safeInteger(value, code);
    invariant(front.segmentLength > 0 && targetRadius >= 0 && halfWidth > 0 && halfDepth > 0, "BAD_FRONT_SIZE");
    const dx = target.x - front.x;
    const dy = target.y - front.y;
    const along = Math.abs(roundRatio(dx * front.directionX + dy * front.directionY, front.segmentLength));
    const across = Math.abs(roundRatio(dx * -front.directionY + dy * front.directionX, front.segmentLength));
    return along < halfDepth + roundRatio(targetRadius * 3, 4)
      && across < halfWidth + roundRatio(targetRadius * 3, 5);
  }

  function nearestArenaEntry(arena, point) {
    validateArena(arena);
    validatePoint(point);
    const outside = 38 * COORDINATE_SCALE;
    const candidates = [
      { x: arena.padding - outside, y: point.y },
      { x: arena.width - arena.padding + outside, y: point.y },
      { x: point.x, y: arena.padding - outside },
      { x: point.x, y: arena.height - arena.padding + outside },
    ];
    return candidates.reduce((best, candidate) => {
      const distance = (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;
      return !best || distance < best.distance ? { ...candidate, distance } : best;
    }, null);
  }

  function pursuitRuns(options) {
    invariant(options && typeof options === "object", "BAD_PURSUIT");
    validateArena(options.arena);
    const trail = options.trail;
    invariant(trail?.locked && Array.isArray(trail.points) && trail.points.length >= 2, "TRAIL_NOT_LOCKED");
    safeInteger(options.speedPerSecond, "BAD_PURSUIT_SPEED");
    safeInteger(options.count, "BAD_PURSUIT_COUNT");
    safeInteger(options.spacingTicks, "BAD_PURSUIT_SPACING");
    invariant(options.speedPerSecond > 0 && options.count > 0 && options.spacingTicks >= 0, "BAD_PURSUIT");
    const entry = nearestArenaEntry(options.arena, trail.points[0]);
    const route = Object.freeze([{ x: entry.x, y: entry.y }, ...trail.points.map((point) => ({ ...point }))]);
    return Object.freeze(Array.from({ length: options.count }, (_, index) => Object.freeze({
      index,
      delayTicks: index * options.spacingTicks,
      warningTicks: RULES.pursuitWarningTicks,
      speedPerSecond: options.speedPerSecond,
      points: route,
      length: polylineLength(route),
    })));
  }

  function shadowPoint(arena, player, bossRadius, cycleIndex) {
    validateArena(arena);
    validatePoint(player, "BAD_PLAYER");
    safeInteger(bossRadius, "BAD_BOSS_RADIUS");
    safeInteger(cycleIndex, "BAD_CYCLE_INDEX");
    invariant(bossRadius > 0 && cycleIndex >= 0, "BAD_SHADOW");
    const centerX = roundRatio(arena.width, 2);
    const centerY = roundRatio(arena.height, 2);
    const radiusX = centerX - arena.padding - bossRadius;
    const radiusY = centerY - arena.padding - bossRadius;
    return SHADOW_OFFSETS.map((_, index) => SHADOW_OFFSETS[(index + cycleIndex * 2) % SHADOW_OFFSETS.length])
      .map((offset) => ({
        x: centerX + roundRatio(offset[0] * radiusX, 1000),
        y: centerY + roundRatio(offset[1] * radiusY, 1000),
      }))
      .reduce((best, candidate) => {
        const distance = (candidate.x - player.x) ** 2 + (candidate.y - player.y) ** 2;
        return !best || distance > best.distance ? { ...candidate, distance } : best;
      }, null);
  }

  function stakePoints(arena) {
    validateArena(arena);
    const centerX = roundRatio(arena.width, 2);
    const centerY = roundRatio(arena.height, 2);
    const radiusX = centerX - arena.padding - RULES.stakeRadius;
    const radiusY = centerY - arena.padding - RULES.stakeRadius;
    return Object.freeze(STAKE_OFFSETS.map((offset, index) => Object.freeze({
      id: index + 1,
      x: centerX + roundRatio(offset[0] * radiusX, 1000),
      y: centerY + roundRatio(offset[1] * radiusY, 1000),
      radius: RULES.stakeRadius,
      active: true,
    })));
  }

  function crossfireLinePoints(arena, lineIndex, cross) {
    validateArena(arena);
    safeInteger(lineIndex, "BAD_LINE_INDEX");
    safeInteger(cross, "BAD_CROSS_COORDINATE");
    invariant(lineIndex >= 0, "BAD_LINE_INDEX");
    const vertical = lineIndex % 2 === 0;
    const reverse = Math.floor(lineIndex / 2) % 2 === 1;
    const outside = 38 * COORDINATE_SCALE;
    const points = vertical
      ? reverse
        ? [{ x: cross, y: arena.height - arena.padding + outside }, { x: cross, y: arena.padding - outside }]
        : [{ x: cross, y: arena.padding - outside }, { x: cross, y: arena.height - arena.padding + outside }]
      : reverse
        ? [{ x: arena.width - arena.padding + outside, y: cross }, { x: arena.padding - outside, y: cross }]
        : [{ x: arena.padding - outside, y: cross }, { x: arena.width - arena.padding + outside, y: cross }];
    return Object.freeze({
      lineIndex,
      vertical,
      reverse,
      cross,
      halfWidth: RULES.crossfireHalfWidth,
      points: Object.freeze(points),
    });
  }

  function reachableExitCount(options) {
    invariant(options && typeof options === "object", "BAD_CROSSFIRE");
    const { arena, player, boss } = options;
    validateArena(arena);
    validatePoint(player, "BAD_PLAYER");
    validatePoint(boss, "BAD_BOSS");
    const playerRadius = safeInteger(options.playerRadius, "BAD_PLAYER_RADIUS");
    const bossRadius = safeInteger(options.bossRadius, "BAD_BOSS_RADIUS");
    invariant(playerRadius > 0 && bossRadius > 0, "BAD_CROSSFIRE");
    const lines = [...(options.lines || [])];
    invariant(lines.every((line) => Array.isArray(line.points) && line.points.length >= 2), "BAD_CROSSFIRE_LINES");
    const centerX = roundRatio(arena.width, 2);
    const centerY = roundRatio(arena.height, 2);
    const radiusX = centerX - arena.padding - playerRadius;
    const radiusY = centerY - arena.padding - playerRadius;
    const nodes = [];
    for (let row = 0; row < 7; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        const nx = column * 250 - 1000;
        const ny = row * 333 - 999;
        if (nx * nx + ny * ny > 920000) continue;
        const point = {
          x: centerX + roundRatio(nx * radiusX, 1000),
          y: centerY + roundRatio(ny * radiusY, 1000),
          row,
          column,
        };
        if ((point.x - boss.x) ** 2 + (point.y - boss.y) ** 2 <= (bossRadius + playerRadius + 120) ** 2) continue;
        if (lines.some((line) => squaredDistanceToSegment(point, line.points[0], line.points.at(-1))
          <= (line.halfWidth + playerRadius + 50) ** 2)) continue;
        nodes.push(point);
      }
    }
    if (!nodes.length) return 0;
    const start = nodes.reduce((best, point) => {
      const distance = (point.x - player.x) ** 2 + (point.y - player.y) ** 2;
      return !best || distance < best.distance ? { ...point, distance } : best;
    }, null);
    const queue = [start];
    const reached = new Set([`${start.row}:${start.column}`]);
    while (queue.length) {
      const current = queue.shift();
      for (const next of nodes) {
        const key = `${next.row}:${next.column}`;
        if (reached.has(key)) continue;
        if (Math.abs(next.row - current.row) > 1 || Math.abs(next.column - current.column) > 1) continue;
        reached.add(key);
        queue.push(next);
      }
    }
    const exits = new Set();
    for (const point of nodes) {
      if (!reached.has(`${point.row}:${point.column}`)) continue;
      if (point.column <= 1) exits.add("left");
      if (point.column >= 7) exits.add("right");
      if (point.row <= 1) exits.add("top");
      if (point.row >= 5) exits.add("bottom");
    }
    return exits.size;
  }

  function selectCrossfireLine(options) {
    invariant(options && typeof options === "object", "BAD_CROSSFIRE");
    const { arena, player, boss } = options;
    validateArena(arena);
    validatePoint(player, "BAD_PLAYER");
    validatePoint(boss, "BAD_BOSS");
    const lineIndex = safeInteger(options.lineIndex, "BAD_LINE_INDEX");
    invariant(lineIndex >= 0, "BAD_LINE_INDEX");
    const vertical = lineIndex % 2 === 0;
    const minimum = arena.padding + 28 * COORDINATE_SCALE;
    const maximum = (vertical ? arena.width : arena.height) - arena.padding - 28 * COORDINATE_SCALE;
    const coordinate = vertical ? player.x : player.y;
    const span = maximum - minimum;
    const candidates = [coordinate, minimum + roundRatio(span * 18, 100), minimum + roundRatio(span * 38, 100),
      minimum + roundRatio(span * 62, 100), minimum + roundRatio(span * 82, 100)]
      .map((value) => clamp(value, minimum, maximum));
    const working = [...(options.activeLines || [])].filter((line) => line.active !== false);
    const collapsedIds = [];
    while (true) {
      const ranked = candidates.map((cross) => crossfireLinePoints(arena, lineIndex, cross))
        .map((line) => ({
          line,
          routes: reachableExitCount({
            arena,
            player,
            playerRadius: options.playerRadius,
            boss,
            bossRadius: options.bossRadius,
            lines: [...working, line],
          }),
        }))
        .sort((left, right) => right.routes - left.routes
          || Math.abs(left.line.cross - coordinate) - Math.abs(right.line.cross - coordinate)
          || left.line.cross - right.line.cross);
      const selected = ranked[0];
      if (selected && selected.routes >= RULES.minimumReachableExits) {
        return Object.freeze({
          skipped: false,
          reachableExits: selected.routes,
          collapsedIds: Object.freeze([...collapsedIds]),
          line: selected.line,
        });
      }
      if (!working.length) {
        return Object.freeze({
          skipped: true,
          reachableExits: selected?.routes || 0,
          collapsedIds: Object.freeze([...collapsedIds]),
          line: null,
        });
      }
      const oldest = working.shift();
      collapsedIds.push(oldest.id ?? oldest.lineIndex);
    }
  }

  function squaredDistanceToSegment(point, from, to) {
    validatePoint(point);
    validatePoint(from);
    validatePoint(to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return (point.x - from.x) ** 2 + (point.y - from.y) ** 2;
    const projection = clamp(((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared, 0, 1);
    const nearestX = from.x + dx * projection;
    const nearestY = from.y + dy * projection;
    return (point.x - nearestX) ** 2 + (point.y - nearestY) ** 2;
  }

  function sweptStakeHit(stakes, from, to, bossRadius) {
    invariant(Array.isArray(stakes), "BAD_STAKES");
    validatePoint(from);
    validatePoint(to);
    safeInteger(bossRadius, "BAD_BOSS_RADIUS");
    invariant(bossRadius > 0, "BAD_BOSS_RADIUS");
    return stakes.find((stake) => {
      validatePoint(stake, "BAD_STAKE");
      const radius = safeInteger(stake.radius, "BAD_STAKE");
      return stake.active && squaredDistanceToSegment(stake, from, to) <= (radius + roundRatio(bossRadius * 7, 10)) ** 2;
    }) || null;
  }

  return Object.freeze({
    VERSION,
    TICK_RATE,
    COORDINATE_SCALE,
    RULES,
    SHADOW_OFFSETS,
    STAKE_OFFSETS,
    TOPOLOGY,
    pacing,
    playerLane,
    pressureFronts,
    createTrail,
    recordTrailPoint,
    lockTrail,
    polylineLength,
    pointAlongPolyline,
    frontIntersectsCircle,
    nearestArenaEntry,
    pursuitRuns,
    shadowPoint,
    stakePoints,
    crossfireLinePoints,
    reachableExitCount,
    selectCrossfireLine,
    squaredDistanceToSegment,
    sweptStakeHit,
  });
});
