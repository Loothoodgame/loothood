(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodVillageServices = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VILLAGE_REWORK_VERSION = 1;
  const OPERATION_PROGRESS_SCHEMA_VERSION = 1;
  const BOUNTY_SCHEMA_VERSION = 2;
  const WEEKLY_BOUNTY_SCHEMA_VERSION = 2;
  const STORAGE_MINUTES = 12 * 60;
  const FINAL_STAGE_MULTIPLIER = 4;
  const NORMAL_STAGE_COUNT = 14;
  const BOUNTY_ROLL_INTERVAL_MS = 4 * 60 * 60 * 1000;
  const MIN_BOUNTY_ROLL_INTERVAL_MS = 3 * 60 * 60 * 1000;
  const MAX_BOUNTY_ROLL_INTERVAL_MS = 4 * 60 * 60 * 1000;
  const BOUNTY_LIFETIME_MS = 12 * 60 * 60 * 1000;
  const DEFAULT_BOUNTY_SLOT_COUNT = 3;
  const MIN_BOUNTY_SLOT_COUNT = 3;
  const MAX_BOUNTY_SLOT_COUNT = 5;
  const BOUNTY_INACTIVE_WEIGHT = 10;
  const BOUNTY_ACTIVE_WEIGHT = 1;
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const WEEKLY_STANDARD_TICKET_CAP = 25;
  const MAX_WEEKLY_EVENT_IDS = 1024;
  const LEGACY_BUILDING_IDS = Object.freeze(["lumberCamp", "quarry", "blacksmith"]);

  const OPERATION_CONFIG = Object.freeze({
    lumber: Object.freeze({
      id: "lumber",
      name: "Lumber Operation",
      resource: "wood",
      passivePerMinutePerRank: 0.05,
      stagePayoutPerRank: 2,
      nextRankBaseGold: 80,
      postRankFiveGoldPerStep: 200,
    }),
    quarry: Object.freeze({
      id: "quarry",
      name: "Quarry Operation",
      resource: "ore",
      passivePerMinutePerRank: 0.025,
      stagePayoutPerRank: 1,
      nextRankBaseGold: 100,
      postRankFiveGoldPerStep: 250,
    }),
  });

  const BOUNTY_REWARDS = Object.freeze({
    easy: Object.freeze({ gold: 45 }),
    medium: Object.freeze({ gold: 125 }),
    hard: Object.freeze({ gold: 260 }),
  });
  const BOUNTY_TEMPLATES = Object.freeze([
    Object.freeze({ id: "RB-E-01", tier: "easy", desc: "Clear 3 stages.", goal: 3, metric: "stageClear" }),
    Object.freeze({ id: "RB-E-02", tier: "easy", desc: "Defeat 20 enemies.", goal: 20, metric: "kill" }),
    Object.freeze({ id: "RB-E-03", tier: "easy", desc: "Clear 1 stage without taking HP damage.", goal: 1, metric: "cleanStage" }),
    Object.freeze({ id: "RB-E-04", tier: "easy", desc: "Reach a defeat streak of 10.", goal: 10, metric: "streak" }),
    Object.freeze({ id: "RB-E-05", tier: "easy", desc: "Earn 120 room Gold in normal Hunts.", goal: 120, metric: "gold" }),
    Object.freeze({ id: "RB-E-06", tier: "easy", desc: "Choose 2 Run Upgrades.", goal: 2, metric: "upgrade" }),
    Object.freeze({ id: "RB-E-07", tier: "easy", desc: "Choose 1 Run Relic.", goal: 1, metric: "relic" }),
    Object.freeze({ id: "RB-E-08", tier: "easy", desc: "Lock any Poison, Frost, or Bleed path.", goal: 1, metric: "statusLock" }),
    Object.freeze({ id: "RB-E-09", tier: "easy", desc: "Defeat the Stage 5 miniboss once.", goal: 1, metric: "stageClear", stage: 5 }),
    Object.freeze({ id: "RB-E-10", tier: "easy", desc: "Clear 2 stages after locking any status path.", goal: 2, metric: "stageWithStatus" }),
    Object.freeze({ id: "RB-M-01", tier: "medium", desc: "Clear 8 stages.", goal: 8, metric: "stageClear" }),
    Object.freeze({ id: "RB-M-02", tier: "medium", desc: "Defeat 60 enemies.", goal: 60, metric: "kill" }),
    Object.freeze({ id: "RB-M-03", tier: "medium", desc: "Earn 500 room Gold in normal Hunts.", goal: 500, metric: "gold" }),
    Object.freeze({ id: "RB-M-04", tier: "medium", desc: "Choose 6 Run Upgrades.", goal: 6, metric: "upgrade" }),
    Object.freeze({ id: "RB-M-05", tier: "medium", desc: "Clear 3 stages without taking HP damage.", goal: 3, metric: "cleanStage" }),
    Object.freeze({ id: "RB-M-06", tier: "medium", desc: "Reach a defeat streak of 20.", goal: 20, metric: "streak" }),
    Object.freeze({ id: "RB-M-07", tier: "medium", desc: "Defeat 2 Stage 5 or Stage 10 minibosses.", goal: 2, metric: "miniboss" }),
    Object.freeze({ id: "RB-M-08", tier: "medium", desc: "Choose 2 Run Relics.", goal: 2, metric: "relic" }),
    Object.freeze({ id: "RB-M-09", tier: "medium", desc: "Clear 4 stages after locking {status}.", goal: 4, metric: "stageWithNamedStatus", parameter: "status" }),
    Object.freeze({ id: "RB-M-10", tier: "medium", desc: "Defeat the Stage 10 miniboss once.", goal: 1, metric: "stageClear", stage: 10 }),
    Object.freeze({ id: "RB-H-01", tier: "hard", desc: "Clear 12 stages.", goal: 12, metric: "stageClear" }),
    Object.freeze({ id: "RB-H-02", tier: "hard", desc: "Defeat 100 enemies.", goal: 100, metric: "kill" }),
    Object.freeze({ id: "RB-H-03", tier: "hard", desc: "Earn 1,000 room Gold in normal Hunts.", goal: 1000, metric: "gold" }),
    Object.freeze({ id: "RB-H-04", tier: "hard", desc: "Choose 10 Run Upgrades.", goal: 10, metric: "upgrade" }),
    Object.freeze({ id: "RB-H-05", tier: "hard", desc: "Clear 6 stages without taking HP damage.", goal: 6, metric: "cleanStage" }),
    Object.freeze({ id: "RB-H-06", tier: "hard", desc: "Reach a defeat streak of 35.", goal: 35, metric: "streak" }),
    Object.freeze({ id: "RB-H-07", tier: "hard", desc: "Defeat 4 Stage 5 or Stage 10 minibosses.", goal: 4, metric: "miniboss" }),
    Object.freeze({ id: "RB-H-08", tier: "hard", desc: "Clear Stage 10 after locking {status}.", goal: 1, metric: "stageWithNamedStatus", parameter: "status", stage: 10 }),
    Object.freeze({ id: "RB-H-09", tier: "hard", desc: "Clear Stage 10 without taking HP damage.", goal: 1, metric: "cleanStage", stage: 10 }),
    Object.freeze({ id: "RB-H-10", tier: "hard", desc: "Clear Stage 12.", goal: 1, metric: "stageClear", stage: 12 }),
  ].map((template) => Object.freeze({
    ...template,
    reward: BOUNTY_REWARDS[template.tier],
  })));

  const WEEKLY_BOUNTY_OBJECTIVES = Object.freeze([
    Object.freeze({ id: "WB-01", desc: "Complete a full Stage 15 normal Hunt.", goal: 1, metric: "fullClear", kind: "repeatable" }),
    Object.freeze({ id: "WB-05", desc: "Clear 18 stages without taking HP damage.", goal: 18, metric: "cleanStage", kind: "repeatable" }),
    Object.freeze({ id: "WB-07", desc: "Earn 3,000 room Gold in normal Hunts.", goal: 3000, metric: "gold", kind: "repeatable" }),
    Object.freeze({ id: "WB-06", desc: "Defeat 6 Stage 5 or Stage 10 minibosses.", goal: 6, metric: "miniboss", kind: "repeatable" }),
    Object.freeze({ id: "WB-02", desc: "Clear Stage 10 with Frost.", goal: 4, metric: "stage10Status", status: "frost", kind: "elemental" }),
    Object.freeze({ id: "WB-03", desc: "Clear Stage 10 with Poison.", goal: 4, metric: "stage10Status", status: "poison", kind: "elemental" }),
    Object.freeze({ id: "WB-04", desc: "Clear Stage 10 with Bleed.", goal: 4, metric: "stage10Status", status: "bleed", kind: "elemental" }),
  ]);

  const LEGACY_BUILDING_PLACE_COST = Object.freeze({ gold: 34, primary: 8, secondary: 3 });
  const LEGACY_FIXTURE_LEVEL_COSTS = Object.freeze({
    2: Object.freeze({ gold: 45, primary: 0, secondary: 0 }),
    3: Object.freeze({ gold: 90, primary: 20, secondary: 0 }),
    4: Object.freeze({ gold: 170, primary: 45, secondary: 10 }),
    5: Object.freeze({ gold: 300, primary: 85, secondary: 20 }),
    6: Object.freeze({ gold: 500, primary: 140, secondary: 40 }),
    7: Object.freeze({ gold: 800, primary: 220, secondary: 70 }),
    8: Object.freeze({ gold: 1200, primary: 330, secondary: 110 }),
    9: Object.freeze({ gold: 1750, primary: 480, secondary: 170 }),
    10: Object.freeze({ gold: 2500, primary: 700, secondary: 250 }),
  });
  const LEGACY_BUILDING_LEVEL_COSTS = Object.freeze({
    2: Object.freeze({ gold: 45, primary: 0, secondary: 0 }),
    3: Object.freeze({ gold: 90, primary: 20, secondary: 0, bossTrophies: 1 }),
    4: Object.freeze({ gold: 170, primary: 45, secondary: 10, bossTrophies: 2 }),
    5: Object.freeze({ gold: 300, primary: 85, secondary: 20, bossTrophies: 3, sheriffsCrests: 1 }),
  });
  const LEGACY_STOREHOUSE_COSTS = Object.freeze({
    2: Object.freeze({ gold: 50, wood: 8, ore: 4 }),
    3: Object.freeze({ gold: 200, wood: 40, ore: 20 }),
    4: Object.freeze({ gold: 750, wood: 180, ore: 90, bossTrophies: 1 }),
    5: Object.freeze({ gold: 1500, wood: 380, ore: 190, bossTrophies: 2, sheriffsCrests: 1 }),
  });
  const LEGACY_BUILDINGS = Object.freeze({
    lumberCamp: Object.freeze({
      id: "lumberCamp",
      weight: 0.8,
      primaryCost: "ore",
      secondaryCost: "wood",
      maxLevel: 5,
    }),
    quarry: Object.freeze({
      id: "quarry",
      weight: 0.9,
      primaryCost: "wood",
      secondaryCost: "ore",
      maxLevel: 5,
    }),
    blacksmith: Object.freeze({
      id: "blacksmith",
      weight: 1.2,
      primaryCost: "wood",
      secondaryCost: "ore",
      maxLevel: 3,
      bow: true,
    }),
  });
  const LEGACY_FIXTURES = Object.freeze({
    outlawCamp: Object.freeze({
      id: "outlawCamp",
      weight: 1.5,
      primaryCost: "wood",
      secondaryCost: "ore",
      minimumLevel: 1,
      maxLevel: 10,
    }),
    bountyBoard: Object.freeze({
      id: "bountyBoard",
      weight: 1.05,
      primaryCost: "wood",
      secondaryCost: "ore",
      minimumLevel: 0,
      maxLevel: 5,
    }),
  });

  function plainObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function finiteNonNegative(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
  }

  function integerNonNegative(value) {
    return Math.floor(finiteNonNegative(value));
  }

  function positiveRank(value) {
    return Math.max(1, Math.floor(Number(value) || 1));
  }

  function operationNextRankGold(config, rank) {
    return rank < 5
      ? Math.round(config.nextRankBaseGold * rank * rank)
      : Math.round(config.postRankFiveGoldPerStep * (rank + 5));
  }

  function bountyRollInterval(value) {
    return Math.max(
      MIN_BOUNTY_ROLL_INTERVAL_MS,
      Math.min(MAX_BOUNTY_ROLL_INTERVAL_MS, Math.floor(Number(value) || BOUNTY_ROLL_INTERVAL_MS))
    );
  }

  function hashString(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededUnit(value) {
    return hashString(value) / 0x100000000;
  }

  function mondayUtcStart(nowMs) {
    const now = new Date(Math.max(0, Number(nowMs) || 0));
    const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const daysSinceMonday = (now.getUTCDay() + 6) % 7;
    return midnight - daysSinceMonday * 24 * 60 * 60 * 1000;
  }

  function weeklyCycleId(nowMs) {
    return new Date(mondayUtcStart(nowMs)).toISOString().slice(0, 10);
  }

  function rounded(value, places = 6) {
    const factor = Math.pow(10, places);
    return Math.round(value * factor) / factor;
  }

  function operationSnapshot(id, rawRank) {
    const config = OPERATION_CONFIG[id];
    if (!config) return null;
    const rank = positiveRank(rawRank);
    const passivePerMinute = rounded(config.passivePerMinutePerRank * rank);
    const stagePayout = Math.max(1, Math.round(config.stagePayoutPerRank * rank));
    const finalStagePayout = stagePayout * FINAL_STAGE_MULTIPLIER;
    return Object.freeze({
      id,
      name: config.name,
      resource: config.resource,
      rank,
      passivePerMinute,
      stagePayout,
      finalStagePayout,
      fullRunPayout: NORMAL_STAGE_COUNT * stagePayout + finalStagePayout,
      capacity: rounded(passivePerMinute * STORAGE_MINUTES),
      nextRank: rank + 1,
      nextRankCost: Object.freeze({ gold: operationNextRankGold(config, rank) }),
      nextRankAdvancementCost: rank >= 5 ? 1 : 0,
      nextPassivePerMinute: rounded(config.passivePerMinutePerRank * (rank + 1)),
      nextStagePayout: Math.max(1, Math.round(config.stagePayoutPerRank * (rank + 1))),
      nextCapacity: rounded(config.passivePerMinutePerRank * (rank + 1) * STORAGE_MINUTES),
    });
  }

  function normalizeOperations(value) {
    const source = plainObject(value) || {};
    return Object.freeze({
      lumber: positiveRank(source.lumber),
      quarry: positiveRank(source.quarry),
    });
  }

  function normalizeOperationProgress(value, operations) {
    const source = plainObject(value) || {};
    const normalizedOperations = normalizeOperations(operations);
    const purchasedAboveRankFive = Object.values(normalizedOperations)
      .reduce((sum, rank) => sum + Math.max(0, rank - 5), 0);
    const qualifyingStage10Clears = integerNonNegative(source.qualifyingStage10Clears);
    const hasSavedAdvancements = Number.isFinite(Number(source.advancements));
    const advancements = hasSavedAdvancements
      ? integerNonNegative(source.advancements)
      : Math.max(0, qualifyingStage10Clears - purchasedAboveRankFive);
    return Object.freeze({
      schemaVersion: OPERATION_PROGRESS_SCHEMA_VERSION,
      advancements,
      qualifyingStage10Clears,
      lastAwardedRunId: typeof source.lastAwardedRunId === "string" ? source.lastAwardedRunId : "",
    });
  }

  function awardOperationAdvancement(progress, operations, runId) {
    const normalized = normalizeOperationProgress(progress, operations);
    const key = String(runId || "");
    if (!key || normalized.lastAwardedRunId === key) {
      return Object.freeze({ accepted: false, reason: key ? "duplicateRun" : "missingRunId", progress: normalized });
    }
    return Object.freeze({
      accepted: true,
      reason: "accepted",
      progress: Object.freeze({
        ...normalized,
        advancements: normalized.advancements + 1,
        qualifyingStage10Clears: normalized.qualifyingStage10Clears + 1,
        lastAwardedRunId: key,
      }),
    });
  }

  function bossCurrencyRewards(stage, prestigeTier, maximumPrestigeTier = 5) {
    const resolvedStage = Math.max(0, Math.floor(Number(stage) || 0));
    const tier = Math.max(0, Math.min(
      Math.max(0, Math.floor(Number(maximumPrestigeTier) || 0)),
      Math.floor(Number(prestigeTier) || 0)
    ));
    if (resolvedStage === 5) return Object.freeze({ bossTrophies: tier + 1 });
    if (resolvedStage === 10) return Object.freeze({ bossTrophies: 2 * (tier + 1) });
    if (resolvedStage === 15) {
      return Object.freeze({
        sheriffsCrests: 1,
        ...(tier === maximumPrestigeTier ? { royalSigils: 1 } : {}),
      });
    }
    return Object.freeze({});
  }

  function weightedBuildingMaterialAmount(definition, resource, baseAmount) {
    const weight = finiteNonNegative(definition?.weight);
    const armouryOreScalar = definition?.id === "armoury" && resource === "ore" ? 0.5 : 1;
    return Math.round(finiteNonNegative(baseAmount) * weight * armouryOreScalar);
  }

  function operationCapacities(operations) {
    const normalized = normalizeOperations(operations);
    return Object.freeze({
      wood: operationSnapshot("lumber", normalized.lumber).capacity,
      ore: operationSnapshot("quarry", normalized.quarry).capacity,
    });
  }

  function operationPassiveRates(operations) {
    const normalized = normalizeOperations(operations);
    return Object.freeze({
      wood: operationSnapshot("lumber", normalized.lumber).passivePerMinute,
      ore: operationSnapshot("quarry", normalized.quarry).passivePerMinute,
    });
  }

  function operationStageRewards(operations, finalStage = false) {
    const normalized = normalizeOperations(operations);
    const lumber = operationSnapshot("lumber", normalized.lumber);
    const quarry = operationSnapshot("quarry", normalized.quarry);
    return Object.freeze({
      wood: finalStage ? lumber.finalStagePayout : lumber.stagePayout,
      ore: finalStage ? quarry.finalStagePayout : quarry.stagePayout,
    });
  }

  function operationFullRunRewards(operations) {
    const normalized = normalizeOperations(operations);
    return Object.freeze({
      wood: operationSnapshot("lumber", normalized.lumber).fullRunPayout,
      ore: operationSnapshot("quarry", normalized.quarry).fullRunPayout,
    });
  }

  function operationUpgradeStatus(operations, progress, resources, id) {
    const config = OPERATION_CONFIG[id];
    const normalizedOperations = normalizeOperations(operations);
    const normalizedProgress = normalizeOperationProgress(progress, normalizedOperations);
    const sourceResources = plainObject(resources) || {};
    if (!config) return null;
    const snapshot = operationSnapshot(id, normalizedOperations[id]);
    const gold = finiteNonNegative(sourceResources.gold);
    const missingGold = Math.max(0, snapshot.nextRankCost.gold - gold);
    const missingAdvancements = Math.max(0, snapshot.nextRankAdvancementCost - normalizedProgress.advancements);
    return Object.freeze({
      affordable: missingGold === 0 && missingAdvancements === 0,
      missingGold,
      missingAdvancements,
      snapshot,
      progress: normalizedProgress,
    });
  }

  function purchaseOperationRank(operations, progress, resources, id) {
    const normalizedOperations = normalizeOperations(operations);
    const normalizedProgress = normalizeOperationProgress(progress, normalizedOperations);
    const sourceResources = plainObject(resources) || {};
    const status = operationUpgradeStatus(normalizedOperations, normalizedProgress, sourceResources, id);
    if (!status) {
      return Object.freeze({
        accepted: false,
        reason: "unknownOperation",
        operations: normalizedOperations,
        progress: normalizedProgress,
        resources: Object.freeze({ ...sourceResources }),
      });
    }
    if (!status.affordable) {
      const reason = status.missingGold > 0 && status.missingAdvancements > 0
        ? "insufficientGoldAndAdvancement"
        : status.missingGold > 0 ? "insufficientGold" : "insufficientAdvancement";
      return Object.freeze({
        accepted: false,
        reason,
        cost: status.snapshot.nextRankCost,
        snapshot: status.snapshot,
        missingGold: status.missingGold,
        missingAdvancements: status.missingAdvancements,
        operations: normalizedOperations,
        progress: normalizedProgress,
        resources: Object.freeze({ ...sourceResources }),
      });
    }
    return Object.freeze({
      accepted: true,
      reason: "accepted",
      cost: status.snapshot.nextRankCost,
      snapshot: status.snapshot,
      operations: Object.freeze({
        ...normalizedOperations,
        [id]: status.snapshot.nextRank,
      }),
      progress: Object.freeze({
        ...normalizedProgress,
        advancements: normalizedProgress.advancements - status.snapshot.nextRankAdvancementCost,
      }),
      resources: Object.freeze({
        ...sourceResources,
        gold: finiteNonNegative(sourceResources.gold) - status.snapshot.nextRankCost.gold,
      }),
    });
  }

  function normalizeServices(value) {
    const source = plainObject(value) || {};
    return Object.freeze({
      foundationEntitlementFloor: Math.max(1, Math.min(3, Math.floor(Number(source.foundationEntitlementFloor) || 1))),
      bowMaxTier: Math.max(0, Math.min(2, Math.floor(Number(source.bowMaxTier) || 0))),
    });
  }

  function foundationLimit(plotCount, entitlementFloor = 1) {
    const plots = Math.max(1, Math.min(25, Math.floor(Number(plotCount) || 1)));
    const earned = plots >= 25 ? 3 : plots >= 15 ? 2 : 1;
    return Math.max(earned, Math.max(1, Math.min(3, Math.floor(Number(entitlementFloor) || 1))));
  }

  function bountyTemplate(templateId) {
    return BOUNTY_TEMPLATES.find((template) => template.id === templateId) || null;
  }

  function bountyParameter(template, seed) {
    if (template.parameter !== "status") return {};
    const statuses = ["poison", "frost", "bleed"];
    return { status: statuses[Math.floor(seededUnit(`${seed}:status`) * statuses.length)] };
  }

  function bountyDescription(template, parameters = {}) {
    const status = String(parameters.status || "");
    const statusName = status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : "a status path";
    return template.desc.replace("{status}", statusName);
  }

  function selectBountyTemplate(activeTemplateIds, seed) {
    const active = new Set(activeTemplateIds || []);
    const weighted = BOUNTY_TEMPLATES.map((template) => ({
      template,
      weight: active.has(template.id) ? BOUNTY_ACTIVE_WEIGHT : BOUNTY_INACTIVE_WEIGHT,
    }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = seededUnit(`${seed}:template`) * total;
    for (const entry of weighted) {
      if (roll < entry.weight) return entry.template;
      roll -= entry.weight;
    }
    return weighted[weighted.length - 1].template;
  }

  function createBounty(slotIndex, cycle, rolledAtMs, expiresAtMs, activeTemplateIds = []) {
    const seed = `${slotIndex}:${cycle}:${rolledAtMs}`;
    const template = selectBountyTemplate(activeTemplateIds, seed);
    const parameters = bountyParameter(template, seed);
    return {
      id: `rolling:${slotIndex}:${cycle}:${template.id}:${rolledAtMs}`,
      templateId: template.id,
      tier: template.tier,
      desc: bountyDescription(template, parameters),
      goal: template.goal,
      progress: 0,
      reward: { ...template.reward },
      parameters,
      rolledAtMs,
      expiresAtMs,
    };
  }

  function lockedBountyBoard(slotCount = DEFAULT_BOUNTY_SLOT_COUNT, rollIntervalMs = BOUNTY_ROLL_INTERVAL_MS) {
    return {
      schemaVersion: BOUNTY_SCHEMA_VERSION,
      unlocked: false,
      unlockedAtMs: 0,
      slotCount: Math.max(MIN_BOUNTY_SLOT_COUNT, Math.min(MAX_BOUNTY_SLOT_COUNT, Math.floor(Number(slotCount) || DEFAULT_BOUNTY_SLOT_COUNT))),
      rollIntervalMs: bountyRollInterval(rollIntervalMs),
      lifetimeMs: BOUNTY_LIFETIME_MS,
      slots: [],
    };
  }

  function unlockBountyBoard(
    nowMs,
    slotCount = DEFAULT_BOUNTY_SLOT_COUNT,
    rollIntervalMs = BOUNTY_ROLL_INTERVAL_MS
  ) {
    const unlockedAtMs = Math.max(1, Math.floor(Number(nowMs) || 1));
    const count = Math.max(MIN_BOUNTY_SLOT_COUNT, Math.min(MAX_BOUNTY_SLOT_COUNT, Math.floor(Number(slotCount) || DEFAULT_BOUNTY_SLOT_COUNT)));
    const interval = bountyRollInterval(rollIntervalMs);
    const slots = [];
    for (let slotIndex = 0; slotIndex < count; slotIndex += 1) {
      const nextRollAtMs = unlockedAtMs + interval * (slotIndex + 1);
      const expiresAtMs = unlockedAtMs + Math.min(BOUNTY_LIFETIME_MS, interval * (slotIndex + 1));
      const rolledAtMs = Math.max(1, expiresAtMs - BOUNTY_LIFETIME_MS);
      const activeTemplateIds = slots.map((slot) => slot.bounty.templateId);
      slots.push({
        slotIndex,
        cycle: 0,
        nextRollAtMs,
        bounty: createBounty(slotIndex, 0, rolledAtMs, expiresAtMs, activeTemplateIds),
      });
    }
    return {
      schemaVersion: BOUNTY_SCHEMA_VERSION,
      unlocked: true,
      unlockedAtMs,
      slotCount: count,
      rollIntervalMs: interval,
      lifetimeMs: BOUNTY_LIFETIME_MS,
      slots,
    };
  }

  function normalizeBounty(raw) {
    const source = plainObject(raw);
    if (!source) return null;
    const template = bountyTemplate(source.templateId);
    const rolledAtMs = Math.max(1, Math.floor(Number(source.rolledAtMs) || 0));
    const expiresAtMs = Math.max(rolledAtMs + 1, Math.floor(Number(source.expiresAtMs) || 0));
    if (!template || !rolledAtMs || !expiresAtMs) return null;
    const parameters = bountyParameter(template, `${source.id || template.id}:${rolledAtMs}`);
    if (template.parameter === "status" && ["poison", "frost", "bleed"].includes(source.parameters?.status)) {
      parameters.status = source.parameters.status;
    }
    return {
      id: typeof source.id === "string" && source.id ? source.id : `${template.id}:${rolledAtMs}`,
      templateId: template.id,
      tier: template.tier,
      desc: bountyDescription(template, parameters),
      goal: template.goal,
      progress: Math.max(0, Math.min(template.goal, Math.floor(Number(source.progress) || 0))),
      reward: { ...template.reward },
      parameters,
      rolledAtMs,
      expiresAtMs,
    };
  }

  function normalizeBountyBoard(raw) {
    const source = plainObject(raw);
    if (!source || !source.unlocked) return lockedBountyBoard(source?.slotCount, source?.rollIntervalMs);
    const slotCount = Math.max(
      MIN_BOUNTY_SLOT_COUNT,
      Math.min(MAX_BOUNTY_SLOT_COUNT, Math.floor(Number(source.slotCount) || DEFAULT_BOUNTY_SLOT_COUNT))
    );
    const slots = [];
    for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
      const rawSlot = Array.isArray(source.slots)
        ? source.slots.find((slot) => Number(slot?.slotIndex) === slotIndex)
        : null;
      const cycle = Math.max(0, Math.floor(Number(rawSlot?.cycle) || 0));
      let bounty = normalizeBounty(rawSlot?.bounty);
      if (!bounty && plainObject(rawSlot?.bounty)) {
        const rolledAtMs = Math.max(1, Math.floor(Number(rawSlot.bounty.rolledAtMs) || 1));
        const expiresAtMs = Math.max(rolledAtMs + 1, Math.floor(Number(rawSlot.bounty.expiresAtMs) || rolledAtMs + BOUNTY_LIFETIME_MS));
        bounty = createBounty(
          slotIndex,
          cycle,
          rolledAtMs,
          expiresAtMs,
          slots.map((slot) => slot.bounty?.templateId).filter(Boolean)
        );
      }
      const nextRollAtMs = Math.max(
        1,
        Math.floor(Number(rawSlot?.nextRollAtMs) || bounty?.expiresAtMs || 0)
      );
      slots.push({ slotIndex, cycle, nextRollAtMs, bounty });
    }
    return {
      schemaVersion: BOUNTY_SCHEMA_VERSION,
      unlocked: true,
      unlockedAtMs: Math.max(1, Math.floor(Number(source.unlockedAtMs) || 1)),
      slotCount,
      rollIntervalMs: bountyRollInterval(source.rollIntervalMs),
      lifetimeMs: BOUNTY_LIFETIME_MS,
      slots,
    };
  }

  function advanceBountyBoard(rawBoard, nowMs) {
    const board = deepClone(normalizeBountyBoard(rawBoard));
    const now = Math.max(1, Math.floor(Number(nowMs) || 1));
    if (!board.unlocked) return Object.freeze({ board: Object.freeze(board), changed: false });
    let changed = false;
    const slotCycleMs = board.slotCount * board.rollIntervalMs;
    for (const slot of board.slots) {
      let guard = 0;
      while (now >= slot.nextRollAtMs && guard < 10000) {
        const rolledAtMs = slot.nextRollAtMs;
        slot.cycle += 1;
        slot.nextRollAtMs = rolledAtMs + slotCycleMs;
        const activeTemplateIds = board.slots
          .filter((candidate) => candidate.slotIndex !== slot.slotIndex)
          .map((candidate) => candidate.bounty?.templateId)
          .filter(Boolean);
        slot.bounty = createBounty(
          slot.slotIndex,
          slot.cycle,
          rolledAtMs,
          rolledAtMs + BOUNTY_LIFETIME_MS,
          activeTemplateIds
        );
        changed = true;
        guard += 1;
      }
      if (slot.bounty && now >= slot.bounty.expiresAtMs) {
        slot.bounty = null;
        changed = true;
      }
    }
    return Object.freeze({ board: Object.freeze(board), changed });
  }

  function bountyProgressValue(bounty, event, payload) {
    const template = bountyTemplate(bounty.templateId);
    if (!template) return null;
    const stage = Math.max(0, Math.floor(Number(payload?.stage) || 0));
    const status = String(payload?.statusPath || "");
    const stageMatches = !template.stage || template.stage === stage;
    if (template.metric === "kill" && event === "kill") return { add: 1 };
    if (template.metric === "stageClear" && event === "stageClear" && stageMatches) return { add: 1 };
    if (template.metric === "cleanStage" && event === "stageClear" && stageMatches && Number(payload?.damageTaken) <= 0) return { add: 1 };
    if (template.metric === "streak" && event === "kill") return { setAtLeast: Math.floor(Number(payload?.streak) || 0) };
    if (template.metric === "gold" && (event === "stageClear" || event === "goldAwarded")) return { add: Math.floor(Number(payload?.gold) || 0) };
    if (template.metric === "upgrade" && event === "upgradeChosen") return { add: 1 };
    if (template.metric === "relic" && event === "runRelicChosen") return { add: 1 };
    if (
      template.metric === "statusLock"
      && (event === "statusPathLocked" || (event === "upgradeChosen" && payload?.statusPathLocked))
      && ["poison", "frost", "bleed"].includes(status)
    ) return { add: 1 };
    if (template.metric === "stageWithStatus" && event === "stageClear" && status) return { add: 1 };
    if (
      template.metric === "stageWithNamedStatus"
      && event === "stageClear"
      && stageMatches
      && status === bounty.parameters?.status
    ) return { add: 1 };
    if (template.metric === "miniboss" && event === "stageClear" && (stage === 5 || stage === 10)) return { add: 1 };
    return null;
  }

  function progressBountyBoard(rawBoard, event, payload, nowMs) {
    const advanced = advanceBountyBoard(rawBoard, nowMs);
    const board = deepClone(advanced.board);
    const completions = [];
    let changed = advanced.changed;
    if (!board.unlocked) return Object.freeze({ board: Object.freeze(board), completions: Object.freeze(completions), changed });
    for (const slot of board.slots) {
      const bounty = slot.bounty;
      if (!bounty) continue;
      const update = bountyProgressValue(bounty, event, payload);
      if (!update) continue;
      bounty.progress = Math.min(
        bounty.goal,
        Math.max(bounty.progress, Number(update.setAtLeast) || 0) + (Number(update.add) || 0)
      );
      changed = true;
      if (bounty.progress < bounty.goal) continue;
      completions.push(Object.freeze({
        slotIndex: slot.slotIndex,
        id: bounty.id,
        templateId: bounty.templateId,
        tier: bounty.tier,
        desc: bounty.desc,
        reward: Object.freeze({ ...bounty.reward }),
      }));
      slot.bounty = null;
    }
    return Object.freeze({
      board: Object.freeze(board),
      completions: Object.freeze(completions),
      changed,
    });
  }

  function weeklyObjectiveState(definition) {
    return {
      id: definition.id,
      progress: 0,
      rewarded: 0,
      completedAtMs: 0,
    };
  }

  function initialWeeklyBounties(nowMs) {
    const cycleStartMs = mondayUtcStart(nowMs);
    return {
      schemaVersion: WEEKLY_BOUNTY_SCHEMA_VERSION,
      cycleId: weeklyCycleId(nowMs),
      cycleStartMs,
      cycleEndMs: cycleStartMs + WEEK_MS,
      unlocked: true,
      unlockedAtMs: Math.max(1, cycleStartMs),
      objectives: WEEKLY_BOUNTY_OBJECTIVES.map(weeklyObjectiveState),
      weeklyTicketsEarned: 0,
      processedEventIds: [],
    };
  }

  function weeklyObjectiveById(objectives, id) {
    return objectives.find((objective) => objective?.id === id);
  }

  function normalizeWeeklyEventIds(values) {
    const unique = [];
    for (const value of Array.isArray(values) ? values : []) {
      const id = String(value || "");
      if (!id || unique.includes(id)) continue;
      unique.push(id);
    }
    return unique.slice(-MAX_WEEKLY_EVENT_IDS);
  }

  function migrateCurrentWeeklyBounties(source, current, nowMs) {
    const savedObjectives = Array.isArray(source.objectives) ? source.objectives : [];
    const oldProgress = (id, maximum) => Math.max(0, Math.min(maximum, Math.floor(Number(weeklyObjectiveById(savedObjectives, id)?.progress) || 0)));
    const fullClears = oldProgress("WB-01", 7);
    const oldTicketsClaimed = Math.max(0, Math.min(fullClears, Math.floor(Number(source.ticketsClaimed) || 0)));
    const frostClears = oldProgress("WB-02", 4);
    const poisonClears = oldProgress("WB-03", 4);
    const bleedClears = oldProgress("WB-04", 4);
    const cleanStages = oldProgress("WB-05", 12);
    const minibosses = oldProgress("WB-06", 18);
    const roomGold = oldProgress("WB-07", 6000);
    const mapped = {
      "WB-01": { progress: 0, rewarded: fullClears },
      "WB-05": { progress: cleanStages, rewarded: 0 },
      "WB-07": { progress: roomGold % 3000, rewarded: Math.floor(roomGold / 3000) },
      "WB-06": { progress: minibosses % 6, rewarded: Math.floor(minibosses / 6) },
      "WB-02": { progress: frostClears, rewarded: frostClears },
      "WB-03": { progress: poisonClears, rewarded: poisonClears },
      "WB-04": { progress: bleedClears, rewarded: bleedClears },
    };
    const totalMappedTickets = Object.values(mapped).reduce((total, objective) => total + objective.rewarded, 0);
    current.unlocked = true;
    current.unlockedAtMs = Math.max(1, Math.floor(Number(source.unlockedAtMs) || current.cycleStartMs));
    current.weeklyTicketsEarned = Math.min(WEEKLY_STANDARD_TICKET_CAP, totalMappedTickets);
    current.objectives = WEEKLY_BOUNTY_OBJECTIVES.map((definition) => {
      const migrated = mapped[definition.id];
      const progress = Math.max(0, Math.min(definition.goal, migrated.progress));
      return {
        id: definition.id,
        progress,
        rewarded: Math.max(0, migrated.rewarded),
        completedAtMs: definition.kind === "elemental" && progress >= definition.goal
          ? Math.max(1, Math.floor(Number(nowMs) || 1))
          : 0,
      };
    });
    const newMilestones = Math.max(0, current.weeklyTicketsEarned - fullClears);
    return {
      board: current,
      autoDelivery: Object.freeze({
        standardTickets: Math.max(0, fullClears - oldTicketsClaimed) + newMilestones,
        scrap: 0,
      }),
    };
  }

  function normalizeCurrentWeeklyBounties(source, current) {
    const savedObjectives = Array.isArray(source.objectives) ? source.objectives : [];
    current.unlocked = true;
    current.unlockedAtMs = Math.max(1, Math.floor(Number(source.unlockedAtMs) || current.cycleStartMs));
    current.weeklyTicketsEarned = Math.max(0, Math.min(WEEKLY_STANDARD_TICKET_CAP, Math.floor(Number(source.weeklyTicketsEarned) || 0)));
    current.processedEventIds = normalizeWeeklyEventIds(source.processedEventIds);
    current.objectives = WEEKLY_BOUNTY_OBJECTIVES.map((definition) => {
      const saved = weeklyObjectiveById(savedObjectives, definition.id);
      const maximumProgress = definition.kind === "repeatable" ? Math.max(0, definition.goal - 1) : definition.goal;
      const progress = Math.max(0, Math.min(maximumProgress, Math.floor(Number(saved?.progress) || 0)));
      return {
        id: definition.id,
        progress,
        rewarded: Math.max(0, Math.min(
          definition.kind === "elemental" ? definition.goal : WEEKLY_STANDARD_TICKET_CAP,
          Math.floor(Number(saved?.rewarded) || 0)
        )),
        completedAtMs: definition.kind === "elemental" && progress >= definition.goal
          ? Math.max(1, Math.floor(Number(saved?.completedAtMs) || 1))
          : 0,
      };
    });
    return current;
  }

  function normalizeWeeklyBountiesResult(raw, nowMs) {
    const source = plainObject(raw);
    const current = initialWeeklyBounties(nowMs);
    if (!source || source.cycleId !== current.cycleId) {
      return Object.freeze({ board: current, autoDelivery: Object.freeze({ standardTickets: 0, scrap: 0 }), migrated: false });
    }
    if (Number(source.schemaVersion) < WEEKLY_BOUNTY_SCHEMA_VERSION) {
      const migration = migrateCurrentWeeklyBounties(source, current, nowMs);
      return Object.freeze({ board: migration.board, autoDelivery: migration.autoDelivery, migrated: true });
    }
    return Object.freeze({
      board: normalizeCurrentWeeklyBounties(source, current),
      autoDelivery: Object.freeze({ standardTickets: 0, scrap: 0 }),
      migrated: source.unlocked !== true,
    });
  }

  function normalizeWeeklyBounties(raw, nowMs) {
    return normalizeWeeklyBountiesResult(raw, nowMs).board;
  }

  function legacyPendingWeeklyTickets(source) {
    if (!source || Number(source.schemaVersion) >= WEEKLY_BOUNTY_SCHEMA_VERSION) return 0;
    const objective = weeklyObjectiveById(Array.isArray(source.objectives) ? source.objectives : [], "WB-01");
    const progress = Math.max(0, Math.min(7, Math.floor(Number(objective?.progress) || 0)));
    const claimed = Math.max(0, Math.min(progress, Math.floor(Number(source.ticketsClaimed) || 0)));
    return progress - claimed;
  }

  function advanceWeeklyBounties(raw, nowMs) {
    const currentCycle = weeklyCycleId(nowMs);
    const source = plainObject(raw);
    if (!source || source.cycleId === currentCycle) {
      const normalized = normalizeWeeklyBountiesResult(raw, nowMs);
      return Object.freeze({
        board: Object.freeze(normalized.board),
        autoDelivery: normalized.autoDelivery,
        changed: normalized.migrated,
      });
    }
    const autoDelivery = Object.freeze({
      standardTickets: source.unlocked ? legacyPendingWeeklyTickets(source) : 0,
      scrap: 0,
    });
    const board = initialWeeklyBounties(nowMs);
    return Object.freeze({ board: Object.freeze(board), autoDelivery, changed: true });
  }

  function weeklyProgressValue(definition, event, payload) {
    const stage = Math.max(0, Math.floor(Number(payload?.stage) || 0));
    const status = String(payload?.statusPath || "");
    if (definition.metric === "fullClear" && event === "stageClear" && stage === 15) return 1;
    if (definition.metric === "stage10Status" && event === "stageClear" && stage === 10 && status === definition.status) return 1;
    if (definition.metric === "cleanStage" && event === "stageClear" && Number(payload?.damageTaken) <= 0) return 1;
    if (definition.metric === "miniboss" && event === "stageClear" && (stage === 5 || stage === 10)) return 1;
    if (definition.metric === "gold" && (event === "stageClear" || event === "goldAwarded")) return Math.max(0, Math.floor(Number(payload?.gold) || 0));
    return 0;
  }

  function progressWeeklyBounties(raw, event, payload, nowMs) {
    const advanced = advanceWeeklyBounties(raw, nowMs);
    const board = deepClone(advanced.board);
    const completions = [];
    const awards = [];
    let changed = advanced.changed;
    const eventId = String(payload?.eventId || "");
    const hasProgress = WEEKLY_BOUNTY_OBJECTIVES.some((definition) => weeklyProgressValue(definition, event, payload) > 0);
    if (!hasProgress || board.weeklyTicketsEarned >= WEEKLY_STANDARD_TICKET_CAP || !eventId || board.processedEventIds.includes(eventId)) {
      return Object.freeze({ board: Object.freeze(board), autoDelivery: advanced.autoDelivery, completions: Object.freeze(completions), awards: Object.freeze(awards), changed });
    }
    board.processedEventIds = normalizeWeeklyEventIds([...board.processedEventIds, eventId]);
    changed = true;
    for (const definition of WEEKLY_BOUNTY_OBJECTIVES) {
      if (board.weeklyTicketsEarned >= WEEKLY_STANDARD_TICKET_CAP) break;
      const amount = weeklyProgressValue(definition, event, payload);
      if (amount <= 0) continue;
      const objective = board.objectives.find((entry) => entry.id === definition.id);
      const capacity = WEEKLY_STANDARD_TICKET_CAP - board.weeklyTicketsEarned;
      let ticketCount = 0;
      if (definition.kind === "repeatable") {
        const totalProgress = objective.progress + amount;
        ticketCount = Math.min(capacity, Math.floor(totalProgress / definition.goal));
        objective.progress = totalProgress % definition.goal;
      } else {
        ticketCount = Math.min(capacity, definition.goal - objective.progress, amount);
        objective.progress += ticketCount;
      }
      if (ticketCount <= 0) continue;
      const firstRewardNumber = objective.rewarded + 1;
      objective.rewarded += ticketCount;
      board.weeklyTicketsEarned += ticketCount;
      awards.push(Object.freeze({
        id: `${board.cycleId}:${eventId}:${definition.id}:${firstRewardNumber}-${objective.rewarded}`,
        objectiveId: definition.id,
        standardTickets: ticketCount,
      }));
      completions.push(definition.id);
      if (definition.kind === "elemental" && objective.progress >= definition.goal) {
        objective.completedAtMs = Math.max(1, Math.floor(Number(nowMs) || 1));
      }
    }
    return Object.freeze({
      board: Object.freeze(board),
      autoDelivery: advanced.autoDelivery,
      completions: Object.freeze(completions),
      awards: Object.freeze(awards),
      changed,
    });
  }

  function addRefund(refund, resource, amount) {
    const value = integerNonNegative(amount);
    if (!resource || value <= 0) return;
    refund[resource] = (refund[resource] || 0) + value;
  }

  function addCost(refund, cost) {
    for (const [resource, amount] of Object.entries(cost || {})) addRefund(refund, resource, amount);
  }

  function weightedCost(base, definition) {
    const cost = { gold: Math.round(base.gold * definition.weight) };
    if (base.primary > 0) cost[definition.primaryCost] = Math.round(base.primary * definition.weight);
    if (base.secondary > 0) cost[definition.secondaryCost] = Math.round(base.secondary * definition.weight);
    for (const resource of ["bossTrophies", "sheriffsCrests", "royalSigils"]) {
      if (base[resource]) cost[resource] = base[resource];
    }
    return cost;
  }

  function legacyPlacementCost(definition) {
    return weightedCost(LEGACY_BUILDING_PLACE_COST, definition);
  }

  function legacyBuildingUpgradeCost(definition, level) {
    const base = definition.bow
      ? LEGACY_FIXTURE_LEVEL_COSTS[level]
      : LEGACY_BUILDING_LEVEL_COSTS[level];
    return base ? weightedCost(base, definition) : null;
  }

  function legacyFixtureUpgradeCost(definition, level) {
    const base = LEGACY_FIXTURE_LEVEL_COSTS[level];
    if (!base) return null;
    const cost = weightedCost(base, definition);
    if (level === 10) cost.bossTrophies = 1;
    return cost;
  }

  function oldFoundationEntitlement(outlawLevel) {
    const level = Math.max(1, Math.min(10, Math.floor(Number(outlawLevel) || 1)));
    return level >= 10 ? 3 : level >= 8 ? 2 : 1;
  }

  function calculateLegacyRefund(saved) {
    const refund = {};
    const plots = Array.isArray(saved?.buildingPlots) ? saved.buildingPlots : [];
    for (const plot of plots) {
      const definition = LEGACY_BUILDINGS[plot?.id];
      if (!definition) continue;
      const level = Math.max(1, Math.min(definition.maxLevel, Math.floor(Number(plot.level) || 1)));
      addCost(refund, legacyPlacementCost(definition));
      for (let currentLevel = 2; currentLevel <= level; currentLevel += 1) {
        addCost(refund, legacyBuildingUpgradeCost(definition, currentLevel));
      }
    }

    const fixtures = plainObject(saved?.fixtures) || {};
    const outlawLevel = Math.max(1, Math.min(10, Math.floor(Number(fixtures.outlawCamp) || 1)));
    for (let level = 2; level <= outlawLevel; level += 1) {
      addCost(refund, legacyFixtureUpgradeCost(LEGACY_FIXTURES.outlawCamp, level));
    }

    const bountyLevel = Math.max(0, Math.min(5, Math.floor(Number(fixtures.bountyBoard) || 0)));
    if (bountyLevel > 0) addCost(refund, legacyPlacementCost(LEGACY_FIXTURES.bountyBoard));
    for (let level = 2; level <= bountyLevel; level += 1) {
      addCost(refund, legacyFixtureUpgradeCost(LEGACY_FIXTURES.bountyBoard, level));
    }

    const storehouseLevel = Math.max(1, Math.min(5, Math.floor(Number(fixtures.storehouse) || 1)));
    for (let level = 2; level <= storehouseLevel; level += 1) addCost(refund, LEGACY_STOREHOUSE_COSTS[level]);

    return Object.freeze(Object.fromEntries(Object.entries(refund).sort(([left], [right]) => left.localeCompare(right))));
  }

  function migrateSave(rawSaved, nowMs) {
    const saved = plainObject(rawSaved);
    if (!saved) return Object.freeze({ status: "unsupported", reason: "missingSave" });
    if (Number(saved.villageRework?.version) === VILLAGE_REWORK_VERSION) {
      return Object.freeze({ status: "current", save: rawSaved });
    }
    if (Number(saved.progressionSaveSchemaVersion) !== 4) {
      return Object.freeze({ status: "unsupported", reason: "schema" });
    }
    if (!Array.isArray(saved.buildingPlots) || !plainObject(saved.resources) || !plainObject(saved.production)) {
      return Object.freeze({ status: "invalid", reason: "shape" });
    }
    const fixtures = plainObject(saved.fixtures);
    if (!fixtures) return Object.freeze({ status: "invalid", reason: "fixtures" });

    const refund = calculateLegacyRefund(saved);
    const next = deepClone(saved);
    const bowLevels = next.buildingPlots
      .filter((plot) => plot?.id === "blacksmith")
      .map((plot) => Math.max(1, Math.min(3, Math.floor(Number(plot.level) || 1))));
    const bowMaxTier = Math.max(0, ...bowLevels.map((level) => level - 1));
    const bountyUnlocked = Math.floor(Number(fixtures.bountyBoard) || 0) > 0;
    const foundationEntitlementFloor = oldFoundationEntitlement(fixtures.outlawCamp);

    next.resources = plainObject(next.resources) || {};
    for (const [resource, amount] of Object.entries(refund)) {
      next.resources[resource] = finiteNonNegative(next.resources[resource]) + amount;
    }
    next.buildingPlots = next.buildingPlots.map((plot) => (
      plot && LEGACY_BUILDING_IDS.includes(plot.id) ? null : plot
    ));
    next.buildings = {};
    for (const plot of next.buildingPlots) {
      if (!plot?.id) continue;
      next.buildings[plot.id] = (next.buildings[plot.id] || 0) + Math.max(1, Math.floor(Number(plot.level) || 1));
    }
    next.operations = { lumber: 1, quarry: 1 };
    next.operationProgress = normalizeOperationProgress(null, next.operations);
    next.villageServices = { foundationEntitlementFloor, bowMaxTier };
    next.bowTier = Math.max(0, Math.min(bowMaxTier, Math.floor(Number(next.bowTier) || 0)));
    next.bounties = bountyUnlocked ? unlockBountyBoard(nowMs) : lockedBountyBoard();
    next.villageRework = {
      version: VILLAGE_REWORK_VERSION,
      migratedAtMs: Math.max(1, Math.floor(Number(nowMs) || 1)),
      refund,
      legacy: {
        outlawCampLevel: Math.max(1, Math.floor(Number(fixtures.outlawCamp) || 1)),
        bountyBoardLevel: Math.max(0, Math.floor(Number(fixtures.bountyBoard) || 0)),
        storehouseLevel: Math.max(1, Math.floor(Number(fixtures.storehouse) || 1)),
      },
    };
    next.metaprogressionSaveVersion = 4;
    delete next.fixtures;

    return Object.freeze({
      status: "migrated",
      save: Object.freeze(next),
      refund,
      removedPlotCount: rawSaved.buildingPlots.filter((plot) => plot && LEGACY_BUILDING_IDS.includes(plot.id)).length,
      preservedFoundationEntitlement: foundationEntitlementFloor,
      preservedBowMaxTier: bowMaxTier,
      preservedBountyAccess: bountyUnlocked,
    });
  }

  return Object.freeze({
    VILLAGE_REWORK_VERSION,
    OPERATION_PROGRESS_SCHEMA_VERSION,
    BOUNTY_SCHEMA_VERSION,
    WEEKLY_BOUNTY_SCHEMA_VERSION,
    STORAGE_MINUTES,
    FINAL_STAGE_MULTIPLIER,
    NORMAL_STAGE_COUNT,
    BOUNTY_ROLL_INTERVAL_MS,
    MIN_BOUNTY_ROLL_INTERVAL_MS,
    MAX_BOUNTY_ROLL_INTERVAL_MS,
    BOUNTY_LIFETIME_MS,
    DEFAULT_BOUNTY_SLOT_COUNT,
    MIN_BOUNTY_SLOT_COUNT,
    MAX_BOUNTY_SLOT_COUNT,
    BOUNTY_INACTIVE_WEIGHT,
    BOUNTY_ACTIVE_WEIGHT,
    WEEK_MS,
    WEEKLY_STANDARD_TICKET_CAP,
    MAX_WEEKLY_EVENT_IDS,
    LEGACY_BUILDING_IDS,
    OPERATION_CONFIG,
    BOUNTY_TEMPLATES,
    WEEKLY_BOUNTY_OBJECTIVES,
    operationSnapshot,
    normalizeOperations,
    normalizeOperationProgress,
    awardOperationAdvancement,
    bossCurrencyRewards,
    weightedBuildingMaterialAmount,
    operationCapacities,
    operationPassiveRates,
    operationStageRewards,
    operationFullRunRewards,
    operationUpgradeStatus,
    purchaseOperationRank,
    normalizeServices,
    foundationLimit,
    lockedBountyBoard,
    unlockBountyBoard,
    normalizeBountyBoard,
    advanceBountyBoard,
    progressBountyBoard,
    weeklyCycleId,
    initialWeeklyBounties,
    normalizeWeeklyBounties,
    advanceWeeklyBounties,
    progressWeeklyBounties,
    calculateLegacyRefund,
    migrateSave,
  });
});
