(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodForestBalance = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_HISTORY_TIER = 5;
  const MAX_ACTIVE_TIER = 3;
  const UNAVAILABLE_COPY = "Unavailable until a future patch.";

  const PRESTIGE = Object.freeze([
    Object.freeze({ tier: 0, name: "Standard Hunt", modifier: "Standard Hunt. No Prestige modifiers.", hp: 1, damage: 1, speed: 1, gold: 1, available: true }),
    Object.freeze({ tier: 1, name: "Reduced Choices", modifier: "Run Upgrade offers contain one fewer choice.", hp: 1.30, damage: 1.25, speed: 1.08, gold: 1.20, available: true }),
    Object.freeze({ tier: 2, name: "Lethal Bosses", modifier: "Bosses deal 50% more damage.", hp: 1.49, damage: 1.41, speed: 1.13, gold: 1.40, available: true }),
    Object.freeze({ tier: 3, name: "More Enemies", modifier: "25% more enemies per stage, and non-boss enemies deal 25% more damage.", hp: 1.71, damage: 1.58, speed: 1.19, gold: 1.65, available: true }),
    Object.freeze({ tier: 4, name: "Unavailable", modifier: UNAVAILABLE_COPY, hp: 1.96, damage: 1.78, speed: 1.24, gold: 1.75, available: false }),
    Object.freeze({ tier: 5, name: "Unavailable", modifier: UNAVAILABLE_COPY, hp: 2.25, damage: 2, speed: 1.30, gold: 1.85, available: false }),
  ]);

  const P0_COUNTS = Object.freeze({
    1: 6, 2: 7, 3: 8, 4: 9,
    6: 10, 7: 11, 8: 12, 9: 12,
    11: 13, 12: 15, 13: 16, 14: 20,
  });
  const P0_PULSES = Object.freeze({
    1: Object.freeze([3, 3]), 2: Object.freeze([4, 3]), 3: Object.freeze([4, 4]), 4: Object.freeze([4, 5]),
    6: Object.freeze([4, 3, 3]), 7: Object.freeze([4, 4, 3]), 8: Object.freeze([4, 4, 4]), 9: Object.freeze([4, 4, 4]),
    11: Object.freeze([4, 4, 5]), 12: Object.freeze([3, 4, 4, 4]),
    13: Object.freeze([4, 4, 4, 4]), 14: Object.freeze([4, 4, 4, 4, 4]),
  });
  const P3_COUNTS = Object.freeze({
    1: 8, 2: 9, 3: 10, 4: 11,
    6: 12, 7: 14, 8: 15, 9: 15,
    11: 16, 12: 19, 13: 20, 14: 25,
  });
  const P3_PULSES = Object.freeze({
    1: Object.freeze([3, 3, 2]), 2: Object.freeze([3, 3, 3]), 3: Object.freeze([4, 3, 3]), 4: Object.freeze([4, 4, 3]),
    6: Object.freeze([4, 4, 4]), 7: Object.freeze([4, 4, 3, 3]), 8: Object.freeze([4, 4, 4, 3]), 9: Object.freeze([4, 4, 4, 3]),
    11: Object.freeze([4, 4, 4, 4]), 12: Object.freeze([3, 4, 4, 4, 4]),
    13: Object.freeze([4, 4, 4, 4, 4]), 14: Object.freeze([5, 5, 5, 5, 5]),
  });
  const P0_HP_MULTIPLIERS = Object.freeze({
    // The table is derived from the target stage duration, not eyeballed:
    // tools/balance/derive-hp.cjs. The previous values ran from 1.20 to 6.50,
    // and that was triple counting. A stage's HP pool grows on its own even
    // without the table: the hpPerRoom increment gives a 3.6x rise, and the
    // enemy count another 3.3x. The table piled its own 5.4x on top, so the
    // pool grew 108x while the player's damage grew only 3.4x. Stage fifteen
    // took nearly three minutes of pure shooting, the whole run sixteen.
    //
    // Now the table is almost flat: its job is not to ramp difficulty up but
    // to correct the shape of the curve that the enemies and their count set.
    1: 2.40, 2: 2.30, 3: 2.20, 4: 2.10,
    6: 1.90, 7: 1.85, 8: 1.85, 9: 1.90,
    11: 2.00, 12: 2.00, 13: 2.00, 14: 1.95,
  });
  const SCORE_NORMALIZATION = Object.freeze({
    1: 0.985450, 2: 0.971594, 3: 0.973748, 4: 0.998266,
    6: 0.988225, 7: 0.900417, 8: 0.957769, 9: 1.007102,
    11: 1.012757, 12: 0.848236, 13: 0.817878, 14: 0.673292,
  });

  function normalizeHistoryTier(value) {
    return Math.max(0, Math.min(MAX_HISTORY_TIER, Math.floor(Number(value) || 0)));
  }

  function normalizeActiveTier(value) {
    return Math.max(0, Math.min(MAX_ACTIVE_TIER, normalizeHistoryTier(value)));
  }

  function prestige(tier = 0) {
    return PRESTIGE[normalizeHistoryTier(tier)] || PRESTIGE[0];
  }

  function isAvailable(tier) {
    return prestige(tier).available === true;
  }

  function stageCount(stage, tier = 0) {
    const table = normalizeActiveTier(tier) >= 3 ? P3_COUNTS : P0_COUNTS;
    const room = Math.floor(Number(stage) || 0);
    if (room < ENDLESS_FROM) return Number(table[room] || 0);
    if (isEndlessBossStage(room)) return 0;
    /* The enemy count keeps growing past the threshold, but it runs into a
       ceiling: the arena is not made of rubber, and the scheduler keeps no
       more than eight of them on it at once anyway. What should keep growing
       is health, not the crowd — otherwise the stage turns into a queue at
       the slaughterhouse. */
    const last = Number(table[14] || 20);
    return Math.min(28, Math.round(last + (room - 14) * 0.6));
  }

  function pulseSizes(stage, tier = 0) {
    const table = normalizeActiveTier(tier) >= 3 ? P3_PULSES : P0_PULSES;
    const room = Math.floor(Number(stage) || 0);
    if (room < ENDLESS_FROM) return table[room] || Object.freeze([]);
    if (isEndlessBossStage(room)) return Object.freeze([]);
    // Past the threshold the waves come four at a time, as on stage fourteen:
    // as many waves as it takes to release everyone.
    const total = stageCount(room, tier);
    const pulses = [];
    let left = total;
    while (left > 0) {
      pulses.push(Math.min(4, left));
      left -= 4;
    }
    return Object.freeze(pulses);
  }

  /* The threshold past which endless mode begins. Fifteen stages is the run
     as shipped; everything beyond that exists for the sake of the record. */
  const ENDLESS_FROM = 16;

  /* The difficulty step past the threshold.

     Within the fifteen stages the curve is set by a table derived from the
     target stage duration. Past the threshold there is no table and there can
     be none, so the curve continues geometrically: each stage is 12% heavier
     than the one before it.

     The twelve percent was not picked at random. The player's damage over a
     run grows roughly three and a half times across fifteen stages, that is
     about 9% per stage, and nearly all of that growth lands in the first
     half: towards the end of a run the cards give less and less. A step
     slightly above those nine percent means that past the threshold the
     player starts falling behind — slowly, but inevitably. The run ends not
     against a wall, but by the stages getting longer and longer until one of
     them turns out to be longer than the player can hold out. */
  const ENDLESS_STEP = 1.12;

  function endlessFactor(stage) {
    return Math.pow(ENDLESS_STEP, stage - ENDLESS_FROM + 1);
  }

  function ordinaryHpMultiplier(stage) {
    const room = Math.floor(Number(stage) || 0);
    if (room < ENDLESS_FROM) return Number(P0_HP_MULTIPLIERS[room] || 1);
    // Past the threshold we count from the last tabulated stage, not from
    // one: otherwise stage sixteen would come out easier than stage fourteen.
    return Number(P0_HP_MULTIPLIERS[14]) * endlessFactor(room);
  }

  /* A boss every five stages, past the threshold as well: 20, 25, 30 and on.
     The rhythm of a run should not change just because the count has gone
     past fifteen. */
  function isEndlessBossStage(stage) {
    const room = Math.floor(Number(stage) || 0);
    return room >= ENDLESS_FROM && room % 5 === 0;
  }

  function scoreNormalization(stage) {
    return Number(SCORE_NORMALIZATION[Math.floor(Number(stage) || 0)] || 1);
  }

  function roomTempoDifficulty(stage) {
    const r = Math.max(0, Math.floor(Number(stage) || 1) - 1);
    return 1 + r * 0.04 + r * r * 0.004;
  }

  function roomDamageDifficulty(stage) {
    const r = Math.max(0, Math.floor(Number(stage) || 1) - 1);
    return 1 + r * 0.05 + r * r * 0.006;
  }

  function outgoingDamageMultiplier(tier, bossAuthored) {
    const normalized = normalizeActiveTier(tier);
    const base = prestige(normalized).damage;
    if (bossAuthored && normalized >= 2) return base * 1.5;
    if (!bossAuthored && normalized >= 3) return base * 1.25;
    return base;
  }

  function ordinaryOfferSize(tier) {
    return normalizeActiveTier(tier) >= 1 ? 2 : 3;
  }

  function projectedCapOccupancy(living, unsplitOozes = 0) {
    return Math.max(0, Number(living) || 0) + Math.max(0, Number(unsplitOozes) || 0);
  }

  function laneChargeFrontIntersects({
    vertical,
    lane,
    startX,
    startY,
    endX,
    endY,
    bossRadius,
    playerX,
    playerY,
    playerRadius,
  }) {
    const bodyPadding = Math.max(0, Number(bossRadius) || 0) + Math.max(0, Number(playerRadius) || 0);
    if (vertical) {
      if (playerX < lane.x - playerRadius || playerX > lane.x + lane.width + playerRadius) return false;
      return playerY >= Math.min(startY, endY) - bodyPadding
        && playerY <= Math.max(startY, endY) + bodyPadding;
    }
    if (playerY < lane.y - playerRadius || playerY > lane.y + lane.height + playerRadius) return false;
    return playerX >= Math.min(startX, endX) - bodyPadding
      && playerX <= Math.max(startX, endX) + bodyPadding;
  }

  function forecastPosition(position, velocity, warningDuration) {
    const duration = Math.max(0, Number(warningDuration) || 0);
    return Object.freeze({
      x: (Number(position?.x) || 0) + (Number(velocity?.x) || 0) * duration,
      y: (Number(position?.y) || 0) + (Number(velocity?.y) || 0) * duration,
    });
  }

  function timberfallRouteBudget(moveSpeed, warningDuration, exitAllowance = 0.2) {
    return Math.max(0, Number(moveSpeed) || 0)
      * Math.max(0, (Number(warningDuration) || 0) - Math.max(0, Number(exitAllowance) || 0));
  }

  function schedulerConfig(stage, tier = 0) {
    const room = Math.floor(Number(stage) || 0);
    // Past the threshold the P0_COUNTS entries run out, but the reinforcement
    // scheduler is needed there too: a seasonal run goes beyond stage fifteen
    // and is required to receive a configuration, otherwise the manifest
    // validator fails with MISSING_REINFORCEMENT_AUTHORITY. There used to be
    // an early return of null here — a leftover from the days when only the
    // ordinary game went past the threshold, and that one has its own path.
    // We carry on by the late-stage rules: they already apply from stage
    // eleven and do not change after that.
    if (!P0_COUNTS[room] && room < ENDLESS_FROM) return null;
    if (room < 1) return null;
    const early = room <= 4;
    const late = room >= 11;
    return Object.freeze({
      pulseCount: pulseSizes(room, tier).length,
      ageFloor: early ? 3.5 : late ? 5 : 4.5,
      livingThreshold: early ? 2 : late ? 4 : 3,
      livingCap: (early ? 6 : late ? 8 : 7) + (normalizeActiveTier(tier) >= 1 ? 1 : 0),
      warningDuration: early ? 1.05 : late ? 0.95 : 1,
      zeroLivingWarning: late ? 0.5 : 0.55,
      clearance: early ? 195 : late ? 185 : 190,
      maxLanes: 2,
    });
  }

  return Object.freeze({
    MAX_HISTORY_TIER,
    MAX_ACTIVE_TIER,
    UNAVAILABLE_COPY,
    PRESTIGE,
    P0_COUNTS,
    P0_PULSES,
    P3_COUNTS,
    P3_PULSES,
    P0_HP_MULTIPLIERS,
    SCORE_NORMALIZATION,
    normalizeHistoryTier,
    normalizeActiveTier,
    prestige,
    isAvailable,
    stageCount,
    isEndlessBossStage,
    ENDLESS_FROM,
    pulseSizes,
    ordinaryHpMultiplier,
    scoreNormalization,
    roomTempoDifficulty,
    roomDamageDifficulty,
    outgoingDamageMultiplier,
    ordinaryOfferSize,
    projectedCapOccupancy,
    laneChargeFrontIntersects,
    forecastPosition,
    timberfallRouteBudget,
    schedulerConfig,
  });
});
