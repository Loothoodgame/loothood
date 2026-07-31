(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodRunRelics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CATALOGUE_VERSION = "run-relic-v4.3";

  const IDS = Object.freeze({
    DOUBLE_DRAFT: "RLC4-S5-01",
    ROYAL_BARGAIN: "RLC4-S5-02",
    BLIND_BARGAIN: "RLC4-S5-03",
    OUTLAWS_HOURGLASS: "RLC4-S5-04",
    GOLDEN_OATH: "RLC4-S5-05",
    GILDED_PYRE: "RLC4-S5-06",
    BORROWED_HEART: "RLC4-S5-07",
    OUTLAWS_RESHUFFLE: "RLC4-S10-01",
    FIFTH_BELL: "RLC4-S10-03",
    LAST_LIFE: "RLC4-S10-04",
    OVERFLOWING_HEART: "RLC4-S10-05",
    SHERIFFS_WAGER: "RLC4-S10-06",
    BROKEN_CROWN_OATH: "RLC4-S10-07",
  });

  const OLD_IDS = Object.freeze([
    "bloodChalice",
    "wolfstepBoots",
    "greenwoodHeart",
    "splitStringTotem",
    "merryBanner",
    "huntersBrand",
    "ricochetIdol",
    "brambleQuiver",
    "widowsPhial",
    "serpentRing",
    "shardCrown",
    "rimeLantern",
    "barbedCrown",
    "reapersToken",
  ]);

  const HOURGLASS_PAR_SECONDS = Object.freeze({
    6: 38,
    7: 42,
    8: 46,
    9: 50,
    11: 54,
    12: 58,
    13: 62,
    14: 66,
  });

  const DEFINITIONS = Object.freeze([
    Object.freeze({
      id: IDS.DOUBLE_DRAFT,
      stage: 5,
      name: "Double Draft",
      desc: "Choose two different upgrades from each remaining ordinary offer. Your equipped bow uses 68% base damage.",
      params: Object.freeze({ bowBaseMultiplier: 0.68 }),
    }),
    Object.freeze({
      id: IDS.ROYAL_BARGAIN,
      stage: 5,
      name: "Royal Bargain",
      desc: "Every remaining ordinary offer has one guaranteed Epic card and one normal or eligible Evolution card. Taking the guaranteed Epic costs 5.5% of resulting maximum HP, down to 30.",
      params: Object.freeze({ maxHpCostRatio: 0.055, maxHpFloor: 30 }),
    }),
    Object.freeze({
      id: IDS.BLIND_BARGAIN,
      stage: 5,
      name: "Blind Bargain",
      desc: "Future ordinary rewards show one forced legal card. Stats grant 230% value and techniques complete at Epic.",
      params: Object.freeze({ statMultiplier: 2.3 }),
    }),
    Object.freeze({
      id: IDS.OUTLAWS_HOURGLASS,
      stage: 5,
      name: "Outlaw's Hourglass",
      desc: "Beat the stage par for a second upgrade. Miss it and lose 5 maximum HP, down to 30.",
      params: Object.freeze({ parSeconds: HOURGLASS_PAR_SECONDS, maxHpLoss: 5, maxHpFloor: 30 }),
    }),
    Object.freeze({
      id: IDS.GOLDEN_OATH,
      stage: 5,
      name: "Golden Oath",
      desc: "Future stages pay double gold if no health damage gets through, or zero gold if the oath breaks.",
      params: Object.freeze({ intactMultiplier: 2, brokenMultiplier: 0 }),
    }),
    Object.freeze({
      id: IDS.GILDED_PYRE,
      stage: 5,
      name: "Gilded Pyre",
      desc: "Burn all run gold. Every 100 burned grants +4% bow base damage and +0.1 HP/sec, up to ten marks.",
      params: Object.freeze({ goldPerMark: 100, maxMarks: 10, bowBasePerMark: 0.04, regenPerMark: 0.1 }),
    }),
    Object.freeze({
      id: IDS.BORROWED_HEART,
      stage: 5,
      name: "Borrowed Heart",
      desc: "Healing fills a 150% Heart store. Damage drains the store before HP; stage clears and boss transitions consume the rest for healing and maximum HP.",
      requiresHealing: true,
      incompatible: Object.freeze([IDS.LAST_LIFE, IDS.OVERFLOWING_HEART]),
      params: Object.freeze({ storageMultiplier: 1.5, excessToMaxHp: 0.2, stageMaxHpCap: 5 }),
    }),
    Object.freeze({
      id: IDS.OUTLAWS_RESHUFFLE,
      stage: 10,
      name: "Outlaw's Reshuffle",
      desc: "Replace every pre-Stage-10 ordinary pick with a different card one rarity higher, then choose one Uncommon recovery card.",
    }),
    Object.freeze({
      id: IDS.FIFTH_BELL,
      stage: 10,
      name: "Fifth Bell",
      desc: "Four Autoshots record direct damage. The fifth fires no arrows, replays 112.5% to valid targets, then silences firing for one second.",
      params: Object.freeze({ recordedAutoshots: 4, replayMultiplier: 1.125, silenceSeconds: 1 }),
    }),
    Object.freeze({
      id: IDS.LAST_LIFE,
      stage: 10,
      name: "Last Life",
      desc: "Start each remaining stage at full HP. Combat healing is disabled and 30% of health damage becomes a lasting maximum-HP wound.",
      incompatible: Object.freeze([IDS.BORROWED_HEART]),
      params: Object.freeze({ woundRatio: 0.3, maxHpFloor: 1 }),
    }),
    Object.freeze({
      id: IDS.OVERFLOWING_HEART,
      stage: 10,
      name: "Overflowing Heart",
      desc: "Healing above full HP becomes Barrier up to 30% max HP, but effective Damage Reduction becomes zero.",
      requiresHealing: true,
      incompatible: Object.freeze([IDS.BORROWED_HEART]),
      params: Object.freeze({ barrierCapRatio: 0.3 }),
    }),
    Object.freeze({
      id: IDS.SHERIFFS_WAGER,
      stage: 10,
      name: "Sheriff's Wager",
      desc: "Enemies deal 25% more damage in stages 11-14. Each flawless clear grants +8% damage and +0.15 HP/sec in Stage 15.",
      params: Object.freeze({ trialDamageMultiplier: 1.25, damagePerWarrant: 0.08, regenPerWarrant: 0.15, maxWarrants: 4 }),
    }),
    Object.freeze({
      id: IDS.BROKEN_CROWN_OATH,
      stage: 10,
      name: "Broken Crown Oath",
      desc: "Deal 65% damage to final-boss armour. Each broken armour segment grants +12.5% damage and +0.15 HP/sec for Stage 15.",
      params: Object.freeze({ armourDamageMultiplier: 0.65, damagePerMark: 0.125, regenPerMark: 0.15, maxMarks: 4 }),
    }),
  ]);

  const BY_ID = Object.freeze(Object.fromEntries(DEFINITIONS.map((definition) => [definition.id, definition])));
  const STAGE_5_IDS = Object.freeze(DEFINITIONS.filter((definition) => definition.stage === 5).map((definition) => definition.id));
  const STAGE_10_IDS = Object.freeze(DEFINITIONS.filter((definition) => definition.stage === 10).map((definition) => definition.id));

  function get(id) {
    return BY_ID[id] || null;
  }

  function definitionsForStage(stage) {
    return DEFINITIONS.filter((definition) => definition.stage === stage);
  }

  function hasHealingSource(context = {}) {
    return Number(context.regenPerSecond) > 0 || Boolean(context.hasLifesteal || context.hasDirectHealing);
  }

  function eligible(id, context = {}) {
    const definition = get(id);
    if (!definition) return false;
    const selectedIds = new Set(context.selectedIds || []);
    if (selectedIds.has(id)) return false;
    if (definition.requiresHealing && !hasHealingSource(context)) return false;
    if ((definition.incompatible || []).some((otherId) => selectedIds.has(otherId))) return false;
    return true;
  }

  function validateSelection(selectedIds = []) {
    const ids = [...selectedIds];
    const errors = [];
    if (ids.length > 2) errors.push("A run may own at most two temporary relics.");
    if (new Set(ids).size !== ids.length) errors.push("Temporary relic IDs must be unique.");
    for (const id of ids) {
      if (!get(id)) errors.push(`Unknown or retired temporary relic ID: ${id}`);
      if (OLD_IDS.includes(id)) errors.push(`Retired temporary relic ID is forbidden: ${id}`);
    }
    for (const id of ids) {
      const definition = get(id);
      if ((definition?.incompatible || []).some((otherId) => ids.includes(otherId))) {
        errors.push(`Incompatible temporary relic pair: ${id} + ${definition.incompatible.find((otherId) => ids.includes(otherId))}`);
      }
    }
    return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
  }

  function createRelicState(id) {
    switch (id) {
      case IDS.DOUBLE_DRAFT:
        return { bowBaseMultiplier: 0.68, rewardsCompleted: 0, extraPicksTaken: 0 };
      case IDS.ROYAL_BARGAIN:
        return { royalEpicPicks: 0, royalMaxHpPaid: 0, royalDebtEntries: [] };
      case IDS.BLIND_BARGAIN:
        return { blindOffers: 0 };
      case IDS.OUTLAWS_HOURGLASS:
        return { hourglassSuccessCount: 0, hourglassFailureCount: 0, hourglassMaxHpLost: 0, lastResult: null };
      case IDS.GOLDEN_OATH:
        return { oathIntact: true, oathBrokenAt: null, oathBreakingSource: "", baseStageGold: 0, oathStageGold: 0 };
      case IDS.GILDED_PYRE:
        return { burnedGoldTotal: 0, pyreProgressWithinMark: 0, pyreMarks: 0, legendaryMeterLocked: true, goldBankLocked: true };
      case IDS.BORROWED_HEART:
        return {
          heartStore: 0,
          heartHealingGenerated: 0,
          heartStoreLostToDamage: 0,
          heartConsumedThisStage: 0,
          heartMaxHpGainThisStage: 0,
          heartTotalMaxHpGain: 0,
          consumedEventIds: [],
        };
      case IDS.OUTLAWS_RESHUFFLE:
        return {
          sourceOrdinaryPickLedger: [],
          proposedReplacementLedger: [],
          committedReplacementLedger: [],
          recoveryOfferIds: [],
          recoverySelectedId: "",
          transactionStatus: "idle",
          deterministicRerollSeed: "",
        };
      case IDS.FIFTH_BELL:
        return {
          bellAutoshotIndex: 0,
          bellLedgerByTargetEpoch: {},
          bellRecordedHitCount: 0,
          bellRecordedDamage: 0,
          bellPaidDamage: 0,
          bellSkippedDamage: 0,
          bellSilenceRemaining: 0,
        };
      case IDS.LAST_LIFE:
        return { lastLifeWounds: 0, lastLifeHealingPrevented: 0, lastLifeStageRefills: 0 };
      case IDS.OVERFLOWING_HEART:
        return { overflowBarrier: 0, overflowHealingConverted: 0, recordedDamageReduction: 0, effectiveDamageReduction: 0 };
      case IDS.SHERIFFS_WAGER:
        return { warrants: 0, trialStageFlawless: true, trialDamageTaken: 0, stage15WarrantDamageMultiplier: 1, stage15WarrantRegeneration: 0 };
      case IDS.BROKEN_CROWN_OATH:
        return { brokenCrownSegmentIds: [], brokenCrownMarks: 0, armourDamageMultiplier: 0.65, playerDamageMultiplier: 1, regenerationBonus: 0 };
      default:
        return {};
    }
  }

  function legalPairs() {
    const result = [];
    for (const stage5Id of STAGE_5_IDS) {
      for (const stage10Id of STAGE_10_IDS) {
        if (validateSelection([stage5Id, stage10Id]).ok) result.push(Object.freeze([stage5Id, stage10Id]));
      }
    }
    return Object.freeze(result);
  }

  function absorbBorrowedHeartDamage(heartState, amount) {
    const incoming = Math.max(0, Number(amount) || 0);
    const stored = Math.max(0, Number(heartState?.heartStore) || 0);
    const absorbed = Math.min(stored, incoming);
    if (heartState && absorbed > 0) {
      heartState.heartStore = Math.max(0, stored - absorbed);
      heartState.heartStoreLostToDamage = Math.max(0, Number(heartState.heartStoreLostToDamage) || 0) + absorbed;
    }
    return Object.freeze({
      absorbed,
      healthDamage: Math.max(0, incoming - absorbed),
    });
  }

  function balancedReplacementChoice(candidates, useCounts = {}, random = Math.random) {
    if (!Array.isArray(candidates) || !candidates.length) return null;
    const lowestUseCount = Math.min(...candidates.map((candidate) => Math.max(0, Number(useCounts[candidate.id]) || 0)));
    const leastUsed = candidates.filter((candidate) => Math.max(0, Number(useCounts[candidate.id]) || 0) === lowestUseCount);
    const roll = Math.max(0, Math.min(0.999999999, Number(random()) || 0));
    const selected = leastUsed[Math.floor(roll * leastUsed.length)] || null;
    if (selected) useCounts[selected.id] = (Number(useCounts[selected.id]) || 0) + 1;
    return selected;
  }

  return Object.freeze({
    CATALOGUE_VERSION,
    IDS,
    OLD_IDS,
    DEFINITIONS,
    STAGE_5_IDS,
    STAGE_10_IDS,
    HOURGLASS_PAR_SECONDS,
    get,
    definitionsForStage,
    hasHealingSource,
    eligible,
    validateSelection,
    createRelicState,
    legalPairs,
    absorbBorrowedHeartDamage,
    balancedReplacementChoice,
  });
});
