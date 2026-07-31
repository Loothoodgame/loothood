(function (root, factory) {
  const buildRules = typeof module === "object" && module.exports
    ? require("./competitive-build-rules")
    : root?.LoothoodCompetitiveBuildRules;
  const runRelics = typeof module === "object" && module.exports
    ? require("./run-relics")
    : root?.LoothoodRunRelics;
  const huntersKnotRules = typeof module === "object" && module.exports
    ? require("./competitive-hunters-knot-rules")
    : root?.LoothoodCompetitiveHuntersKnotRules;
  const ironOathRules = typeof module === "object" && module.exports
    ? require("./competitive-iron-oath-rules")
    : root?.LoothoodCompetitiveIronOathRules;
  const bloodHuntRules = typeof module === "object" && module.exports
    ? require("./competitive-blood-hunt-rules")
    : root?.LoothoodCompetitiveBloodHuntRules;
  const deepRootRules = typeof module === "object" && module.exports
    ? require("./competitive-deep-root-rules")
    : root?.LoothoodCompetitiveDeepRootRules;
  const phaseThreeRules = typeof module === "object" && module.exports
    ? require("./competitive-phase-three-rules")
    : root?.LoothoodCompetitivePhaseThreeRules;
  const forestBalance = typeof module === "object" && module.exports
    ? require("./forest-balance")
    : root?.LoothoodForestBalance;
  const api = factory(buildRules, runRelics, huntersKnotRules, ironOathRules, bloodHuntRules, deepRootRules, phaseThreeRules, forestBalance);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodCompetitiveRunCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (BUILD_RULES, RUN_RELICS, HUNTERS_KNOT, IRON_OATH, BLOOD_HUNT, DEEP_ROOT, PHASE_THREE, FOREST_BALANCE) {
  "use strict";

  if (!BUILD_RULES) throw new Error("Loothood competitive build rules are required.");
  if (!RUN_RELICS) throw new Error("Loothood run relic rules are required.");
  if (!HUNTERS_KNOT) throw new Error("Loothood competitive Hunter's Knot rules are required.");
  if (!IRON_OATH) throw new Error("Loothood competitive Iron Oath rules are required.");
  if (!BLOOD_HUNT) throw new Error("Loothood competitive Blood Hunt rules are required.");
  if (!DEEP_ROOT) throw new Error("Loothood competitive Deep Root rules are required.");
  if (!PHASE_THREE) throw new Error("Loothood competitive Phase 3 rules are required.");
  if (!FOREST_BALANCE) throw new Error("Loothood Forest balance authority is required.");

  // Authoritative competitive state only. This module must remain independent
  // from the DOM, rendering, audio, wall clocks, persistence and unseeded RNG.
  const CORE_VERSION = "loothood-competitive-run-v1.0-endless";
  const RULESET_ID = "loothood-s1-endless-v1";
  const TICK_RATE = 60;
  const STAGE_COUNT = 15;
  const RUN_TRANSCRIPT_VERSION = "loothood-competitive-run-transcript-v1";
    /* Run time ceiling. Used to be 45 minutes — sized for a run of exactly
     fifteen stages. Endless mode needs headroom, but not unlimited headroom:
     without a ceiling the season is won by whoever is willing to sit there for
     six hours straight, and that is not the competition we want to run. An
     hour makes it a "how deep can you get in an hour" record, runs stay
     comparable, and the server-side replay takes ~0.8 seconds (measured: 3.7
     microseconds per tick). */
  const MAX_RUN_TICKS = TICK_RATE * 60 * 60;
  const MAX_STAGE_TICKS = TICK_RATE * 60 * 10;
  const INPUT_AXIS_LIMIT = 1000;
  const ORDINARY_STAGES = Object.freeze([1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14]);
  const BOSS_STAGES = Object.freeze([5, 10, 15]);
  const LEADERBOARD_MIN_CLEARED_STAGE = 10;
  const BOSS_SEED_IDS = Object.freeze(["ironOath", "deepRoot", "huntersKnot", "bloodHunt"]);
  const BOSS_AUTHORITY_RULES = Object.freeze({
    finalArmorModuleMinimumTicks: 255,
    finalArmorSplitBps: 5000,
    finalArmorLockHundredths: 100,
    phaseThreeOpeningTicks: PHASE_THREE.RULES.openingRitualTicks,
    phaseThreeOpeningLaneIntervalTicks: PHASE_THREE.RULES.openingLaneIntervalTicks,
    timberfallGridColumns: PHASE_THREE.RULES.timberfallGridColumns,
    timberfallGridRows: PHASE_THREE.RULES.timberfallGridRows,
    timberfallDangerCells: PHASE_THREE.RULES.timberfallDangerCells,
    timberfallSafeCells: PHASE_THREE.RULES.timberfallSafeCells,
    timberfallWaveIntervalTicks: PHASE_THREE.RULES.timberfallWaveIntervalTicks,
    timberfallWarningTicks: PHASE_THREE.RULES.timberfallWarningTicks,
    timberfallDrainNumerator: PHASE_THREE.RULES.segmentFourDrainNumerator,
    timberfallDrainDenominator: PHASE_THREE.RULES.segmentFourDrainDenominator,
  });

  const SCORE_POLICY = Object.freeze({
    ordinary: Object.freeze({ award: "derived", advancesStreak: true, requiredForClear: true }),
    boss: Object.freeze({ award: "derived", advancesStreak: true, requiredForClear: true }),
    bossSummon: Object.freeze({ award: 0, advancesStreak: false, requiredForClear: false }),
    mandatoryBossObjective: Object.freeze({ award: 90, advancesStreak: false, requiredForClear: true }),
    optionalSprite: Object.freeze({ award: "derived", advancesStreak: true, requiredForClear: false }),
  });

  const FOUNDATION_DEFS = Object.freeze({
    steadyHand: Object.freeze({ arrowDamageBps: 11200, moveSpeedBps: 10000, maximumHpHundredths: 10000 }),
    trailBoots: Object.freeze({ arrowDamageBps: 10000, moveSpeedBps: 10800, maximumHpHundredths: 10000 }),
    toughHide: Object.freeze({ arrowDamageBps: 10000, moveSpeedBps: 10000, maximumHpHundredths: 11500 }),
  });

  const LOADOUT_POLICY = Object.freeze({
    bowId: "ashShortbow",
    prestigeTier: 0,
    equipmentIds: Object.freeze([]),
    allowedFoundationIds: Object.freeze(Object.keys(FOUNDATION_DEFS)),
    requiredFoundationCount: 1,
    upgradeIds: Object.freeze([]),
    relicIds: Object.freeze([]),
    buildingStatsId: "fixed-zero-v1",
  });

  const FIXED_LOADOUT = Object.freeze({
    bowId: "ashShortbow",
    prestigeTier: 0,
    equipmentIds: Object.freeze([]),
    foundationIds: Object.freeze(["steadyHand"]),
    upgradeIds: Object.freeze([]),
    relicIds: Object.freeze([]),
    buildingStatsId: "fixed-zero-v1",
  });

  const STAGE_DEFS = Object.freeze([
    [1, "Greenwood Edge", 24, 6, [["forestGrunt", 70], ["wolfRunner", 20]]],
    [2, "Poacher Trail", 29, 7, [["forestGrunt", 48], ["wolfRunner", 20], ["poacherArcher", 27]]],
    [3, "Wolf Run", 32, 8, [["forestGrunt", 35], ["wolfRunner", 40], ["poacherArcher", 15], ["boarCharger", 12]]],
    [4, "Toll Gate", 36, 9, [["forestGrunt", 26], ["wolfRunner", 18], ["boarCharger", 29], ["shieldGuard", 26], ["poacherArcher", 12]]],
    [5, "Sheriff's Enforcer", 70, 1, [], "sheriffEnforcer"],
    [6, "Bramble Hollow", 38, 10, [["forestGrunt", 22], ["woodlandOoze", 26], ["netTrapper", 22], ["brambleCaster", 24], ["wolfRunner", 15]]],
    [7, "Ooze Copse", 42, 11, [["woodlandOoze", 38], ["wolfRunner", 23], ["netTrapper", 18], ["brambleCaster", 13], ["shieldGuard", 11]]],
    [8, "Trapper's Mire", 46, 12, [["netTrapper", 34], ["poacherArcher", 24], ["boarCharger", 16], ["shieldGuard", 14], ["armoredBrute", 11], ["wolfRunner", 12]]],
    [9, "Captain's Camp", 50, 12, [["bannerCaptain", 12], ["shieldGuard", 20], ["poacherArcher", 20], ["armoredBrute", 15], ["boarCharger", 17], ["netTrapper", 13]]],
    [10, "Bramble Warden", 100, 1, [], "seedMiniboss"],
    [11, "Ironwood Pass", 54, 13, [["armoredBrute", 26], ["shieldGuard", 22], ["boarCharger", 20], ["poacherArcher", 16], ["brambleCaster", 16], ["wolfRunner", 10]]],
    [12, "Outlaw Ambush", 58, 15, [["wolfRunner", 22], ["poacherArcher", 25], ["netTrapper", 20], ["woodlandOoze", 20], ["bannerCaptain", 9], ["armoredBrute", 14]]],
    [13, "Royal Roadblock", 62, 16, [["shieldGuard", 28], ["armoredBrute", 22], ["poacherArcher", 23], ["bannerCaptain", 10], ["boarCharger", 18], ["brambleCaster", 14]]],
    [14, "Sheriff's Gate", 66, 20, [["armoredBrute", 23], ["bannerCaptain", 12], ["brambleCaster", 20], ["netTrapper", 17], ["boarCharger", 20], ["woodlandOoze", 17], ["poacherArcher", 16]]],
    [15, "Sheriff's Clearing", 150, 1, [], "forestBoss"],
  ].map(([number, title, parSeconds, enemyCount, enemyPool, bossType = ""]) => Object.freeze({
    number,
    title,
    parTicks: parSeconds * TICK_RATE,
    enemyCount,
    enemyPool: Object.freeze(enemyPool.map((entry) => Object.freeze([...entry]))),
    bossType,
  })));

  const ENEMY_DEFS = Object.freeze({
    forestGrunt: Object.freeze({ behavior: "chase", hp: 28, hpPerStage: 7, radius: 16, speed: 44, speedPerStage: 4, touchTenths: 60, touchPerStageTenths: 9, scoreBonus: 0 }),
    wolfRunner: Object.freeze({ behavior: "wolf", hp: 20, hpPerStage: 5, radius: 13, speed: 68, speedPerStage: 6, touchTenths: 50, touchPerStageTenths: 8, scoreBonus: 8 }),
    boarCharger: Object.freeze({ behavior: "charger", hp: 42, hpPerStage: 8, radius: 20, speed: 36, speedPerStage: 3, touchTenths: 100, touchPerStageTenths: 14, scoreBonus: 16, chargeSpeed: 235, chargeCooldownTicks: 192 }),
    shieldGuard: Object.freeze({ behavior: "shield", hp: 58, hpPerStage: 8, radius: 20, speed: 34, speedPerStage: 3, touchTenths: 70, touchPerStageTenths: 10, scoreBonus: 18, combatHpBps: 4200, shieldHits: 5 }),
    poacherArcher: Object.freeze({ behavior: "ranged", hp: 26, hpPerStage: 6, radius: 15, speed: 42, speedPerStage: 3, touchTenths: 30, touchPerStageTenths: 5, scoreBonus: 20, range: 245, shotCooldownTicks: 126, projectileSpeed: 215 }),
    netTrapper: Object.freeze({ behavior: "netter", hp: 30, hpPerStage: 6, radius: 16, speed: 40, speedPerStage: 3, touchTenths: 30, touchPerStageTenths: 5, scoreBonus: 18, range: 220, shotCooldownTicks: 180 }),
    brambleCaster: Object.freeze({ behavior: "caster", hp: 34, hpPerStage: 7, radius: 17, speed: 35, speedPerStage: 2, touchTenths: 40, touchPerStageTenths: 6, scoreBonus: 24, range: 235, shotCooldownTicks: 204 }),
    bannerCaptain: Object.freeze({ behavior: "support", hp: 46, hpPerStage: 9, radius: 19, speed: 32, speedPerStage: 2, touchTenths: 50, touchPerStageTenths: 8, scoreBonus: 28, auraRadius: 165 }),
    woodlandOoze: Object.freeze({ behavior: "ooze", hp: 24, hpPerStage: 5, radius: 14, speed: 55, speedPerStage: 4, touchTenths: 40, touchPerStageTenths: 7, scoreBonus: 12, childCount: 2 }),
    armoredBrute: Object.freeze({ behavior: "brute", hp: 82, hpPerStage: 12, radius: 25, speed: 25, speedPerStage: 2, touchTenths: 130, touchPerStageTenths: 15, scoreBonus: 36 }),
    fletcherThief: Object.freeze({ behavior: "flee", hp: 24, hpPerStage: 4, radius: 14, speed: 86, speedPerStage: 5, touchTenths: 0, touchPerStageTenths: 0, scoreBonus: 16, optionalHitMarks: 2, escapeTicks: 420, optionalReward: "splinterVolley" }),
    greenwoodStag: Object.freeze({ behavior: "flee", hp: 30, hpPerStage: 3, radius: 16, speed: 84, speedPerStage: 5, touchTenths: 0, touchPerStageTenths: 0, scoreBonus: 14, optionalHitMarks: 3, escapeTicks: 390, optionalReward: "heartsGrace" }),
  });

  const BOSS_DEFS = Object.freeze({
    ironOath: Object.freeze({ typeId: "sheriffEnforcer", hp: 78, hpPerStage: 10, radius: 28, speed: 40, speedPerStageTenths: 25, touchTenths: 100, touchPerStageTenths: 11, scoreBonus: 105, combatHpBps: 32000, armorBps: 8000 }),
    deepRoot: Object.freeze({ typeId: "brambleWarden", hp: 108, hpPerStage: 12, radius: 30, speed: 36, speedPerStageTenths: 24, touchTenths: 90, touchPerStageTenths: 9, scoreBonus: 125, combatHpBps: 25500, armorBps: 7500 }),
    huntersKnot: Object.freeze({ typeId: "royalTrapper", hp: 92, hpPerStage: 11, radius: 29, speed: 39, speedPerStageTenths: 25, touchTenths: 90, touchPerStageTenths: 10, scoreBonus: 118, combatHpBps: 28000, armorBps: 7600 }),
    bloodHunt: Object.freeze({ typeId: "blackwoodHuntmaster", hp: 96, hpPerStage: 11, radius: 30, speed: 42, speedPerStageTenths: 26, touchTenths: 100, touchPerStageTenths: 10, scoreBonus: 122, combatHpBps: 27200, armorBps: 7600 }),
    forestBoss: Object.freeze({ typeId: "forestBoss", hp: 170, hpPerStage: 18, radius: 34, speed: 46, speedPerStageTenths: 30, touchTenths: 140, touchPerStageTenths: 14, scoreBonus: 150, combatHpBps: 14500, armorBps: 6500, phaseThreeHpBps: 12000 }),
  });

  const RADIAL_DIRECTIONS = Object.freeze([
    [1000, 0], [924, 383], [707, 707], [383, 924], [0, 1000], [-383, 924], [-707, 707], [-924, 383],
    [-1000, 0], [-924, -383], [-707, -707], [-383, -924], [0, -1000], [383, -924], [707, -707], [924, -383],
  ].map((entry) => Object.freeze(entry)));

  const DEFAULT_RULES = Object.freeze({
    arena: Object.freeze({ width: 9600, height: 6400, padding: 80 }),
    player: Object.freeze({
      startX: 4800,
      startY: 5200,
      radius: 160,
      maxHpHundredths: 10000,
      moveUnitsPerTick: 40,
      arrowDamageHundredths: 2000,
      criticalChanceBps: 500,
      criticalMultiplierBps: 20000,
      arrowSpeedUnitsPerTick: 90,
      arrowRadius: 50,
      arrowTtlTicks: 84,
      shotCooldownTicks: 43,
      roomGraceTicks: 48,
    }),
    scoring: Object.freeze({
      streakWindowTicks: 204,
      streakStepBps: 400,
      streakMaxBonusBps: 3000,
      bossSpawnScore: 0,
      mandatoryBossObjectiveScore: 90,
    }),
  });

  function fail(code, detail) {
    const error = new Error(detail || code);
    error.code = code;
    throw error;
  }

  function invariant(condition, code, detail) {
    if (!condition) fail(code, detail);
  }

  function isPlainObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function exactKeys(value, keys, code) {
    invariant(isPlainObject(value), code, `${code}: expected object`);
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    invariant(actual.length === expected.length && actual.every((key, index) => key === expected[index]), code, `${code}: unexpected fields`);
  }

  function clone(value) {
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(clone);
    const result = {};
    for (const key of Object.keys(value)) result[key] = clone(value[key]);
    return result;
  }

  function canonicalJson(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }

  function rotateLeft(value, bits) {
    return ((value << bits) | (value >>> (32 - bits))) >>> 0;
  }

  class DeterministicPrng {
    constructor(seedWords) {
      validateSeedWords(seedWords);
      this.a = seedWords[0] >>> 0;
      this.b = seedWords[1] >>> 0;
      this.c = seedWords[2] >>> 0;
      this.d = seedWords[3] >>> 0;
      if ((this.a | this.b | this.c | this.d) === 0) this.a = 0x9e3779b9;
    }

    nextUint32() {
      const result = Math.imul((this.a + this.d) >>> 0, 9) >>> 0;
      const t = (this.b << 9) >>> 0;
      this.c ^= this.a;
      this.d ^= this.b;
      this.b ^= this.c;
      this.a ^= this.d;
      this.c ^= t;
      this.d = rotateLeft(this.d, 11);
      return result >>> 0;
    }

    range(maxExclusive) {
      invariant(Number.isSafeInteger(maxExclusive) && maxExclusive > 0, "BAD_RANDOM_RANGE");
      const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
      let value;
      do value = this.nextUint32(); while (value >= limit);
      return value % maxExclusive;
    }

    exportWords() {
      return [this.a >>> 0, this.b >>> 0, this.c >>> 0, this.d >>> 0];
    }
  }

  function validateSeedWords(seedWords) {
    invariant(Array.isArray(seedWords) && seedWords.length === 4, "BAD_SEED_WORDS");
    for (const word of seedWords) invariant(Number.isSafeInteger(word) && word >= 0 && word <= 0xffffffff, "BAD_SEED_WORD");
    return true;
  }

  function roundRatio(numerator, denominator) {
    invariant(Number.isSafeInteger(numerator) && Number.isSafeInteger(denominator) && denominator > 0, "BAD_INTEGER_RATIO");
    return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function integerSqrt(value) {
    invariant(Number.isSafeInteger(value) && value >= 0, "BAD_SQRT_INPUT");
    if (value < 2) return value;
    let x = Math.floor(Math.sqrt(value));
    while ((x + 1) * (x + 1) <= value) x += 1;
    while (x * x > value) x -= 1;
    return x;
  }

  function squaredDistance(left, right) {
    const dx = left.x - right.x;
    const dy = left.y - right.y;
    return dx * dx + dy * dy;
  }

  function normalizedStep(dx, dy, distance) {
    if (dx === 0 && dy === 0) return { x: 0, y: 0 };
    const length = integerSqrt(dx * dx + dy * dy);
    if (length === 0) return { x: 0, y: 0 };
    return { x: roundRatio(dx * distance, length), y: roundRatio(dy * distance, length) };
  }

  /* ---- stages past the threshold ------------------------------------------
   *
   * The fifteen stages are an authored run: each one has its own name, its own
   * enemy roster and its own rhythm. The season goes further than that, and out
   * there authorship is no longer possible: there are infinitely many stages,
   * and there is no way to describe each of them by hand.
   *
   * So past the threshold a stage is DERIVED, not described. The source of the
   * rules is forest-balance.js — the same one the ordinary forest lives by:
   * enemy count, pulse sizes and reinforcement configuration are already
   * defined there past the threshold. We keep no tables of our own here — a
   * second truth about difficulty would diverge from the first one on the very
   * first balance patch.
   *
   * What is decided here rather than taken from the tables:
   *   — the enemy pool past the threshold equals the pool of stage fourteen. It
   *     is the last ordinary stage and the richest in composition; taking a
   *     poorer pool would mean making the game easier exactly where it is
   *     supposed to get harder;
   *   — a boss every fifth stage (20, 25, 30…), as in the ordinary forest;
   *   — an endless boss stage carries TWO seeds, like stage fifteen. Past the
   *     threshold people live for the record, and a half-boss there would be a
   *     step backwards;
   *   — par time grows by four seconds per stage. The numbers are taken from
   *     the slope of the last ordinary stages: from eleven through fourteen par
   *     grows by exactly four seconds.
   */
  const ENDLESS_FROM = 16;

  function isBossStage(stage) {
    const s = Math.floor(Number(stage) || 0);
    if (s < ENDLESS_FROM) return BOSS_STAGES.includes(s);
    return s % 5 === 0;
  }

  function isOrdinaryStage(stage) {
    const s = Math.floor(Number(stage) || 0);
    if (s < 1) return false;
    if (s < ENDLESS_FROM) return ORDINARY_STAGES.includes(s);
    return !isBossStage(s);
  }

  const ENDLESS_STAGE_CACHE = new Map();

  function endlessStageDef(stage) {
    if (ENDLESS_STAGE_CACHE.has(stage)) return ENDLESS_STAGE_CACHE.get(stage);
    const isBoss = isBossStage(stage);
    const template = STAGE_DEFS[13];             // stage fourteen, the last ordinary one
    const def = Object.freeze({
      number: stage,
      title: isBoss ? `Deep Hollow ${stage}` : `Deep Forest ${stage}`,
      parTicks: (isBoss ? 150 : 66 + (stage - 14) * 4) * TICK_RATE,
      enemyCount: isBoss ? 1 : FOREST_BALANCE.stageCount(stage, 0),
      enemyPool: isBoss ? Object.freeze([]) : template.enemyPool,
      bossType: isBoss ? "forestBoss" : "",
    });
    ENDLESS_STAGE_CACHE.set(stage, def);
    return def;
  }

  function stageDef(stage) {
    invariant(Number.isSafeInteger(stage) && stage >= 1, "BAD_STAGE");
    if (stage <= STAGE_COUNT) return STAGE_DEFS[stage - 1];
    return endlessStageDef(stage);
  }

  /* ---- stage plan past the threshold --------------------------------------
   *
   * The manifest cannot enumerate infinitely many plans, so past the threshold
   * it carries not a list but a SEED. The stage plan is derived from the seed
   * and the stage number — deterministically, which means identically for the
   * player in the browser, for the server during replay, and for a stranger who
   * decides to check somebody else's record. Nobody sends anything to anybody
   * and nothing is stored.
   *
   * This is the same trick as with the season manifest itself: what is derived
   * from a number announced in advance cannot be forged.
   */
  const ENDLESS_PLAN_CACHE = new Map();

  function endlessRandom(seedWords, stage, step) {
    // Simple mixing of the seed words with the stage number. No cryptography is
    // needed here: the seed is already published, there is nothing to hide — all
    // we need is bit-for-bit repeatability across all three worlds.
    let h = 0x811c9dc5;
    const data = [...seedWords, stage, step];
    for (const word of data) {
      let x = word >>> 0;
      for (let i = 0; i < 4; i += 1) {
        h ^= x & 0xff;
        h = Math.imul(h, 0x01000193) >>> 0;
        x >>>= 8;
      }
    }
    return h >>> 0;
  }

  function endlessStagePlan(manifest, stage) {
    const key = `${stage}`;
    const cached = ENDLESS_PLAN_CACHE.get(manifest);
    if (cached?.has(key)) return cached.get(key);
    const seed = manifest.endless.seedWords;
    const def = stageDef(stage);
    let plan;
    if (isBossStage(stage)) {
      // Two seeds on an endless boss stage: we take them from the season's
      // announced order, swapping them every other time so that neighbouring
      // boss stages are not identical.
      const swapOrder = endlessRandom(seed, stage, 0) % 2 === 1;
      const seeds = swapOrder ? [...manifest.bossSeedOrder].reverse() : [...manifest.bossSeedOrder];
      plan = Object.freeze({
        stage, kind: "boss", planId: "AUTHORED-BOSS-V1",
        pulses: Object.freeze([]), reinforcement: null,
        bossSeedIds: Object.freeze(seeds),
      });
    } else {
      const pool = def.enemyPool;
      const weightTotal = pool.reduce((sum, [, weight]) => sum + (Number(weight) || 1), 0);
      const sizes = FOREST_BALANCE.pulseSizes(stage, 0);
      const pulses = [];
      let bannerCaptains = 0;
      let step = 1;
      for (const size of sizes) {
        const pulse = [];
        for (let i = 0; i < size; i += 1) {
          let roll = endlessRandom(seed, stage, step) % weightTotal;
          step += 1;
          let picked = pool[pool.length - 1][0];
          for (const [id, weight] of pool) {
            if (roll < (Number(weight) || 1)) { picked = id; break; }
            roll -= Number(weight) || 1;
          }
          // Only one banner captain per stage — a core rule, not a matter of taste.
          if (picked === "bannerCaptain" && bannerCaptains >= 1) {
            picked = pool.find(([id]) => id !== "bannerCaptain")?.[0] || picked;
          }
          if (picked === "bannerCaptain") bannerCaptains += 1;
          pulse.push(picked);
        }
        pulses.push(Object.freeze(pulse));
      }
      // The body count is set by the stage definition; the sum of the pulse
      // sizes has to agree with it, but the tables can drift apart — so we top
      // the last pulse up.
      let spawned = pulses.reduce((sum, p) => sum + p.length, 0);
      while (spawned < def.enemyCount && pulses.length) {
        const plain = pool.find(([id]) => id !== "bannerCaptain")?.[0] || pool[0][0];
        pulses[pulses.length - 1] = Object.freeze([...pulses[pulses.length - 1], plain]);
        spawned += 1;
      }
      while (spawned > def.enemyCount && pulses[pulses.length - 1].length > 1) {
        pulses[pulses.length - 1] = Object.freeze(pulses[pulses.length - 1].slice(0, -1));
        spawned -= 1;
      }
      const scheduler = FOREST_BALANCE.schedulerConfig(stage, 0);
      plan = Object.freeze({
        stage, kind: "ordinary", planId: "LD-FR-V1-BR",
        pulses: Object.freeze(pulses),
        reinforcement: Object.freeze({
          ageFloorTicks: Math.round(scheduler.ageFloor * TICK_RATE),
          livingThreshold: scheduler.livingThreshold,
          livingCap: scheduler.livingCap,
          warningTicks: Math.round(scheduler.warningDuration * TICK_RATE),
          zeroLivingWarningTicks: Math.round(scheduler.zeroLivingWarning * TICK_RATE),
        }),
        bossSeedIds: Object.freeze([]),
      });
    }
    if (!cached) ENDLESS_PLAN_CACHE.set(manifest, new Map([[key, plan]]));
    else cached.set(key, plan);
    return plan;
  }

  function stagePlanFor(manifest, stage) {
    if (stage <= STAGE_COUNT) return manifest.stagePlans[stage - 1];
    invariant(Boolean(manifest.endless), "ENDLESS_NOT_ENABLED");
    return endlessStagePlan(manifest, stage);
  }

  /** Run limit: past the threshold it is set by time alone. */
  function runStageLimit(manifest) {
    return manifest?.endless ? Number.MAX_SAFE_INTEGER : STAGE_COUNT;
  }

  function validateLoadoutPolicy(policy) {
    invariant(canonicalJson(policy) === canonicalJson(LOADOUT_POLICY), "LOADOUT_POLICY_DRIFT");
    return true;
  }

  function validateFixedLoadout(loadout, policy = LOADOUT_POLICY) {
    validateLoadoutPolicy(policy);
    exactKeys(loadout, Object.keys(FIXED_LOADOUT), "BAD_LOADOUT_SHAPE");
    invariant(loadout.bowId === policy.bowId, "INELIGIBLE_BOW");
    invariant(loadout.prestigeTier === policy.prestigeTier, "INELIGIBLE_PRESTIGE");
    invariant(loadout.buildingStatsId === policy.buildingStatsId, "INELIGIBLE_BUILDING_STATS");
    for (const key of ["equipmentIds", "upgradeIds", "relicIds"]) {
      invariant(Array.isArray(loadout[key]) && loadout[key].length === 0, "INELIGIBLE_LOADOUT", `${key} must be empty.`);
    }
    invariant(Array.isArray(loadout.foundationIds) && loadout.foundationIds.length === policy.requiredFoundationCount, "INELIGIBLE_FOUNDATION");
    invariant(new Set(loadout.foundationIds).size === loadout.foundationIds.length, "INELIGIBLE_FOUNDATION");
    invariant(loadout.foundationIds.every((id) => policy.allowedFoundationIds.includes(id)), "INELIGIBLE_FOUNDATION");
    return true;
  }

  function validateReviewPolicy(policy) {
    exactKeys(policy, ["simulatorScore", "nearCeilingBps", "quarantineAutomationSignals"], "BAD_REVIEW_POLICY");
    invariant(policy.simulatorScore === null || (Number.isSafeInteger(policy.simulatorScore) && policy.simulatorScore >= 0), "BAD_SIMULATOR_SCORE");
    invariant(Number.isSafeInteger(policy.nearCeilingBps) && policy.nearCeilingBps >= 0 && policy.nearCeilingBps <= 10000, "BAD_NEAR_CEILING");
    invariant(typeof policy.quarantineAutomationSignals === "boolean", "BAD_AUTOMATION_POLICY");
  }

  function validateReinforcementConfig(config, stage) {
    exactKeys(config, ["ageFloorTicks", "livingThreshold", "livingCap", "warningTicks", "zeroLivingWarningTicks"], "BAD_REINFORCEMENT_CONFIG");
    const authority = FOREST_BALANCE.schedulerConfig(stage, 0);
    invariant(Boolean(authority), "MISSING_REINFORCEMENT_AUTHORITY");
    const expected = {
      ageFloorTicks: Math.round(authority.ageFloor * TICK_RATE),
      livingThreshold: authority.livingThreshold,
      livingCap: authority.livingCap,
      warningTicks: Math.round(authority.warningDuration * TICK_RATE),
      zeroLivingWarningTicks: Math.round(authority.zeroLivingWarning * TICK_RATE),
    };
    for (const [key, value] of Object.entries(expected)) {
      invariant(config[key] === value, "REINFORCEMENT_CONFIG_DRIFT", `Unexpected ${key}.`);
    }
  }

  function validateStagePlan(plan, expectedStage) {
    exactKeys(plan, ["stage", "kind", "planId", "pulses", "reinforcement", "bossSeedIds"], "BAD_STAGE_PLAN_SHAPE");
    invariant(plan.stage === expectedStage, "BAD_STAGE_PLAN_ORDER");
    const definition = stageDef(expectedStage);
    if (isOrdinaryStage(expectedStage)) {
      invariant(plan.kind === "ordinary" && plan.planId === "LD-FR-V1-BR", "BAD_ORDINARY_PLAN");
      invariant(Array.isArray(plan.pulses), "BAD_SPAWN_PULSES");
      const expectedPulseCount = FOREST_BALANCE.pulseSizes(expectedStage, 0).length;
      invariant(plan.pulses.length === expectedPulseCount, "BAD_SPAWN_PULSES");
      let bodyCount = 0;
      let captainCount = 0;
      const legalTypes = new Set(definition.enemyPool.map(([id]) => id));
      for (const pulse of plan.pulses) {
        invariant(Array.isArray(pulse) && pulse.length > 0, "BAD_SPAWN_PULSE");
        for (const typeId of pulse) {
          invariant(legalTypes.has(typeId) && Object.prototype.hasOwnProperty.call(ENEMY_DEFS, typeId), "BAD_ENEMY_TYPE");
          if (typeId === "bannerCaptain") captainCount += 1;
          bodyCount += 1;
        }
      }
      invariant(bodyCount === definition.enemyCount, "BAD_STAGE_ROSTER_COUNT");
      invariant(captainCount <= 1, "BAD_CAPTAIN_COUNT");
      validateReinforcementConfig(plan.reinforcement, expectedStage);
      invariant(Array.isArray(plan.bossSeedIds) && plan.bossSeedIds.length === 0, "BAD_ORDINARY_BOSS_SEEDS");
      return true;
    }

    invariant(plan.kind === "boss" && plan.planId === "AUTHORED-BOSS-V1", "BAD_BOSS_PLAN");
    invariant(Array.isArray(plan.pulses) && plan.pulses.length === 0, "BAD_BOSS_PULSES");
    invariant(plan.reinforcement === null, "BAD_BOSS_REINFORCEMENT");
    // Stages five and ten are single named bosses. Fifteen is a double one, and
    // so is every endless boss stage past it: beyond the threshold people play
    // for the record, and a half-boss there would be a step backwards in
    // difficulty.
    const expectedSeeds = expectedStage >= STAGE_COUNT ? 2 : 1;
    invariant(Array.isArray(plan.bossSeedIds) && plan.bossSeedIds.length === expectedSeeds, "BAD_BOSS_SEEDS");
    invariant(new Set(plan.bossSeedIds).size === plan.bossSeedIds.length, "BAD_BOSS_SEEDS");
    invariant(plan.bossSeedIds.every((id) => BOSS_SEED_IDS.includes(id)), "BAD_BOSS_SEEDS");
    return true;
  }

  function validateManifest(manifest) {
    exactKeys(manifest, [
      "coreVersion", "rulesetId", "seasonId", "gameBuild", "tickRate", "maxRunTicks",
      "simulationSeeds", "bossSeedOrder", "stagePlans", "rules", "loadoutPolicy", "reviewPolicy",
      "endless",
    ], "BAD_MANIFEST_SHAPE");
    invariant(manifest.coreVersion === CORE_VERSION, "BAD_CORE_VERSION");
    invariant(manifest.rulesetId === RULESET_ID, "BAD_RULESET_ID");
    invariant(typeof manifest.seasonId === "string" && manifest.seasonId.length >= 1 && manifest.seasonId.length <= 128, "BAD_SEASON_ID");
    invariant(typeof manifest.gameBuild === "string" && manifest.gameBuild.length >= 1 && manifest.gameBuild.length <= 64, "BAD_GAME_BUILD");
    invariant(manifest.tickRate === TICK_RATE, "BAD_TICK_RATE");
    invariant(Number.isSafeInteger(manifest.maxRunTicks) && manifest.maxRunTicks > 0 && manifest.maxRunTicks <= MAX_RUN_TICKS, "BAD_MAX_RUN_TICKS");
    exactKeys(manifest.simulationSeeds, ["combat", "rewards", "bosses"], "BAD_SIMULATION_SEEDS");
    validateSeedWords(manifest.simulationSeeds.combat);
    validateSeedWords(manifest.simulationSeeds.rewards);
    validateSeedWords(manifest.simulationSeeds.bosses);
    invariant(Array.isArray(manifest.bossSeedOrder) && manifest.bossSeedOrder.length === 2, "BAD_BOSS_SEED_ORDER");
    invariant(new Set(manifest.bossSeedOrder).size === 2 && manifest.bossSeedOrder.every((id) => BOSS_SEED_IDS.includes(id)), "BAD_BOSS_SEED_ORDER");
    invariant(Array.isArray(manifest.stagePlans) && manifest.stagePlans.length === STAGE_COUNT, "BAD_STAGE_PLANS");
    manifest.stagePlans.forEach((plan, index) => validateStagePlan(plan, index + 1));
    invariant(manifest.stagePlans[4].bossSeedIds[0] === manifest.bossSeedOrder[0], "BAD_STAGE5_SEED");
    invariant(manifest.stagePlans[9].bossSeedIds[0] === manifest.bossSeedOrder[1], "BAD_STAGE10_SEED");
    invariant(
      [...manifest.stagePlans[14].bossSeedIds].sort().join("+") === [...manifest.bossSeedOrder].sort().join("+"),
      "BAD_STAGE15_SEEDS",
    );
    // Endless mode: either it is absent entirely, or it is declared by a seed.
    // The seed itself is published together with the manifest BEFORE the season
    // starts — which means the composition of any stage past the threshold is
    // predetermined and cannot be forged.
    if (manifest.endless !== null) {
      exactKeys(manifest.endless, ["fromStage", "seedWords"], "BAD_ENDLESS_SHAPE");
      invariant(manifest.endless.fromStage === ENDLESS_FROM, "BAD_ENDLESS_FROM");
      validateSeedWords(manifest.endless.seedWords);
    }
    invariant(canonicalJson(manifest.rules) === canonicalJson(DEFAULT_RULES), "RULESET_DRIFT");
    validateLoadoutPolicy(manifest.loadoutPolicy);
    validateReviewPolicy(manifest.reviewPolicy);
    return true;
  }

  function validateTickInput(input) {
    exactKeys(input, ["x", "y"], "BAD_TICK_INPUT_SHAPE");
    invariant(Number.isSafeInteger(input.x) && input.x >= -INPUT_AXIS_LIMIT && input.x <= INPUT_AXIS_LIMIT, "BAD_INPUT_AXIS");
    invariant(Number.isSafeInteger(input.y) && input.y >= -INPUT_AXIS_LIMIT && input.y <= INPUT_AXIS_LIMIT, "BAD_INPUT_AXIS");
    return true;
  }

  function validateDecision(decision) {
    exactKeys(decision, ["afterStage", "kind", "choiceIds"], "BAD_DECISION_SHAPE");
    // This used to read afterStage < STAGE_COUNT: after stage fifteen there was
    // nothing left to choose, the run was over. In endless mode there is a
    // choice after EVERY stage, so the upper bound is gone — the run timer holds
    // it instead.
    invariant(Number.isSafeInteger(decision.afterStage) && decision.afterStage >= 1, "BAD_DECISION_STAGE");
    const expectedKind = isBossStage(decision.afterStage) ? "relic" : "upgrade";
    invariant(decision.kind === expectedKind, "BAD_DECISION_KIND");
    invariant(Array.isArray(decision.choiceIds) && decision.choiceIds.length >= 1 && decision.choiceIds.length <= 2, "BAD_DECISION_CHOICES");
    invariant(decision.choiceIds.every((id) => typeof id === "string" && /^[A-Za-z][A-Za-z0-9-]{1,63}$/.test(id)), "BAD_DECISION_CHOICE");
    invariant(new Set(decision.choiceIds).size === decision.choiceIds.length, "DUPLICATE_DECISION_CHOICE");
    return true;
  }

  function validateDecisionSequence(decisions) {
    invariant(Array.isArray(decisions), "BAD_DECISIONS");
    let previousStage = 0;
    for (const decision of decisions) {
      validateDecision(decision);
      invariant(decision.afterStage > previousStage, "DECISION_ORDER_OR_DUPLICATE");
      previousStage = decision.afterStage;
    }
    return true;
  }

  function leaderboardEligible(stagesCleared) {
    invariant(Number.isSafeInteger(stagesCleared) && stagesCleared >= 0, "BAD_STAGES_CLEARED");
    return stagesCleared >= LEADERBOARD_MIN_CLEARED_STAGE;
  }

  function consumesEntryTicket(outcome, stagesCleared) {
    invariant(["CLEARED", "DEAD", "TIMEOUT", "ABANDONED"].includes(outcome), "BAD_RUN_OUTCOME");
    invariant(Number.isSafeInteger(stagesCleared) && stagesCleared >= 0, "BAD_STAGES_CLEARED");
    // The ticket counts as spent once the authored run has been completed. In
    // endless mode the run does not "finish" any further — it is cut short by
    // death or by time — so the threshold stays the same fifteen stages.
    return stagesCleared >= STAGE_COUNT;
  }

  function stageDifficulty(stage) {
    const r = stage - 1;
    return {
      hpBps: 10000 + r * 1300 + r * r * 45,
      stageHpBps: 10000 + r * 850 + Math.max(0, stage - 5) * 400 + Math.max(0, stage - 10) * 400,
      dangerBps: 10000 + r * 400 + r * r * 40,
    };
  }

  function enemyScoreValue(definition, scoreHpHundredths, radiusUnits, scoreSpeedHundredths, touchHundredthsPerSecond, normalizationMillionths = 1000000) {
    const hpWhole = Math.floor(scoreHpHundredths / 100);
    const tenThousandths = 60000
      + radiusUnits * 750
      + hpWhole * 1200
      + scoreSpeedHundredths * 6
      + touchHundredthsPerSecond * 80
      + definition.scoreBonus * 10000;
    invariant(Number.isSafeInteger(normalizationMillionths) && normalizationMillionths > 0, "BAD_SCORE_NORMALIZATION");
    return roundRatio(tenThousandths * normalizationMillionths, 10000 * 1000000);
  }

  function maximumStreakScore(stateRules, baseScore) {
    return roundRatio(baseScore * (10000 + stateRules.scoring.streakMaxBonusBps), 10000);
  }

  function ordinaryScoreCeiling(manifest, stage, typeId, child = false) {
    const definition = ENEMY_DEFS[typeId];
    invariant(Boolean(definition), "BAD_ENEMY_TYPE");
    const difficulty = stageDifficulty(stage);
    const hpScaleBps = child ? 4500 : 10000;
    const radiusUnits = Math.max(80, roundRatio(definition.radius * 10 * (child ? 7200 : 10000), 10000));
    const baseHpHundredths = (definition.hp + stage * definition.hpPerStage) * 100;
    const difficultyHp = roundRatio(roundRatio(baseHpHundredths * difficulty.hpBps, 10000) * difficulty.stageHpBps, 10000);
    const scoreHpHundredths = Math.max(400, roundRatio(difficultyHp * hpScaleBps, 10000));
    const speedBonusHundredths = child ? 2400 : 0;
    const maximumSpeedHundredths = (definition.speed + stage * definition.speedPerStage) * 100 + speedBonusHundredths + 799;
    const scoreSpeedHundredths = roundRatio(
      roundRatio(maximumSpeedHundredths * 8500, 10000) * Math.min(16000, difficulty.dangerBps),
      10000,
    );
    const touchBaseHundredths = (definition.touchTenths + stage * definition.touchPerStageTenths) * 10;
    const touchHundredthsPerSecond = roundRatio(touchBaseHundredths * difficulty.dangerBps, 10000);
    const baseScore = enemyScoreValue(
      definition,
      scoreHpHundredths,
      radiusUnits,
      scoreSpeedHundredths,
      touchHundredthsPerSecond,
      Math.round(FOREST_BALANCE.scoreNormalization(stage) * 1000000),
    );
    return maximumStreakScore(manifest.rules, baseScore);
  }

  function bossScoreCeiling(manifest, stage, seedId) {
    const definition = BOSS_DEFS[seedId];
    invariant(Boolean(definition), "BAD_BOSS_DEFINITION");
    const difficulty = stageDifficulty(stage);
    const baseHpHundredths = (definition.hp + stage * definition.hpPerStage) * 100;
    const stageScoreHpBps = difficulty.stageHpBps + (stage === 15 ? 2800 : 1400);
    const scoreHpHundredths = Math.max(400, roundRatio(
      roundRatio(baseHpHundredths * difficulty.hpBps, 10000) * stageScoreHpBps,
      10000,
    ));
    const maximumSpeedHundredths = definition.speed * 100 + stage * definition.speedPerStageTenths * 10 + 799;
    const scoreSpeedHundredths = roundRatio(
      roundRatio(maximumSpeedHundredths * 8500, 10000) * Math.min(16000, difficulty.dangerBps),
      10000,
    );
    const touchBaseHundredths = (definition.touchTenths + stage * definition.touchPerStageTenths) * 10;
    const touchHundredthsPerSecond = roundRatio(touchBaseHundredths * difficulty.dangerBps, 10000);
    const baseScore = enemyScoreValue(
      definition,
      scoreHpHundredths,
      definition.radius * 10,
      scoreSpeedHundredths,
      touchHundredthsPerSecond,
    ) + 150;
    return maximumStreakScore(manifest.rules, baseScore);
  }

  /* The theoretical score ceiling — the figure reviewPolicy uses to decide
   * whether a run is suspiciously good. In endless mode there is no ceiling
   * "for the whole run", so it is computed UP TO A GIVEN DEPTH: for a run that
   * reached stage 34 the ceiling is the sum over 34 stages. Without the
   * parameter the behaviour is as before — the ceiling of the authored
   * fifteen. */
  function theoreticalRunScoreCeiling(manifest, uptoStage = STAGE_COUNT) {
    validateManifest(manifest);
    invariant(Number.isSafeInteger(uptoStage) && uptoStage >= 1, "BAD_CEILING_DEPTH");
    let ceiling = 0;
    const plans = [];
    for (let stage = 1; stage <= uptoStage; stage += 1) plans.push(stagePlanFor(manifest, stage));
    for (const plan of plans) {
      if (plan.kind === "ordinary") {
        for (const typeId of plan.pulses.flat()) {
          ceiling += ordinaryScoreCeiling(manifest, plan.stage, typeId, false);
          const childCount = ENEMY_DEFS[typeId].childCount || 0;
          for (let child = 0; child < childCount; child += 1) {
            ceiling += ordinaryScoreCeiling(manifest, plan.stage, typeId, true);
          }
        }
        if (plan.stage >= 2) ceiling += ordinaryScoreCeiling(manifest, plan.stage, "fletcherThief", false);
        if (plan.stage >= 3) ceiling += ordinaryScoreCeiling(manifest, plan.stage, "greenwoodStag", false);
        continue;
      }
      // Stage fifteen and every endless boss stage carry the full forest boss;
      // stages five and ten carry named seeds.
      const isFinal = plan.stage >= STAGE_COUNT;
      const seedId = isFinal ? "forestBoss" : plan.bossSeedIds[0];
      ceiling += bossScoreCeiling(manifest, plan.stage, seedId);
      if (!isFinal && plan.bossSeedIds[0] === "deepRoot") {
        ceiling += 3 * SCORE_POLICY.mandatoryBossObjective.award;
      }
    }
    invariant(Number.isSafeInteger(ceiling) && ceiling > 0, "BAD_RUN_SCORE_CEILING");
    return ceiling;
  }

  function spawnPoint(prng, radius, arena) {
    const side = prng.range(4);
    const minimumX = arena.padding + radius;
    const maximumX = arena.width - arena.padding - radius;
    const minimumY = arena.padding + radius;
    const maximumY = arena.height - arena.padding - radius;
    if (side === 0) return { x: minimumX + prng.range(maximumX - minimumX + 1), y: minimumY };
    if (side === 1) return { x: maximumX, y: minimumY + prng.range(maximumY - minimumY + 1) };
    if (side === 2) return { x: minimumX + prng.range(maximumX - minimumX + 1), y: maximumY };
    return { x: minimumX, y: minimumY + prng.range(maximumY - minimumY + 1) };
  }

  function createOrdinaryEnemy(state, typeId, options = {}) {
    const definition = ENEMY_DEFS[typeId];
    invariant(Boolean(definition), "BAD_ENEMY_TYPE");
    const difficulty = stageDifficulty(state.stage);
    const child = Boolean(options.child);
    const hpScaleBps = child ? 4500 : 10000;
    const radiusUnits = Math.max(80, roundRatio(definition.radius * 10 * (child ? 7200 : 10000), 10000));
    const baseHpHundredths = (definition.hp + state.stage * definition.hpPerStage) * 100;
    const difficultyHp = roundRatio(roundRatio(baseHpHundredths * difficulty.hpBps, 10000) * difficulty.stageHpBps, 10000);
    const scoreHpHundredths = Math.max(400, roundRatio(difficultyHp * hpScaleBps, 10000));
    const ordinaryHpMillionths = Math.round(FOREST_BALANCE.ordinaryHpMultiplier(state.stage) * 1000000);
    const ordinaryCombatHpHundredths = roundRatio(
      baseHpHundredths * ordinaryHpMillionths * hpScaleBps,
      1000000 * 10000,
    );
    const combatHpHundredths = Math.max(400, roundRatio(
      ordinaryCombatHpHundredths * (definition.combatHpBps || 10000),
      10000 * 100,
    ) * 100);
    const speedJitterHundredths = state.prng.combat.range(800);
    const speedBonusHundredths = child ? 2400 : 0;
    const baseSpeedHundredths = (definition.speed + state.stage * definition.speedPerStage) * 100 + speedBonusHundredths + speedJitterHundredths;
    const dangerSpeedBps = Math.min(16000, difficulty.dangerBps);
    const scoreSpeedHundredths = roundRatio(roundRatio(baseSpeedHundredths * 8500, 10000) * dangerSpeedBps, 10000);
    const touchBaseHundredths = (definition.touchTenths + state.stage * definition.touchPerStageTenths) * 10;
    const touchHundredthsPerSecond = roundRatio(touchBaseHundredths * difficulty.dangerBps, 10000);
    const position = options.position || spawnPoint(state.prng.combat, radiusUnits, state.manifest.rules.arena);
    const optionalSprite = Number.isSafeInteger(definition.optionalHitMarks) && definition.optionalHitMarks > 0;
    const scoreNormalizationMillionths = optionalSprite
      ? 1000000
      : Math.round(FOREST_BALANCE.scoreNormalization(state.stage) * 1000000);
    if (state.stage === 1 && !child && !options.scorePolicy) {
      return {
        id: state.nextEnemyId++,
        typeId,
        behavior: definition.behavior,
        x: position.x,
        y: position.y,
        radius: radiusUnits,
        hpHundredths: combatHpHundredths,
        maxHpHundredths: combatHpHundredths,
        scoreHpHundredths,
        scoreSpeedHundredths,
        speedUnitsPerTick: Math.max(1, roundRatio(scoreSpeedHundredths * 10, TICK_RATE * 100)),
        touchHundredthsPerSecond,
        contactDamageRemainder: 0,
        scorePolicy: "ordinary",
        baseScore: enemyScoreValue(definition, scoreHpHundredths, radiusUnits, scoreSpeedHundredths, touchHundredthsPerSecond, scoreNormalizationMillionths),
        child: false,
        childCount: 0,
        mode: "ready",
        actionTicks: 0,
        modeTicks: 0,
        facingX: state.player.x - position.x,
        facingY: state.player.y - position.y,
        chargeVx: 0,
        chargeVy: 0,
        shotTicks: 0,
        shieldHits: 0,
        shieldBroken: false,
        strafeDirection: 1,
        poisonStacks: [],
        bleedTranches: [],
        bleedCursor: 0,
        frostTicks: 0,
        frostSlowBps: 10000,
        chill: 0,
        freezeTicks: 0,
        brittleTicks: 0,
        staggerTicks: 0,
        wolfMode: "circle",
        wolfTimer: 30 + state.prng.combat.range(60),
      };
    }
    const shotCooldown = definition.shotCooldownTicks || 0;
    const actionJitter = state.prng.combat.range(73);
    const effectiveHpHundredths = optionalSprite ? definition.optionalHitMarks * 100 : combatHpHundredths;
    const enemy = {
      id: state.nextEnemyId++,
      typeId,
      behavior: definition.behavior,
      x: position.x,
      y: position.y,
      radius: radiusUnits,
      hpHundredths: effectiveHpHundredths,
      maxHpHundredths: effectiveHpHundredths,
      scoreHpHundredths,
      scoreSpeedHundredths,
      speedUnitsPerTick: Math.max(1, roundRatio(scoreSpeedHundredths * 10, TICK_RATE * 100)),
      touchHundredthsPerSecond,
      contactDamageRemainder: 0,
      scorePolicy: options.scorePolicy || (optionalSprite ? "optionalSprite" : "ordinary"),
      baseScore: enemyScoreValue(definition, scoreHpHundredths, radiusUnits, scoreSpeedHundredths, touchHundredthsPerSecond, scoreNormalizationMillionths),
      child,
      childCount: child ? 0 : (definition.childCount || 0),
      mode: "ready",
      actionTicks: 36 + actionJitter,
      modeTicks: 0,
      facingX: state.player.x - position.x,
      facingY: state.player.y - position.y,
      chargeVx: 0,
      chargeVy: 0,
      shotTicks: shotCooldown ? Math.max(1, roundRatio(shotCooldown * (70 + state.prng.combat.range(61)), 100)) : 0,
      shieldHits: 0,
      shieldBroken: false,
      strafeDirection: state.prng.combat.range(2) ? 1 : -1,
      poisonStacks: [],
      bleedTranches: [],
      bleedCursor: 0,
      frostTicks: 0,
      frostSlowBps: 10000,
      chill: 0,
      freezeTicks: 0,
      brittleTicks: 0,
      staggerTicks: 0,
      optionalSprite,
      optionalEntryTicks: optionalSprite ? 45 : 0,
      escapeTicks: optionalSprite ? definition.escapeTicks : 0,
      optionalReward: optionalSprite ? definition.optionalReward : "",
    };
    if (optionalSprite) enemy.invulnerable = true;
    return enemy;
  }

  function createBossEnemy(state) {
    const seedIds = state.plan.bossSeedIds;
    const seedId = state.stage === 15 ? "forestBoss" : seedIds[0];
    const definition = BOSS_DEFS[seedId];
    invariant(Boolean(definition), "BAD_BOSS_DEFINITION");
    const difficulty = stageDifficulty(state.stage);
    const baseHpHundredths = (definition.hp + state.stage * definition.hpPerStage) * 100;
    const scoreHpHundredths = Math.max(400, roundRatio(roundRatio(baseHpHundredths * difficulty.hpBps, 10000) * (difficulty.stageHpBps + (state.stage === 15 ? 2800 : 1400)), 10000));
    const bodyHpHundredths = roundRatio(scoreHpHundredths * definition.combatHpBps, 10000);
    const speedBaseHundredths = definition.speed * 100 + state.stage * definition.speedPerStageTenths * 10 + state.prng.combat.range(800);
    const scoreSpeedHundredths = roundRatio(roundRatio(speedBaseHundredths * 8500, 10000) * Math.min(16000, difficulty.dangerBps), 10000);
    const touchBaseHundredths = (definition.touchTenths + state.stage * definition.touchPerStageTenths) * 10;
    const touchHundredthsPerSecond = roundRatio(touchBaseHundredths * difficulty.dangerBps, 10000);
    const radiusUnits = definition.radius * 10;
    return {
      id: state.nextEnemyId++,
      typeId: definition.typeId,
      behavior: "boss",
      boss: true,
      bossSeedIds: [...seedIds],
      activeSeedId: seedIds[0],
      x: state.manifest.rules.arena.width / 2,
      y: 1450,
      radius: radiusUnits,
      hpHundredths: bodyHpHundredths,
      maxHpHundredths: bodyHpHundredths,
      scoreHpHundredths,
      armorHundredths: roundRatio(bodyHpHundredths * definition.armorBps, 10000),
      armorMaxHundredths: roundRatio(bodyHpHundredths * definition.armorBps, 10000),
      scoreSpeedHundredths,
      speedUnitsPerTick: Math.max(1, roundRatio(scoreSpeedHundredths * 10, TICK_RATE * 100)),
      touchHundredthsPerSecond,
      contactDamageRemainder: 0,
      scorePolicy: "boss",
      baseScore: enemyScoreValue(definition, scoreHpHundredths, radiusUnits, scoreSpeedHundredths, touchHundredthsPerSecond) + 150,
      child: false,
      childCount: 0,
      mode: "intro",
      modeTicks: 162,
      actionTicks: 0,
      facingX: state.player.x - state.manifest.rules.arena.width / 2,
      facingY: state.player.y - 1450,
      chargeVx: 0,
      chargeVy: 0,
      shotTicks: 0,
      shieldHits: 0,
      shieldBroken: true,
      strafeDirection: state.prng.bosses.range(2) ? 1 : -1,
      poisonStacks: [],
      bleedTranches: [],
      bleedCursor: 0,
      frostTicks: 0,
      frostSlowBps: 10000,
      chill: 0,
      freezeTicks: 0,
      brittleTicks: 0,
      staggerTicks: 0,
      invulnerable: true,
      phase: 1,
      phasePatternIndex: 0,
      phasePatternTicks: 0,
      phaseTransitionTicks: 0,
      armorSegment: 1,
      armorSegmentsBroken: 0,
      brokenArmorSegmentIds: [],
      armorModuleIndex: 0,
      armorModuleTicks: 0,
      armorModuleStarted: false,
      phaseThreeSegment: 0,
      phaseThreeTier: 0,
      phaseThreeOpeningTicks: 0,
      phaseThreeOpeningLaneTicks: 0,
      phaseThreeRampageTicks: 0,
      phaseThreeChargeIndex: 0,
      phaseThreeChargeCount: 0,
      phaseThreeLaneVertical: true,
      phaseThreeLaneForward: true,
      phaseThreeLane: 1,
      phaseThreeLaneStartX: 0,
      phaseThreeLaneStartY: 0,
      phaseThreeLaneEndX: 0,
      phaseThreeLaneEndY: 0,
      phaseThreeChargeElapsedTicks: 0,
      phaseThreeChargeTravel: 0,
      phaseThreeChargeDamagePending: false,
      phaseThreeSegmentFourStarted: false,
      phaseThreeDrainRemainder: 0,
      phaseThreeTimberfallWaveTicks: 0,
      phaseThreeTimberfallWaveIndex: 0,
      mandatoryObjectivesRemaining: 0,
      rootHeartsSpawned: 0,
      rootHeartRespiteTicks: 0,
      hunterLessonIndex: 0,
      hunterPhaseOneLessonComplete: false,
      hunterFollowupIndex: 0,
      hunterBranch: "",
      hunterCycleKind: "",
      hunterFollowup: null,
      hunterStormWavesRemaining: 0,
      hunterStormIntervalTicks: 0,
      hunterStormWarningTicks: 0,
      hunterStormRadius: 0,
      hunterStormCastId: 0,
      hunterStormCastSequence: 0,
      hunterStormPatternIndex: 0,
      hunterLastStormPattern: "",
      hunterVulnerableTicks: 0,
      hunterDeadeyeTargetX: 0,
      hunterDeadeyeTargetY: 0,
      hunterDeadeyeVx: 0,
      hunterDeadeyeVy: 0,
      ironCycleKind: "",
      ironWheelElapsedTicks: 0,
      ironWheelShotIndex: 0,
      ironWheelShotTotal: 0,
      ironWheelDurationTicks: 0,
      ironWheelDirection: 1,
      ironLaneIndex: 0,
      ironLaneCount: 0,
      ironLaneVertical: true,
      ironLaneForward: true,
      ironLane: 1,
      ironLaneStartX: 0,
      ironLaneStartY: 0,
      ironLaneEndX: 0,
      ironLaneEndY: 0,
      ironLaneElapsedTicks: 0,
      ironChargeTravel: 0,
      ironChargeDamagePending: false,
      ironSweepFacingRadians: 0,
      ironSweepElapsedTicks: 0,
      ironSweepDamagePending: false,
      bloodCycleIndex: 0,
      bloodWaveIndex: 0,
      bloodWaveTicks: 0,
      bloodLessonComplete: false,
      bloodVulnerableTicks: 0,
      bloodShadowVisible: false,
      bloodCrossfireLineIndex: 0,
      bloodCrossfireTicks: 0,
      bloodChargeVx: 0,
      bloodChargeVy: 0,
      bloodChargeTravelTicks: 0,
      deepCycleKind: "",
      deepStep: 0,
      deepCount: 0,
      deepDirection: 1,
      deepVertical: true,
      deepInitialVertical: true,
      deepSafeStrips: [],
      deepGapAngle: 0,
      deepRingRadius: 0,
      vulnerableTicks: 0,
    };
  }

  function reservePulse(state, pulseIndex) {
    invariant(state.reservedReinforcementEnemies.length === 0, "REINFORCEMENT_ALREADY_RESERVED");
    const pulse = state.plan.pulses[pulseIndex];
    state.reservedReinforcementEnemies = pulse.map((typeId) => createOrdinaryEnemy(state, typeId));
    state.reinforcementReservations = state.reservedReinforcementEnemies.map((enemy) => ({
      typeId: enemy.typeId,
      x: enemy.x,
      y: enemy.y,
      radius: enemy.radius,
    }));
  }

  function releasePulse(state, pulseIndex) {
    const pulse = state.plan.pulses[pulseIndex];
    const reserved = state.reservedReinforcementEnemies;
    if (reserved.length) {
      invariant(reserved.length === pulse.length, "BAD_REINFORCEMENT_RESERVATION");
      invariant(reserved.every((enemy, index) => enemy.typeId === pulse[index]), "BAD_REINFORCEMENT_RESERVATION");
      state.enemies.push(...reserved);
    } else {
      for (const typeId of pulse) state.enemies.push(createOrdinaryEnemy(state, typeId));
    }
    state.enemies.sort((left, right) => left.id - right.id);
    state.telemetry.reinforcementReleaseTicks.push({ pulseIndex, tick: state.stageTick });
    state.nextPulseIndex = pulseIndex + 1;
    state.reinforcementWarningTicks = 0;
    state.reinforcementReservations = [];
    state.reservedReinforcementEnemies = [];
  }

  function validateCarriedState(carried) {
    invariant(isPlainObject(carried), "BAD_CARRIED_STATE");
    const numericKeys = [
      "hpHundredths", "maxHpHundredths", "moveUnitsPerTick", "arrowDamageHundredths",
      "shotCooldownTicks", "criticalChanceBps", "criticalMultiplierBps",
      "regenerationHundredthsPerSecond", "damageReductionBps",
    ];
    const allowedKeys = [...numericKeys, "techniques", "statusPath", "evolutions"];
    invariant(Object.keys(carried).every((key) => allowedKeys.includes(key)), "BAD_CARRIED_STATE");
    for (const key of numericKeys.filter((name) => Object.prototype.hasOwnProperty.call(carried, name))) {
      invariant(Number.isSafeInteger(carried[key]) && carried[key] >= 0 && carried[key] <= 1000000, "BAD_CARRIED_STATE");
    }
    if (Object.prototype.hasOwnProperty.call(carried, "techniques")) {
      invariant(isPlainObject(carried.techniques), "BAD_CARRIED_STATE");
      for (const [id, rank] of Object.entries(carried.techniques)) {
        invariant(Boolean(BUILD_RULES.UPGRADE_BY_ID[id]) && BUILD_RULES.UPGRADE_BY_ID[id].kind === "technique", "BAD_CARRIED_STATE");
        invariant(Number.isSafeInteger(rank) && rank >= 1 && rank <= 3, "BAD_CARRIED_STATE");
      }
    }
    if (Object.prototype.hasOwnProperty.call(carried, "statusPath")) invariant(["", "poison", "frost", "bleed"].includes(carried.statusPath), "BAD_CARRIED_STATE");
    if (Object.prototype.hasOwnProperty.call(carried, "evolutions")) {
      invariant(isPlainObject(carried.evolutions), "BAD_CARRIED_STATE");
      for (const [id, enabled] of Object.entries(carried.evolutions)) {
        invariant(Boolean(BUILD_RULES.EVOLUTION_BY_ID[id]) && enabled === true, "BAD_CARRIED_STATE");
      }
    }
    return true;
  }

  function createStageState(manifest, stage, loadout = FIXED_LOADOUT, carried = {}) {
    validateManifest(manifest);
    validateFixedLoadout(loadout, manifest.loadoutPolicy);
    stageDef(stage);
    validateCarriedState(carried);
    const foundation = FOUNDATION_DEFS[loadout.foundationIds[0]];
    const maximumHpHundredths = carried.maxHpHundredths || foundation.maximumHpHundredths;
    const state = {
      manifest,
      plan: stagePlanFor(manifest, stage),
      loadout: clone(loadout),
      stage,
      stageTick: 0,
      outcome: "RUNNING",
      player: {
        x: manifest.rules.player.startX,
        y: manifest.rules.player.startY,
        hpHundredths: clamp(carried.hpHundredths || maximumHpHundredths, 1, maximumHpHundredths),
        maxHpHundredths: maximumHpHundredths,
        moveUnitsPerTick: carried.moveUnitsPerTick || roundRatio(manifest.rules.player.moveUnitsPerTick * foundation.moveSpeedBps, 10000),
        arrowDamageHundredths: carried.arrowDamageHundredths || roundRatio(manifest.rules.player.arrowDamageHundredths * foundation.arrowDamageBps, 10000),
        shotCooldownTicks: carried.shotCooldownTicks || manifest.rules.player.shotCooldownTicks,
        criticalChanceBps: carried.criticalChanceBps || manifest.rules.player.criticalChanceBps,
        criticalMultiplierBps: carried.criticalMultiplierBps || manifest.rules.player.criticalMultiplierBps,
        regenerationHundredthsPerSecond: carried.regenerationHundredthsPerSecond || 0,
        regenerationRemainder: 0,
        damageReductionBps: carried.damageReductionBps || 0,
        barrierHundredths: 0,
        barrierTimerTicks: 0,
        silenceTicks: 0,
        stillTicks: 0,
        survivorsOathActive: false,
        shotCooldown: 0,
        shotCount: 0,
        moving: false,
        roomGraceTicks: manifest.rules.player.roomGraceTicks,
      },
      enemies: [],
      arrows: [],
      enemyShots: [],
      hazards: [],
      bossAnchor: null,
      houndRuns: [],
      scentTrail: null,
      bruteStakes: [],
      nextEnemyId: 1,
      nextArrowId: 1,
      nextEnemyShotId: 1,
      nextHazardId: 1,
      nextHoundRunId: 1,
      nextPulseIndex: 0,
      reinforcementWarningTicks: 0,
      reinforcementReservations: [],
      reservedReinforcementEnemies: [],
      score: 0,
      baseScore: 0,
      streakScore: 0,
      kills: [],
      streakCount: 0,
      bestStreak: 0,
      lastKillTick: null,
      damageTakenHundredths: 0,
      techniques: clone(carried.techniques || {}),
      statusPath: carried.statusPath || "",
      evolutions: clone(carried.evolutions || {}),
      telemetry: {
        autoshotTicks: [],
        criticalResults: [],
        collisionCount: 0,
        reinforcementReleaseTicks: [],
        enemyShotTicks: [],
        hazardTicks: [],
        optionalSpriteSpawns: [],
        bossMechanicEvents: [],
      },
      prng: {
        combat: new DeterministicPrng(manifest.simulationSeeds.combat),
        rewards: new DeterministicPrng(manifest.simulationSeeds.rewards),
        bosses: new DeterministicPrng(manifest.simulationSeeds.bosses),
      },
    };
    // Domain-separate stages without relying on mutable activity in earlier rooms.
    for (let index = 1; index < stage; index += 1) {
      state.prng.combat.nextUint32();
      state.prng.combat.nextUint32();
    }
    if (isOrdinaryStage(stage)) releasePulse(state, 0);
    else state.enemies.push(createBossEnemy(state));
    return state;
  }

  function bossById(state, bossId) {
    return state.enemies.find((enemy) => enemy.id === bossId && enemy.boss) || null;
  }

  function clearDeadBossPressure(state, dead) {
    const deadBossIds = new Set(dead.filter((enemy) => enemy.boss).map((enemy) => enemy.id));
    if (!deadBossIds.size) return;
    state.houndRuns = state.houndRuns.filter((run) => !deadBossIds.has(run.sourceBossId));
    if (state.scentTrail && deadBossIds.has(state.scentTrail.ownerBossId)) state.scentTrail = null;
    state.bruteStakes = [];
  }

  function createBossAnchor(state, boss, options = {}) {
    if (state.bossAnchor?.active) breakBossAnchor(state, "replaced");
    state.bossAnchor = HUNTERS_KNOT.createAnchor({
      player: state.player,
      boss,
      arena: state.manifest.rules.arena,
      ownerBossId: boss.id,
      limit: options.limit,
    });
    recordBossMechanic(state, boss, "anchorCreated", {
      hits: HUNTERS_KNOT.RULES.anchorHits,
      x: state.bossAnchor.x,
      y: state.bossAnchor.y,
      limit: state.bossAnchor.limit,
    });
    return state.bossAnchor;
  }

  function breakBossAnchor(state, reason) {
    const anchor = state.bossAnchor;
    if (!anchor?.active) return false;
    const boss = bossById(state, anchor.ownerBossId);
    const broken = HUNTERS_KNOT.breakAnchor(anchor, reason);
    if (broken && boss) recordBossMechanic(state, boss, "anchorBroken", { reason });
    return broken;
  }

  function clearBossAnchor(state, ownerBossId) {
    if (state.bossAnchor?.ownerBossId !== ownerBossId) return;
    state.bossAnchor = null;
  }

  function movePlayer(state, input) {
    validateTickInput(input);
    const rules = state.manifest.rules;
    state.player.moving = input.x !== 0 || input.y !== 0;
    const moveUnits = roundRatio(state.player.moveUnitsPerTick * playerHazardSlowBps(state), 10000);
    let step = state.player.moving ? normalizedStep(input.x, input.y, moveUnits) : { x: 0, y: 0 };
    if (state.bossAnchor?.active) {
      const movement = HUNTERS_KNOT.applyAnchorMovement(state.bossAnchor, state.player, step, state.player.moving);
      step = { x: movement.x, y: movement.y };
      if (movement.snapped) {
        const boss = bossById(state, state.bossAnchor.ownerBossId);
        if (boss) recordBossMechanic(state, boss, "anchorBroken", { reason: "strain" });
      }
    }
    if (!state.player.moving) return;
    state.player.x = clamp(state.player.x + step.x, rules.arena.padding + rules.player.radius, rules.arena.width - rules.arena.padding - rules.player.radius);
    state.player.y = clamp(state.player.y + step.y, rules.arena.padding + rules.player.radius, rules.arena.height - rules.arena.padding - rules.player.radius);
  }

  function nearestEnemy(state, point, ignoredIds = null) {
    let best = null;
    let bestDistance = Number.MAX_SAFE_INTEGER;
    for (const enemy of state.enemies) {
      if (ignoredIds?.has(enemy.id) || enemy.invulnerable) continue;
      const distance = squaredDistance(point, enemy);
      if (distance < bestDistance || (distance === bestDistance && (!best || enemy.id < best.id))) {
        best = enemy;
        bestDistance = distance;
      }
    }
    return best;
  }

  function fifthBellCombatEpoch(enemy) {
    if (!enemy.boss) return `enemy-${enemy.id}:life`;
    if (enemy.typeId === "forestBoss") {
      if (enemy.phase === 1) {
        const armorBand = Math.ceil(enemy.armorHundredths * 4 / Math.max(1, enemy.armorMaxHundredths));
        return `boss-${enemy.id}:armour:${armorBand}`;
      }
      if (enemy.phase === 3) return `boss-${enemy.id}:phase-3:${enemy.phaseThreeSegment || 1}`;
    }
    return `boss-${enemy.id}:phase-${enemy.phase || 1}:${enemy.armorHundredths > 0 ? "armour" : "health"}`;
  }

  function recordFifthBellImpact(state, enemy, arrow, dealt) {
    if (!hasStageRelic(state, RUN_RELICS.IDS.FIFTH_BELL) || dealt <= 0) return;
    if (arrow.bellCycleIndex < 1 || arrow.bellCycleIndex > 4) return;
    const bell = stageRelicState(state, RUN_RELICS.IDS.FIFTH_BELL);
    const epoch = fifthBellCombatEpoch(enemy);
    const key = `${enemy.id}|${epoch}`;
    const record = bell.bellLedgerByTargetEpoch[key] || {
      targetId: enemy.id,
      combatEpoch: epoch,
      hitCount: 0,
      damage: 0,
      volleyIds: [],
    };
    record.hitCount += 1;
    record.damage += dealt;
    if (!record.volleyIds.includes(arrow.volleyId)) record.volleyIds.push(arrow.volleyId);
    bell.bellLedgerByTargetEpoch[key] = record;
    bell.bellRecordedHitCount += 1;
    bell.bellRecordedDamage += dealt;
  }

  function resolveFifthBell(state) {
    const bell = stageRelicState(state, RUN_RELICS.IDS.FIFTH_BELL);
    const dead = [];
    for (const key of Object.keys(bell.bellLedgerByTargetEpoch).sort()) {
      const record = bell.bellLedgerByTargetEpoch[key];
      const requested = roundRatio(record.damage * 11250, 10000);
      const target = state.enemies.find((enemy) => enemy.id === record.targetId);
      const valid = target && target.hpHundredths > 0 && !target.invulnerable
        && fifthBellCombatEpoch(target) === record.combatEpoch;
      if (!valid) {
        bell.bellSkippedDamage += requested;
        continue;
      }
      const dealt = dealEnemyDamage(state, target, requested);
      bell.bellPaidDamage += dealt;
      bell.bellSkippedDamage += Math.max(0, requested - dealt);
      if (target.hpHundredths <= 0) dead.push(target);
    }
    if (dead.length) {
      const deadIds = new Set(dead.map((enemy) => enemy.id));
      clearDeadBossPressure(state, dead);
      for (const enemy of dead.sort((left, right) => left.id - right.id)) awardKill(state, enemy);
      state.enemies = state.enemies.filter((enemy) => !deadIds.has(enemy.id));
      for (const enemy of dead) spawnOozeChildren(state, enemy);
      state.enemies.sort((left, right) => left.id - right.id);
    }
    bell.bellAutoshotIndex = 0;
    bell.bellLedgerByTargetEpoch = {};
    bell.bellSilenceRemaining = TICK_RATE;
    state.player.silenceTicks = TICK_RATE;
  }

  function updateAutoshot(state) {
    const rules = state.manifest.rules.player;
    if (state.player.shotCooldown > 0) state.player.shotCooldown -= 1;
    if (state.player.moving || state.player.shotCooldown > 0 || state.player.silenceTicks > 0 || state.enemies.length === 0) return;
    const target = state.bossAnchor?.active ? state.bossAnchor : nearestEnemy(state, state.player);
    if (!target) return;
    let bellCycleIndex = 0;
    if (hasStageRelic(state, RUN_RELICS.IDS.FIFTH_BELL)) {
      const bell = stageRelicState(state, RUN_RELICS.IDS.FIFTH_BELL);
      if (bell.bellAutoshotIndex >= 4) {
        resolveFifthBell(state);
        state.player.shotCooldown = state.player.shotCooldownTicks;
        return;
      }
      bell.bellAutoshotIndex += 1;
      bellCycleIndex = bell.bellAutoshotIndex;
    }
    const targetX = target.x - state.player.x;
    const targetY = target.y - state.player.y;
    const multishotRank = Number(state.techniques.multishot || 0);
    const projectileCount = [1, 2, 3, 4][multishotRank];
    const splinterBps = state.optionalRewards?.splinterVolleyCharges > 0 ? 20000 : 10000;
    const damageBps = roundRatio([10000, 6000, 4500, 3750][multishotRank] * splinterBps, 10000);
    const bodkinRank = Number(state.techniques.bodkinArrows || 0);
    const ricochetRank = Number(state.techniques.ricochet || 0);
    state.telemetry.autoshotTicks.push(state.stageTick);
    state.player.shotCount += 1;
    const bloodPact = Boolean(state.evolutions.bloodPact)
      && state.player.shotCount % 6 === 0
      && state.player.hpHundredths * 4 >= state.player.maxHpHundredths;
    const siegeReady = Boolean(state.evolutions.siegeArrow) && state.player.stillTicks >= TICK_RATE;
    if (bloodPact) applyPlayerHealthPayment(state, roundRatio(state.player.maxHpHundredths * 300, 10000));
    if (siegeReady) state.player.stillTicks = 0;
    if (splinterBps > 10000) {
      state.optionalRewards.splinterVolleyCharges -= 1;
      if (state.optionalRewards.splinterVolleyCharges <= 0) {
        state.optionalRewards.splinterVolleyCharges = 0;
        state.optionalRewards.splinterVolleyExpiresAfterStage = 0;
      }
    }
    for (let index = 0; index < projectileCount; index += 1) {
      const doubledOffset = 2 * index - (projectileCount - 1);
      const directionX = projectileCount === 1 ? targetX : targetX * 1000 - targetY * doubledOffset * 65;
      const directionY = projectileCount === 1 ? targetY : targetY * 1000 + targetX * doubledOffset * 65;
      const velocity = normalizedStep(directionX, directionY, rules.arrowSpeedUnitsPerTick);
      const critical = state.prng.combat.range(10000) < state.player.criticalChanceBps;
      const centralArrow = index === Math.floor((projectileCount - 1) / 2);
      const empowered = centralArrow && (bloodPact || siegeReady);
      const baseDamage = roundRatio(roundRatio(state.player.arrowDamageHundredths * damageBps, 10000) * (empowered ? 25000 : 10000), 10000);
      const damage = critical
        ? roundRatio(baseDamage * state.player.criticalMultiplierBps, 10000)
        : baseDamage;
      state.telemetry.criticalResults.push(critical);
      state.arrows.push({
        id: state.nextArrowId++,
        volleyId: state.player.shotCount,
        x: state.player.x,
        y: state.player.y,
        vx: velocity.x,
        vy: velocity.y,
        ttl: rules.arrowTtlTicks,
        damageHundredths: damage,
        isCritical: critical,
        bellCycleIndex,
        remainingHits: centralArrow && siegeReady ? 99 : 1 + bodkinRank,
        pierceDecayBps: centralArrow && siegeReady ? 8000 : [10000, 7500, 8000, 8500][bodkinRank],
        remainingBounces: centralArrow && siegeReady ? 0 : ricochetRank,
        bounceDecayBps: [10000, 6500, 6500, 7000][ricochetRank],
        hitIds: [],
        pinballRestoredIds: [],
        contagionStack: null,
        forceBleedApplications: centralArrow && bloodPact ? 3 : 1,
        siege: centralArrow && siegeReady,
      });
    }
    state.player.shotCooldown = state.player.shotCooldownTicks;
  }

  function shieldBlocksArrow(enemy, arrow) {
    if (enemy.behavior !== "shield" || enemy.shieldBroken) return false;
    const incomingX = arrow.x - enemy.x;
    const incomingY = arrow.y - enemy.y;
    const facingLength = integerSqrt(enemy.facingX * enemy.facingX + enemy.facingY * enemy.facingY) || 1;
    const incomingLength = integerSqrt(incomingX * incomingX + incomingY * incomingY) || 1;
    const dot = enemy.facingX * incomingX + enemy.facingY * incomingY;
    return dot >= 0 && dot * 10000 >= facingLength * incomingLength * 7071;
  }

  function awardKill(state, enemy) {
    const policy = SCORE_POLICY[enemy.scorePolicy];
    invariant(Boolean(policy), "UNKNOWN_SCORE_POLICY");
    let awardedScore = 0;
    let streakBonus = 0;
    if (policy.award === "derived") {
      if (policy.advancesStreak) {
        state.streakCount = state.lastKillTick !== null
          && state.stageTick - state.lastKillTick < state.manifest.rules.scoring.streakWindowTicks
          ? state.streakCount + 1
          : 1;
        state.lastKillTick = state.stageTick;
        state.bestStreak = Math.max(state.bestStreak, state.streakCount);
      }
      const bonusBps = policy.advancesStreak
        ? Math.min(state.manifest.rules.scoring.streakMaxBonusBps, Math.max(0, state.streakCount - 1) * state.manifest.rules.scoring.streakStepBps)
        : 0;
      awardedScore = roundRatio(enemy.baseScore * (10000 + bonusBps), 10000);
      streakBonus = awardedScore - enemy.baseScore;
      state.baseScore += enemy.baseScore;
      state.streakScore += streakBonus;
    } else {
      awardedScore = policy.award;
      state.baseScore += awardedScore;
    }
    state.score += awardedScore;
    state.kills.push({
      enemyId: enemy.id,
      typeId: enemy.typeId,
      child: enemy.child,
      tick: state.stageTick,
      scorePolicy: enemy.scorePolicy,
      baseScore: enemy.baseScore,
      streakCount: state.streakCount,
      awardedScore,
    });
    if (enemy.boss) clearBossAnchor(state, enemy.id);
    if (enemy.scorePolicy === "mandatoryBossObjective") {
      const linkedBoss = state.enemies.find((candidate) => candidate.id === enemy.linkedBossId);
      if (linkedBoss) recordBossMechanic(state, linkedBoss, "rootHeartResolved", {
        heartIndex: enemy.heartIndex,
        awardedScore,
      });
    }
  }

  function spawnOozeChildren(state, enemy) {
    if (!enemy.childCount) return;
    for (let index = 0; index < enemy.childCount; index += 1) {
      const offsetX = index === 0 ? -160 : 160;
      const position = {
        x: clamp(enemy.x + offsetX, state.manifest.rules.arena.padding + 100, state.manifest.rules.arena.width - state.manifest.rules.arena.padding - 100),
        y: enemy.y,
      };
      state.enemies.push(createOrdinaryEnemy(state, enemy.typeId, {
        child: true,
        position,
        scorePolicy: enemy.scorePolicy,
      }));
    }
  }

  function grantOptionalSpriteReward(state, enemy) {
    if (!enemy.optionalSprite || !state.optionalRewards) return;
    if (enemy.optionalReward === "splinterVolley") {
      state.optionalRewards.splinterVolleyCharges = 6;
      state.optionalRewards.splinterVolleyExpiresAfterStage = state.stage + 1;
    } else if (enemy.optionalReward === "heartsGrace") {
      state.optionalRewards.heartsGraceStored = true;
      state.optionalRewards.heartsGraceExpiresAfterStage = state.stage + 1;
      maybeConsumeHeartsGrace(state);
    }
  }

  function applyPlayerHealing(state, generatedHundredths) {
    const generated = Math.max(0, Math.floor(generatedHundredths));
    if (generated <= 0) return 0;
    const ids = RUN_RELICS.IDS;
    if (hasStageRelic(state, ids.LAST_LIFE)) {
      stageRelicState(state, ids.LAST_LIFE).lastLifeHealingPrevented += generated;
      return 0;
    }
    if (hasStageRelic(state, ids.BORROWED_HEART)) {
      const heart = stageRelicState(state, ids.BORROWED_HEART);
      const stored = roundRatio(generated * 15000, 10000);
      heart.heartStore += stored;
      heart.heartHealingGenerated += generated;
      return 0;
    }
    const before = state.player.hpHundredths;
    state.player.hpHundredths = Math.min(state.player.maxHpHundredths, before + generated);
    const healed = state.player.hpHundredths - before;
    const excess = generated - healed;
    if (excess > 0 && hasStageRelic(state, ids.OVERFLOWING_HEART)) {
      const overflow = stageRelicState(state, ids.OVERFLOWING_HEART);
      const cap = roundRatio(state.player.maxHpHundredths * 3000, 10000);
      const converted = Math.min(excess, Math.max(0, cap - state.player.barrierHundredths));
      state.player.barrierHundredths += converted;
      overflow.overflowBarrier = state.player.barrierHundredths;
      overflow.overflowHealingConverted += converted;
    }
    return healed;
  }

  function maybeConsumeHeartsGrace(state) {
    if (!state.optionalRewards?.heartsGraceStored) return 0;
    if (state.player.hpHundredths * 10000 > state.player.maxHpHundredths * 4000) return 0;
    state.optionalRewards.heartsGraceStored = false;
    state.optionalRewards.heartsGraceExpiresAfterStage = 0;
    return applyPlayerHealing(state, roundRatio(state.player.maxHpHundredths * 2500, 10000));
  }

  function enemyIncomingDamageBps(enemy) {
    const brittleBps = enemy.brittleTicks > 0 ? 12000 : 10000;
    const hunterReversalBps = enemy.hunterVulnerableTicks > 0
      ? HUNTERS_KNOT.RULES.stormReversalDamageBps
      : 10000;
    const bloodHuntBps = enemy.bloodVulnerableTicks > 0
      ? BLOOD_HUNT.RULES.revealDamageBps
      : 10000;
    return roundRatio(roundRatio(brittleBps * hunterReversalBps, 10000) * bloodHuntBps, 10000);
  }

  function dealEnemyDamage(state, enemy, amountHundredths) {
    if (amountHundredths <= 0 || enemy.hpHundredths <= 0 || enemy.invulnerable) return 0;
    const crownMarks = state.stage === 15 && hasStageRelic(state, RUN_RELICS.IDS.BROKEN_CROWN_OATH)
      ? stageRelicState(state, RUN_RELICS.IDS.BROKEN_CROWN_OATH).brokenCrownMarks
      : 0;
    const ownedDamageBps = 10000 + crownMarks * 1250;
    let scaled = roundRatio(roundRatio(amountHundredths * ownedDamageBps, 10000) * enemyIncomingDamageBps(enemy), 10000);
    if (enemy.boss && enemy.armorHundredths > 0) {
      if (enemy.typeId === "forestBoss" && hasStageRelic(state, RUN_RELICS.IDS.BROKEN_CROWN_OATH)) {
        scaled = roundRatio(scaled * 6500, 10000);
      }
      const beforeArmor = enemy.armorHundredths;
      const hunterLessonFloor = enemy.typeId === "royalTrapper" && enemy.phase === 1
        && !enemy.hunterPhaseOneLessonComplete ? 100 : 0;
      let bloodLessonFloor = 0;
      if (enemy.phase === 1 && enemy.activeSeedId === "bloodHunt" && !enemy.bloodLessonComplete) {
        if (enemy.typeId === "forestBoss") {
          bloodLessonFloor = enemy.bossSeedIds.indexOf("bloodHunt") === 0
            ? roundRatio(enemy.armorMaxHundredths, 2)
            : 100;
        } else bloodLessonFloor = 100;
      }
      let finalArmorModuleFloor = 0;
      if (state.stage === 15 && enemy.typeId === "forestBoss" && enemy.phase === 1) {
        const firstModule = (enemy.armorModuleIndex || 0) === 0;
        const teachingComplete = enemy.armorModuleTicks >= BOSS_AUTHORITY_RULES.finalArmorModuleMinimumTicks;
        finalArmorModuleFloor = firstModule
          ? roundRatio(enemy.armorMaxHundredths * BOSS_AUTHORITY_RULES.finalArmorSplitBps, 10000)
          : teachingComplete ? 0 : BOSS_AUTHORITY_RULES.finalArmorLockHundredths;
      }
      const lessonFloor = Math.max(hunterLessonFloor, bloodLessonFloor, finalArmorModuleFloor);
      const dealtToArmor = Math.min(Math.max(0, enemy.armorHundredths - lessonFloor), scaled);
      enemy.armorHundredths -= dealtToArmor;
      for (let index = 1; index <= 4; index += 1) {
        const threshold = roundRatio(enemy.armorMaxHundredths * (4 - index), 4);
        if (beforeArmor > threshold && enemy.armorHundredths <= threshold) {
          const segmentId = `stage-${state.stage}:boss-${enemy.id}:armour-segment-${index}`;
          if (enemy.brokenArmorSegmentIds.includes(segmentId)) continue;
          enemy.brokenArmorSegmentIds.push(segmentId);
          enemy.armorSegmentsBroken = enemy.brokenArmorSegmentIds.length;
          if (state.run) consumeBorrowedHeart(state.run, segmentId);
          if (enemy.typeId === "forestBoss" && hasStageRelic(state, RUN_RELICS.IDS.BROKEN_CROWN_OATH)) {
            const crown = stageRelicState(state, RUN_RELICS.IDS.BROKEN_CROWN_OATH);
            crown.brokenCrownSegmentIds.push(segmentId);
            crown.brokenCrownMarks = Math.min(4, crown.brokenCrownSegmentIds.length);
            crown.playerDamageMultiplier = 1 + crown.brokenCrownMarks * 0.125;
            crown.regenerationBonus = crown.brokenCrownMarks * 15;
          }
        }
      }
      if (enemy.armorHundredths <= 0) {
        enemy.armorHundredths = 0;
        if (state.stage === 15 && enemy.typeId === "forestBoss" && enemy.armorModuleStarted) {
          recordBossMechanic(state, enemy, "finalArmorModuleCompleted", {
            moduleIndex: enemy.armorModuleIndex,
            seedId: enemy.activeSeedId,
            durationTicks: enemy.armorModuleTicks,
            armorHundredths: 0,
          });
        }
        cancelHunterStorm(state, enemy);
        if (state.bossAnchor?.ownerBossId === enemy.id && state.bossAnchor.active) breakBossAnchor(state, "recovered");
        state.houndRuns = state.houndRuns.filter((run) => run.sourceBossId !== enemy.id);
        state.scentTrail = null;
        state.bruteStakes = [];
        state.hazards = state.hazards.filter((hazard) => hazard.sourceEnemyId !== enemy.id);
        enemy.invulnerable = true;
        enemy.mode = "phaseTransition";
        enemy.phaseTransitionTicks = 90;
      }
      return dealtToArmor;
    }
    if (enemy.typeId === "forestBoss" && enemy.phase === 2 && scaled >= enemy.hpHundredths) {
      const dealtToFloor = Math.max(0, enemy.hpHundredths - 100);
      enemy.hpHundredths = 100;
      cancelHunterStorm(state, enemy);
      if (state.bossAnchor?.ownerBossId === enemy.id && state.bossAnchor.active) breakBossAnchor(state, "recovered");
      state.houndRuns = state.houndRuns.filter((run) => run.sourceBossId !== enemy.id);
      state.scentTrail = null;
      state.bruteStakes = [];
      state.hazards = state.hazards.filter((hazard) => hazard.sourceEnemyId !== enemy.id);
      enemy.invulnerable = true;
      enemy.mode = "finalPhaseTransition";
      enemy.phaseTransitionTicks = 90;
      recordBossMechanic(state, enemy, "falseClearStarted", { transitionTicks: enemy.phaseTransitionTicks });
      return dealtToFloor;
    }
    if (enemy.typeId === "forestBoss" && enemy.phase === 3 && !enemy.phaseThreeSegmentFourStarted) {
      const segment = enemy.phaseThreeSegment || PHASE_THREE.segmentForHp(enemy.hpHundredths, enemy.maxHpHundredths);
      const floor = segment === 3
        ? PHASE_THREE.segmentThreeTierFloorHundredths(enemy.maxHpHundredths, enemy.phaseThreeTier || 1)
        : PHASE_THREE.segmentFloorHundredths(enemy.maxHpHundredths, segment);
      const dealtToFloor = Math.min(scaled, Math.max(0, enemy.hpHundredths - floor));
      enemy.hpHundredths -= dealtToFloor;
      if (enemy.hpHundredths <= floor) {
        if (segment === 3 && (enemy.phaseThreeTier || 1) < 4) {
          enemy.phaseThreeTier = (enemy.phaseThreeTier || 1) + 1;
          state.enemyShots = [];
          state.hazards = [];
          recordBossMechanic(state, enemy, "phaseThreeTierStarted", {
            segment: 3,
            tier: enemy.phaseThreeTier,
          });
          startPhaseThreeRampage(state, enemy);
        } else {
          beginPhaseThreeSegment(state, enemy, segment + 1);
        }
      }
      return dealtToFloor;
    }
    const dealt = Math.min(enemy.hpHundredths, scaled);
    enemy.hpHundredths -= dealt;
    return dealt;
  }

  function applyRimeguardBarrier(state) {
    if (!state.evolutions.rimeguard) return;
    const target = roundRatio(state.player.maxHpHundredths * 800, 10000);
    state.player.barrierHundredths = Math.max(state.player.barrierHundredths, target);
    if (!hasStageRelic(state, RUN_RELICS.IDS.OVERFLOWING_HEART)) state.player.barrierTimerTicks = 3 * TICK_RATE;
  }

  function applyFrostHit(state, enemy, direct, sourceDamageHundredths) {
    const rank = Number(state.techniques.winterBinding || 0);
    if (rank <= 0) return false;
    enemy.frostTicks = [0, 120, 150, 180][rank];
    enemy.frostSlowBps = 10000 - [0, 1500, 2500, 3500][rank];
    if (enemy.brittleTicks > 0) return false;
    const threshold = enemy.boss ? [0, 7, 6, 5][rank] : [0, 5, 4, 3][rank];
    enemy.chill = Math.min(direct ? threshold : threshold - 1, enemy.chill + 1);
    if (!direct || enemy.chill < threshold) return false;
    enemy.chill = 0;
    if (enemy.boss) {
      enemy.freezeTicks = 0;
      enemy.brittleTicks = 2 * TICK_RATE;
    } else {
      enemy.freezeTicks = 48;
      enemy.brittleTicks = 3 * TICK_RATE;
      if (state.evolutions.glacialImpact) {
        for (const target of state.enemies) {
          if (target.id === enemy.id) continue;
          const radius = 1050 + target.radius;
          if (squaredDistance(target, enemy) > radius * radius) continue;
          dealEnemyDamage(state, target, roundRatio(sourceDamageHundredths * 7500, 10000));
          applyFrostHit(state, target, false, sourceDamageHundredths);
          if (!target.boss) {
            const step = normalizedStep(target.x - enemy.x, target.y - enemy.y, 420);
            target.x += step.x;
            target.y += step.y;
            clampEnemyToArena(state, target);
          }
        }
      }
    }
    applyRimeguardBarrier(state);
    return true;
  }

  function applyArrowStatus(state, enemy, arrow, directDamageHundredths) {
    if (enemy.optionalSprite) return;
    if (arrow.contagionStack) {
      enemy.poisonStacks.push(clone(arrow.contagionStack));
      arrow.contagionStack = null;
    }
    const poisonRank = Number(state.techniques.venomTips || 0);
    if (poisonRank > 0) {
      const applications = state.evolutions.plagueVolley && arrow.volleyId % 5 === 0 ? 2 : 1;
      for (let index = 0; index < applications; index += 1) {
        enemy.poisonStacks.push({
          dpsHundredths: [0, 75, 100, 125][poisonRank],
          remainingHalfTicks: [0, 360, 480, 600][poisonRank],
          remainder: 0,
        });
      }
    }

    const bleedRank = Number(state.techniques.serratedHeads || 0);
    if (bleedRank > 0) {
      const slotCount = [0, 2, 3, 4][bleedRank];
      const applications = arrow.forceBleedApplications || 1;
      for (let application = 0; application < applications; application += 1) {
        const occupied = new Set(enemy.bleedTranches.map((tranche) => tranche.slotIndex));
        let slotIndex = -1;
        for (let index = 0; index < slotCount; index += 1) {
          if (!occupied.has(index)) {
            slotIndex = index;
            break;
          }
        }
        if (slotIndex < 0) {
          slotIndex = enemy.bleedCursor % slotCount;
          enemy.bleedCursor = (slotIndex + 1) % slotCount;
        }
        enemy.bleedTranches.push({
          slotIndex,
          remainingDamageHundredths: roundRatio(directDamageHundredths * [0, 2000, 3500, 5500][bleedRank], 10000),
          remainingTicks: 180,
        });
      }
    }

    applyFrostHit(state, enemy, true, directDamageHundredths);

    const staggerRank = Number(state.techniques.staggeringShot || 0);
    if (staggerRank > 0 && !enemy.boss && !enemy.bossAspect) {
      const distance = [0, 160, 280, 400][staggerRank];
      const step = normalizedStep(enemy.x - state.player.x, enemy.y - state.player.y, distance);
      enemy.x += step.x;
      enemy.y += step.y;
      clampEnemyToArena(state, enemy);
      if (staggerRank === 3) enemy.staggerTicks = Math.max(enemy.staggerTicks, 12);
    }
  }

  function applyExecutioner(state, enemy, arrow) {
    if (!state.evolutions.executioner || !arrow.isCritical || enemy.bleedTranches.length === 0) return 0;
    let payout = 0;
    for (const tranche of enemy.bleedTranches) payout += roundRatio(tranche.remainingDamageHundredths * 6000, 10000);
    enemy.bleedTranches = [];
    return dealEnemyDamage(state, enemy, payout);
  }

  function applyBurstDamage(state, impactEnemy, directDamageHundredths, deadIds, dead) {
    if (impactEnemy.optionalSprite) return;
    const rank = Number(state.techniques.burstArrow || 0);
    if (rank <= 0) return;
    const radius = [0, 500, 750, 1000][rank];
    const damage = roundRatio(directDamageHundredths * [0, 2000, 3500, 5000][rank], 10000);
    for (const enemy of state.enemies) {
      if (enemy.id === impactEnemy.id || deadIds.has(enemy.id) || enemy.optionalSprite) continue;
      const collisionRadius = radius + enemy.radius;
      if (squaredDistance(impactEnemy, enemy) > collisionRadius * collisionRadius) continue;
      dealEnemyDamage(state, enemy, damage);
      if (state.evolutions.whiteout) applyFrostHit(state, enemy, false, directDamageHundredths);
      if (state.evolutions.concussiveBlast && !enemy.boss) {
        const step = normalizedStep(enemy.x - impactEnemy.x, enemy.y - impactEnemy.y, 360);
        const proposedX = enemy.x + step.x;
        const proposedY = enemy.y + step.y;
        enemy.x = proposedX;
        enemy.y = proposedY;
        clampEnemyToArena(state, enemy);
        if (enemy.x !== proposedX || enemy.y !== proposedY) {
          dealEnemyDamage(state, enemy, roundRatio(directDamageHundredths * 5000, 10000));
          enemy.staggerTicks = Math.max(enemy.staggerTicks, 15);
        }
      }
      if (enemy.hpHundredths <= 0) {
        deadIds.add(enemy.id);
        dead.push(enemy);
        awardKill(state, enemy);
      }
    }
  }

  function redirectRicochet(state, arrow, impactEnemy) {
    if (arrow.remainingBounces <= 0) return false;
    const ignored = new Set(arrow.hitIds);
    const target = nearestEnemy(state, impactEnemy, ignored);
    if (!target) return false;
    const pinballRestore = Boolean(state.evolutions.pinball) && arrow.isCritical
      && !arrow.pinballRestoredIds.includes(impactEnemy.id);
    if (pinballRestore) {
      arrow.pinballRestoredIds.push(impactEnemy.id);
    } else {
      arrow.remainingBounces -= 1;
      arrow.damageHundredths = roundRatio(arrow.damageHundredths * arrow.bounceDecayBps, 10000);
    }
    arrow.remainingHits = 1;
    if (state.evolutions.contagion && impactEnemy.poisonStacks.length) {
      arrow.contagionStack = clone(impactEnemy.poisonStacks[impactEnemy.poisonStacks.length - 1]);
    }
    const velocity = normalizedStep(target.x - impactEnemy.x, target.y - impactEnemy.y, state.manifest.rules.player.arrowSpeedUnitsPerTick);
    arrow.x = impactEnemy.x;
    arrow.y = impactEnemy.y;
    arrow.vx = velocity.x;
    arrow.vy = velocity.y;
    return true;
  }

  function updateArrows(state) {
    const rules = state.manifest.rules;
    const survivors = [];
    const dead = [];
    const deadIds = new Set();
    state.arrows.sort((left, right) => left.id - right.id);
    state.enemies.sort((left, right) => left.id - right.id);
    for (const arrow of state.arrows) {
      arrow.x += arrow.vx;
      arrow.y += arrow.vy;
      arrow.ttl -= 1;
      let consumed = false;
      const anchor = state.bossAnchor;
      if (anchor?.active) {
        const collisionRadius = anchor.radius + rules.player.arrowRadius;
        if (squaredDistance(arrow, anchor) <= collisionRadius * collisionRadius) {
          const hit = HUNTERS_KNOT.registerVolleyHit(anchor, arrow.volleyId);
          consumed = true;
          arrow.remainingHits = 0;
          if (hit.accepted) {
            const boss = bossById(state, anchor.ownerBossId);
            if (boss) recordBossMechanic(state, boss, "anchorHit", {
              volleyId: arrow.volleyId,
              hitsRemaining: hit.hitsRemaining,
            });
            if (hit.broken && boss) recordBossMechanic(state, boss, "anchorBroken", { reason: "shot" });
          }
        }
      }
      if (consumed) continue;
      for (const enemy of state.enemies) {
        if (deadIds.has(enemy.id) || arrow.hitIds.includes(enemy.id) || enemy.invulnerable) continue;
        const collisionRadius = enemy.radius + rules.player.arrowRadius;
        if (squaredDistance(arrow, enemy) > collisionRadius * collisionRadius) continue;
        state.telemetry.collisionCount += 1;
        arrow.hitIds.push(enemy.id);
        consumed = true;
        if (shieldBlocksArrow(enemy, arrow)) {
          enemy.shieldHits += 1;
          const definition = ENEMY_DEFS[enemy.typeId];
          if (enemy.shieldHits >= definition.shieldHits) enemy.shieldBroken = true;
          break;
        }
        const dealt = dealEnemyDamage(state, enemy, enemy.optionalSprite ? 100 : arrow.damageHundredths);
        if (!enemy.optionalSprite) recordFifthBellImpact(state, enemy, arrow, dealt);
        applyExecutioner(state, enemy, arrow);
        applyArrowStatus(state, enemy, arrow, dealt);
        if (enemy.hpHundredths <= 0) {
          deadIds.add(enemy.id);
          dead.push(enemy);
          grantOptionalSpriteReward(state, enemy);
          awardKill(state, enemy);
        }
        applyBurstDamage(state, enemy, dealt, deadIds, dead);
        arrow.remainingHits -= 1;
        if (arrow.remainingHits > 0) {
          arrow.damageHundredths = roundRatio(
            arrow.damageHundredths * (state.evolutions.skewer ? 11500 : arrow.pierceDecayBps),
            10000,
          );
          consumed = false;
        } else if (redirectRicochet(state, arrow, enemy)) {
          consumed = false;
        }
        break;
      }
      if (!consumed && arrow.remainingHits > 0 && arrow.ttl > 0 && arrow.x >= 0 && arrow.x <= rules.arena.width && arrow.y >= 0 && arrow.y <= rules.arena.height) {
        survivors.push(arrow);
      }
    }
    state.arrows = survivors;
    if (deadIds.size) {
      clearDeadBossPressure(state, dead);
      state.enemies = state.enemies.filter((enemy) => !deadIds.has(enemy.id));
      for (const enemy of dead.sort((left, right) => left.id - right.id)) spawnOozeChildren(state, enemy);
      state.enemies.sort((left, right) => left.id - right.id);
    }
  }

  function bannerMultiplierBps(state, enemy, speed) {
    if (enemy.typeId === "bannerCaptain") return 10000;
    const captain = state.enemies.find((candidate) => candidate.typeId === "bannerCaptain"
      && squaredDistance(candidate, enemy) <= (ENEMY_DEFS.bannerCaptain.auraRadius * 10) ** 2);
    if (!captain) return 10000;
    return speed ? 11800 : 12000;
  }

  function clampEnemyToArena(state, enemy) {
    const arena = state.manifest.rules.arena;
    enemy.x = clamp(enemy.x, arena.padding + enemy.radius, arena.width - arena.padding - enemy.radius);
    enemy.y = clamp(enemy.y, arena.padding + enemy.radius, arena.height - arena.padding - enemy.radius);
  }

  function moveEnemyByVector(state, enemy, dx, dy, speed, reverse = false) {
    const frostSlowBps = enemy.frostTicks > 0 ? enemy.frostSlowBps : 10000;
    const boosted = roundRatio(roundRatio(speed * bannerMultiplierBps(state, enemy, true), 10000) * frostSlowBps, 10000);
    const step = normalizedStep(reverse ? -dx : dx, reverse ? -dy : dy, boosted);
    enemy.x += step.x;
    enemy.y += step.y;
    clampEnemyToArena(state, enemy);
  }

  function fireEnemyShot(state, enemy) {
    const definition = ENEMY_DEFS[enemy.typeId];
    const speedUnitsPerTick = Math.max(1, roundRatio(definition.projectileSpeed * 10, TICK_RATE));
    const velocity = normalizedStep(state.player.x - enemy.x, state.player.y - enemy.y, speedUnitsPerTick);
    const difficulty = stageDifficulty(state.stage);
    const baseDamageHundredths = 600 + state.stage * 60;
    const damageHundredths = roundRatio(baseDamageHundredths * difficulty.dangerBps, 10000);
    state.enemyShots.push({
      id: state.nextEnemyShotId++,
      x: enemy.x,
      y: enemy.y,
      vx: velocity.x,
      vy: velocity.y,
      radius: 50,
      ttl: 4 * TICK_RATE,
      damageHundredths,
      sourceEnemyId: enemy.id,
    });
    state.telemetry.enemyShotTicks.push({ enemyId: enemy.id, tick: state.stageTick });
  }

  function createHazard(state, enemy, type) {
    const definition = ENEMY_DEFS[enemy.typeId];
    const difficulty = stageDifficulty(state.stage);
    const jitterX = state.prng.combat.range(401) - 200;
    const jitterY = state.prng.combat.range(401) - 200;
    const isNet = type === "net";
    const warningTicks = isNet ? 48 : 54;
    state.hazards.push({
      id: state.nextHazardId++,
      type,
      shape: "circle",
      x: clamp(state.player.x + jitterX, 600, state.manifest.rules.arena.width - 600),
      y: clamp(state.player.y + jitterY, 600, state.manifest.rules.arena.height - 600),
      radius: isNet ? 440 : 520,
      warningTicks,
      activeTicks: isNet ? 186 : 252,
      slowBps: isNet ? 4800 : 10000,
      damageHundredthsPerSecond: isNet ? 0 : roundRatio(600 * difficulty.dangerBps, 10000),
      damageRemainder: 0,
      impactDamageHundredths: 0,
      impacted: false,
      sourceEnemyId: enemy.id,
    });
    state.telemetry.hazardTicks.push({ enemyId: enemy.id, type, tick: state.stageTick });
    enemy.shotTicks = definition.shotCooldownTicks;
  }

  function recordBossMechanic(state, enemy, type, details = {}) {
    state.telemetry.bossMechanicEvents.push({
      tick: state.stageTick,
      bossId: enemy.id,
      type,
      ...clone(details),
    });
  }

  function createBossHazard(state, enemy, options) {
    invariant(isPlainObject(options), "BAD_BOSS_HAZARD");
    const shape = options.shape || "circle";
    invariant(["circle", "verticalLane", "horizontalLane", "ring"].includes(shape), "BAD_BOSS_HAZARD");
    state.hazards.push({
      id: state.nextHazardId++,
      type: options.type || "bossImpact",
      shape,
      x: options.x ?? state.player.x,
      y: options.y ?? state.player.y,
      radius: options.radius || 520,
      ringInnerRadius: options.ringInnerRadius || 0,
      laneIndex: options.laneIndex ?? 1,
      warningTicks: options.warningTicks || 45,
      activeTicks: options.activeTicks || 1,
      slowBps: options.slowBps || 10000,
      damageHundredthsPerSecond: options.damageHundredthsPerSecond || 0,
      damageRemainder: 0,
      impactDamageHundredths: options.impactDamageHundredths || 0,
      impacted: false,
      sourceEnemyId: enemy.id,
      hunterStormCastId: options.hunterStormCastId || 0,
      hunterImpactCoreRadius: options.hunterImpactCoreRadius || 0,
      phaseThreeErupts: Boolean(options.phaseThreeErupts),
      phaseThreeVertical: Boolean(options.phaseThreeVertical),
      cancelled: false,
    });
    state.telemetry.hazardTicks.push({ enemyId: enemy.id, type: options.type || "bossImpact", tick: state.stageTick });
  }

  function bossDamageHundredths(state, baseHundredths) {
    return roundRatio(roundRatio(baseHundredths * stageDifficulty(state.stage).dangerBps, 10000) * 7200, 10000);
  }

  function fireBossRadialShots(state, enemy, count = 16, offset = 0) {
    invariant(Number.isSafeInteger(count) && count >= 4 && count <= 16 && 16 % count === 0, "BAD_BOSS_SHOT_COUNT");
    const stride = 16 / count;
    const speed = Math.max(1, roundRatio(2050, TICK_RATE));
    for (let index = 0; index < count; index += 1) {
      const direction = RADIAL_DIRECTIONS[(offset + index * stride) % 16];
      state.enemyShots.push({
        id: state.nextEnemyShotId++,
        x: enemy.x,
        y: enemy.y,
        vx: roundRatio(direction[0] * speed, 1000),
        vy: roundRatio(direction[1] * speed, 1000),
        radius: 60,
        ttl: 5 * TICK_RATE,
        damageHundredths: bossDamageHundredths(state, 800),
        sourceEnemyId: enemy.id,
      });
    }
    state.telemetry.enemyShotTicks.push({ enemyId: enemy.id, tick: state.stageTick, radialCount: count });
  }

  function createRootHeart(state, boss, index) {
    const anchors = [[2600, 2800], [4800, 2200], [7000, 2800]];
    const anchor = anchors[index] || anchors[1];
    const hp = Math.max(900, roundRatio(boss.maxHpHundredths * 1000, 10000));
    return {
      id: state.nextEnemyId++,
      typeId: "rootHeart",
      behavior: "stationaryObjective",
      boss: false,
      bossAspect: true,
      x: anchor[0],
      y: anchor[1],
      radius: 180,
      hpHundredths: hp,
      maxHpHundredths: hp,
      scoreHpHundredths: hp,
      scoreSpeedHundredths: 0,
      speedUnitsPerTick: 0,
      touchHundredthsPerSecond: 0,
      contactDamageRemainder: 0,
      scorePolicy: "mandatoryBossObjective",
      baseScore: 90,
      child: false,
      childCount: 0,
      mode: "heartPattern",
      modeTicks: 0,
      actionTicks: 30,
      facingX: boss.x - anchor[0],
      facingY: boss.y - anchor[1],
      chargeVx: 0,
      chargeVy: 0,
      shotTicks: 0,
      shieldHits: 0,
      shieldBroken: true,
      strafeDirection: 1,
      poisonStacks: [],
      bleedTranches: [],
      bleedCursor: 0,
      frostTicks: 0,
      frostSlowBps: 10000,
      chill: 0,
      freezeTicks: 0,
      brittleTicks: 0,
      staggerTicks: 0,
      invulnerable: false,
      heartIndex: index,
      linkedBossId: boss.id,
      deepCycleKind: "",
      deepStep: 0,
      deepCount: 0,
      deepDirection: 1,
      deepVertical: true,
      deepInitialVertical: true,
      deepSafeStrips: [],
      deepGapAngle: 0,
      deepRingRadius: 0,
    };
  }

  function summonBossAdds(state, boss, deepRootProfile = false) {
    const roles = deepRootProfile
      ? [["netterA", "netTrapper"], ["netterB", "netTrapper"]]
      : [["utility", "netTrapper"], ["runner", "wolfRunner"]];
    const livingRoles = new Set(state.enemies
      .filter((enemy) => enemy.bossAddRole && enemy.linkedBossId === boss.id && enemy.hpHundredths > 0)
      .map((enemy) => enemy.bossAddRole));
    for (let index = 0; index < roles.length; index += 1) {
      const [role, typeId] = roles[index];
      if (livingRoles.has(role)) continue;
      const add = createOrdinaryEnemy(state, typeId, {
        child: true,
        scorePolicy: "bossSummon",
        position: {
          x: clamp(boss.x + (index === 0 ? -700 : 700), 500, 9100),
          y: clamp(boss.y + 540, 500, 5900),
        },
      });
      add.bossAddRole = role;
      add.linkedBossId = boss.id;
      const hpBps = deepRootProfile ? (index === 0 ? 2800 : 2200) : role === "runner" ? 2600 : 3400;
      add.hpHundredths = Math.max(role === "runner" ? 1400 : 2000, roundRatio(add.maxHpHundredths * hpBps, 10000));
      add.maxHpHundredths = add.hpHundredths;
      add.touchHundredthsPerSecond = roundRatio(add.touchHundredthsPerSecond * (role === "runner" ? 4500 : 3500), 10000);
      add.speedUnitsPerTick = roundRatio(add.speedUnitsPerTick * (role === "runner" ? 12800 : 9500), 10000);
      if (deepRootProfile) add.shotTicks = 27 + index * 39;
      state.enemies.push(add);
    }
    state.enemies.sort((left, right) => left.id - right.id);
  }

  function occupiedLane(state, vertical) {
    const coordinate = vertical ? state.player.x : state.player.y;
    const extent = vertical ? state.manifest.rules.arena.width : state.manifest.rules.arena.height;
    return clamp(Math.floor(coordinate * 3 / extent), 0, 2);
  }

  function hunterStormFormationPoints(state, enemy, count, radius) {
    const spacing = roundRatio(radius * 134, 100);
    const patterns = HUNTERS_KNOT.stormPatternNames(count);
    const candidates = patterns.filter((pattern) => pattern !== enemy.hunterLastStormPattern);
    const rotation = enemy.hunterStormPatternIndex % candidates.length;
    let pattern = candidates[rotation];
    let points = [];
    for (let attempt = 0; attempt < candidates.length; attempt += 1) {
      pattern = candidates[(rotation + attempt) % candidates.length];
      const offsets = HUNTERS_KNOT.stormPatternOffsets(count, pattern);
      points = offsets.map((offset) => ({
        x: clamp(state.player.x + roundRatio(offset.x * spacing, 1000), 600, state.manifest.rules.arena.width - 600),
        y: clamp(state.player.y + roundRatio(offset.y * spacing, 1000), 600, state.manifest.rules.arena.height - 600),
      }));
      if (hunterStormHasReachableExit(state, points, radius)) break;
    }
    enemy.hunterLastStormPattern = pattern;
    enemy.hunterStormPatternIndex += 1;
    return { pattern, points };
  }

  function cancelHunterStorm(state, enemy) {
    if (!enemy.hunterStormCastId) return;
    for (const hazard of state.hazards) {
      if (hazard.hunterStormCastId === enemy.hunterStormCastId) hazard.cancelled = true;
    }
    enemy.hunterStormCastId = 0;
  }

  function hunterStormHasReachableExit(state, points, radius) {
    const arena = state.manifest.rules.arena;
    const playerRadius = state.manifest.rules.player.radius;
    for (const distance of [roundRatio(radius * 175, 100), roundRatio(radius * 235, 100)]) {
      for (let index = 0; index < HUNTERS_KNOT.ESCAPE_DIRECTIONS.length; index += 1) {
        const direction = HUNTERS_KNOT.ESCAPE_DIRECTIONS[index];
        const candidate = {
          x: state.player.x + roundRatio(direction[0] * distance, 1000),
          y: state.player.y + roundRatio(direction[1] * distance, 1000),
        };
        if (candidate.x < arena.padding + playerRadius || candidate.x > arena.width - arena.padding - playerRadius
          || candidate.y < arena.padding + playerRadius || candidate.y > arena.height - arena.padding - playerRadius) continue;
        if (state.bossAnchor?.active) {
          const limit = state.bossAnchor.limit - playerRadius;
          if (squaredDistance(candidate, state.bossAnchor) > limit * limit) continue;
        }
        const clearance = radius + playerRadius + 40;
        if (points.every((point) => squaredDistance(candidate, point) > clearance * clearance)) return true;
      }
    }
    return false;
  }

  function spawnHunterStormWave(state, enemy) {
    const count = enemy.hunterCycleKind === "phaseOne"
      ? HUNTERS_KNOT.phaseOneStormCircleCount(enemy.armorHundredths, Math.max(1, enemy.armorMaxHundredths))
      : HUNTERS_KNOT.phaseTwoStormCircleCount(enemy.hpHundredths, Math.max(1, enemy.maxHpHundredths));
    const formation = hunterStormFormationPoints(state, enemy, count, enemy.hunterStormRadius);
    const impactCoreRadius = HUNTERS_KNOT.stormImpactCoreRadius(
      enemy.hunterStormRadius,
      state.manifest.rules.player.radius,
    );
    for (const point of formation.points) {
      createBossHazard(state, enemy, {
        type: "arrowStorm",
        x: point.x,
        y: point.y,
        radius: enemy.hunterStormRadius,
        warningTicks: Math.max(HUNTERS_KNOT.RULES.minimumStormWarningTicks, enemy.hunterStormWarningTicks),
        impactDamageHundredths: bossDamageHundredths(state, 1000),
        hunterStormCastId: enemy.hunterStormCastId,
        hunterImpactCoreRadius: impactCoreRadius,
      });
    }
    recordBossMechanic(state, enemy, "hunterStormWave", {
      castId: enemy.hunterStormCastId,
      circles: count,
      pattern: formation.pattern,
      reachableExit: hunterStormHasReachableExit(state, formation.points, enemy.hunterStormRadius),
      anchorActive: Boolean(state.bossAnchor?.active && state.bossAnchor.ownerBossId === enemy.id),
      impactCoreRadius,
    });
  }

  function startHunterStorm(state, enemy, options) {
    enemy.hunterBranch = "storm";
    enemy.hunterStormWavesRemaining = options.waves;
    enemy.hunterStormIntervalTicks = options.intervalTicks;
    enemy.hunterStormWarningTicks = Math.max(HUNTERS_KNOT.RULES.minimumStormWarningTicks, options.warningTicks);
    enemy.hunterStormRadius = options.radius;
    enemy.hunterStormCastSequence += 1;
    enemy.hunterStormCastId = enemy.id * 1000 + enemy.hunterStormCastSequence;
    enemy.mode = "hunterStorm";
    enemy.modeTicks = options.initialDelayTicks || 0;
    recordBossMechanic(state, enemy, "hunterStormStarted", {
      castId: enemy.hunterStormCastId,
      waves: options.waves,
      warningTicks: enemy.hunterStormWarningTicks,
    });
  }

  function beginHunterRecovery(state, enemy, ticks) {
    cancelHunterStorm(state, enemy);
    if (state.bossAnchor?.ownerBossId === enemy.id && state.bossAnchor.active) breakBossAnchor(state, "recovered");
    enemy.mode = "hunterRecovery";
    enemy.modeTicks = ticks;
    recordBossMechanic(state, enemy, "hunterRecoveryStarted", {
      branch: enemy.hunterBranch,
      durationTicks: ticks,
    });
  }

  function finishHunterCycle(enemy) {
    if (enemy.hunterCycleKind === "phaseOne") enemy.hunterLessonIndex += 1;
    if (enemy.hunterCycleKind === "phaseTwo") enemy.hunterFollowupIndex += 1;
    enemy.hunterBranch = "";
    enemy.hunterCycleKind = "";
    enemy.hunterFollowup = null;
    enemy.mode = "ready";
    enemy.actionTicks = 30;
  }

  function startHunterDeadeye(state, enemy) {
    enemy.mode = "hunterDeadeyeTrack";
    enemy.modeTicks = HUNTERS_KNOT.RULES.deadeyeTrackTicks;
    enemy.hunterDeadeyeTargetX = state.player.x;
    enemy.hunterDeadeyeTargetY = state.player.y;
    recordBossMechanic(state, enemy, "hunterDeadeyeTrackingStarted", {
      anchored: Boolean(state.bossAnchor?.active && state.bossAnchor.ownerBossId === enemy.id),
      trackTicks: HUNTERS_KNOT.RULES.deadeyeTrackTicks,
      lockTicks: HUNTERS_KNOT.RULES.deadeyeLockTicks,
    });
  }

  function fireHunterDeadeye(state, enemy) {
    state.enemyShots.push({
      id: state.nextEnemyShotId++,
      kind: "deadeyeBolt",
      x: enemy.x,
      y: enemy.y,
      vx: enemy.hunterDeadeyeVx,
      vy: enemy.hunterDeadeyeVy,
      radius: 70,
      ttl: 5 * TICK_RATE,
      damageHundredths: roundRatio(roundRatio(enemy.touchHundredthsPerSecond * 25000, 10000) * 7200, 10000),
      sourceEnemyId: enemy.id,
    });
    state.telemetry.enemyShotTicks.push({ enemyId: enemy.id, tick: state.stageTick, kind: "deadeyeBolt" });
    recordBossMechanic(state, enemy, "hunterDeadeyeFired", {
      speedUnitsPerTick: HUNTERS_KNOT.RULES.deadeyeSpeedUnitsPerTick,
    });
    if (enemy.hunterCycleKind === "phaseOne") enemy.hunterPhaseOneLessonComplete = true;
    const recovery = enemy.hunterCycleKind === "phaseOne"
      ? HUNTERS_KNOT.RULES.phaseTwoEnragedRecoveryTicks
      : enemy.hunterCycleKind === "brute"
        ? 168
        : HUNTERS_KNOT.phaseTwoRecoveryTicks(enemy.hpHundredths, enemy.maxHpHundredths);
    beginHunterRecovery(state, enemy, recovery);
  }

  function startHuntersKnotPattern(state, enemy) {
    if (enemy.typeId === "royalTrapper" && enemy.phase === 1) {
      enemy.hunterCycleKind = "phaseOne";
      const lesson = enemy.hunterLessonIndex % 3;
      recordBossMechanic(state, enemy, "hunterPhaseOneLessonStarted", { lesson });
      if (lesson === 0) {
        startHunterStorm(state, enemy, {
          waves: HUNTERS_KNOT.RULES.phaseOneStormWaves,
          warningTicks: 63,
          intervalTicks: 41,
          initialDelayTicks: 18,
          radius: 400,
        });
      } else if (lesson === 1) {
        enemy.hunterBranch = "anchor";
        createBossAnchor(state, enemy);
        enemy.mode = "hunterAnchorSolo";
        enemy.modeTicks = 150;
      } else {
        enemy.hunterBranch = "deadeye";
        startHunterDeadeye(state, enemy);
      }
      return;
    }

    enemy.hunterCycleKind = enemy.typeId === "forestBoss" ? "brute" : "phaseTwo";
    const branch = enemy.hunterCycleKind === "brute"
      ? "storm"
      : enemy.hunterFollowupIndex % 2 === 0 ? "storm" : "deadeye";
    enemy.hunterBranch = branch;
    createBossAnchor(state, enemy, { limit: enemy.typeId === "forestBoss" ? 1840 : undefined });
    enemy.hunterFollowup = HUNTERS_KNOT.createFollowup(branch);
    enemy.mode = "hunterFollowup";
    enemy.modeTicks = HUNTERS_KNOT.RULES.followupDelayTicks;
    recordBossMechanic(state, enemy, "hunterFollowupQueued", {
      branch,
      delayTicks: HUNTERS_KNOT.RULES.followupDelayTicks,
      cycleKind: enemy.hunterCycleKind,
    });
  }

  function updateHuntersKnotPattern(state, enemy) {
    if (enemy.mode === "hunterAnchorSolo") {
      enemy.modeTicks -= 1;
      if (!state.bossAnchor?.active || enemy.modeTicks <= 0) {
        beginHunterRecovery(state, enemy, HUNTERS_KNOT.RULES.phaseTwoEnragedRecoveryTicks);
      }
      return true;
    }
    if (enemy.mode === "hunterFollowup") {
      enemy.modeTicks = Math.max(0, enemy.modeTicks - 1);
      if (HUNTERS_KNOT.tickFollowup(enemy.hunterFollowup)) {
        recordBossMechanic(state, enemy, "hunterFollowupStarted", {
          branch: enemy.hunterBranch,
          anchorActive: Boolean(state.bossAnchor?.active && state.bossAnchor.ownerBossId === enemy.id),
        });
        if (enemy.hunterBranch === "deadeye") startHunterDeadeye(state, enemy);
        else startHunterStorm(state, enemy, {
          waves: enemy.hunterCycleKind === "brute"
            ? HUNTERS_KNOT.RULES.bruteStormWaves
            : HUNTERS_KNOT.RULES.phaseTwoStormWaves,
          warningTicks: enemy.hunterCycleKind === "brute" ? 48 : 53,
          intervalTicks: enemy.hunterCycleKind === "brute" ? 26 : 30,
          initialDelayTicks: 0,
          radius: enemy.hunterCycleKind === "brute" ? 430 : 420,
        });
      }
      return true;
    }
    if (enemy.mode === "hunterStorm") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        spawnHunterStormWave(state, enemy);
        enemy.hunterStormWavesRemaining -= 1;
        if (enemy.hunterStormWavesRemaining > 0) enemy.modeTicks = enemy.hunterStormIntervalTicks;
        else {
          enemy.mode = "hunterStormWait";
          enemy.modeTicks = enemy.hunterStormWarningTicks + 19;
        }
      }
      return true;
    }
    if (enemy.mode === "hunterStormWait") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        const recovery = enemy.hunterCycleKind === "phaseOne"
          ? HUNTERS_KNOT.RULES.phaseTwoEnragedRecoveryTicks
          : enemy.hunterCycleKind === "brute"
            ? 168
            : HUNTERS_KNOT.phaseTwoRecoveryTicks(enemy.hpHundredths, enemy.maxHpHundredths);
        beginHunterRecovery(state, enemy, recovery);
      }
      return true;
    }
    if (enemy.mode === "hunterDeadeyeTrack") {
      enemy.hunterDeadeyeTargetX = state.player.x;
      enemy.hunterDeadeyeTargetY = state.player.y;
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        const velocity = normalizedStep(
          enemy.hunterDeadeyeTargetX - enemy.x,
          enemy.hunterDeadeyeTargetY - enemy.y,
          HUNTERS_KNOT.RULES.deadeyeSpeedUnitsPerTick,
        );
        enemy.hunterDeadeyeVx = velocity.x;
        enemy.hunterDeadeyeVy = velocity.y;
        enemy.mode = "hunterDeadeyeLock";
        enemy.modeTicks = HUNTERS_KNOT.RULES.deadeyeLockTicks;
        recordBossMechanic(state, enemy, "hunterDeadeyeLocked", {
          targetX: enemy.hunterDeadeyeTargetX,
          targetY: enemy.hunterDeadeyeTargetY,
        });
      }
      return true;
    }
    if (enemy.mode === "hunterDeadeyeLock") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) fireHunterDeadeye(state, enemy);
      return true;
    }
    if (enemy.mode === "hunterPunished") {
      enemy.modeTicks -= 1;
      enemy.hunterVulnerableTicks = Math.max(0, enemy.hunterVulnerableTicks - 1);
      if (enemy.modeTicks <= 0) finishHunterCycle(enemy);
      return true;
    }
    if (enemy.mode === "hunterRecovery") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) finishHunterCycle(enemy);
      return true;
    }
    return false;
  }

  function startIronCharge(state, enemy) {
    enemy.ironCycleKind = enemy.typeId === "forestBoss" ? "armor" : "phaseOne";
    enemy.mode = "ironChargeTelegraph";
    enemy.modeTicks = IRON_OATH.RULES.ordinaryChargeTelegraphTicks;
    enemy.ironChargeTravel = 0;
    enemy.ironChargeDamagePending = false;
    recordBossMechanic(state, enemy, "ironChargeTelegraphStarted", {
      warningTicks: enemy.modeTicks,
      armDistance: IRON_OATH.RULES.chargeArmDistance,
    });
  }

  function startIronSweep(state, enemy) {
    enemy.ironCycleKind = "phaseOne";
    enemy.mode = "ironSweep";
    enemy.modeTicks = IRON_OATH.RULES.sweepPoseTicks;
    enemy.ironSweepElapsedTicks = 0;
    enemy.ironSweepDamagePending = true;
    enemy.ironSweepFacingRadians = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    recordBossMechanic(state, enemy, "ironSweepStarted", {
      poseTicks: IRON_OATH.RULES.sweepPoseTicks,
      damageTick: IRON_OATH.RULES.sweepDamageTick,
      facingRadians: enemy.ironSweepFacingRadians,
    });
  }

  function finishIronCycle(enemy) {
    const rotateWheel = ["phaseTwo", "brute"].includes(enemy.ironCycleKind);
    enemy.ironCycleKind = "";
    enemy.mode = "ready";
    enemy.actionTicks = 30;
    if (rotateWheel) enemy.ironWheelDirection *= -1;
  }

  function startIronOathCycle(state, enemy) {
    enemy.ironCycleKind = enemy.typeId === "forestBoss" ? "brute" : "phaseTwo";
    enemy.x = roundRatio(state.manifest.rules.arena.width, 2);
    enemy.y = roundRatio(state.manifest.rules.arena.height, 2);
    enemy.mode = "ironChannelPrelude";
    enemy.modeTicks = enemy.ironCycleKind === "brute"
      ? enemy.phasePatternIndex === 1
        ? IRON_OATH.RULES.bruteInitialPreludeTicks
        : IRON_OATH.RULES.brutePreludeTicks
      : IRON_OATH.RULES.phaseTwoPreludeTicks;
    recordBossMechanic(state, enemy, "ironChannelStarted", {
      disappearTicks: IRON_OATH.RULES.channelHideTicks,
      preludeTicks: enemy.modeTicks,
      combatStatePreserved: true,
    });
  }

  function fireIronWheelShot(state, enemy) {
    const direction = IRON_OATH.wheelDirection(enemy.ironWheelShotIndex, enemy.ironWheelDirection);
    const speed = enemy.ironCycleKind === "brute" ? 39 : 34;
    state.enemyShots.push({
      id: state.nextEnemyShotId++,
      kind: "ironWheel",
      x: enemy.x,
      y: enemy.y,
      vx: roundRatio(direction[0] * speed, 1000),
      vy: roundRatio(direction[1] * speed, 1000),
      radius: 60,
      ttl: 5 * TICK_RATE,
      damageHundredths: bossDamageHundredths(state, 800),
      sourceEnemyId: enemy.id,
    });
    state.telemetry.enemyShotTicks.push({
      enemyId: enemy.id,
      tick: state.stageTick,
      kind: "ironWheel",
      shotIndex: enemy.ironWheelShotIndex,
    });
    enemy.ironWheelShotIndex += 1;
  }

  function startIronWheel(state, enemy) {
    enemy.mode = "ironWheel";
    enemy.ironWheelElapsedTicks = 0;
    enemy.ironWheelShotIndex = 0;
    enemy.ironWheelShotTotal = enemy.ironCycleKind === "brute"
      ? IRON_OATH.RULES.finalWheelShots
      : enemy.hpHundredths * 2 < enemy.maxHpHundredths ? 28 : 22;
    enemy.ironWheelDurationTicks = enemy.ironCycleKind === "brute"
      ? IRON_OATH.RULES.finalWheelDurationTicks
      : enemy.ironWheelShotTotal * 6;
    recordBossMechanic(state, enemy, "ironWheelStarted", {
      shots: enemy.ironWheelShotTotal,
      durationTicks: enemy.ironWheelDurationTicks,
    });
  }

  function chooseNextIronLane(state, enemy) {
    if (enemy.ironLaneIndex === 0) {
      enemy.ironLane = state.prng.bosses.range(3);
      return;
    }
    const choices = [0, 1, 2].filter((lane) => lane !== enemy.ironLane && Math.abs(lane - enemy.ironLane) <= 1);
    enemy.ironLane = choices[state.prng.bosses.range(choices.length)];
  }

  function startIronLaneTelegraph(state, enemy) {
    chooseNextIronLane(state, enemy);
    const geometry = IRON_OATH.laneGeometry(
      state.manifest.rules.arena,
      enemy.radius,
      enemy.ironLane,
      enemy.ironLaneVertical,
      enemy.ironLaneForward,
    );
    enemy.x = geometry.startX;
    enemy.y = geometry.startY;
    enemy.ironLaneStartX = geometry.startX;
    enemy.ironLaneStartY = geometry.startY;
    enemy.ironLaneEndX = geometry.endX;
    enemy.ironLaneEndY = geometry.endY;
    enemy.ironLaneElapsedTicks = 0;
    enemy.ironChargeTravel = 0;
    enemy.ironChargeDamagePending = false;
    enemy.mode = "ironLaneTelegraph";
    enemy.modeTicks = IRON_OATH.RULES.laneTelegraphTicks;
    recordBossMechanic(state, enemy, "ironLaneTelegraphStarted", {
      sequenceIndex: enemy.ironLaneIndex,
      lane: enemy.ironLane,
      vertical: enemy.ironLaneVertical,
      forward: enemy.ironLaneForward,
      warningTicks: enemy.modeTicks,
    });
  }

  function startIronLaneSequence(state, enemy) {
    enemy.ironLaneIndex = 0;
    enemy.ironLaneCount = enemy.ironCycleKind === "brute"
      ? IRON_OATH.RULES.laneChargeCount
      : enemy.hpHundredths * 2 < enemy.maxHpHundredths ? 5 : 4;
    enemy.ironLaneVertical = true;
    enemy.ironLaneForward = true;
    startIronLaneTelegraph(state, enemy);
  }

  function resolveIronChargeImpact(state, enemy, source) {
    const dealt = applyPlayerDamage(state, IRON_OATH.RULES.chargeDamageHundredths);
    recordBossMechanic(state, enemy, "ironChargeImpact", {
      source,
      amountHundredths: IRON_OATH.RULES.chargeDamageHundredths,
      dealtHundredths: dealt,
      travel: enemy.ironChargeTravel,
    });
  }

  function updateIronOathPattern(state, enemy) {
    if (enemy.mode === "ironChargeTelegraph") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        const velocity = normalizedStep(
          state.player.x - enemy.x,
          state.player.y - enemy.y,
          IRON_OATH.RULES.ordinaryChargeSpeedUnitsPerTick,
        );
        enemy.chargeVx = velocity.x;
        enemy.chargeVy = velocity.y;
        enemy.mode = "ironCharge";
        enemy.modeTicks = IRON_OATH.RULES.ordinaryChargeTicks;
        enemy.ironChargeTravel = 0;
        enemy.ironChargeDamagePending = true;
        recordBossMechanic(state, enemy, "ironChargeStarted", {
          durationTicks: enemy.modeTicks,
          vx: enemy.chargeVx,
          vy: enemy.chargeVy,
        });
      }
      return true;
    }
    if (enemy.mode === "ironCharge") {
      const start = { x: enemy.x, y: enemy.y };
      enemy.x += enemy.chargeVx;
      enemy.y += enemy.chargeVy;
      clampEnemyToArena(state, enemy);
      const segment = IRON_OATH.armedChargeSegment({
        previousTravel: enemy.ironChargeTravel,
        start,
        end: enemy,
        player: state.player,
        playerRadius: state.manifest.rules.player.radius,
        bossRadius: enemy.radius,
      });
      enemy.ironChargeTravel = segment.totalTravel;
      if (segment.hit && enemy.ironChargeDamagePending) {
        enemy.ironChargeDamagePending = false;
        resolveIronChargeImpact(state, enemy, "charge");
      }
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        enemy.mode = "ironChargeRecovery";
        enemy.modeTicks = IRON_OATH.RULES.ordinaryChargeRecoveryTicks;
        enemy.ironChargeDamagePending = false;
      }
      return true;
    }
    if (enemy.mode === "ironChargeRecovery") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) finishIronCycle(enemy);
      return true;
    }
    if (enemy.mode === "ironSweep") {
      enemy.ironSweepElapsedTicks += 1;
      enemy.modeTicks -= 1;
      if (enemy.ironSweepDamagePending && enemy.ironSweepElapsedTicks >= IRON_OATH.RULES.sweepDamageTick) {
        enemy.ironSweepDamagePending = false;
        const hit = IRON_OATH.sweepIntersects({
          boss: enemy,
          player: state.player,
          playerRadius: state.manifest.rules.player.radius,
          facingRadians: enemy.ironSweepFacingRadians,
        });
        const amount = roundRatio(
          roundRatio(enemy.touchHundredthsPerSecond * IRON_OATH.RULES.sweepDamageScaleBps, 10000) * 7200,
          10000,
        );
        const dealt = hit ? applyPlayerDamage(state, amount) : 0;
        recordBossMechanic(state, enemy, "ironSweepDamage", { hit, amountHundredths: amount, dealtHundredths: dealt });
      }
      if (enemy.modeTicks <= 0) {
        enemy.mode = "ironSweepRecovery";
        enemy.modeTicks = IRON_OATH.RULES.sweepRecoveryTicks;
        recordBossMechanic(state, enemy, "ironSweepRecoveryStarted", { durationTicks: enemy.modeTicks });
      }
      return true;
    }
    if (enemy.mode === "ironSweepRecovery") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        recordBossMechanic(state, enemy, "ironSweepRecoveryEnded");
        finishIronCycle(enemy);
      }
      return true;
    }
    if (enemy.mode === "ironChannelPrelude") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) startIronWheel(state, enemy);
      return true;
    }
    if (enemy.mode === "ironWheel") {
      enemy.ironWheelElapsedTicks += 1;
      while (enemy.ironWheelShotIndex < enemy.ironWheelShotTotal) {
        const dueTick = enemy.ironCycleKind === "brute"
          ? IRON_OATH.finalWheelShotTicks()[enemy.ironWheelShotIndex]
          : (enemy.ironWheelShotIndex + 1) * 6;
        if (enemy.ironWheelElapsedTicks < dueTick) break;
        fireIronWheelShot(state, enemy);
      }
      if (enemy.ironWheelElapsedTicks >= enemy.ironWheelDurationTicks) {
        recordBossMechanic(state, enemy, "ironWheelCompleted", {
          shots: enemy.ironWheelShotIndex,
          durationTicks: enemy.ironWheelElapsedTicks,
        });
        if (enemy.ironCycleKind === "brute") {
          enemy.mode = "ironBreather";
          enemy.modeTicks = IRON_OATH.RULES.bruteBreatherTicks;
        } else startIronLaneSequence(state, enemy);
      }
      return true;
    }
    if (enemy.mode === "ironBreather") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) startIronLaneSequence(state, enemy);
      return true;
    }
    if (enemy.mode === "ironLaneTelegraph") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        enemy.mode = "ironLaneCharge";
        enemy.modeTicks = IRON_OATH.RULES.laneChargeTicks;
        enemy.ironLaneElapsedTicks = 0;
        enemy.ironChargeTravel = 0;
        enemy.ironChargeDamagePending = true;
        recordBossMechanic(state, enemy, "ironLaneChargeStarted", {
          sequenceIndex: enemy.ironLaneIndex,
          durationTicks: enemy.modeTicks,
        });
      }
      return true;
    }
    if (enemy.mode === "ironLaneCharge") {
      const start = { x: enemy.x, y: enemy.y };
      enemy.ironLaneElapsedTicks += 1;
      enemy.x = roundRatio(
        enemy.ironLaneStartX * (IRON_OATH.RULES.laneChargeTicks - enemy.ironLaneElapsedTicks)
          + enemy.ironLaneEndX * enemy.ironLaneElapsedTicks,
        IRON_OATH.RULES.laneChargeTicks,
      );
      enemy.y = roundRatio(
        enemy.ironLaneStartY * (IRON_OATH.RULES.laneChargeTicks - enemy.ironLaneElapsedTicks)
          + enemy.ironLaneEndY * enemy.ironLaneElapsedTicks,
        IRON_OATH.RULES.laneChargeTicks,
      );
      const segment = IRON_OATH.armedChargeSegment({
        previousTravel: enemy.ironChargeTravel,
        start,
        end: enemy,
        player: state.player,
        playerRadius: state.manifest.rules.player.radius,
        bossRadius: enemy.radius,
      });
      enemy.ironChargeTravel = segment.totalTravel;
      if (segment.hit && enemy.ironChargeDamagePending) {
        enemy.ironChargeDamagePending = false;
        resolveIronChargeImpact(state, enemy, "laneCharge");
      }
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        enemy.x = enemy.ironLaneEndX;
        enemy.y = enemy.ironLaneEndY;
        enemy.ironChargeDamagePending = false;
        enemy.ironLaneIndex += 1;
        if (enemy.ironLaneIndex >= enemy.ironLaneCount) {
          fireBossRadialShots(state, enemy, 8, enemy.phasePatternIndex % 2);
          recordBossMechanic(state, enemy, "ironLaneSequenceCompleted", { charges: enemy.ironLaneCount });
          enemy.mode = "ironWindow";
          enemy.modeTicks = enemy.ironCycleKind === "brute" ? 60 : 87;
        } else {
          enemy.ironLaneForward = !enemy.ironLaneForward;
          startIronLaneTelegraph(state, enemy);
        }
      }
      return true;
    }
    if (enemy.mode === "ironWindow") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) finishIronCycle(enemy);
      return true;
    }
    return false;
  }

  function houndRunDurationTicks(run) {
    return run.delayTicks + run.warningTicks + Math.ceil((run.length + run.radius * 2) * TICK_RATE / run.speedPerSecond);
  }

  function spawnBloodHoundRun(state, enemy, options) {
    invariant(options && Array.isArray(options.points) && options.points.length >= 2, "BAD_HOUND_RUN");
    const run = {
      id: state.nextHoundRunId++,
      sourceBossId: enemy.id,
      points: options.points.map((point) => ({ x: point.x, y: point.y })),
      length: BLOOD_HUNT.polylineLength(options.points),
      distance: 0,
      distanceRemainder: 0,
      delayTicks: options.delayTicks || 0,
      warningTicks: options.warningTicks,
      speedPerSecond: options.speedPerSecond,
      radius: options.radius || BLOOD_HUNT.RULES.pursuitRadius,
      halfWidth: options.halfWidth || BLOOD_HUNT.RULES.pursuitHalfWidth,
      halfDepth: options.halfDepth || BLOOD_HUNT.RULES.pursuitHalfDepth,
      damageHundredths: options.damageHundredths || bossDamageHundredths(state, 1100),
      hitPlayer: false,
      active: true,
      x: options.points[0].x,
      y: options.points[0].y,
      directionX: options.points[1].x - options.points[0].x,
      directionY: options.points[1].y - options.points[0].y,
      segmentLength: Math.max(1, BLOOD_HUNT.polylineLength(options.points.slice(0, 2))),
      purpose: options.purpose || "bloodPressure",
      exposeBossId: options.exposeBossId || 0,
      revealBossId: options.revealBossId || 0,
      lineIndex: options.lineIndex ?? -1,
      side: options.side || "",
    };
    state.houndRuns.push(run);
    return run;
  }

  function spawnBloodPressureWave(state, enemy, options) {
    const topology = BLOOD_HUNT.pressureFronts({
      arena: state.manifest.rules.arena,
      player: state.player,
      horizontal: options.horizontal,
      reverse: options.reverse,
      pincer: options.pincer,
      variant: options.variant,
    });
    let durationTicks = 0;
    for (const descriptor of topology.runs) {
      const run = spawnBloodHoundRun(state, enemy, {
        points: descriptor.points,
        delayTicks: descriptor.delayTicks || 0,
        warningTicks: options.pacing.warningTicks,
        speedPerSecond: options.pacing.speedPerSecond,
        radius: 200,
        halfWidth: roundRatio(
          (options.horizontal ? state.manifest.rules.arena.height : state.manifest.rules.arena.width)
            * 47,
          BLOOD_HUNT.RULES.laneCount * 100,
        ),
        halfDepth: 250,
        damageHundredths: bossDamageHundredths(state, 1100),
        purpose: options.pincer ? "bloodPincer" : "bloodPressure",
        lineIndex: descriptor.lane,
        side: descriptor.side,
      });
      durationTicks = Math.max(durationTicks, houndRunDurationTicks(run));
    }
    recordBossMechanic(state, enemy, "bloodPressureWave", {
      waveIndex: options.waveIndex,
      phase: enemy.phase,
      occupiedLane: topology.occupiedLane,
      escapeLanes: topology.escapeLanes,
      pincerEscapeLanes: topology.pincerEscapeLanes,
      horizontal: topology.horizontal,
      pincer: Boolean(options.pincer),
      warningTicks: options.pacing.warningTicks,
      intervalTicks: options.pacing.intervalTicks,
    });
    return durationTicks;
  }

  function startBloodTrail(state, enemy, durationTicks, mode) {
    state.scentTrail = BLOOD_HUNT.createTrail(enemy.id, state.player, durationTicks);
    enemy.mode = mode;
    enemy.modeTicks = durationTicks + BLOOD_HUNT.RULES.scentLockTicks;
    enemy.bloodShadowVisible = mode === "bloodLureRecord";
    recordBossMechanic(state, enemy, "bloodScentRecordStarted", { durationTicks, shadow: enemy.bloodShadowVisible });
  }

  function spawnBloodPursuit(state, enemy, phaseOne) {
    const count = phaseOne ? BLOOD_HUNT.RULES.phaseOnePursuitCount : BLOOD_HUNT.RULES.phaseTwoPursuitCount;
    const spacingTicks = phaseOne ? BLOOD_HUNT.RULES.phaseOnePursuitSpacingTicks : BLOOD_HUNT.RULES.phaseTwoPursuitSpacingTicks;
    const pacing = BLOOD_HUNT.pacing(state.stage, phaseOne ? 1 : 2, false);
    const runs = BLOOD_HUNT.pursuitRuns({
      arena: state.manifest.rules.arena,
      trail: state.scentTrail,
      count,
      spacingTicks,
      speedPerSecond: phaseOne ? pacing.speedPerSecond : 4300,
    });
    let durationTicks = 0;
    for (const descriptor of runs) {
      const run = spawnBloodHoundRun(state, enemy, {
        ...descriptor,
        purpose: phaseOne ? "bloodPhaseOnePursuit" : "bloodLurePursuit",
        exposeBossId: phaseOne ? enemy.id : 0,
        revealBossId: phaseOne ? 0 : enemy.id,
      });
      durationTicks = Math.max(durationTicks, houndRunDurationTicks(run));
    }
    state.scentTrail = null;
    enemy.mode = phaseOne ? "bloodTeachPursuit" : "bloodLurePursuit";
    enemy.modeTicks = durationTicks + (phaseOne ? 12 : 9);
    recordBossMechanic(state, enemy, phaseOne ? "bloodPhaseOnePursuitStarted" : "bloodLurePursuitStarted", {
      hounds: count,
      durationTicks: enemy.modeTicks,
    });
  }

  function startBloodPhaseOneCycle(state, enemy) {
    state.houndRuns = state.houndRuns.filter((run) => run.sourceBossId !== enemy.id);
    state.scentTrail = null;
    enemy.mode = "bloodTeachWaves";
    enemy.modeTicks = 0;
    enemy.bloodWaveIndex = 0;
    enemy.bloodWaveTicks = 7;
    enemy.bloodShadowVisible = false;
    recordBossMechanic(state, enemy, "bloodPhaseOneLessonStarted", { waves: BLOOD_HUNT.RULES.phaseOneWaveCount });
  }

  function startBloodGrandHunt(state, enemy) {
    state.houndRuns = state.houndRuns.filter((run) => run.sourceBossId !== enemy.id);
    state.scentTrail = null;
    const shadow = BLOOD_HUNT.shadowPoint(
      state.manifest.rules.arena,
      state.player,
      enemy.radius,
      enemy.bloodCycleIndex,
    );
    enemy.x = shadow.x;
    enemy.y = shadow.y;
    enemy.invulnerable = true;
    enemy.mode = "bloodGrandHunt";
    enemy.modeTicks = 0;
    enemy.bloodWaveIndex = 0;
    enemy.bloodWaveTicks = 9;
    enemy.bloodShadowVisible = false;
    recordBossMechanic(state, enemy, "bloodGrandHuntStarted", { waves: BLOOD_HUNT.RULES.phaseTwoWaveCount });
  }

  function exposeBloodBoss(state, enemy, phaseOne) {
    enemy.invulnerable = false;
    enemy.bloodShadowVisible = false;
    enemy.bloodVulnerableTicks = BLOOD_HUNT.RULES.revealWindowTicks;
    enemy.mode = phaseOne ? "bloodTeachExposed" : "bloodRevealed";
    enemy.modeTicks = BLOOD_HUNT.RULES.revealWindowTicks;
    for (const run of state.houndRuns) {
      if (run.exposeBossId === enemy.id || run.revealBossId === enemy.id) run.active = false;
    }
    state.scentTrail = null;
    recordBossMechanic(state, enemy, phaseOne ? "bloodPhaseOneExposed" : "bloodRevealed", {
      multiplierBps: BLOOD_HUNT.RULES.revealDamageBps,
      durationTicks: BLOOD_HUNT.RULES.revealWindowTicks,
    });
  }

  function beginBloodStakeAssault(state, enemy, initial = false) {
    state.houndRuns = state.houndRuns.filter((run) => run.sourceBossId !== enemy.id);
    if (initial || !state.bruteStakes.some((stake) => stake.active)) {
      state.bruteStakes = BLOOD_HUNT.stakePoints(state.manifest.rules.arena).map((stake) => ({ ...stake }));
      recordBossMechanic(state, enemy, "bloodStakesSpawned", {
        stakes: state.bruteStakes.map((stake) => ({ id: stake.id, x: stake.x, y: stake.y })),
      });
    }
    enemy.mode = "bloodStakeCrossfire";
    enemy.bloodCrossfireLineIndex = 0;
    enemy.bloodCrossfireTicks = 7;
  }

  function spawnBloodStakeLine(state, enemy) {
    const activeLines = state.houndRuns
      .filter((run) => run.active && run.purpose === "bloodStakeCrossfire")
      .map((run) => ({ id: run.id, lineIndex: run.lineIndex, points: run.points, halfWidth: run.halfWidth, active: run.active }));
    const selection = BLOOD_HUNT.selectCrossfireLine({
      arena: state.manifest.rules.arena,
      player: state.player,
      playerRadius: state.manifest.rules.player.radius,
      boss: enemy,
      bossRadius: enemy.radius,
      lineIndex: enemy.bloodCrossfireLineIndex,
      activeLines,
    });
    for (const run of state.houndRuns) {
      if (selection.collapsedIds.includes(run.id)) run.active = false;
    }
    if (!selection.skipped) {
      spawnBloodHoundRun(state, enemy, {
        points: selection.line.points,
        warningTicks: BLOOD_HUNT.RULES.crossfireWarningTicks,
        speedPerSecond: BLOOD_HUNT.RULES.crossfireSpeedPerSecond,
        radius: 200,
        halfWidth: BLOOD_HUNT.RULES.crossfireHalfWidth,
        halfDepth: BLOOD_HUNT.RULES.crossfireHalfDepth,
        damageHundredths: bossDamageHundredths(state, 900),
        purpose: "bloodStakeCrossfire",
        lineIndex: enemy.bloodCrossfireLineIndex,
      });
    }
    recordBossMechanic(state, enemy, selection.skipped ? "bloodStakeLineSkipped" : "bloodStakeLineStarted", {
      lineIndex: enemy.bloodCrossfireLineIndex,
      vertical: selection.line?.vertical ?? enemy.bloodCrossfireLineIndex % 2 === 0,
      reverse: selection.line?.reverse ?? Math.floor(enemy.bloodCrossfireLineIndex / 2) % 2 === 1,
      reachableExits: selection.reachableExits,
      collapsedIds: selection.collapsedIds,
    });
    enemy.bloodCrossfireLineIndex += 1;
  }

  function startBloodStakeCharge(state, enemy) {
    const velocity = normalizedStep(
      state.player.x - enemy.x,
      state.player.y - enemy.y,
      roundRatio(BLOOD_HUNT.RULES.chargeSpeedPerSecond, TICK_RATE),
    );
    enemy.bloodChargeVx = velocity.x;
    enemy.bloodChargeVy = velocity.y;
    enemy.bloodChargeTravelTicks = 0;
    enemy.mode = "bloodStakeChargeTelegraph";
    enemy.modeTicks = BLOOD_HUNT.RULES.chargeWarningTicks;
    recordBossMechanic(state, enemy, "bloodStakeChargeTelegraphed", {
      durationTicks: enemy.modeTicks,
      targetX: state.player.x,
      targetY: state.player.y,
    });
  }

  function updateBloodHuntPattern(state, enemy) {
    if (!enemy.mode.startsWith("blood")) return false;
    if (enemy.mode === "bloodTeachWaves") {
      enemy.bloodWaveTicks -= 1;
      if (enemy.bloodWaveTicks <= 0 && enemy.bloodWaveIndex < BLOOD_HUNT.RULES.phaseOneWaveCount) {
        const waveIndex = enemy.bloodWaveIndex;
        const pacing = BLOOD_HUNT.pacing(state.stage, 1);
        const durationTicks = spawnBloodPressureWave(state, enemy, {
          waveIndex,
          horizontal: (enemy.bloodCycleIndex + waveIndex) % 2 === 0,
          reverse: waveIndex % 2 === 1,
          pincer: false,
          variant: enemy.bloodCycleIndex + waveIndex,
          pacing,
        });
        enemy.bloodWaveIndex += 1;
        enemy.bloodWaveTicks += pacing.intervalTicks;
        if (enemy.bloodWaveIndex >= BLOOD_HUNT.RULES.phaseOneWaveCount) {
          enemy.mode = "bloodTeachWavesResolve";
          enemy.modeTicks = durationTicks;
        }
      }
      return true;
    }
    if (enemy.mode === "bloodTeachWavesResolve") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) startBloodTrail(state, enemy, BLOOD_HUNT.RULES.scentRecordTicks, "bloodTeachRecord");
      return true;
    }
    if (enemy.mode === "bloodTeachRecord" || enemy.mode === "bloodLureRecord") {
      if (state.scentTrail?.locked && state.scentTrail.lockTicksRemaining <= 0) {
        spawnBloodPursuit(state, enemy, enemy.mode === "bloodTeachRecord");
      }
      return true;
    }
    if (enemy.mode === "bloodTeachPursuit") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        enemy.bloodLessonComplete = true;
        enemy.mode = "bloodTeachRecovery";
        enemy.modeTicks = 81;
        recordBossMechanic(state, enemy, "bloodPhaseOneLessonCompleted", { exposed: false });
      }
      return true;
    }
    if (enemy.mode === "bloodTeachExposed") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        enemy.bloodLessonComplete = true;
        enemy.bloodVulnerableTicks = 0;
        enemy.mode = "bloodTeachRecovery";
        enemy.modeTicks = 81;
        recordBossMechanic(state, enemy, "bloodPhaseOneLessonCompleted", { exposed: true });
      }
      return true;
    }
    if (enemy.mode === "bloodTeachRecovery") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        enemy.bloodCycleIndex += 1;
        enemy.mode = "ready";
        enemy.actionTicks = 30;
      }
      return true;
    }
    if (enemy.mode === "bloodGrandHunt") {
      enemy.bloodWaveTicks -= 1;
      if (enemy.bloodWaveTicks <= 0 && enemy.bloodWaveIndex < BLOOD_HUNT.RULES.phaseTwoWaveCount) {
        const waveIndex = enemy.bloodWaveIndex;
        const lowHp = enemy.hpHundredths * 2 <= enemy.maxHpHundredths;
        const pacing = BLOOD_HUNT.pacing(state.stage, 2, lowHp);
        const durationTicks = spawnBloodPressureWave(state, enemy, {
          waveIndex,
          horizontal: (enemy.bloodCycleIndex + waveIndex) % 2 === 0,
          reverse: waveIndex % 2 === 1,
          pincer: waveIndex === BLOOD_HUNT.RULES.phaseTwoWaveCount - 1,
          variant: enemy.bloodCycleIndex * BLOOD_HUNT.RULES.phaseTwoWaveCount + waveIndex,
          pacing,
        });
        enemy.bloodWaveIndex += 1;
        enemy.bloodWaveTicks += pacing.intervalTicks;
        if (enemy.bloodWaveIndex >= BLOOD_HUNT.RULES.phaseTwoWaveCount) {
          enemy.mode = "bloodGrandHuntResolve";
          enemy.modeTicks = durationTicks;
        }
      }
      return true;
    }
    if (enemy.mode === "bloodGrandHuntResolve") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) startBloodTrail(state, enemy, BLOOD_HUNT.RULES.lureRecordTicks, "bloodLureRecord");
      return true;
    }
    if (enemy.mode === "bloodLurePursuit") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        enemy.bloodShadowVisible = false;
        enemy.mode = "bloodLureMissRecovery";
        enemy.modeTicks = BLOOD_HUNT.RULES.missRecoveryTicks;
        recordBossMechanic(state, enemy, "bloodLureMissed", { recoveryTicks: enemy.modeTicks });
      }
      return true;
    }
    if (enemy.mode === "bloodRevealed") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        enemy.bloodVulnerableTicks = 0;
        enemy.bloodCycleIndex += 1;
        startBloodGrandHunt(state, enemy);
      }
      return true;
    }
    if (enemy.mode === "bloodLureMissRecovery") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        enemy.bloodCycleIndex += 1;
        startBloodGrandHunt(state, enemy);
      }
      return true;
    }
    if (enemy.mode === "bloodStakeCrossfire") {
      enemy.bloodCrossfireTicks -= 1;
      if (enemy.bloodCrossfireTicks <= 0 && enemy.bloodCrossfireLineIndex < BLOOD_HUNT.RULES.crossfireLineCount) {
        spawnBloodStakeLine(state, enemy);
        enemy.bloodCrossfireTicks += BLOOD_HUNT.RULES.crossfireIntervalTicks;
        if (enemy.bloodCrossfireLineIndex >= BLOOD_HUNT.RULES.crossfireLineCount) startBloodStakeCharge(state, enemy);
      }
      return true;
    }
    if (enemy.mode === "bloodStakeChargeTelegraph") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        enemy.mode = "bloodStakeCharge";
        enemy.modeTicks = BLOOD_HUNT.RULES.chargeDurationTicks;
        recordBossMechanic(state, enemy, "bloodStakeChargeStarted", { durationTicks: enemy.modeTicks });
      }
      return true;
    }
    if (enemy.mode === "bloodStakeCharge") {
      const from = { x: enemy.x, y: enemy.y };
      const next = { x: enemy.x + enemy.bloodChargeVx, y: enemy.y + enemy.bloodChargeVy };
      const stake = BLOOD_HUNT.sweptStakeHit(state.bruteStakes, from, next, enemy.radius);
      enemy.bloodChargeTravelTicks += 1;
      if (stake) {
        enemy.x = next.x;
        enemy.y = next.y;
        stake.active = false;
        state.houndRuns = state.houndRuns.filter((run) => run.sourceBossId !== enemy.id);
        enemy.bloodVulnerableTicks = BLOOD_HUNT.RULES.stakeWindowTicks;
        enemy.mode = "bloodStakeStunned";
        enemy.modeTicks = BLOOD_HUNT.RULES.stakeWindowTicks;
        recordBossMechanic(state, enemy, "bloodStakeShattered", {
          stakeId: stake.id,
          multiplierBps: BLOOD_HUNT.RULES.stakeDamageBps,
          durationTicks: enemy.modeTicks,
        });
        return true;
      }
      const arena = state.manifest.rules.arena;
      const x = clamp(next.x, arena.padding + enemy.radius, arena.width - arena.padding - enemy.radius);
      const y = clamp(next.y, arena.padding + enemy.radius, arena.height - arena.padding - enemy.radius);
      const boundary = x !== next.x || y !== next.y;
      enemy.x = x;
      enemy.y = y;
      enemy.modeTicks -= 1;
      if (boundary || enemy.modeTicks <= 0) {
        enemy.mode = "bloodStakeMissRecovery";
        enemy.modeTicks = BLOOD_HUNT.RULES.missRecoveryTicksBrute;
        recordBossMechanic(state, enemy, "bloodStakeChargeMissed", { travelTicks: enemy.bloodChargeTravelTicks });
      }
      return true;
    }
    if (enemy.mode === "bloodStakeMissRecovery") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) beginBloodStakeAssault(state, enemy, false);
      return true;
    }
    if (enemy.mode === "bloodStakeStunned") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        enemy.bloodVulnerableTicks = 0;
        state.bruteStakes = [];
        enemy.mode = "ready";
        enemy.actionTicks = 30;
      }
      return true;
    }
    return false;
  }

  function startBloodHuntPattern(state, enemy) {
    if (enemy.phase === 1) startBloodPhaseOneCycle(state, enemy);
    else if (state.stage === 15) beginBloodStakeAssault(state, enemy, true);
    else startBloodGrandHunt(state, enemy);
  }

  function deepRootSourceBoss(state, enemy) {
    return enemy.boss ? enemy : bossById(state, enemy.linkedBossId) || enemy;
  }

  function finishDeepRootModule(enemy) {
    enemy.mode = "ready";
    enemy.actionTicks = 30;
    enemy.deepCycleKind = "";
    enemy.deepStep = 0;
    enemy.deepCount = 0;
    enemy.deepSafeStrips = [];
  }

  function startDeepRootClock(state, enemy, cycleKind) {
    const arena = state.manifest.rules.arena;
    if (cycleKind === "warden" || cycleKind === "brute") {
      enemy.x = roundRatio(arena.width, 2);
      enemy.y = roundRatio(arena.height, 2);
    }
    enemy.deepCycleKind = cycleKind;
    enemy.deepStep = 0;
    enemy.deepCount = cycleKind === "warden"
      ? DEEP_ROOT.RULES.wardenClockSectors
      : cycleKind === "brute" ? DEEP_ROOT.RULES.bruteClockSectors : DEEP_ROOT.RULES.heartClockSectors;
    if (enemy.hpHundredths * 2 < enemy.maxHpHundredths) enemy.deepDirection *= -1;
    enemy.deepClockCenterAngle = cycleKind === "heartClock"
      ? Math.atan2(arena.height / 2 - enemy.y, arena.width / 2 - enemy.x)
      : -Math.PI / 2;
    enemy.deepClockArcSpan = cycleKind === "heartClock" ? Math.PI : Math.PI * 2;
    enemy.mode = "deepClockTelegraph";
    enemy.modeTicks = DEEP_ROOT.clockWarningTicks(cycleKind === "warden" ? "warden" : cycleKind === "brute" ? "brute" : "heart", 0);
    recordBossMechanic(state, deepRootSourceBoss(state, enemy), "deepRootClockStarted", {
      cycleKind,
      sectors: enemy.deepCount,
      direction: enemy.deepDirection,
      warningTicks: enemy.modeTicks,
    });
  }

  function deepRootMarchRoute(state, enemy, strip, vertical) {
    const geometry = DEEP_ROOT.stripGeometry(state.manifest.rules.arena, strip, vertical);
    const radius = state.manifest.rules.player.radius;
    const arena = state.manifest.rules.arena;
    const targets = vertical
      ? [state.player.y, state.player.y - 840, state.player.y + 840].map((y) => ({
        x: geometry.x + roundRatio(geometry.width, 2),
        y: clamp(y, arena.padding + radius, arena.height - arena.padding - radius),
      }))
      : [state.player.x, state.player.x - 840, state.player.x + 840].map((x) => ({
        x: clamp(x, arena.padding + radius, arena.width - arena.padding - radius),
        y: geometry.y + roundRatio(geometry.height, 2),
      }));
    const obstacles = state.hazards.filter((hazard) => hazard.type === "deepRootBramble"
      && !hazard.cancelled && (hazard.warningTicks > 0 || hazard.activeTicks > 0));
    let best = Number.MAX_SAFE_INTEGER;
    for (const target of targets) {
      const blockedByBramble = obstacles.some((hazard) => BLOOD_HUNT.squaredDistanceToSegment(
        hazard,
        state.player,
        target,
      ) <= (hazard.radius + radius + 40) ** 2);
      const blockedByBoss = BLOOD_HUNT.squaredDistanceToSegment(enemy, state.player, target)
        <= (enemy.radius + radius + 100) ** 2;
      if (blockedByBramble || blockedByBoss) continue;
      best = Math.min(best, Math.round(Math.hypot(target.x - state.player.x, target.y - state.player.y)));
    }
    return best;
  }

  function collapseDeepRootBramble(state) {
    const blocking = state.hazards
      .filter((hazard) => hazard.type === "deepRootBramble" && !hazard.cancelled)
      .sort((left, right) => right.radius - left.radius || right.activeTicks - left.activeTicks || left.id - right.id)[0];
    if (!blocking) return false;
    blocking.cancelled = true;
    return true;
  }

  function prepareDeepRootMarchWave(state, enemy) {
    const playerStrip = DEEP_ROOT.stripAtPoint(state.manifest.rules.arena, state.player, enemy.deepVertical);
    let routes = [];
    let selection;
    const collapsedHazardIds = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      routes = Array.from({ length: DEEP_ROOT.RULES.stripCount }, (_, strip) => ({
        strip,
        distance: deepRootMarchRoute(state, enemy, strip, enemy.deepVertical),
      })).filter((route) => route.distance < Number.MAX_SAFE_INTEGER);
      selection = DEEP_ROOT.selectSafeStrips({ playerStrip, step: enemy.deepStep, routes });
      if (!selection.cancelled) break;
      const before = state.hazards.filter((hazard) => hazard.type === "deepRootBramble" && !hazard.cancelled);
      if (!collapseDeepRootBramble(state)) break;
      const collapsed = before.find((hazard) => hazard.cancelled);
      if (collapsed) collapsedHazardIds.push(collapsed.id);
    }
    enemy.deepSafeStrips = [...selection.safeStrips];
    const farthest = selection.cancelled ? 0 : Math.max(0, ...enemy.deepSafeStrips.map((strip) => (
      routes.find((route) => route.strip === strip)?.distance || 0
    )));
    const moveUnitsPerTick = Math.max(1, roundRatio(
      state.player.moveUnitsPerTick * playerHazardSlowBps(state),
      10000,
    ));
    const warningKind = enemy.deepCycleKind === "warden" ? "warden" : enemy.deepCycleKind.startsWith("heart") ? "heart" : "brute";
    enemy.mode = "deepMarchTelegraph";
    enemy.modeTicks = DEEP_ROOT.rootMarchWarningTicks(warningKind, enemy.deepStep, farthest, moveUnitsPerTick);
    recordBossMechanic(state, deepRootSourceBoss(state, enemy), "deepRootMarchPrepared", {
      cycleKind: enemy.deepCycleKind,
      waveIndex: enemy.deepStep,
      vertical: enemy.deepVertical,
      playerStrip,
      playerStripUnsafe: !selection.cancelled,
      cancelled: selection.cancelled,
      safeStrips: enemy.deepSafeStrips,
      reachableRoutes: selection.reachableRoutes,
      warningTicks: enemy.modeTicks,
      collapsedHazardIds,
    });
  }

  function startDeepRootMarch(state, enemy, cycleKind, waveCount, initialVertical = true) {
    enemy.deepCycleKind = cycleKind;
    enemy.deepStep = 0;
    enemy.deepCount = waveCount;
    enemy.deepInitialVertical = initialVertical;
    enemy.deepVertical = initialVertical;
    prepareDeepRootMarchWave(state, enemy);
  }

  function startDeepRootRing(state, enemy, cycleKind) {
    const arena = state.manifest.rules.arena;
    enemy.deepCycleKind = cycleKind;
    enemy.deepStep = 0;
    enemy.deepCount = cycleKind === "warden" ? DEEP_ROOT.RULES.wardenRingPulses : DEEP_ROOT.RULES.heartRingPulses;
    enemy.deepGapAngle = cycleKind === "heartRing"
      ? Math.atan2(arena.height / 2 - enemy.y, arena.width / 2 - enemy.x)
      : Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    const pulse = DEEP_ROOT.ringPulse({
      arena,
      origin: enemy,
      step: 0,
      direction: enemy.deepDirection,
      gapAngle: enemy.deepGapAngle,
      kind: cycleKind === "warden" ? "warden" : "heart",
    });
    enemy.deepRingRadius = pulse.radius;
    enemy.mode = "deepRingTelegraph";
    enemy.modeTicks = pulse.warningTicks;
    recordBossMechanic(state, deepRootSourceBoss(state, enemy), "deepRootRingStarted", {
      cycleKind,
      pulses: enemy.deepCount,
      radius: pulse.radius,
      gapAngle: pulse.gapAngle,
      warningTicks: pulse.warningTicks,
    });
  }

  function completeDeepRootClock(state, enemy) {
    if (enemy.deepCycleKind === "warden") {
      startDeepRootMarch(state, enemy, "warden", DEEP_ROOT.RULES.wardenMarchWaves, true);
    } else if (enemy.deepCycleKind === "brute") {
      summonBossAdds(state, enemy, true);
      startDeepRootMarch(state, enemy, "brute", DEEP_ROOT.RULES.bruteMarchWaves, true);
    } else {
      enemy.mode = "deepHeartRest";
      enemy.modeTicks = 33;
    }
  }

  function completeDeepRootMarch(state, enemy) {
    if (enemy.deepCycleKind === "warden") {
      enemy.mode = "deepWindow";
      enemy.modeTicks = 81;
    } else if (enemy.deepCycleKind === "brute") {
      enemy.mode = "deepWindow";
      enemy.modeTicks = 72;
    } else if (enemy.deepCycleKind === "armor") {
      finishDeepRootModule(enemy);
    } else {
      enemy.mode = "deepHeartRest";
      enemy.modeTicks = 33;
    }
  }

  function updateDeepRootPattern(state, enemy) {
    if (!enemy.mode.startsWith("deep")) return false;
    const sourceBoss = deepRootSourceBoss(state, enemy);
    if (enemy.mode === "deepBrambleRecovery") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        if (enemy.deepCycleKind === "armor") startDeepRootMarch(state, enemy, "armor", 2, true);
        else finishDeepRootModule(enemy);
      }
      return true;
    }
    if (enemy.mode === "deepClockTelegraph") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        const sector = DEEP_ROOT.clockSector({
          origin: enemy,
          count: enemy.deepCount,
          step: enemy.deepStep,
          direction: enemy.deepDirection,
          centerAngle: enemy.deepClockCenterAngle,
          arcSpan: enemy.deepClockArcSpan,
        });
        const hit = DEEP_ROOT.sectorHitsCircle({
          origin: enemy,
          target: state.player,
          targetRadius: state.manifest.rules.player.radius,
          ...sector,
        });
        const amount = bossDamageHundredths(state, enemy.bossAspect ? 720 : 1000);
        const dealt = hit ? applyPlayerDamage(state, amount) : 0;
        recordBossMechanic(state, sourceBoss, "deepRootClockStrike", {
          cycleKind: enemy.deepCycleKind,
          sectorIndex: enemy.deepStep,
          hit,
          dealtHundredths: dealt,
        });
        enemy.mode = "deepClockStrike";
        enemy.modeTicks = DEEP_ROOT.RULES.clockStrikeTicks;
      }
      return true;
    }
    if (enemy.mode === "deepClockStrike") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        enemy.deepStep += 1;
        if (enemy.deepStep >= enemy.deepCount) completeDeepRootClock(state, enemy);
        else {
          enemy.mode = "deepClockTelegraph";
          const kind = enemy.deepCycleKind === "warden" ? "warden" : enemy.deepCycleKind === "brute" ? "brute" : "heart";
          enemy.modeTicks = DEEP_ROOT.clockWarningTicks(kind, enemy.deepStep);
        }
      }
      return true;
    }
    if (enemy.mode === "deepMarchTelegraph") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        const playerStrip = DEEP_ROOT.stripAtPoint(state.manifest.rules.arena, state.player, enemy.deepVertical);
        const safe = enemy.deepSafeStrips.includes(playerStrip);
        const amount = bossDamageHundredths(state, enemy.bossAspect ? 820 : 1100);
        const dealt = safe ? 0 : applyPlayerDamage(state, amount);
        recordBossMechanic(state, sourceBoss, "deepRootMarchStrike", {
          cycleKind: enemy.deepCycleKind,
          waveIndex: enemy.deepStep,
          playerStrip,
          safe,
          dealtHundredths: dealt,
        });
        enemy.mode = "deepMarchStrike";
        enemy.modeTicks = DEEP_ROOT.RULES.rootStrikeTicks;
      }
      return true;
    }
    if (enemy.mode === "deepMarchStrike") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        enemy.deepStep += 1;
        if (enemy.deepStep >= enemy.deepCount) completeDeepRootMarch(state, enemy);
        else {
          enemy.deepVertical = !enemy.deepVertical;
          prepareDeepRootMarchWave(state, enemy);
        }
      }
      return true;
    }
    if (enemy.mode === "deepWindow") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        if (enemy.deepCycleKind === "warden") startDeepRootRing(state, enemy, "warden");
        else finishDeepRootModule(enemy);
      }
      return true;
    }
    if (enemy.mode === "deepRingTelegraph") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        const pulse = DEEP_ROOT.ringPulse({
          arena: state.manifest.rules.arena,
          origin: enemy,
          step: enemy.deepStep,
          direction: enemy.deepDirection,
          gapAngle: enemy.deepGapAngle,
          kind: enemy.deepCycleKind === "warden" ? "warden" : "heart",
        });
        const hit = DEEP_ROOT.ringHitsCircle({
          origin: enemy,
          target: state.player,
          targetRadius: state.manifest.rules.player.radius,
          radius: pulse.radius,
          gapAngle: pulse.gapAngle,
        });
        const amount = bossDamageHundredths(state, enemy.bossAspect ? 780 : 1050);
        const dealt = hit ? applyPlayerDamage(state, amount) : 0;
        recordBossMechanic(state, sourceBoss, "deepRootRingStrike", {
          cycleKind: enemy.deepCycleKind,
          pulseIndex: enemy.deepStep,
          radius: pulse.radius,
          gapAngle: pulse.gapAngle,
          hit,
          dealtHundredths: dealt,
        });
        enemy.mode = "deepRingStrike";
        enemy.modeTicks = DEEP_ROOT.RULES.ringStrikeTicks;
      }
      return true;
    }
    if (enemy.mode === "deepRingStrike") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        enemy.deepStep += 1;
        if (enemy.deepStep >= enemy.deepCount) {
          if (enemy.deepCycleKind === "warden") {
            enemy.deepDirection *= -1;
            finishDeepRootModule(enemy);
          } else {
            enemy.mode = "deepHeartRest";
            enemy.modeTicks = 33;
          }
        } else {
          const pulse = DEEP_ROOT.ringPulse({
            arena: state.manifest.rules.arena,
            origin: enemy,
            step: enemy.deepStep,
            direction: enemy.deepDirection,
            gapAngle: enemy.deepGapAngle,
            kind: enemy.deepCycleKind === "warden" ? "warden" : "heart",
          });
          enemy.deepRingRadius = pulse.radius;
          enemy.mode = "deepRingTelegraph";
          enemy.modeTicks = pulse.warningTicks;
        }
      }
      return true;
    }
    if (enemy.mode === "deepHeartRest") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) enemy.mode = "heartPattern";
      return true;
    }
    return false;
  }

  function startDeepRootPattern(state, enemy) {
    if (enemy.phase === 1) {
      createBossHazard(state, enemy, {
        type: "deepRootBramble",
        x: state.player.x,
        y: state.player.y,
        radius: 440,
        warningTicks: 45,
        activeTicks: 150,
        damageHundredthsPerSecond: bossDamageHundredths(state, 600),
      });
      if (state.stage >= 10) summonBossAdds(state, enemy, true);
      enemy.deepCycleKind = enemy.typeId === "forestBoss" ? "armor" : "phaseOne";
      enemy.mode = "deepBrambleRecovery";
      enemy.modeTicks = 90;
      return;
    }
    startDeepRootClock(state, enemy, enemy.typeId === "forestBoss" ? "brute" : "warden");
  }

  function startIronOathPattern(state, enemy, pattern) {
    if (enemy.phase === 1) {
      const closeEnoughForSweep = squaredDistance(state.player, enemy)
        <= (IRON_OATH.RULES.sweepReach + state.manifest.rules.player.radius + 120) ** 2;
      if (enemy.typeId === "sheriffEnforcer" && pattern % 3 === 1 && closeEnoughForSweep) {
        startIronSweep(state, enemy);
      } else if (pattern % 3 === 2) {
        fireBossRadialShots(state, enemy, 4, pattern % 4);
        enemy.mode = "patternRecovery";
        enemy.modeTicks = 60;
      } else startIronCharge(state, enemy);
      return;
    }
    startIronOathCycle(state, enemy);
  }

  function beginBossPattern(state, enemy) {
    const seedId = enemy.activeSeedId;
    const pattern = enemy.phasePatternIndex++;
    if (seedId === "ironOath") {
      startIronOathPattern(state, enemy, pattern);
      return;
    }
    if (seedId === "deepRoot") {
      startDeepRootPattern(state, enemy);
      return;
    }
    if (seedId === "huntersKnot") {
      startHuntersKnotPattern(state, enemy);
      return;
    }
    startBloodHuntPattern(state, enemy);
  }

  function clearFinalArmorModulePressure(state, enemy) {
    cancelHunterStorm(state, enemy);
    if (state.bossAnchor?.ownerBossId === enemy.id && state.bossAnchor.active) breakBossAnchor(state, "moduleTransition");
    state.enemyShots = [];
    state.hazards = state.hazards.filter((hazard) => hazard.sourceEnemyId !== enemy.id);
    state.houndRuns = state.houndRuns.filter((run) => run.sourceBossId !== enemy.id);
    if (state.scentTrail?.ownerBossId === enemy.id) state.scentTrail = null;
    state.bruteStakes = [];
    state.enemies = state.enemies.filter((candidate) => candidate.boss || candidate.bossAspect);
  }

  function startFinalArmorModule(state, enemy, index, initial = false) {
    invariant(index === 0 || index === 1, "BAD_FINAL_ARMOR_MODULE");
    if (!initial) clearFinalArmorModulePressure(state, enemy);
    enemy.armorModuleIndex = index;
    enemy.armorModuleTicks = 0;
    enemy.armorModuleStarted = true;
    enemy.activeSeedId = enemy.bossSeedIds[index];
    enemy.mode = "ready";
    enemy.modeTicks = 0;
    enemy.actionTicks = 36;
    recordBossMechanic(state, enemy, "finalArmorModuleStarted", {
      moduleIndex: index,
      seedId: enemy.activeSeedId,
      initial,
      minimumTicks: BOSS_AUTHORITY_RULES.finalArmorModuleMinimumTicks,
      floorHundredths: index === 0
        ? roundRatio(enemy.armorMaxHundredths * BOSS_AUTHORITY_RULES.finalArmorSplitBps, 10000)
        : BOSS_AUTHORITY_RULES.finalArmorLockHundredths,
    });
  }

  function updateFinalArmorModule(state, enemy) {
    if (state.stage !== 15 || enemy.typeId !== "forestBoss" || enemy.phase !== 1 || enemy.armorHundredths <= 0) return false;
    if (!enemy.armorModuleStarted) startFinalArmorModule(state, enemy, 0, true);
    enemy.armorModuleTicks += 1;
    const splitFloor = roundRatio(enemy.armorMaxHundredths * BOSS_AUTHORITY_RULES.finalArmorSplitBps, 10000);
    if (enemy.armorModuleIndex === 0
      && enemy.armorModuleTicks >= BOSS_AUTHORITY_RULES.finalArmorModuleMinimumTicks
      && enemy.armorHundredths <= splitFloor) {
      recordBossMechanic(state, enemy, "finalArmorModuleCompleted", {
        moduleIndex: 0,
        seedId: enemy.activeSeedId,
        durationTicks: enemy.armorModuleTicks,
        armorHundredths: enemy.armorHundredths,
      });
      startFinalArmorModule(state, enemy, 1);
      return true;
    }
    return false;
  }

  function updateRootHeartBehavior(state, enemy) {
    if (updateDeepRootPattern(state, enemy)) return;
    enemy.actionTicks -= 1;
    if (enemy.actionTicks > 0) return;
    if (enemy.heartIndex === 0) startDeepRootClock(state, enemy, "heartClock");
    else if (enemy.heartIndex === 1) {
      const arena = state.manifest.rules.arena;
      const vertical = Math.abs(enemy.x - arena.width / 2) >= Math.abs(enemy.y - arena.height / 2);
      startDeepRootMarch(state, enemy, "heartMarch", DEEP_ROOT.RULES.heartMarchWaves, vertical);
    } else startDeepRootRing(state, enemy, "heartRing");
  }

  function timberfallGrid(state) {
    const rules = BOSS_AUTHORITY_RULES;
    const arena = state.manifest.rules.arena;
    const minX = arena.padding + 720;
    const maxX = arena.width - arena.padding - 720;
    const minY = arena.padding + 620;
    const maxY = arena.height - arena.padding - 620;
    const cells = [];
    for (let row = 0; row < rules.timberfallGridRows; row += 1) {
      for (let column = 0; column < rules.timberfallGridColumns; column += 1) {
        cells.push({
          index: row * rules.timberfallGridColumns + column,
          row,
          column,
          x: roundRatio(minX * (rules.timberfallGridColumns - 1 - column) + maxX * column, rules.timberfallGridColumns - 1),
          y: roundRatio(minY * (rules.timberfallGridRows - 1 - row) + maxY * row, rules.timberfallGridRows - 1),
        });
      }
    }
    return cells;
  }

  function connectedTimberfallRefuge(state, cells, waveIndex) {
    const rules = BOSS_AUTHORITY_RULES;
    let seed = cells[0];
    let seedDistance = Number.MAX_SAFE_INTEGER;
    for (const cell of cells) {
      const distance = squaredDistance(cell, state.player);
      if (distance < seedDistance || (distance === seedDistance && cell.index < seed.index)) {
        seed = cell;
        seedDistance = distance;
      }
    }
    const safe = [];
    const queued = [seed.index];
    const seen = new Set(queued);
    const directions = [
      [0, 1], [1, 0], [0, -1], [-1, 0],
    ];
    const rotation = waveIndex % directions.length;
    while (queued.length && safe.length < rules.timberfallSafeCells) {
      const index = queued.shift();
      safe.push(index);
      const row = Math.floor(index / rules.timberfallGridColumns);
      const column = index % rules.timberfallGridColumns;
      for (let offset = 0; offset < directions.length; offset += 1) {
        const direction = directions[(rotation + offset) % directions.length];
        const nextRow = row + direction[0];
        const nextColumn = column + direction[1];
        if (nextRow < 0 || nextRow >= rules.timberfallGridRows || nextColumn < 0 || nextColumn >= rules.timberfallGridColumns) continue;
        const next = nextRow * rules.timberfallGridColumns + nextColumn;
        if (seen.has(next)) continue;
        seen.add(next);
        queued.push(next);
      }
    }
    return safe;
  }

  function spawnTimberfallWave(state, enemy) {
    const rules = BOSS_AUTHORITY_RULES;
    const cells = timberfallGrid(state);
    const safeIndices = connectedTimberfallRefuge(state, cells, enemy.phaseThreeTimberfallWaveIndex);
    const safe = new Set(safeIndices);
    const dangerCells = cells.filter((cell) => !safe.has(cell.index));
    invariant(dangerCells.length === rules.timberfallDangerCells, "BAD_TIMBERFALL_DANGER_COUNT");
    for (const cell of dangerCells) {
      createBossHazard(state, enemy, {
        type: "timberfall",
        x: cell.x,
        y: cell.y,
        radius: 610,
        warningTicks: rules.timberfallWarningTicks,
        impactDamageHundredths: bossDamageHundredths(state, 1600),
      });
    }
    recordBossMechanic(state, enemy, "timberfallWave", {
      waveIndex: enemy.phaseThreeTimberfallWaveIndex,
      dangerCellIndices: dangerCells.map((cell) => cell.index),
      safeCellIndices: safeIndices,
    });
    enemy.phaseThreeTimberfallWaveIndex += 1;
  }

  function phaseThreeArena(state) {
    return {
      width: state.manifest.rules.arena.width,
      height: state.manifest.rules.arena.height,
      padding: state.manifest.rules.arena.padding,
    };
  }

  function startPhaseThreeWindow(state, enemy) {
    const segment = enemy.phaseThreeSegment;
    invariant(segment >= 1 && segment <= 3, "BAD_PHASE_THREE_WINDOW");
    enemy.mode = "phaseThreeWindow";
    enemy.modeTicks = segment === 1
      ? PHASE_THREE.RULES.segmentOneWindowTicks
      : segment === 2
        ? PHASE_THREE.RULES.segmentTwoWindowTicks
        : PHASE_THREE.RULES.segmentThreeBreatherTicks;
    enemy.invulnerable = false;
    enemy.actionTicks = 0;
    recordBossMechanic(state, enemy, "phaseThreeWindowStarted", {
      segment,
      tier: enemy.phaseThreeTier || 0,
      durationTicks: enemy.modeTicks,
    });
  }

  function startPhaseThreeChargeTelegraph(state, enemy) {
    const vertical = enemy.phaseThreeSegment === 1 ? true : enemy.phaseThreeLaneVertical;
    const lane = PHASE_THREE.occupiedLane(phaseThreeArena(state), state.player, vertical);
    const geometry = IRON_OATH.laneGeometry(
      phaseThreeArena(state),
      enemy.radius,
      lane,
      vertical,
      enemy.phaseThreeLaneForward,
    );
    enemy.phaseThreeLaneVertical = vertical;
    enemy.phaseThreeLane = lane;
    enemy.phaseThreeLaneStartX = geometry.startX;
    enemy.phaseThreeLaneStartY = geometry.startY;
    enemy.phaseThreeLaneEndX = geometry.endX;
    enemy.phaseThreeLaneEndY = geometry.endY;
    enemy.x = geometry.startX;
    enemy.y = geometry.startY;
    enemy.mode = "phaseThreeChargeTelegraph";
    enemy.modeTicks = PHASE_THREE.laneTelegraphTicks(enemy.phaseThreeChargeIndex);
    enemy.phaseThreeChargeElapsedTicks = 0;
    enemy.phaseThreeChargeTravel = 0;
    enemy.phaseThreeChargeDamagePending = true;
    recordBossMechanic(state, enemy, "phaseThreeChargeTelegraphed", {
      segment: enemy.phaseThreeSegment,
      tier: enemy.phaseThreeTier || 0,
      chargeIndex: enemy.phaseThreeChargeIndex,
      vertical,
      lane,
      warningTicks: enemy.modeTicks,
    });
  }

  function startPhaseThreeRampage(state, enemy) {
    const segment = enemy.phaseThreeSegment;
    invariant(segment >= 1 && segment <= 3, "BAD_PHASE_THREE_RAMPAGE");
    const tierPattern = segment === 3 ? PHASE_THREE.tierPattern(enemy.phaseThreeTier) : null;
    enemy.invulnerable = true;
    enemy.phaseThreeChargeIndex = 0;
    enemy.phaseThreeChargeCount = tierPattern?.chargeCount || Number.MAX_SAFE_INTEGER;
    enemy.phaseThreeLaneVertical = true;
    enemy.phaseThreeLaneForward = true;
    enemy.phaseThreeRampageTicks = segment === 1
      ? PHASE_THREE.RULES.segmentOneRampageTicks
      : segment === 2
        ? PHASE_THREE.RULES.segmentTwoRampageTicks
        : 0;
    recordBossMechanic(state, enemy, "phaseThreeRampageStarted", {
      segment,
      tier: enemy.phaseThreeTier || 0,
      chargeCount: tierPattern?.chargeCount || 0,
      aftershocks: Boolean(tierPattern?.aftershocks),
      eruptions: Boolean(tierPattern?.eruptions),
    });
    startPhaseThreeChargeTelegraph(state, enemy);
  }

  function queuePhaseThreeAftershock(state, enemy) {
    if (enemy.phaseThreeSegment !== 3) return;
    const tierPattern = PHASE_THREE.tierPattern(enemy.phaseThreeTier);
    if (!tierPattern.aftershocks) return;
    createBossHazard(state, enemy, {
      type: "phaseThreeAftershock",
      shape: enemy.phaseThreeLaneVertical ? "verticalLane" : "horizontalLane",
      laneIndex: enemy.phaseThreeLane,
      warningTicks: PHASE_THREE.RULES.aftershockWarningTicks,
      activeTicks: PHASE_THREE.RULES.aftershockImpactTicks,
      impactDamageHundredths: bossDamageHundredths(state, 2300),
      phaseThreeErupts: tierPattern.eruptions,
      phaseThreeVertical: enemy.phaseThreeLaneVertical,
    });
    recordBossMechanic(state, enemy, "phaseThreeAftershockQueued", {
      tier: enemy.phaseThreeTier,
      chargeIndex: enemy.phaseThreeChargeIndex,
      vertical: enemy.phaseThreeLaneVertical,
      lane: enemy.phaseThreeLane,
      warningTicks: PHASE_THREE.RULES.aftershockWarningTicks,
      erupts: tierPattern.eruptions,
    });
  }

  function completePhaseThreeCharge(state, enemy) {
    queuePhaseThreeAftershock(state, enemy);
    enemy.phaseThreeChargeIndex += 1;
    enemy.phaseThreeLaneForward = !enemy.phaseThreeLaneForward;
    if (enemy.phaseThreeSegment >= 2) enemy.phaseThreeLaneVertical = !enemy.phaseThreeLaneVertical;
    if (enemy.phaseThreeSegment === 3 && enemy.phaseThreeChargeIndex >= enemy.phaseThreeChargeCount) {
      const tierPattern = PHASE_THREE.tierPattern(enemy.phaseThreeTier);
      if (!tierPattern.aftershocks) {
        startPhaseThreeWindow(state, enemy);
      } else {
        enemy.mode = "phaseThreeAftershockWait";
        enemy.modeTicks = tierPattern.eruptions ? 111 : 60;
        recordBossMechanic(state, enemy, "phaseThreeAftershockWaitStarted", {
          tier: enemy.phaseThreeTier,
          durationTicks: enemy.modeTicks,
        });
      }
      return;
    }
    if (enemy.phaseThreeSegment <= 2 && enemy.phaseThreeRampageTicks <= 0) {
      startPhaseThreeWindow(state, enemy);
      return;
    }
    startPhaseThreeChargeTelegraph(state, enemy);
  }

  function startTimberfall(state, enemy) {
    enemy.phaseThreeSegmentFourStarted = true;
    enemy.phaseThreeSegment = 4;
    enemy.phaseThreeTier = 0;
    enemy.hpHundredths = enemy.maxHpHundredths;
    enemy.phaseThreeDrainRemainder = 0;
    enemy.phaseThreeTimberfallWaveTicks = 0;
    enemy.phaseThreeTimberfallWaveIndex = 0;
    enemy.mode = "timberfall";
    enemy.actionTicks = 0;
    enemy.invulnerable = false;
    state.enemyShots = [];
    state.hazards = [];
    recordBossMechanic(state, enemy, "timberfallStarted", {
      refilledHpHundredths: enemy.hpHundredths,
      drainNumerator: BOSS_AUTHORITY_RULES.timberfallDrainNumerator,
      drainDenominator: BOSS_AUTHORITY_RULES.timberfallDrainDenominator,
    });
  }

  function beginPhaseThreeSegment(state, enemy, segment) {
    invariant(segment >= 2 && segment <= 4, "BAD_PHASE_THREE_SEGMENT");
    state.enemyShots = [];
    state.hazards = [];
    enemy.phaseThreeSegment = segment;
    enemy.phaseThreeTier = segment === 3 ? 1 : 0;
    recordBossMechanic(state, enemy, "phaseThreeSegmentStarted", {
      segment,
      tier: enemy.phaseThreeTier,
    });
    if (segment === 4) startTimberfall(state, enemy);
    else startPhaseThreeRampage(state, enemy);
  }

  function updatePhaseThreePattern(state, enemy) {
    if (enemy.mode === "phaseThreeWindow") {
      const speedBps = enemy.phaseThreeSegment === 1 ? 10000 : 2800;
      moveEnemyByVector(
        state,
        enemy,
        state.player.x - enemy.x,
        state.player.y - enemy.y,
        Math.max(1, roundRatio(enemy.speedUnitsPerTick * speedBps, 10000)),
      );
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) startPhaseThreeRampage(state, enemy);
      return true;
    }
    if (enemy.mode === "phaseThreeChargeTelegraph") {
      if (enemy.phaseThreeSegment <= 2) enemy.phaseThreeRampageTicks -= 1;
      enemy.modeTicks -= 1;
      if (enemy.phaseThreeSegment <= 2 && enemy.phaseThreeRampageTicks <= 0) {
        startPhaseThreeWindow(state, enemy);
        return true;
      }
      if (enemy.modeTicks <= 0) {
        enemy.mode = "phaseThreeCharge";
        enemy.modeTicks = PHASE_THREE.RULES.laneChargeTicks;
        enemy.phaseThreeChargeElapsedTicks = 0;
        recordBossMechanic(state, enemy, "phaseThreeChargeStarted", {
          segment: enemy.phaseThreeSegment,
          tier: enemy.phaseThreeTier || 0,
          chargeIndex: enemy.phaseThreeChargeIndex,
          vertical: enemy.phaseThreeLaneVertical,
          lane: enemy.phaseThreeLane,
        });
      }
      return true;
    }
    if (enemy.mode === "phaseThreeCharge") {
      if (enemy.phaseThreeSegment <= 2) enemy.phaseThreeRampageTicks -= 1;
      const previous = { x: enemy.x, y: enemy.y };
      enemy.phaseThreeChargeElapsedTicks += 1;
      const elapsed = Math.min(PHASE_THREE.RULES.laneChargeTicks, enemy.phaseThreeChargeElapsedTicks);
      enemy.x = enemy.phaseThreeLaneStartX + roundRatio(
        (enemy.phaseThreeLaneEndX - enemy.phaseThreeLaneStartX) * elapsed,
        PHASE_THREE.RULES.laneChargeTicks,
      );
      enemy.y = enemy.phaseThreeLaneStartY + roundRatio(
        (enemy.phaseThreeLaneEndY - enemy.phaseThreeLaneStartY) * elapsed,
        PHASE_THREE.RULES.laneChargeTicks,
      );
      const collision = IRON_OATH.armedChargeSegment({
        previousTravel: enemy.phaseThreeChargeTravel,
        start: previous,
        end: { x: enemy.x, y: enemy.y },
        player: { x: state.player.x, y: state.player.y },
        playerRadius: state.manifest.rules.player.radius,
        bossRadius: enemy.radius,
      });
      enemy.phaseThreeChargeTravel = collision.totalTravel;
      if (enemy.phaseThreeChargeDamagePending && collision.hit) {
        enemy.phaseThreeChargeDamagePending = false;
        const dealt = applyPlayerDamage(state, bossDamageHundredths(state, 4600));
        recordBossMechanic(state, enemy, "phaseThreeChargeImpact", {
          segment: enemy.phaseThreeSegment,
          tier: enemy.phaseThreeTier || 0,
          chargeIndex: enemy.phaseThreeChargeIndex,
          dealtHundredths: dealt,
        });
      }
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) completePhaseThreeCharge(state, enemy);
      return true;
    }
    if (enemy.mode === "phaseThreeAftershockWait") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) startPhaseThreeWindow(state, enemy);
      return true;
    }
    return false;
  }

  function beginFinalPhaseThreePattern(state, enemy) {
    startPhaseThreeRampage(state, enemy);
  }

  function updateBossBehavior(state, enemy) {
    if (enemy.mode === "intro") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        enemy.invulnerable = false;
        enemy.mode = "ready";
        enemy.actionTicks = 60;
      }
      return;
    }
    if (enemy.mode === "phaseTransition") {
      enemy.phaseTransitionTicks -= 1;
      if (enemy.phaseTransitionTicks > 0) return;
      if (enemy.activeSeedId === "deepRoot" && state.stage !== 15 && enemy.phase === 1) {
        enemy.mode = "rootHearts";
        enemy.mandatoryObjectivesRemaining = 3;
        enemy.rootHeartsSpawned = 0;
        enemy.rootHeartRespiteTicks = 0;
        recordBossMechanic(state, enemy, "rootHeartIntermissionStarted", {
          objectiveCount: 3,
          respiteTicks: 45,
        });
        return;
      }
      enemy.phase = 2;
      enemy.invulnerable = false;
      enemy.mode = "ready";
      enemy.actionTicks = 45;
      return;
    }
    if (enemy.mode === "rootHearts") {
      const activeHeart = state.enemies.some((candidate) => candidate.bossAspect && candidate.hpHundredths > 0);
      if (activeHeart) return;
      if (enemy.rootHeartRespiteTicks > 0) {
        enemy.rootHeartRespiteTicks -= 1;
        return;
      }
      if (enemy.mandatoryObjectivesRemaining > 0) {
        const index = enemy.rootHeartsSpawned;
        enemy.mandatoryObjectivesRemaining -= 1;
        enemy.rootHeartsSpawned += 1;
        enemy.rootHeartRespiteTicks = 45;
        state.enemies.push(createRootHeart(state, enemy, index));
        state.enemies.sort((left, right) => left.id - right.id);
        recordBossMechanic(state, enemy, "rootHeartActivated", { heartIndex: index });
        return;
      }
      enemy.mode = "rootReturn";
      enemy.phaseTransitionTicks = 99;
      recordBossMechanic(state, enemy, "rootHeartIntermissionEnded");
      return;
    }
    if (enemy.mode === "rootReturn") {
      enemy.phaseTransitionTicks -= 1;
      if (enemy.phaseTransitionTicks <= 0) {
        enemy.phase = 2;
        enemy.invulnerable = false;
        enemy.mode = "ready";
        enemy.actionTicks = 45;
      }
      return;
    }
    if (enemy.mode === "finalPhaseTransition") {
      enemy.phaseTransitionTicks -= 1;
      if (enemy.phaseTransitionTicks <= 0) {
        const definition = BOSS_DEFS.forestBoss;
        enemy.phase = 3;
        enemy.phaseThreeSegment = 1;
        enemy.phaseThreeTier = 0;
        enemy.hpHundredths = roundRatio(enemy.maxHpHundredths * definition.phaseThreeHpBps, 10000);
        enemy.maxHpHundredths = enemy.hpHundredths;
        enemy.invulnerable = true;
        enemy.mode = "phaseThreeOpening";
        enemy.phaseThreeOpeningTicks = BOSS_AUTHORITY_RULES.phaseThreeOpeningTicks;
        enemy.phaseThreeOpeningLaneTicks = 0;
        enemy.actionTicks = 0;
        recordBossMechanic(state, enemy, "phaseThreeOpeningStarted", {
          durationTicks: enemy.phaseThreeOpeningTicks,
        });
      }
      return;
    }
    if (enemy.mode === "phaseThreeOpening") {
      enemy.phaseThreeOpeningTicks -= 1;
      enemy.phaseThreeOpeningLaneTicks -= 1;
      if (enemy.phaseThreeOpeningLaneTicks <= 0) {
        const vertical = enemy.phasePatternIndex % 2 === 0;
        createBossHazard(state, enemy, {
          type: "openingRampageLane",
          shape: vertical ? "verticalLane" : "horizontalLane",
          laneIndex: occupiedLane(state, vertical),
          warningTicks: 36,
          impactDamageHundredths: bossDamageHundredths(state, 1400),
        });
        enemy.phasePatternIndex += 1;
        enemy.phaseThreeOpeningLaneTicks = BOSS_AUTHORITY_RULES.phaseThreeOpeningLaneIntervalTicks;
      }
      if (enemy.phaseThreeOpeningTicks <= 0) {
        recordBossMechanic(state, enemy, "phaseThreeOpeningEnded");
        startPhaseThreeWindow(state, enemy);
      }
      return;
    }
    if (enemy.mode === "timberfall") {
      enemy.x = roundRatio(state.manifest.rules.arena.width, 2);
      enemy.y = roundRatio(state.manifest.rules.arena.height, 2);
      enemy.phaseThreeDrainRemainder += enemy.maxHpHundredths * BOSS_AUTHORITY_RULES.timberfallDrainNumerator;
      const drain = Math.floor(enemy.phaseThreeDrainRemainder / BOSS_AUTHORITY_RULES.timberfallDrainDenominator);
      enemy.phaseThreeDrainRemainder %= BOSS_AUTHORITY_RULES.timberfallDrainDenominator;
      enemy.hpHundredths = Math.max(0, enemy.hpHundredths - drain);
      enemy.phaseThreeTimberfallWaveTicks -= 1;
      if (enemy.phaseThreeTimberfallWaveTicks <= 0) {
        spawnTimberfallWave(state, enemy);
        enemy.phaseThreeTimberfallWaveTicks = BOSS_AUTHORITY_RULES.timberfallWaveIntervalTicks;
      }
      return;
    }
    updateFinalArmorModule(state, enemy);
    if (updatePhaseThreePattern(state, enemy)) return;
    if (updateHuntersKnotPattern(state, enemy)) return;
    if (updateIronOathPattern(state, enemy)) return;
    if (updateBloodHuntPattern(state, enemy)) return;
    if (updateDeepRootPattern(state, enemy)) return;
    if (enemy.mode === "patternRecovery") {
      enemy.modeTicks -= 1;
      if (enemy.modeTicks <= 0) {
        enemy.mode = "ready";
        enemy.actionTicks = 30;
      }
      return;
    }

    if (state.stage === 15 && enemy.phase === 2) {
      enemy.activeSeedId = enemy.bossSeedIds[enemy.phasePatternIndex % 2];
    }

    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    enemy.facingX = dx;
    enemy.facingY = dy;
    moveEnemyByVector(state, enemy, dx, dy, Math.max(1, Math.floor(enemy.speedUnitsPerTick / 3)));
    enemy.actionTicks -= 1;
    if (enemy.actionTicks > 0) return;
    if (state.stage === 15 && enemy.phase === 3) beginFinalPhaseThreePattern(state, enemy);
    else beginBossPattern(state, enemy);
  }

  function hazardContainsPlayer(state, hazard) {
    if (hazard.shape === "verticalLane") {
      const laneWidth = state.manifest.rules.arena.width / 3;
      const left = hazard.laneIndex * laneWidth;
      return state.player.x + state.manifest.rules.player.radius >= left
        && state.player.x - state.manifest.rules.player.radius <= left + laneWidth;
    }
    if (hazard.shape === "horizontalLane") {
      const laneHeight = state.manifest.rules.arena.height / 3;
      const top = hazard.laneIndex * laneHeight;
      return state.player.y + state.manifest.rules.player.radius >= top
        && state.player.y - state.manifest.rules.player.radius <= top + laneHeight;
    }
    const distanceSquared = squaredDistance(state.player, hazard);
    if (hazard.shape === "ring") {
      const distance = integerSqrt(distanceSquared);
      return distance + state.manifest.rules.player.radius >= hazard.ringInnerRadius
        && distance - state.manifest.rules.player.radius <= hazard.radius;
    }
    const playerRadius = hazard.type === "timberfall"
      ? state.manifest.rules.player.radius
      : roundRatio(state.manifest.rules.player.radius * 25, 100);
    const radius = hazard.radius + playerRadius;
    return distanceSquared <= radius * radius;
  }

  function updateEnemyBehavior(state, enemy) {
    const definition = ENEMY_DEFS[enemy.typeId];
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const distance = integerSqrt(dx * dx + dy * dy);
    enemy.facingX = dx;
    enemy.facingY = dy;
    const baseSpeed = enemy.speedUnitsPerTick;

    if (state.stage === 1) {
      let speed = baseSpeed;
      if (enemy.behavior === "wolf") {
        enemy.wolfTimer -= 1;
        if (enemy.wolfTimer <= 0) {
          enemy.wolfMode = enemy.wolfMode === "circle" ? "lunge" : "circle";
          enemy.wolfTimer = enemy.wolfMode === "lunge" ? 25 : 70 + state.prng.combat.range(42);
        }
        speed = enemy.wolfMode === "lunge" ? roundRatio(speed * 165, 100) : roundRatio(speed * 82, 100);
      }
      moveEnemyByVector(state, enemy, dx, dy, speed);
      return;
    }

    if (enemy.behavior === "stationaryObjective") {
      updateRootHeartBehavior(state, enemy);
      return;
    }

    if (enemy.behavior === "boss") {
      updateBossBehavior(state, enemy);
      return;
    }

    if (enemy.behavior === "flee") {
      moveEnemyByVector(state, enemy, dx, dy, baseSpeed, true);
      return;
    }

    if (enemy.behavior === "wolf") {
      enemy.actionTicks -= 1;
      if (enemy.mode === "lunge") {
        moveEnemyByVector(state, enemy, enemy.chargeVx, enemy.chargeVy, roundRatio(baseSpeed * 165, 100));
        enemy.modeTicks -= 1;
        if (enemy.modeTicks <= 0) {
          enemy.mode = "ready";
          enemy.actionTicks = 72 + state.prng.combat.range(43);
        }
      } else {
        const lateralX = -dy * enemy.strafeDirection;
        const lateralY = dx * enemy.strafeDirection;
        moveEnemyByVector(state, enemy, dx * 9 + lateralX * 4, dy * 9 + lateralY * 4, roundRatio(baseSpeed * 82, 100));
        if (enemy.actionTicks <= 0) {
          enemy.mode = "lunge";
          enemy.modeTicks = 25;
          enemy.chargeVx = dx;
          enemy.chargeVy = dy;
        }
      }
      return;
    }

    if (enemy.behavior === "charger") {
      enemy.actionTicks -= 1;
      if (enemy.mode === "telegraph") {
        enemy.modeTicks -= 1;
        enemy.chargeVx = state.player.x - enemy.x;
        enemy.chargeVy = state.player.y - enemy.y;
        if (enemy.modeTicks <= 0) {
          enemy.mode = "charge";
          enemy.modeTicks = 37;
        }
        return;
      }
      if (enemy.mode === "charge") {
        moveEnemyByVector(state, enemy, enemy.chargeVx, enemy.chargeVy, Math.max(1, roundRatio(definition.chargeSpeed * 10, TICK_RATE)));
        enemy.modeTicks -= 1;
        if (enemy.modeTicks <= 0) {
          enemy.mode = "recover";
          enemy.modeTicks = 33;
        }
        return;
      }
      if (enemy.mode === "recover") {
        enemy.modeTicks -= 1;
        if (enemy.modeTicks <= 0) {
          enemy.mode = "ready";
          enemy.actionTicks = definition.chargeCooldownTicks;
        }
        return;
      }
      moveEnemyByVector(state, enemy, dx, dy, roundRatio(baseSpeed * 55, 100));
      if (enemy.actionTicks <= 0 && distance < 4300) {
        enemy.mode = "telegraph";
        enemy.modeTicks = 33;
      }
      return;
    }

    if (["ranged", "netter", "caster"].includes(enemy.behavior)) {
      enemy.shotTicks -= 1;
      const desired = definition.range * 10;
      if (distance < roundRatio(desired * 72, 100)) {
        moveEnemyByVector(state, enemy, dx, dy, roundRatio(baseSpeed * 88, 100), true);
      } else if (distance > roundRatio(desired * 108, 100)) {
        moveEnemyByVector(state, enemy, dx, dy, roundRatio(baseSpeed * 65, 100));
      } else {
        moveEnemyByVector(state, enemy, -dy * enemy.strafeDirection, dx * enemy.strafeDirection, Math.max(1, roundRatio(baseSpeed * 22, 100)));
      }
      if (enemy.shotTicks <= 0) {
        if (enemy.behavior === "ranged") fireEnemyShot(state, enemy);
        else createHazard(state, enemy, enemy.behavior === "netter" ? "net" : "bramble");
        enemy.shotTicks = definition.shotCooldownTicks;
      }
      return;
    }

    if (enemy.behavior === "support") {
      moveEnemyByVector(state, enemy, dx, dy, distance < 1700 ? roundRatio(baseSpeed * 72, 100) : roundRatio(baseSpeed * 42, 100), distance < 1700);
      return;
    }

    if (enemy.behavior === "ooze") {
      const sway = ((state.stageTick + enemy.id * 17) % 61) - 30;
      moveEnemyByVector(state, enemy, dx * 60 - dy * sway, dy * 60 + dx * sway, baseSpeed);
      return;
    }

    if (enemy.behavior === "brute") {
      moveEnemyByVector(state, enemy, dx, dy, baseSpeed);
      return;
    }

    if (enemy.behavior === "shield") {
      moveEnemyByVector(state, enemy, dx, dy, roundRatio(baseSpeed * (enemy.shieldBroken ? 90 : 72), 100));
      return;
    }

    moveEnemyByVector(state, enemy, dx, dy, baseSpeed);
  }

  function markPlayerHealthDamage(state, paid, source) {
    if (paid <= 0) return;
    const ids = RUN_RELICS.IDS;
    state.streakCount = 0;
    state.lastKillTick = null;
    if (hasStageRelic(state, ids.GOLDEN_OATH) && state.stage >= 6) {
      const oath = stageRelicState(state, ids.GOLDEN_OATH);
      oath.oathIntact = false;
      oath.oathBrokenAt = state.stageTick;
      oath.oathBreakingSource = source;
    }
    if (hasStageRelic(state, ids.SHERIFFS_WAGER) && state.stage >= 11 && state.stage <= 14) {
      const wager = stageRelicState(state, ids.SHERIFFS_WAGER);
      wager.trialStageFlawless = false;
      wager.trialDamageTaken += paid;
    }
    if (hasStageRelic(state, ids.LAST_LIFE)) {
      const lastLife = stageRelicState(state, ids.LAST_LIFE);
      const requestedWound = roundRatio(paid * 3000, 10000);
      const wound = Math.min(requestedWound, Math.max(0, state.player.maxHpHundredths - 100));
      if (wound > 0) {
        state.run.relicMaxHpBonusHundredths -= wound;
        state.player.maxHpHundredths -= wound;
        state.player.hpHundredths = Math.min(state.player.hpHundredths, state.player.maxHpHundredths);
        lastLife.lastLifeWounds += wound;
      }
    }
  }

  function applyPlayerHealthPayment(state, amountHundredths) {
    const paid = Math.min(Math.max(0, amountHundredths), Math.max(0, state.player.hpHundredths - 100));
    if (paid <= 0) return 0;
    state.player.hpHundredths -= paid;
    state.damageTakenHundredths += paid;
    markPlayerHealthDamage(state, paid, "bloodPact");
    return paid;
  }

  function applyPlayerDamage(state, damageHundredths) {
    if (damageHundredths <= 0 || state.player.roomGraceTicks > 0) return 0;
    const ids = RUN_RELICS.IDS;
    const wagerBps = hasStageRelic(state, ids.SHERIFFS_WAGER) && state.stage >= 11 && state.stage <= 14 ? 12500 : 10000;
    const effectiveReductionBps = state.player.damageReductionBps + (state.player.survivorsOathActive ? 1500 : 0);
    let reduced = roundRatio(roundRatio(damageHundredths * wagerBps, 10000) * (10000 - clamp(effectiveReductionBps, 0, 9000)), 10000);
    if (state.player.barrierHundredths > 0) {
      const absorbed = Math.min(state.player.barrierHundredths, reduced);
      state.player.barrierHundredths -= absorbed;
      reduced -= absorbed;
      if (hasStageRelic(state, ids.OVERFLOWING_HEART)) {
        stageRelicState(state, ids.OVERFLOWING_HEART).overflowBarrier = state.player.barrierHundredths;
      }
    }
    if (reduced > 0 && hasStageRelic(state, ids.BORROWED_HEART)) {
      const absorption = RUN_RELICS.absorbBorrowedHeartDamage(stageRelicState(state, ids.BORROWED_HEART), reduced);
      reduced = Math.floor(absorption.healthDamage);
    }
    const paid = Math.min(state.player.hpHundredths, reduced);
    state.player.hpHundredths -= paid;
    state.damageTakenHundredths += paid;
    if (paid > 0) {
      markPlayerHealthDamage(state, paid, "healthDamage");
      maybeConsumeHeartsGrace(state);
    }
    return paid;
  }

  function applyPassiveRegeneration(state) {
    if (state.evolutions.survivorsOath) {
      const hpRatioBps = roundRatio(state.player.hpHundredths * 10000, state.player.maxHpHundredths);
      if (!state.player.survivorsOathActive && hpRatioBps < 3000) state.player.survivorsOathActive = true;
      if (state.player.survivorsOathActive && hpRatioBps > 4500) state.player.survivorsOathActive = false;
    } else {
      state.player.survivorsOathActive = false;
    }
    const crownRegen = state.stage === 15 && hasStageRelic(state, RUN_RELICS.IDS.BROKEN_CROWN_OATH)
      ? stageRelicState(state, RUN_RELICS.IDS.BROKEN_CROWN_OATH).brokenCrownMarks * 15
      : 0;
    const regeneration = (state.player.regenerationHundredthsPerSecond + crownRegen)
      * (state.player.survivorsOathActive ? 3 : 1);
    if (regeneration <= 0 || state.player.hpHundredths <= 0) return;
    state.player.regenerationRemainder += regeneration;
    const healing = Math.floor(state.player.regenerationRemainder / TICK_RATE);
    state.player.regenerationRemainder %= TICK_RATE;
    if (healing > 0) applyPlayerHealing(state, healing);
  }

  function updateEnemyStatuses(state, enemy) {
    const poisonSpeed = state.evolutions.overdose && enemy.poisonStacks.length >= 15 ? 3 : 2;
    for (const stack of enemy.poisonStacks) {
      stack.remainder += stack.dpsHundredths * poisonSpeed;
      const damage = Math.floor(stack.remainder / (TICK_RATE * 2));
      stack.remainder %= TICK_RATE * 2;
      if (damage > 0) dealEnemyDamage(state, enemy, damage);
      stack.remainingHalfTicks -= poisonSpeed;
    }
    enemy.poisonStacks = enemy.poisonStacks.filter((stack) => stack.remainingHalfTicks > 0);

    for (const tranche of enemy.bleedTranches) {
      if (tranche.remainingTicks <= 0 || tranche.remainingDamageHundredths <= 0) continue;
      const damage = Math.ceil(tranche.remainingDamageHundredths / tranche.remainingTicks);
      tranche.remainingDamageHundredths -= damage;
      tranche.remainingTicks -= 1;
      dealEnemyDamage(state, enemy, damage);
    }
    enemy.bleedTranches = enemy.bleedTranches.filter((tranche) => tranche.remainingTicks > 0 && tranche.remainingDamageHundredths > 0);

    if (enemy.frostTicks > 0) enemy.frostTicks -= 1;
    if (enemy.freezeTicks > 0) enemy.freezeTicks -= 1;
    if (enemy.brittleTicks > 0) enemy.brittleTicks -= 1;
    if (enemy.staggerTicks > 0) enemy.staggerTicks -= 1;
    if (enemy.bloodVulnerableTicks > 0) enemy.bloodVulnerableTicks -= 1;
    return enemy.hpHundredths <= 0;
  }

  function updateEnemies(state) {
    state.enemies.sort((left, right) => left.id - right.id);
    const dead = [];
    const escapedIds = new Set();
    for (const enemy of state.enemies) {
      if (enemy.optionalEntryTicks > 0) {
        enemy.optionalEntryTicks -= 1;
        if (enemy.optionalEntryTicks <= 0) enemy.invulnerable = false;
        continue;
      }
      if (enemy.optionalSprite) {
        enemy.escapeTicks -= 1;
        if (enemy.escapeTicks <= 0) {
          escapedIds.add(enemy.id);
          continue;
        }
      }
      if (updateEnemyStatuses(state, enemy)) {
        dead.push(enemy);
        awardKill(state, enemy);
        continue;
      }
      if (enemy.freezeTicks <= 0 && enemy.staggerTicks <= 0) updateEnemyBehavior(state, enemy);
      const contactRadius = state.manifest.rules.player.radius + enemy.radius;
      const authoredIronImpact = [
        "ironChargeTelegraph", "ironCharge", "ironChargeRecovery", "ironSweep", "ironSweepRecovery",
        "ironLaneTelegraph", "ironLaneCharge",
      ].includes(enemy.mode);
      const bloodContactSafe = [
        "bloodTeachRecord", "bloodTeachPursuit", "bloodTeachExposed",
        "bloodLureRecord", "bloodLurePursuit", "bloodRevealed", "bloodLureMissRecovery",
      ].includes(enemy.mode);
      if (!enemy.invulnerable && !authoredIronImpact && !bloodContactSafe && enemy.touchHundredthsPerSecond > 0
        && squaredDistance(state.player, enemy) <= contactRadius * contactRadius) {
        const brittleOutgoingBps = enemy.brittleTicks > 0 ? 8000 : 10000;
        const bossOutgoingBps = enemy.boss ? 7200 : 10000;
        enemy.contactDamageRemainder += roundRatio(
          roundRatio(
            roundRatio(enemy.touchHundredthsPerSecond * bannerMultiplierBps(state, enemy, false), 10000) * brittleOutgoingBps,
            10000,
          ) * bossOutgoingBps,
          10000,
        );
        const damage = Math.floor(enemy.contactDamageRemainder / TICK_RATE);
        enemy.contactDamageRemainder %= TICK_RATE;
        if (state.stage === 1) {
          const paid = Math.min(state.player.hpHundredths, damage);
          state.player.hpHundredths -= paid;
          state.damageTakenHundredths += paid;
        } else {
          applyPlayerDamage(state, damage);
        }
      }
    }
    if (dead.length) {
      const deadIds = new Set(dead.map((enemy) => enemy.id));
      clearDeadBossPressure(state, dead);
      state.enemies = state.enemies.filter((enemy) => !deadIds.has(enemy.id));
      for (const enemy of dead) spawnOozeChildren(state, enemy);
      state.enemies.sort((left, right) => left.id - right.id);
    }
    if (escapedIds.size) state.enemies = state.enemies.filter((enemy) => !escapedIds.has(enemy.id));
  }

  function updateEnemyShots(state) {
    const survivors = [];
    for (const shot of state.enemyShots.sort((left, right) => left.id - right.id)) {
      shot.x += shot.vx;
      shot.y += shot.vy;
      shot.ttl -= 1;
      const collisionRadius = state.manifest.rules.player.radius + shot.radius;
      if (squaredDistance(state.player, shot) <= collisionRadius * collisionRadius) {
        applyPlayerDamage(state, shot.damageHundredths);
        continue;
      }
      if (shot.ttl > 0 && shot.x >= 0 && shot.x <= state.manifest.rules.arena.width && shot.y >= 0 && shot.y <= state.manifest.rules.arena.height) survivors.push(shot);
    }
    state.enemyShots = survivors;
  }

  function updateBloodScentTrail(state) {
    const trail = state.scentTrail;
    if (!trail) return;
    const boss = bossById(state, trail.ownerBossId);
    if (!boss) {
      state.scentTrail = null;
      return;
    }
    if (trail.active) {
      BLOOD_HUNT.recordTrailPoint(trail, state.player);
      trail.ticksRemaining -= 1;
      if (trail.ticksRemaining <= 0) {
        BLOOD_HUNT.lockTrail(trail, state.player);
        recordBossMechanic(state, boss, "bloodScentLocked", { points: trail.points.length });
      }
      return;
    }
    if (trail.locked && trail.lockTicksRemaining > 0) trail.lockTicksRemaining -= 1;
  }

  function updateHoundRuns(state) {
    for (const run of state.houndRuns.sort((left, right) => left.id - right.id)) {
      if (!run.active) continue;
      if (run.delayTicks > 0) {
        run.delayTicks -= 1;
        continue;
      }
      if (run.warningTicks > 0) {
        run.warningTicks -= 1;
        continue;
      }
      run.distanceRemainder += run.speedPerSecond;
      const travel = Math.floor(run.distanceRemainder / TICK_RATE);
      run.distanceRemainder %= TICK_RATE;
      run.distance += travel;
      const front = BLOOD_HUNT.pointAlongPolyline(run.points, run.distance);
      run.x = front.x;
      run.y = front.y;
      run.directionX = front.directionX;
      run.directionY = front.directionY;
      run.segmentLength = front.segmentLength;
      const boss = bossById(state, run.exposeBossId || run.revealBossId);
      if (boss && run.exposeBossId && boss.mode === "bloodTeachPursuit"
        && BLOOD_HUNT.frontIntersectsCircle(front, boss, boss.radius, run.halfWidth, run.halfDepth)) {
        exposeBloodBoss(state, boss, true);
        continue;
      }
      if (boss && run.revealBossId && boss.mode === "bloodLurePursuit" && boss.bloodShadowVisible
        && BLOOD_HUNT.frontIntersectsCircle(
          front,
          boss,
          BLOOD_HUNT.RULES.shadowRadius,
          run.halfWidth,
          run.halfDepth,
        )) {
        exposeBloodBoss(state, boss, false);
        continue;
      }
      if (!run.hitPlayer && BLOOD_HUNT.frontIntersectsCircle(
        front,
        state.player,
        state.manifest.rules.player.radius,
        run.halfWidth,
        run.halfDepth,
      )) {
        run.hitPlayer = true;
        const dealt = applyPlayerDamage(state, run.damageHundredths);
        const push = normalizedStep(run.directionX, run.directionY, 340);
        const arena = state.manifest.rules.arena;
        const radius = state.manifest.rules.player.radius;
        state.player.x = clamp(state.player.x + push.x, arena.padding + radius, arena.width - arena.padding - radius);
        state.player.y = clamp(state.player.y + push.y, arena.padding + radius, arena.height - arena.padding - radius);
        const sourceBoss = bossById(state, run.sourceBossId);
        if (sourceBoss) recordBossMechanic(state, sourceBoss, "bloodHoundBite", { runId: run.id, dealtHundredths: dealt });
      }
      if (run.distance >= run.length + run.radius * 2) run.active = false;
    }
    state.houndRuns = state.houndRuns.filter((run) => run.active);
  }

  function playerHazardSlowBps(state) {
    let slowBps = 10000;
    for (const hazard of state.hazards) {
      if (hazard.warningTicks > 0) continue;
      if (hazardContainsPlayer(state, hazard)) slowBps = Math.min(slowBps, hazard.slowBps);
    }
    return slowBps;
  }

  function resolveHunterStormImpact(state, hazard) {
    if (hazard.type !== "arrowStorm" || !hazard.hunterStormCastId) return false;
    const boss = bossById(state, hazard.sourceEnemyId);
    if (!boss || boss.invulnerable || !["hunterStorm", "hunterStormWait"].includes(boss.mode)
      || boss.hunterStormCastId !== hazard.hunterStormCastId || boss.hunterVulnerableTicks > 0) return false;
    const result = HUNTERS_KNOT.stormReversalResult({
      hazard: { x: hazard.x, y: hazard.y, radius: hazard.radius },
      boss: { x: boss.x, y: boss.y, radius: boss.radius },
      playerRadius: state.manifest.rules.player.radius,
    });
    invariant(hazard.hunterImpactCoreRadius === result.coreRadius, "HUNTER_IMPACT_CORE_DRIFT");
    if (!result.reversed) return false;
    boss.hunterVulnerableTicks = result.durationTicks;
    boss.mode = "hunterPunished";
    boss.modeTicks = result.durationTicks;
    for (const pending of state.hazards) {
      if (pending.id !== hazard.id && pending.hunterStormCastId === hazard.hunterStormCastId) pending.cancelled = true;
    }
    if (result.breakAnchor && state.bossAnchor?.ownerBossId === boss.id && state.bossAnchor.active) {
      breakBossAnchor(state, "storm");
    }
    recordBossMechanic(state, boss, "hunterStormReversed", {
      castId: hazard.hunterStormCastId,
      impactCoreRadius: result.coreRadius,
      multiplierBps: result.damageMultiplierBps,
      durationTicks: result.durationTicks,
    });
    return true;
  }

  function updateHazards(state) {
    const survivors = [];
    const spawned = [];
    for (const hazard of state.hazards.sort((left, right) => left.id - right.id)) {
      if (hazard.cancelled) continue;
      if (hazard.warningTicks > 0) {
        hazard.warningTicks -= 1;
        survivors.push(hazard);
        continue;
      }
      hazard.activeTicks -= 1;
      if (!hazard.impacted && hazard.impactDamageHundredths > 0) {
        hazard.impacted = true;
        resolveHunterStormImpact(state, hazard);
        if (hazardContainsPlayer(state, hazard)) applyPlayerDamage(state, hazard.impactDamageHundredths);
        if (hazard.type === "phaseThreeAftershock" && hazard.phaseThreeErupts) {
          const sourceBoss = bossById(state, hazard.sourceEnemyId);
          const vertical = hazard.shape === "verticalLane";
          const geometry = PHASE_THREE.laneGeometry(phaseThreeArena(state), hazard.laneIndex, vertical);
          const centers = PHASE_THREE.eruptionCenters(geometry, vertical);
          for (const center of centers) {
            spawned.push({
              id: state.nextHazardId++,
              type: "phaseThreeEruption",
              shape: "circle",
              x: center.x,
              y: center.y,
              radius: 310,
              ringInnerRadius: 0,
              laneIndex: 1,
              warningTicks: PHASE_THREE.RULES.eruptionWarningTicks,
              activeTicks: PHASE_THREE.RULES.eruptionImpactTicks,
              slowBps: 10000,
              damageHundredthsPerSecond: 0,
              damageRemainder: 0,
              impactDamageHundredths: roundRatio(hazard.impactDamageHundredths * 7200, 10000),
              impacted: false,
              sourceEnemyId: hazard.sourceEnemyId,
              hunterStormCastId: 0,
              hunterImpactCoreRadius: 0,
              phaseThreeErupts: false,
              phaseThreeVertical: vertical,
              cancelled: false,
            });
            state.telemetry.hazardTicks.push({
              enemyId: hazard.sourceEnemyId,
              type: "phaseThreeEruption",
              tick: state.stageTick,
            });
          }
          if (sourceBoss) recordBossMechanic(state, sourceBoss, "phaseThreeEruptionsQueued", {
            chargeLane: hazard.laneIndex,
            vertical,
            count: centers.length,
            warningTicks: PHASE_THREE.RULES.eruptionWarningTicks,
          });
        }
      }
      if (hazard.damageHundredthsPerSecond > 0 && hazardContainsPlayer(state, hazard)) {
        hazard.damageRemainder += hazard.damageHundredthsPerSecond;
        const damage = Math.floor(hazard.damageRemainder / TICK_RATE);
        hazard.damageRemainder %= TICK_RATE;
        applyPlayerDamage(state, damage);
      }
      if (hazard.activeTicks > 0) survivors.push(hazard);
    }
    state.hazards = survivors.filter((hazard) => !hazard.cancelled).concat(spawned);
  }

  function updateReinforcement(state) {
    if (state.nextPulseIndex >= state.plan.pulses.length) return;
    const config = state.plan.reinforcement;
    if (state.reinforcementWarningTicks > 0) {
      state.reinforcementWarningTicks -= 1;
      if (state.reinforcementWarningTicks === 0) releasePulse(state, state.nextPulseIndex);
      return;
    }
    const coreLiving = blockingEnemyCount(state);
    if (state.stage === 1 && state.stageTick < config.ageFloorTicks) return;
    if (state.stage !== 1 && state.stageTick < config.ageFloorTicks && coreLiving > 0) return;
    if (coreLiving > config.livingThreshold) return;
    const incoming = state.plan.pulses[state.nextPulseIndex].length;
    if (coreLiving + incoming > config.livingCap) return;
    reservePulse(state, state.nextPulseIndex);
    state.reinforcementWarningTicks = coreLiving === 0 ? config.zeroLivingWarningTicks : config.warningTicks;
  }

  function blockingEnemyCount(state) {
    return state.enemies.filter((enemy) => SCORE_POLICY[enemy.scorePolicy]?.requiredForClear !== false).length;
  }

  function publicStageState(state) {
    return {
      coreVersion: CORE_VERSION,
      rulesetId: RULESET_ID,
      stage: state.stage,
      stageTick: state.stageTick,
      outcome: state.outcome,
      player: {
        x: state.player.x,
        y: state.player.y,
        hpHundredths: state.player.hpHundredths,
        maxHpHundredths: state.player.maxHpHundredths,
        moveUnitsPerTick: state.player.moveUnitsPerTick,
        arrowDamageHundredths: state.player.arrowDamageHundredths,
        shotCooldownTicks: state.player.shotCooldownTicks,
        criticalChanceBps: state.player.criticalChanceBps,
        criticalMultiplierBps: state.player.criticalMultiplierBps,
        regenerationHundredthsPerSecond: state.player.regenerationHundredthsPerSecond,
        regenerationRemainder: state.player.regenerationRemainder,
        damageReductionBps: state.player.damageReductionBps,
        barrierHundredths: state.player.barrierHundredths,
        barrierTimerTicks: state.player.barrierTimerTicks,
        silenceTicks: state.player.silenceTicks,
        stillTicks: state.player.stillTicks,
        survivorsOathActive: state.player.survivorsOathActive,
        shotCooldown: state.player.shotCooldown,
        roomGraceTicks: state.player.roomGraceTicks,
      },
      enemies: state.enemies.map((enemy) => ({
        id: enemy.id,
        typeId: enemy.typeId,
        child: enemy.child,
        x: enemy.x,
        y: enemy.y,
        hpHundredths: enemy.hpHundredths,
        maxHpHundredths: enemy.maxHpHundredths,
        mode: enemy.mode,
        modeTicks: enemy.modeTicks,
        actionTicks: enemy.actionTicks,
        shotTicks: enemy.shotTicks,
        shieldHits: enemy.shieldHits,
        shieldBroken: enemy.shieldBroken,
        poisonStacks: clone(enemy.poisonStacks),
        bleedTranches: clone(enemy.bleedTranches),
        frostTicks: enemy.frostTicks,
        frostSlowBps: enemy.frostSlowBps,
        chill: enemy.chill,
        freezeTicks: enemy.freezeTicks,
        brittleTicks: enemy.brittleTicks,
        staggerTicks: enemy.staggerTicks,
        optionalSprite: Boolean(enemy.optionalSprite),
        optionalEntryTicks: enemy.optionalEntryTicks || 0,
        escapeTicks: enemy.escapeTicks || 0,
        optionalReward: enemy.optionalReward || "",
        boss: Boolean(enemy.boss),
        bossAspect: Boolean(enemy.bossAspect),
        bossSeedIds: [...(enemy.bossSeedIds || [])],
        activeSeedId: enemy.activeSeedId || "",
        armorHundredths: enemy.armorHundredths || 0,
        armorMaxHundredths: enemy.armorMaxHundredths || 0,
        armorSegmentsBroken: enemy.armorSegmentsBroken || 0,
        brokenArmorSegmentIds: [...(enemy.brokenArmorSegmentIds || [])],
        armorModuleIndex: enemy.armorModuleIndex || 0,
        armorModuleTicks: enemy.armorModuleTicks || 0,
        armorModuleStarted: Boolean(enemy.armorModuleStarted),
        invulnerable: Boolean(enemy.invulnerable),
        phase: enemy.phase || 0,
        phasePatternIndex: enemy.phasePatternIndex || 0,
        phaseTransitionTicks: enemy.phaseTransitionTicks || 0,
        phaseThreeSegment: enemy.phaseThreeSegment || 0,
        phaseThreeTier: enemy.phaseThreeTier || 0,
        phaseThreeOpeningTicks: enemy.phaseThreeOpeningTicks || 0,
        phaseThreeRampageTicks: enemy.phaseThreeRampageTicks || 0,
        phaseThreeChargeIndex: enemy.phaseThreeChargeIndex || 0,
        phaseThreeChargeCount: enemy.phaseThreeChargeCount || 0,
        phaseThreeLaneVertical: Boolean(enemy.phaseThreeLaneVertical),
        phaseThreeLane: enemy.phaseThreeLane || 0,
        phaseThreeSegmentFourStarted: Boolean(enemy.phaseThreeSegmentFourStarted),
        phaseThreeTimberfallWaveTicks: enemy.phaseThreeTimberfallWaveTicks || 0,
        phaseThreeTimberfallWaveIndex: enemy.phaseThreeTimberfallWaveIndex || 0,
        mandatoryObjectivesRemaining: enemy.mandatoryObjectivesRemaining || 0,
        rootHeartsSpawned: enemy.rootHeartsSpawned || 0,
        rootHeartRespiteTicks: enemy.rootHeartRespiteTicks || 0,
        hunterLessonIndex: enemy.hunterLessonIndex || 0,
        hunterPhaseOneLessonComplete: Boolean(enemy.hunterPhaseOneLessonComplete),
        hunterFollowupIndex: enemy.hunterFollowupIndex || 0,
        hunterBranch: enemy.hunterBranch || "",
        hunterCycleKind: enemy.hunterCycleKind || "",
        hunterStormWavesRemaining: enemy.hunterStormWavesRemaining || 0,
        hunterStormCastId: enemy.hunterStormCastId || 0,
        hunterVulnerableTicks: enemy.hunterVulnerableTicks || 0,
        ironCycleKind: enemy.ironCycleKind || "",
        ironWheelElapsedTicks: enemy.ironWheelElapsedTicks || 0,
        ironWheelShotIndex: enemy.ironWheelShotIndex || 0,
        ironWheelShotTotal: enemy.ironWheelShotTotal || 0,
        ironLaneIndex: enemy.ironLaneIndex || 0,
        ironLaneCount: enemy.ironLaneCount || 0,
        ironLane: enemy.ironLane || 0,
        ironChargeTravel: enemy.ironChargeTravel || 0,
        bloodCycleIndex: enemy.bloodCycleIndex || 0,
        bloodWaveIndex: enemy.bloodWaveIndex || 0,
        bloodWaveTicks: enemy.bloodWaveTicks || 0,
        bloodLessonComplete: Boolean(enemy.bloodLessonComplete),
        bloodVulnerableTicks: enemy.bloodVulnerableTicks || 0,
        bloodShadowVisible: Boolean(enemy.bloodShadowVisible),
        bloodCrossfireLineIndex: enemy.bloodCrossfireLineIndex || 0,
        bloodCrossfireTicks: enemy.bloodCrossfireTicks || 0,
        bloodChargeTravelTicks: enemy.bloodChargeTravelTicks || 0,
        deepCycleKind: enemy.deepCycleKind || "",
        deepStep: enemy.deepStep || 0,
        deepCount: enemy.deepCount || 0,
        deepDirection: enemy.deepDirection || 1,
        deepVertical: Boolean(enemy.deepVertical),
        deepSafeStrips: [...(enemy.deepSafeStrips || [])],
        deepGapAngle: enemy.deepGapAngle || 0,
        deepRingRadius: enemy.deepRingRadius || 0,
      })),
      arrows: state.arrows.map((arrow) => ({
        id: arrow.id,
        x: arrow.x,
        y: arrow.y,
        vx: arrow.vx,
        vy: arrow.vy,
        ttl: arrow.ttl,
        damageHundredths: arrow.damageHundredths,
        volleyId: arrow.volleyId,
        isCritical: arrow.isCritical,
        bellCycleIndex: arrow.bellCycleIndex,
        remainingHits: arrow.remainingHits,
        pierceDecayBps: arrow.pierceDecayBps,
        remainingBounces: arrow.remainingBounces,
        bounceDecayBps: arrow.bounceDecayBps,
        hitIds: [...arrow.hitIds],
        pinballRestoredIds: [...arrow.pinballRestoredIds],
        contagionStack: clone(arrow.contagionStack),
        forceBleedApplications: arrow.forceBleedApplications,
        siege: arrow.siege,
      })),
      enemyShots: state.enemyShots.map((shot) => ({ ...shot })),
      hazards: state.hazards.map((hazard) => ({ ...hazard })),
      bossAnchor: state.bossAnchor ? { ...state.bossAnchor } : null,
      houndRuns: state.houndRuns.map((run) => ({
        ...run,
        points: run.points.map((point) => ({ ...point })),
      })),
      scentTrail: state.scentTrail ? {
        ...state.scentTrail,
        points: state.scentTrail.points.map((point) => ({ ...point })),
      } : null,
      bruteStakes: state.bruteStakes.map((stake) => ({ ...stake })),
      score: state.score,
      baseScore: state.baseScore,
      streakScore: state.streakScore,
      kills: clone(state.kills),
      streakCount: state.streakCount,
      bestStreak: state.bestStreak,
      lastKillTick: state.lastKillTick,
      damageTakenHundredths: state.damageTakenHundredths,
      bossMechanicEvents: clone(state.telemetry.bossMechanicEvents),
      techniques: clone(state.techniques),
      statusPath: state.statusPath,
      evolutions: clone(state.evolutions),
      optionalRewards: clone(state.optionalRewards || null),
      nextPulseIndex: state.nextPulseIndex,
      reinforcementWarningTicks: state.reinforcementWarningTicks,
      reinforcementReservations: clone(state.reinforcementReservations),
      nextEnemyId: state.nextEnemyId,
      nextArrowId: state.nextArrowId,
      nextEnemyShotId: state.nextEnemyShotId,
      nextHazardId: state.nextHazardId,
      nextHoundRunId: state.nextHoundRunId,
      prngWords: {
        combat: state.prng.combat.exportWords(),
        rewards: state.prng.rewards.exportWords(),
        bosses: state.prng.bosses.exportWords(),
      },
    };
  }

  function simulateStageTick(state, input) {
    invariant(state.outcome === "RUNNING", "SIMULATION_ALREADY_TERMINAL");
    validateTickInput(input);
    state.stageTick += 1;
    if (state.player.roomGraceTicks > 0) state.player.roomGraceTicks -= 1;
    movePlayer(state, input);
    updateBloodScentTrail(state);
    state.player.stillTicks = state.player.moving ? 0 : state.player.stillTicks + 1;
    if (state.player.silenceTicks > 0) {
      state.player.silenceTicks -= 1;
      const bell = stageRelicState(state, RUN_RELICS.IDS.FIFTH_BELL);
      if (bell) bell.bellSilenceRemaining = state.player.silenceTicks;
    }
    if (state.player.barrierTimerTicks > 0) {
      state.player.barrierTimerTicks -= 1;
      if (state.player.barrierTimerTicks <= 0 && !hasStageRelic(state, RUN_RELICS.IDS.OVERFLOWING_HEART)) {
        state.player.barrierHundredths = 0;
      }
    }
    updateAutoshot(state);
    updateArrows(state);
    updateEnemies(state);
    updateHoundRuns(state);
    updateEnemyShots(state);
    updateHazards(state);
    updateReinforcement(state);
    applyPassiveRegeneration(state);
    if (state.player.hpHundredths <= 0) {
      state.player.hpHundredths = 0;
      state.outcome = "DEAD";
    } else if (state.nextPulseIndex >= state.plan.pulses.length && blockingEnemyCount(state) === 0) {
      state.enemies = [];
      state.enemyShots = [];
      state.hazards = [];
      state.houndRuns = [];
      state.scentTrail = null;
      state.bruteStakes = [];
      state.outcome = "CLEARED";
    } else if (state.stageTick >= MAX_STAGE_TICKS) {
      state.outcome = "TIMEOUT";
    }
    return state.outcome;
  }

  function validateSegments(segments, expectedEndTick) {
    invariant(Array.isArray(segments) && segments.length > 0, "MISSING_REPLAY_INPUT");
    invariant(Number.isSafeInteger(expectedEndTick) && expectedEndTick > 0 && expectedEndTick <= MAX_STAGE_TICKS, "BAD_REPLAY_END");
    let next = 0;
    for (const segment of segments) {
      exactKeys(segment, ["startTick", "endTick", "x", "y"], "BAD_INPUT_SEGMENT_SHAPE");
      invariant(segment.startTick === next, "INPUT_GAP_OR_OVERLAP");
      invariant(Number.isSafeInteger(segment.endTick) && segment.endTick > segment.startTick && segment.endTick <= expectedEndTick, "BAD_INPUT_RANGE");
      validateTickInput({ x: segment.x, y: segment.y });
      next = segment.endTick;
    }
    invariant(next === expectedEndTick, "INCOMPLETE_REPLAY_INPUT");
    return true;
  }

  function replayOrdinaryStage(manifest, stage, segments, endTick, loadout = FIXED_LOADOUT, carried = {}) {
    validateManifest(manifest);
    invariant(isOrdinaryStage(stage), "ORDINARY_STAGE_REQUIRED");
    validateSegments(segments, endTick);
    const state = createStageState(manifest, stage, loadout, carried);
    let segmentIndex = 0;
    for (let tick = 0; tick < endTick; tick += 1) {
      if (state.outcome !== "RUNNING") fail("POST_TERMINAL_INPUT", `Stage became terminal at tick ${state.stageTick}.`);
      while (tick >= segments[segmentIndex].endTick) segmentIndex += 1;
      const segment = segments[segmentIndex];
      simulateStageTick(state, { x: segment.x, y: segment.y });
    }
    return publicStageState(state);
  }

  function replayStage(manifest, stage, segments, endTick, loadout = FIXED_LOADOUT, carried = {}) {
    validateManifest(manifest);
    validateSegments(segments, endTick);
    const state = createStageState(manifest, stage, loadout, carried);
    let segmentIndex = 0;
    for (let tick = 0; tick < endTick; tick += 1) {
      if (state.outcome !== "RUNNING") fail("POST_TERMINAL_INPUT", `Stage became terminal at tick ${state.stageTick}.`);
      while (tick >= segments[segmentIndex].endTick) segmentIndex += 1;
      const segment = segments[segmentIndex];
      simulateStageTick(state, { x: segment.x, y: segment.y });
    }
    return publicStageState(state);
  }

  function calculateRoomGold(stageState) {
    invariant(stageState?.outcome === "CLEARED", "STAGE_NOT_CLEARED");
    const definition = stageDef(stageState.stage);
    const score = Math.max(1, stageState.score);
    const roomMultiplierBps = 10000 + (stageState.stage - 1) * 400;
    const timeMultiplierBps = clamp(roundRatio(definition.parTicks * 10000, Math.max(TICK_RATE, stageState.stageTick)), 6500, 12500);
    const healthPenaltyBps = roundRatio(stageState.damageTakenHundredths * 7500, Math.max(1, stageState.player.maxHpHundredths));
    const healthMultiplierBps = clamp(10000 - healthPenaltyBps, 3500, 11000);
    const cleanMultiplierBps = stageState.damageTakenHundredths <= 0
      ? 11500
      : stageState.damageTakenHundredths * 10 <= stageState.player.maxHpHundredths
        ? 10500
        : 10000;
    const numerator = BigInt(score) * 12n * BigInt(roomMultiplierBps) * BigInt(timeMultiplierBps)
      * BigInt(healthMultiplierBps) * BigInt(cleanMultiplierBps);
    const denominator = 100n * 10000n * 10000n * 10000n * 10000n;
    const gold = Number(numerator / denominator);
    return {
      stage: stageState.stage,
      score,
      baseScore: stageState.baseScore,
      streakScore: stageState.streakScore,
      kills: stageState.kills.length,
      bestStreak: stageState.bestStreak,
      damageTakenHundredths: stageState.damageTakenHundredths,
      clearTicks: stageState.stageTick,
      parTicks: definition.parTicks,
      roomMultiplierBps,
      timeMultiplierBps,
      healthMultiplierBps,
      cleanMultiplierBps,
      gold,
    };
  }

  function hasRunRelic(run, id) {
    return run.relicIds.includes(id);
  }

  function hasStageRelic(state, id) {
    return Boolean(state.run && hasRunRelic(state.run, id));
  }

  function stageRelicState(state, id) {
    return state.run ? relicState(state.run, id) : null;
  }

  function relicState(run, id) {
    if (!run.relicState[id]) run.relicState[id] = RUN_RELICS.createRelicState(id);
    return run.relicState[id];
  }

  function deterministicUnique(items, count, prng) {
    const pool = [...items];
    const result = [];
    while (result.length < count && pool.length) result.push(pool.splice(prng.range(pool.length), 1)[0]);
    return result;
  }

  function generateRelicOffer(run, stage) {
    invariant(stage === 5 || stage === 10, "BAD_RELIC_STAGE");
    const buildStats = BUILD_RULES.combatStats(run.build);
    const candidates = RUN_RELICS.definitionsForStage(stage).filter((definition) => RUN_RELICS.eligible(definition.id, {
      selectedIds: run.relicIds,
      regenPerSecond: buildStats.regenerationHundredthsPerSecond / 100,
      hasDirectHealing: run.optionalRewards.heartsGraceStored,
    }));
    const offer = deterministicUnique(candidates, 3, run.prng.rewards).map((definition) => ({ id: definition.id, kind: "relic" }));
    invariant(offer.length === 3, "INSUFFICIENT_RELIC_OFFER");
    return offer;
  }

  function generateRunUpgradeOffer(run, stage) {
    const ids = RUN_RELICS.IDS;
    const excludeIds = hasRunRelic(run, ids.OVERFLOWING_HEART) ? ["leatherGuard"] : [];
    if (hasRunRelic(run, ids.BLIND_BARGAIN)) {
      return BUILD_RULES.generateOffer(run.build, stage, run.prng.rewards, { count: 1, excludeIds }).map((choice) => {
        if (choice.kind === "evolution") return choice;
        const definition = BUILD_RULES.UPGRADE_BY_ID[choice.id];
        return {
          ...choice,
          rank: definition.kind === "technique" ? 3 : choice.rank,
          valueMultiplierBps: definition.kind === "stat" ? 23000 : 10000,
        };
      });
    }
    const offer = BUILD_RULES.generateOffer(run.build, stage, run.prng.rewards, { excludeIds });
    if (hasRunRelic(run, ids.ROYAL_BARGAIN)) {
      let promoted = 0;
      return offer.map((choice) => {
        if (choice.kind === "evolution" || promoted >= 2) return choice;
        promoted += 1;
        return { ...choice, rank: 3, guaranteedEpic: true };
      });
    }
    return offer;
  }

  function runCombatStats(run, stage) {
    const stats = BUILD_RULES.combatStats(run.build);
    let damageBps = 10000;
    let regenBonus = 0;
    const ids = RUN_RELICS.IDS;
    if (hasRunRelic(run, ids.DOUBLE_DRAFT)) damageBps = roundRatio(damageBps * 6800, 10000);
    if (hasRunRelic(run, ids.GILDED_PYRE)) {
      const marks = relicState(run, ids.GILDED_PYRE).pyreMarks;
      damageBps += marks * 400;
      regenBonus += marks * 10;
    }
    if (stage === 15 && hasRunRelic(run, ids.SHERIFFS_WAGER)) {
      const warrants = relicState(run, ids.SHERIFFS_WAGER).warrants;
      damageBps += warrants * 800;
      regenBonus += warrants * 15;
    }
    if (stage === 15 && hasRunRelic(run, ids.BROKEN_CROWN_OATH)) {
      const marks = relicState(run, ids.BROKEN_CROWN_OATH).brokenCrownMarks;
      damageBps += marks * 1250;
      regenBonus += marks * 15;
    }
    return {
      hpHundredths: run.playerHpHundredths,
      maxHpHundredths: Math.max(100, stats.maximumHpHundredths + run.relicMaxHpBonusHundredths),
      moveUnitsPerTick: stats.moveUnitsPerTick,
      arrowDamageHundredths: roundRatio(stats.arrowDamageHundredths * damageBps, 10000),
      shotCooldownTicks: stats.shotCooldownTicks,
      criticalChanceBps: stats.criticalChanceBps,
      criticalMultiplierBps: stats.criticalMultiplierBps,
      regenerationHundredthsPerSecond: stats.regenerationHundredthsPerSecond + regenBonus,
      damageReductionBps: hasRunRelic(run, ids.OVERFLOWING_HEART) ? 0 : stats.damageReductionBps,
      techniques: stats.techniques,
      statusPath: stats.statusPath,
      evolutions: stats.evolutions,
    };
  }

  function expireOptionalRewardsForStage(run, stage) {
    const rewards = run.optionalRewards;
    if (rewards.splinterVolleyCharges > 0 && stage > rewards.splinterVolleyExpiresAfterStage) {
      rewards.splinterVolleyCharges = 0;
      rewards.splinterVolleyExpiresAfterStage = 0;
    }
    if (rewards.heartsGraceStored && stage > rewards.heartsGraceExpiresAfterStage) {
      rewards.heartsGraceStored = false;
      rewards.heartsGraceExpiresAfterStage = 0;
    }
  }

  function spawnOptionalSpritesForStage(run) {
    if (!isOrdinaryStage(run.stage)) return;
    const state = run.stageState;
    const rewards = run.optionalRewards;
    const typeIds = [];
    if (run.stage >= 2 && rewards.splinterVolleyCharges <= 0 && run.prng.rewards.range(10000) < 2400) {
      typeIds.push("fletcherThief");
    }
    if (run.stage >= 3 && !rewards.heartsGraceStored) {
      const healthRatioBps = roundRatio(state.player.hpHundredths * 10000, state.player.maxHpHundredths);
      const chanceBps = healthRatioBps < 4200 ? 5500 : healthRatioBps < 7000 ? 2800 : 1200;
      if (run.prng.rewards.range(10000) < chanceBps) typeIds.push("greenwoodStag");
    }
    for (const typeId of typeIds) {
      const enemy = createOrdinaryEnemy(state, typeId);
      state.enemies.push(enemy);
      state.telemetry.optionalSpriteSpawns.push({ typeId, enemyId: enemy.id, tick: state.stageTick });
    }
    state.enemies.sort((left, right) => left.id - right.id);
  }

  function prepareStageRelics(run) {
    const ids = RUN_RELICS.IDS;
    const state = run.stageState;
    if (hasRunRelic(run, ids.GOLDEN_OATH) && run.stage >= 6) {
      Object.assign(relicState(run, ids.GOLDEN_OATH), {
        oathIntact: true,
        oathBrokenAt: null,
        oathBreakingSource: "",
        baseStageGold: 0,
        oathStageGold: 0,
      });
    }
    if (hasRunRelic(run, ids.BORROWED_HEART)) {
      Object.assign(relicState(run, ids.BORROWED_HEART), {
        heartConsumedThisStage: 0,
        heartMaxHpGainThisStage: 0,
        consumedEventIds: [],
      });
    }
    if (hasRunRelic(run, ids.FIFTH_BELL)) {
      Object.assign(relicState(run, ids.FIFTH_BELL), {
        bellAutoshotIndex: 0,
        bellLedgerByTargetEpoch: {},
        bellRecordedHitCount: 0,
        bellRecordedDamage: 0,
        bellPaidDamage: 0,
        bellSkippedDamage: 0,
        bellSilenceRemaining: 0,
      });
      state.player.silenceTicks = 0;
    }
    if (hasRunRelic(run, ids.OVERFLOWING_HEART)) {
      state.player.barrierHundredths = 0;
      relicState(run, ids.OVERFLOWING_HEART).overflowBarrier = 0;
    }
    if (hasRunRelic(run, ids.LAST_LIFE) && run.stage >= 11) {
      state.player.hpHundredths = state.player.maxHpHundredths;
      run.playerHpHundredths = state.player.hpHundredths;
      relicState(run, ids.LAST_LIFE).lastLifeStageRefills += 1;
    }
    if (hasRunRelic(run, ids.SHERIFFS_WAGER) && run.stage >= 11 && run.stage <= 14) {
      Object.assign(relicState(run, ids.SHERIFFS_WAGER), {
        trialStageFlawless: true,
        trialDamageTaken: 0,
      });
    }
  }

  function startRunStage(run, stage) {
    expireOptionalRewardsForStage(run, stage);
    const carried = runCombatStats(run, stage);
    carried.hpHundredths = clamp(carried.hpHundredths || carried.maxHpHundredths, 1, carried.maxHpHundredths);
    run.playerHpHundredths = carried.hpHundredths;
    run.stage = stage;
    run.stageState = createStageState(run.manifest, stage, run.loadout, carried);
    run.stageState.run = run;
    run.stageState.optionalRewards = run.optionalRewards;
    spawnOptionalSpritesForStage(run);
    prepareStageRelics(run);
    run.phase = "COMBAT";
    run.pendingOffer = null;
  }

  function createRunState(manifest, loadout = FIXED_LOADOUT) {
    validateManifest(manifest);
    validateFixedLoadout(loadout, manifest.loadoutPolicy);
    const build = BUILD_RULES.createBuild(loadout.foundationIds[0]);
    const baseStats = BUILD_RULES.combatStats(build);
    const run = {
      manifest,
      loadout: clone(loadout),
      phase: "COMBAT",
      outcome: "RUNNING",
      stage: 1,
      stagesCleared: 0,
      totalActiveTicks: 0,
      totalScore: 0,
      totalGold: 0,
      playerHpHundredths: baseStats.maximumHpHundredths,
      relicMaxHpBonusHundredths: 0,
      build,
      relicIds: [],
      relicState: {},
      optionalRewards: {
        splinterVolleyCharges: 0,
        splinterVolleyExpiresAfterStage: 0,
        heartsGraceStored: false,
        heartsGraceExpiresAfterStage: 0,
      },
      stageLedger: [],
      decisions: [],
      pendingOffer: null,
      pendingPickCount: 0,
      stageState: null,
      prng: {
        rewards: new DeterministicPrng(manifest.simulationSeeds.rewards),
      },
    };
    startRunStage(run, 1);
    return run;
  }

  function consumeBorrowedHeart(run, eventId) {
    const ids = RUN_RELICS.IDS;
    if (!hasRunRelic(run, ids.BORROWED_HEART)) return { healedHundredths: 0, maxHpGainHundredths: 0 };
    const heart = relicState(run, ids.BORROWED_HEART);
    if (heart.consumedEventIds.includes(eventId)) return { healedHundredths: 0, maxHpGainHundredths: 0 };
    heart.consumedEventIds.push(eventId);
    const stored = Math.floor(heart.heartStore);
    heart.heartStore = 0;
    if (stored <= 0) return { healedHundredths: 0, maxHpGainHundredths: 0 };
    const player = run.stageState.player;
    const healedHundredths = Math.min(Math.max(0, player.maxHpHundredths - player.hpHundredths), stored);
    player.hpHundredths += healedHundredths;
    const excess = stored - healedHundredths;
    const available = Math.max(0, 500 - heart.heartMaxHpGainThisStage);
    const maxHpGainHundredths = Math.min(available, roundRatio(excess * 2000, 10000));
    if (maxHpGainHundredths > 0) {
      run.relicMaxHpBonusHundredths += maxHpGainHundredths;
      player.maxHpHundredths += maxHpGainHundredths;
      heart.heartMaxHpGainThisStage += maxHpGainHundredths;
      heart.heartTotalMaxHpGain += maxHpGainHundredths;
    }
    heart.heartConsumedThisStage += stored;
    run.playerHpHundredths = player.hpHundredths;
    return { healedHundredths, maxHpGainHundredths };
  }

  function applyStageClearRelics(run, reward) {
    const ids = RUN_RELICS.IDS;
    if (!isBossStage(reward.stage) && hasRunRelic(run, ids.BORROWED_HEART)) {
      reward.borrowedHeart = consumeBorrowedHeart(run, `stage-${reward.stage}:ordinary-clear`);
    }
    if (hasRunRelic(run, ids.OUTLAWS_HOURGLASS) && !isBossStage(reward.stage)) {
      const state = relicState(run, ids.OUTLAWS_HOURGLASS);
      const succeeded = reward.clearTicks <= reward.parTicks;
      state.lastResult = { stage: reward.stage, succeeded };
      if (succeeded) state.hourglassSuccessCount += 1;
      else {
        state.hourglassFailureCount += 1;
        const maximum = BUILD_RULES.combatStats(run.build).maximumHpHundredths + run.relicMaxHpBonusHundredths;
        const loss = Math.min(500, Math.max(0, maximum - 3000));
        run.relicMaxHpBonusHundredths -= loss;
        state.hourglassMaxHpLost += loss / 100;
        run.playerHpHundredths = Math.min(run.playerHpHundredths, maximum - loss);
      }
    }
    if (hasRunRelic(run, ids.SHERIFFS_WAGER) && reward.stage >= 11 && reward.stage <= 14
      && relicState(run, ids.SHERIFFS_WAGER).trialStageFlawless) {
      const state = relicState(run, ids.SHERIFFS_WAGER);
      state.warrants = Math.min(4, state.warrants + 1);
    }
    if (hasRunRelic(run, ids.GOLDEN_OATH) && reward.stage >= 6) {
      const oath = relicState(run, ids.GOLDEN_OATH);
      reward.baseGoldBeforeRelics = reward.gold;
      reward.gold = oath.oathIntact ? reward.gold * 2 : 0;
      oath.baseStageGold = reward.baseGoldBeforeRelics;
      oath.oathStageGold = reward.gold;
      reward.goldenOath = {
        intact: oath.oathIntact,
        breakingSource: oath.oathBreakingSource,
        baseGold: reward.baseGoldBeforeRelics,
        resultGold: reward.gold,
      };
    }
    if (hasRunRelic(run, ids.GILDED_PYRE)) {
      const state = relicState(run, ids.GILDED_PYRE);
      state.burnedGoldTotal += reward.gold;
      state.pyreMarks = Math.min(10, Math.floor(state.burnedGoldTotal / 100));
      state.pyreProgressWithinMark = state.pyreMarks >= 10 ? 0 : state.burnedGoldTotal % 100;
      reward.pyreBurnedGold = reward.gold;
      reward.gold = 0;
    }
  }

  function finishRunStage(run) {
    const stageState = run.stageState;
    if (stageState.outcome === "DEAD" || stageState.outcome === "TIMEOUT") {
      run.playerHpHundredths = stageState.player.hpHundredths;
      run.outcome = stageState.outcome;
      run.phase = "TERMINAL";
      return;
    }
    invariant(stageState.outcome === "CLEARED", "BAD_STAGE_TERMINAL");
    const reward = calculateRoomGold(stageState);
    run.playerHpHundredths = stageState.player.hpHundredths;
    run.stagesCleared = stageState.stage;
    run.totalScore += reward.score;
    applyStageClearRelics(run, reward);
    run.totalGold += reward.gold;
    BUILD_RULES.addLegendaryMeter(run.build, reward.gold);
    run.stageLedger.push(reward);
    if (stageState.stage >= runStageLimit(run.manifest)) {
      run.outcome = "CLEARED";
      run.phase = "TERMINAL";
      return;
    }
    if (isBossStage(stageState.stage)) {
      run.pendingOffer = generateRelicOffer(run, stageState.stage);
      run.pendingPickCount = 1;
      run.phase = "AWAITING_RELIC";
    } else {
      run.pendingOffer = generateRunUpgradeOffer(run, stageState.stage);
      const doubleDraft = hasRunRelic(run, RUN_RELICS.IDS.DOUBLE_DRAFT);
      const hourglass = hasRunRelic(run, RUN_RELICS.IDS.OUTLAWS_HOURGLASS)
        && relicState(run, RUN_RELICS.IDS.OUTLAWS_HOURGLASS).lastResult?.succeeded;
      run.pendingPickCount = doubleDraft || hourglass ? Math.min(2, run.pendingOffer.length) : 1;
      run.phase = "AWAITING_UPGRADE";
    }
  }

  function simulateRunTick(run, input) {
    invariant(run?.outcome === "RUNNING" && run.phase === "COMBAT", "RUN_NOT_ACCEPTING_TICKS");
    invariant(run.totalActiveTicks < run.manifest.maxRunTicks, "RUN_TICK_LIMIT");
    run.totalActiveTicks += 1;
    simulateStageTick(run.stageState, input);
    if (run.stageState.outcome !== "RUNNING") finishRunStage(run);
    if (run.outcome === "RUNNING" && run.totalActiveTicks >= run.manifest.maxRunTicks) {
      run.outcome = "TIMEOUT";
      run.phase = "TERMINAL";
      run.pendingOffer = null;
      run.pendingPickCount = 0;
    }
    return run.phase;
  }

  function applyRelicSelection(run, choiceId) {
    const offered = run.pendingOffer.find((choice) => choice.id === choiceId);
    invariant(Boolean(offered), "CHOICE_NOT_OFFERED");
    const proposed = [...run.relicIds, choiceId];
    const validation = RUN_RELICS.validateSelection(proposed);
    invariant(validation.ok, "INELIGIBLE_RELIC", validation.errors[0]);
    run.relicIds = proposed;
    run.relicState[choiceId] = RUN_RELICS.createRelicState(choiceId);
    if (choiceId === RUN_RELICS.IDS.GILDED_PYRE) {
      const state = relicState(run, choiceId);
      state.burnedGoldTotal = run.totalGold;
      state.pyreMarks = Math.min(10, Math.floor(state.burnedGoldTotal / 100));
      state.pyreProgressWithinMark = state.pyreMarks >= 10 ? 0 : state.burnedGoldTotal % 100;
      run.totalGold = 0;
      run.build.legendaryMeter = 0;
    } else if (choiceId === RUN_RELICS.IDS.OVERFLOWING_HEART) {
      const state = relicState(run, choiceId);
      state.recordedDamageReduction = BUILD_RULES.combatStats(run.build).damageReductionBps;
      state.effectiveDamageReduction = 0;
    }
  }

  function previewReshuffleRecovery(run) {
    invariant(run?.outcome === "RUNNING" && run.phase === "AWAITING_RELIC", "RUN_NOT_AWAITING_RELIC");
    invariant(run.pendingOffer.some((choice) => choice.id === RUN_RELICS.IDS.OUTLAWS_RESHUFFLE), "RESHUFFLE_NOT_OFFERED");
    const previewPrng = new DeterministicPrng(run.prng.rewards.exportWords());
    return clone(BUILD_RULES.planReshuffle(run.build, previewPrng).recoveryOffer);
  }

  function applyRunDecision(run, decision) {
    invariant(run?.outcome === "RUNNING" && ["AWAITING_UPGRADE", "AWAITING_RELIC"].includes(run.phase), "RUN_NOT_ACCEPTING_DECISION");
    validateDecision(decision);
    invariant(decision.afterStage === run.stagesCleared, "DECISION_STAGE_MISMATCH");
    if (run.phase === "AWAITING_RELIC") {
      invariant(decision.kind === "relic", "BAD_RELIC_DECISION");
      const relicId = decision.choiceIds[0];
      const reshuffle = relicId === RUN_RELICS.IDS.OUTLAWS_RESHUFFLE;
      invariant(decision.choiceIds.length === (reshuffle ? 2 : 1), "BAD_RELIC_DECISION");
      applyRelicSelection(run, relicId);
      if (reshuffle) {
        const originalHp = run.playerHpHundredths;
        const plan = BUILD_RULES.planReshuffle(run.build, run.prng.rewards);
        run.build = BUILD_RULES.commitReshuffle(run.build, plan, decision.choiceIds[1]);
        const state = relicState(run, relicId);
        state.sourceOrdinaryPickLedger = clone(plan.sourceLedger);
        state.proposedReplacementLedger = clone(plan.replacements);
        state.committedReplacementLedger = clone(run.build.ordinaryPickLedger);
        state.recoveryOfferIds = plan.recoveryOffer.map((choice) => choice.id);
        state.recoverySelectedId = decision.choiceIds[1];
        state.transactionStatus = "committed";
        state.deterministicRerollSeed = run.manifest.simulationSeeds.rewards.join(":");
        const maximum = BUILD_RULES.combatStats(run.build).maximumHpHundredths + run.relicMaxHpBonusHundredths;
        run.playerHpHundredths = Math.min(originalHp, maximum);
      }
    } else {
      invariant(decision.kind === "upgrade" && decision.choiceIds.length === run.pendingPickCount, "BAD_PICK_COUNT");
      const offeredById = new Map(run.pendingOffer.map((choice) => [choice.id, choice]));
      const before = BUILD_RULES.combatStats(run.build);
      for (const choiceId of decision.choiceIds) {
        const choice = offeredById.get(choiceId);
        invariant(Boolean(choice), "CHOICE_NOT_OFFERED");
        BUILD_RULES.applyChoice(run.build, choice, run.stagesCleared);
      }
      const after = BUILD_RULES.combatStats(run.build);
      const maximumGain = Math.max(0, after.maximumHpHundredths - before.maximumHpHundredths);
      run.playerHpHundredths += maximumGain;
      if (hasRunRelic(run, RUN_RELICS.IDS.ROYAL_BARGAIN)) {
        const guaranteed = decision.choiceIds.map((id) => offeredById.get(id)).filter((choice) => choice?.guaranteedEpic).length;
        if (guaranteed > 0) {
          const maximum = after.maximumHpHundredths + run.relicMaxHpBonusHundredths;
          const cost = Math.min(maximum - 3000, Math.floor(maximum * 550 / 10000));
          const paid = Math.max(0, cost);
          run.relicMaxHpBonusHundredths -= paid;
          run.playerHpHundredths = Math.min(run.playerHpHundredths, maximum - paid);
          const royal = relicState(run, RUN_RELICS.IDS.ROYAL_BARGAIN);
          royal.royalEpicPicks += guaranteed;
          royal.royalMaxHpPaid += paid;
          royal.royalDebtEntries.push({ afterStage: run.stagesCleared, amountHundredths: paid });
        }
      }
      if (hasRunRelic(run, RUN_RELICS.IDS.DOUBLE_DRAFT)) {
        const draft = relicState(run, RUN_RELICS.IDS.DOUBLE_DRAFT);
        draft.rewardsCompleted += 1;
        draft.extraPicksTaken += Math.max(0, decision.choiceIds.length - 1);
      }
      if (hasRunRelic(run, RUN_RELICS.IDS.BLIND_BARGAIN)) {
        relicState(run, RUN_RELICS.IDS.BLIND_BARGAIN).blindOffers += 1;
      }
    }
    run.decisions.push(clone(decision));
    startRunStage(run, run.stagesCleared + 1);
    return run.phase;
  }

  function abandonRun(run) {
    invariant(run?.outcome === "RUNNING", "RUN_ALREADY_TERMINAL");
    run.outcome = "ABANDONED";
    run.phase = "TERMINAL";
    run.pendingOffer = null;
    run.pendingPickCount = 0;
    return run.outcome;
  }

  function replayRun(manifest, transcript, loadout = FIXED_LOADOUT) {
    validateManifest(manifest);
    validateFixedLoadout(loadout, manifest.loadoutPolicy);
    exactKeys(transcript, ["transcriptVersion", "endReason", "stages", "decisions"], "BAD_RUN_TRANSCRIPT_SHAPE");
    invariant(transcript.transcriptVersion === RUN_TRANSCRIPT_VERSION, "BAD_RUN_TRANSCRIPT_VERSION");
    invariant(["SIMULATED", "ABANDONED"].includes(transcript.endReason), "BAD_RUN_END_REASON");
    invariant(Array.isArray(transcript.stages) && transcript.stages.length >= 1, "BAD_RUN_STAGE_PACKETS");
    validateDecisionSequence(transcript.decisions);
    const run = createRunState(manifest, loadout);
    let decisionIndex = 0;
    for (let packetIndex = 0; packetIndex < transcript.stages.length; packetIndex += 1) {
      const packet = transcript.stages[packetIndex];
      exactKeys(packet, ["stage", "endTick", "segments"], "BAD_RUN_STAGE_PACKET_SHAPE");
      invariant(run.outcome === "RUNNING" && run.phase === "COMBAT", "STAGE_PACKET_AFTER_TERMINAL");
      invariant(packet.stage === run.stage && packet.stage === packetIndex + 1, "RUN_STAGE_SEQUENCE_MISMATCH");
      validateSegments(packet.segments, packet.endTick);
      let segmentIndex = 0;
      for (let tick = 0; tick < packet.endTick; tick += 1) {
        invariant(run.outcome === "RUNNING" && run.phase === "COMBAT", "POST_TERMINAL_INPUT");
        while (tick >= packet.segments[segmentIndex].endTick) segmentIndex += 1;
        const segment = packet.segments[segmentIndex];
        simulateRunTick(run, { x: segment.x, y: segment.y });
      }

      const hasNextPacket = packetIndex + 1 < transcript.stages.length;
      if (hasNextPacket) {
        invariant(["AWAITING_UPGRADE", "AWAITING_RELIC"].includes(run.phase), "STAGE_PACKET_NOT_CLEARED");
        const decision = transcript.decisions[decisionIndex];
        invariant(Boolean(decision), "MISSING_RUN_DECISION");
        applyRunDecision(run, decision);
        decisionIndex += 1;
      }
    }
    invariant(decisionIndex === transcript.decisions.length, "UNUSED_RUN_DECISION");
    if (transcript.endReason === "ABANDONED") {
      invariant(run.outcome === "RUNNING", "ABANDONED_AFTER_SIMULATED_TERMINAL");
      abandonRun(run);
    } else {
      invariant(run.phase === "TERMINAL" && run.outcome !== "ABANDONED", "RUN_NOT_TERMINAL");
    }
    return publicRunState(run);
  }

  function publicRunState(run) {
    const currentStageScore = run.stageState && run.stageState.outcome !== "CLEARED"
      ? run.stageState.score
      : 0;
    return {
      coreVersion: CORE_VERSION,
      rulesetId: RULESET_ID,
      phase: run.phase,
      outcome: run.outcome,
      stage: run.stage,
      stagesCleared: run.stagesCleared,
      leaderboardEligible: leaderboardEligible(run.stagesCleared),
      consumesEntryTicket: run.outcome === "RUNNING" ? false : consumesEntryTicket(run.outcome, run.stagesCleared),
      totalActiveTicks: run.totalActiveTicks,
      completedScore: run.totalScore,
      currentStageScore,
      totalScore: run.totalScore + currentStageScore,
      totalGold: run.totalGold,
      playerHpHundredths: run.playerHpHundredths,
      relicMaxHpBonusHundredths: run.relicMaxHpBonusHundredths,
      build: BUILD_RULES.clone(run.build),
      relicIds: [...run.relicIds],
      relicState: clone(run.relicState),
      optionalRewards: clone(run.optionalRewards),
      stageLedger: clone(run.stageLedger),
      decisions: clone(run.decisions),
      pendingOffer: clone(run.pendingOffer),
      pendingPickCount: run.pendingPickCount,
      stageState: run.stageState ? publicStageState(run.stageState) : null,
      rewardPrngWords: run.prng.rewards.exportWords(),
    };
  }

  return Object.freeze({
    CORE_VERSION,
    RULESET_ID,
    TICK_RATE,
    STAGE_COUNT,
    MAX_RUN_TICKS,
    MAX_STAGE_TICKS,
    RUN_TRANSCRIPT_VERSION,
    INPUT_AXIS_LIMIT,
    ORDINARY_STAGES,
    BOSS_STAGES,
    LEADERBOARD_MIN_CLEARED_STAGE,
    BOSS_SEED_IDS,
    BOSS_AUTHORITY_RULES,
    SCORE_POLICY,
    FOUNDATION_DEFS,
    LOADOUT_POLICY,
    FIXED_LOADOUT,
    STAGE_DEFS,
    ENEMY_DEFS,
    BOSS_DEFS,
    DEFAULT_RULES,
    BUILD_RULES,
    RUN_RELICS,
    HUNTERS_KNOT,
    IRON_OATH,
    BLOOD_HUNT,
    DEEP_ROOT,
    PHASE_THREE,
    FOREST_BALANCE,
    DeterministicPrng,
    clone,
    roundRatio,
    clamp,
    integerSqrt,
    squaredDistance,
    normalizedStep,
    stageDef,
    stagePlanFor,
    isOrdinaryStage,
    isBossStage,
    runStageLimit,
    ENDLESS_FROM,
    stageDifficulty,
    enemyScoreValue,
    ordinaryScoreCeiling,
    bossScoreCeiling,
    theoreticalRunScoreCeiling,
    validateLoadoutPolicy,
    validateFixedLoadout,
    validateStagePlan,
    validateManifest,
    validateTickInput,
    validateDecision,
    validateDecisionSequence,
    leaderboardEligible,
    consumesEntryTicket,
    createStageState,
    publicStageState,
    simulateStageTick,
    validateSegments,
    replayOrdinaryStage,
    replayStage,
    calculateRoomGold,
    createRunState,
    simulateRunTick,
    applyRunDecision,
    previewReshuffleRecovery,
    abandonRun,
    replayRun,
    publicRunState,
  });
});
