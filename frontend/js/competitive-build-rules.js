(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodCompetitiveBuildRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "loothood-competitive-build-v0.1";
  const LEGENDARY_BASE_THRESHOLD = 325;
  const LEGENDARY_THRESHOLD_STEP = 250;
  const BASE_ARROW_DAMAGE_HUNDREDTHS = 2000;
  const BASE_MAX_HP_HUNDREDTHS = 10000;
  const BASE_MOVE_UNITS_PER_TICK = 40;
  const BASE_SHOT_COOLDOWN_TICKS = 43;
  const BASE_CRITICAL_CHANCE_BPS = 500;
  const BASE_CRITICAL_MULTIPLIER_BPS = 20000;
  const BASE_DAMAGE_REDUCTION_CAP_BPS = 6000;

  const FOUNDATION_DEFS = Object.freeze({
    steadyHand: Object.freeze({ damageBonusBps: 1200, moveSpeedBonusBps: 0, maximumHpBonusHundredths: 0 }),
    trailBoots: Object.freeze({ damageBonusBps: 0, moveSpeedBonusBps: 800, maximumHpBonusHundredths: 0 }),
    toughHide: Object.freeze({ damageBonusBps: 0, moveSpeedBonusBps: 0, maximumHpBonusHundredths: 1500 }),
  });

  const UPGRADE_DEFS = Object.freeze([
    Object.freeze({ id: "drawWeight", kind: "stat", stat: "damageBonusBps", values: Object.freeze([0, 1000, 2000, 4000]) }),
    Object.freeze({ id: "oakheart", kind: "stat", stat: "maximumHpBonusHundredths", values: Object.freeze([0, 1000, 2000, 4000]) }),
    Object.freeze({ id: "fieldDressing", kind: "stat", stat: "regenerationHundredthsPerSecond", values: Object.freeze([0, 50, 100, 150]) }),
    Object.freeze({ id: "fleetfoot", kind: "stat", stat: "moveSpeedBonusBps", values: Object.freeze([0, 500, 1000, 2000]) }),
    Object.freeze({ id: "quickNock", kind: "stat", stat: "arrowsPerSecondBonusBps", values: Object.freeze([0, 1000, 2000, 4000]) }),
    Object.freeze({ id: "eagleEye", kind: "stat", stat: "criticalChanceBonusBps", values: Object.freeze([0, 750, 1500, 3000]) }),
    Object.freeze({ id: "deadeye", kind: "stat", stat: "criticalDamageBonusBps", values: Object.freeze([0, 4000, 8000, 12000]) }),
    Object.freeze({ id: "leatherGuard", kind: "stat", stat: "damageReductionBps", values: Object.freeze([0, 1000, 1500, 2000]) }),
    Object.freeze({ id: "multishot", kind: "technique", status: "" }),
    Object.freeze({ id: "bodkinArrows", kind: "technique", status: "" }),
    Object.freeze({ id: "ricochet", kind: "technique", status: "" }),
    Object.freeze({ id: "venomTips", kind: "technique", status: "poison" }),
    Object.freeze({ id: "winterBinding", kind: "technique", status: "frost" }),
    Object.freeze({ id: "serratedHeads", kind: "technique", status: "bleed" }),
    Object.freeze({ id: "burstArrow", kind: "technique", status: "" }),
    Object.freeze({ id: "staggeringShot", kind: "technique", status: "" }),
  ]);
  const UPGRADE_BY_ID = Object.freeze(Object.fromEntries(UPGRADE_DEFS.map((definition) => [definition.id, definition])));

  const EVOLUTION_DEFS = Object.freeze([
    ["plagueVolley", ["venomTips", "multishot"]],
    ["contagion", ["venomTips", "ricochet"]],
    ["overdose", ["venomTips", "quickNock"]],
    ["whiteout", ["winterBinding", "burstArrow"]],
    ["glacialImpact", ["winterBinding", "staggeringShot"]],
    ["rimeguard", ["winterBinding", "leatherGuard"]],
    ["skewer", ["serratedHeads", "bodkinArrows"]],
    ["executioner", ["serratedHeads", "deadeye"]],
    ["bloodPact", ["serratedHeads", "oakheart"]],
    ["pinball", ["ricochet", "eagleEye"]],
    ["siegeArrow", ["drawWeight", "bodkinArrows"]],
    ["concussiveBlast", ["burstArrow", "staggeringShot"]],
    ["survivorsOath", ["oakheart", "fieldDressing"]],
  ].map(([id, ingredients]) => Object.freeze({ id, ingredients: Object.freeze(ingredients) })));
  const EVOLUTION_BY_ID = Object.freeze(Object.fromEntries(EVOLUTION_DEFS.map((definition) => [definition.id, definition])));

  function fail(code, detail) {
    const error = new Error(detail || code);
    error.code = code;
    throw error;
  }

  function invariant(condition, code, detail) {
    if (!condition) fail(code, detail);
  }

  function clone(value) {
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(clone);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  }

  function createBuild(foundationId) {
    const foundation = FOUNDATION_DEFS[foundationId];
    invariant(Boolean(foundation), "BAD_FOUNDATION");
    return {
      version: VERSION,
      foundationId,
      stats: {
        damageBonusBps: foundation.damageBonusBps,
        maximumHpBonusHundredths: foundation.maximumHpBonusHundredths,
        regenerationHundredthsPerSecond: 0,
        moveSpeedBonusBps: foundation.moveSpeedBonusBps,
        arrowsPerSecondBonusBps: 0,
        criticalChanceBonusBps: 0,
        criticalDamageBonusBps: 0,
        damageReductionBps: 0,
      },
      techniques: {},
      statusPath: "",
      evolutions: {},
      ordinaryPickLedger: [],
      legendaryMeter: 0,
      legendaryPicks: 0,
    };
  }

  function rollRank(stage, prng) {
    invariant(Number.isSafeInteger(stage) && stage >= 1 && stage <= 14, "BAD_UPGRADE_STAGE");
    const roll = prng.range(10000);
    if (stage >= 11) return roll < 3500 ? 1 : roll < 8000 ? 2 : 3;
    if (stage >= 6) return roll < 5200 ? 1 : roll < 9000 ? 2 : 3;
    return roll < 7000 ? 1 : roll < 9700 ? 2 : 3;
  }

  function hasIngredient(build, id) {
    const definition = UPGRADE_BY_ID[id];
    if (!definition) return false;
    return definition.kind === "stat"
      ? build.ordinaryPickLedger.some((pick) => pick.id === id)
      : Number(build.techniques[id] || 0) > 0;
  }

  function evolutionEligible(build, definition) {
    return !build.evolutions[definition.id] && definition.ingredients.every((id) => hasIngredient(build, id));
  }

  function upgradeEligible(build, definition) {
    if (definition.kind === "technique" && Number(build.techniques[definition.id] || 0) >= 3) return false;
    if (definition.status && build.statusPath && definition.status !== build.statusPath) return false;
    if (definition.stat === "damageReductionBps" && build.stats.damageReductionBps >= BASE_DAMAGE_REDUCTION_CAP_BPS) return false;
    return true;
  }

  function chooseIndex(prng, length) {
    invariant(Number.isSafeInteger(length) && length > 0, "EMPTY_CHOICE_POOL");
    return prng.range(length);
  }

  function generateOffer(build, stage, prng, options = {}) {
    invariant(build?.version === VERSION, "BAD_BUILD");
    invariant(prng && typeof prng.range === "function", "BAD_REWARD_PRNG");
    const count = options.count ?? 3;
    const excludedIds = new Set(options.excludeIds || []);
    invariant([...excludedIds].every((id) => Boolean(UPGRADE_BY_ID[id] || EVOLUTION_BY_ID[id])), "BAD_EXCLUDED_UPGRADE");
    invariant(Number.isSafeInteger(count) && count >= 1 && count <= 3, "BAD_OFFER_COUNT");
    const offer = [];
    const used = new Set();
    const threshold = LEGENDARY_BASE_THRESHOLD + build.legendaryPicks * LEGENDARY_THRESHOLD_STEP;
    const evolutions = EVOLUTION_DEFS.filter((definition) => evolutionEligible(build, definition) && !excludedIds.has(definition.id));
    if (options.allowEvolution !== false && build.legendaryMeter >= threshold && evolutions.length) {
      const definition = evolutions[chooseIndex(prng, evolutions.length)];
      offer.push({ kind: "evolution", id: definition.id, rank: 4, valueMultiplierBps: 10000 });
      used.add(definition.id);
    }

    while (offer.length < count) {
      const candidates = UPGRADE_DEFS.filter((definition) => upgradeEligible(build, definition)
        && !used.has(definition.id) && !excludedIds.has(definition.id));
      if (!candidates.length) break;
      const nonStatusAlready = offer.some((choice) => UPGRADE_BY_ID[choice.id]?.status);
      const legal = nonStatusAlready && !build.statusPath
        ? candidates.filter((definition) => !definition.status)
        : candidates;
      const definition = legal[chooseIndex(prng, legal.length)];
      used.add(definition.id);
      const currentRank = Number(build.techniques[definition.id] || 0);
      const rank = definition.kind === "technique"
        ? Math.min(3, Math.max(rollRank(stage, prng), currentRank + 1))
        : rollRank(stage, prng);
      offer.push({ kind: definition.kind, id: definition.id, rank, valueMultiplierBps: 10000 });
    }
    invariant(offer.length >= 1, "EMPTY_UPGRADE_OFFER");
    return offer;
  }

  function applyChoice(build, choice, stage) {
    invariant(build?.version === VERSION, "BAD_BUILD");
    invariant(choice && typeof choice.id === "string", "BAD_UPGRADE_CHOICE");
    if (choice.kind === "evolution") {
      const evolution = EVOLUTION_BY_ID[choice.id];
      invariant(Boolean(evolution) && evolutionEligible(build, evolution), "INELIGIBLE_EVOLUTION");
      const threshold = LEGENDARY_BASE_THRESHOLD + build.legendaryPicks * LEGENDARY_THRESHOLD_STEP;
      invariant(build.legendaryMeter >= threshold, "LEGENDARY_METER_NOT_FULL");
      build.evolutions[choice.id] = true;
      build.legendaryMeter -= threshold;
      build.legendaryPicks += 1;
      return true;
    }

    const definition = UPGRADE_BY_ID[choice.id];
    invariant(Boolean(definition) && definition.kind === choice.kind, "BAD_UPGRADE_CHOICE");
    invariant(upgradeEligible(build, definition), "INELIGIBLE_UPGRADE");
    invariant(Number.isSafeInteger(choice.rank) && choice.rank >= 1 && choice.rank <= 3, "BAD_UPGRADE_RANK");
    const multiplierBps = choice.valueMultiplierBps || 10000;
    invariant(Number.isSafeInteger(multiplierBps) && multiplierBps >= 10000 && multiplierBps <= 30000, "BAD_VALUE_MULTIPLIER");
    if (definition.kind === "stat") {
      let amount = Math.floor(definition.values[choice.rank] * multiplierBps / 10000);
      if (definition.stat === "damageReductionBps") {
        amount = Math.min(amount, Math.max(0, BASE_DAMAGE_REDUCTION_CAP_BPS - build.stats.damageReductionBps));
      }
      invariant(amount > 0, "ZERO_REALIZED_GAIN");
      build.stats[definition.stat] += amount;
      build.ordinaryPickLedger.push({ stage, kind: "stat", id: definition.id, rank: choice.rank, amount, valueMultiplierBps: multiplierBps });
      return true;
    }
    const currentRank = Number(build.techniques[definition.id] || 0);
    invariant(choice.rank > currentRank, "TECHNIQUE_NOT_AN_UPGRADE");
    build.techniques[definition.id] = choice.rank;
    if (definition.status && !build.statusPath) build.statusPath = definition.status;
    build.ordinaryPickLedger.push({ stage, kind: "technique", id: definition.id, rank: choice.rank, amount: 0, valueMultiplierBps: multiplierBps });
    return true;
  }

  function applyOfferedChoices(build, offer, choiceIds, stage) {
    invariant(Array.isArray(offer) && offer.length >= 1 && offer.length <= 3, "BAD_OFFER");
    invariant(Array.isArray(choiceIds) && choiceIds.length === 1, "BAD_PICK_COUNT");
    const choice = offer.find((candidate) => candidate.id === choiceIds[0]);
    invariant(Boolean(choice), "CHOICE_NOT_OFFERED");
    return applyChoice(build, choice, stage);
  }

  function addLegendaryMeter(build, gold) {
    invariant(build?.version === VERSION, "BAD_BUILD");
    invariant(Number.isSafeInteger(gold) && gold >= 0, "BAD_GOLD");
    build.legendaryMeter += gold;
  }

  function reshuffleStatGain(definition, rank, stats, excludeIds) {
    if (excludeIds.has(definition.id)) return 0;
    let amount = definition.values[rank] || 0;
    if (definition.stat === "damageReductionBps") {
      amount = Math.min(amount, Math.max(0, BASE_DAMAGE_REDUCTION_CAP_BPS - stats.damageReductionBps));
    }
    return Math.max(0, amount);
  }

  function balancedReshuffleChoice(candidates, useCounts, prng) {
    invariant(candidates.length > 0, "EMPTY_RESHUFFLE_POOL");
    const leastUsed = Math.min(...candidates.map((candidate) => Number(useCounts[candidate.id] || 0)));
    const pool = candidates.filter((candidate) => Number(useCounts[candidate.id] || 0) === leastUsed);
    const selected = pool[prng.range(pool.length)];
    useCounts[selected.id] = Number(useCounts[selected.id] || 0) + 1;
    return selected;
  }

  function planReshuffle(build, prng, options = {}) {
    invariant(build?.version === VERSION, "BAD_BUILD");
    invariant(prng && typeof prng.range === "function", "BAD_REWARD_PRNG");
    const excludeIds = new Set(options.excludeIds || []);
    const simulation = createBuild(build.foundationId);
    simulation.statusPath = build.statusPath;
    const useCounts = {};
    const replacements = [];
    for (const source of build.ordinaryPickLedger) {
      const sourceDefinition = UPGRADE_BY_ID[source.id];
      invariant(Boolean(sourceDefinition), "BAD_RESHUFFLE_SOURCE");
      const rank = Math.min(3, Math.max(1, Number(source.rank) + 1));
      let definition = null;
      if (sourceDefinition.status && sourceDefinition.status === build.statusPath
        && Number(simulation.techniques[sourceDefinition.id] || 0) < rank) {
        definition = sourceDefinition;
        useCounts[definition.id] = Number(useCounts[definition.id] || 0) + 1;
      } else if (sourceDefinition.kind === "technique") {
        const candidates = UPGRADE_DEFS.filter((candidate) => candidate.kind === "technique"
          && !candidate.status && candidate.id !== source.id && !excludeIds.has(candidate.id)
          && Number(simulation.techniques[candidate.id] || 0) < rank);
        if (candidates.length) definition = balancedReshuffleChoice(candidates, useCounts, prng);
      }
      if (!definition) {
        const candidates = UPGRADE_DEFS.filter((candidate) => candidate.kind === "stat"
          && candidate.id !== source.id
          && reshuffleStatGain(candidate, rank, simulation.stats, excludeIds) > 0);
        definition = balancedReshuffleChoice(candidates, useCounts, prng);
      }
      const choice = { kind: definition.kind, id: definition.id, rank, valueMultiplierBps: 10000 };
      applyChoice(simulation, choice, 10);
      replacements.push({ source: clone(source), replacement: clone(choice) });
    }

    const recoveryCandidates = UPGRADE_DEFS.filter((definition) => {
      if (definition.kind === "stat") return reshuffleStatGain(definition, 1, simulation.stats, excludeIds) > 0;
      if (excludeIds.has(definition.id)) return false;
      if (definition.status && build.statusPath && definition.status !== build.statusPath) return false;
      return Number(simulation.techniques[definition.id] || 0) < 1;
    });
    const recoveryOffer = [];
    const pool = [...recoveryCandidates];
    while (recoveryOffer.length < 3 && pool.length) {
      const [definition] = pool.splice(prng.range(pool.length), 1);
      recoveryOffer.push({ kind: definition.kind, id: definition.id, rank: 1, valueMultiplierBps: 10000 });
    }
    invariant(recoveryOffer.length === 3, "INSUFFICIENT_RESHUFFLE_RECOVERY");
    return {
      sourceLedger: clone(build.ordinaryPickLedger),
      replacements,
      recoveryOffer,
      preservedStatusPath: build.statusPath,
      preservedEvolutionIds: Object.keys(build.evolutions).sort(),
    };
  }

  function commitReshuffle(build, plan, recoveryId) {
    invariant(build?.version === VERSION && plan && Array.isArray(plan.replacements), "BAD_RESHUFFLE_PLAN");
    const recovery = plan.recoveryOffer.find((choice) => choice.id === recoveryId);
    invariant(Boolean(recovery), "RESHUFFLE_RECOVERY_NOT_OFFERED");
    const replacement = createBuild(build.foundationId);
    replacement.legendaryMeter = build.legendaryMeter;
    replacement.legendaryPicks = build.legendaryPicks;
    for (const entry of plan.replacements) applyChoice(replacement, entry.replacement, 10);
    applyChoice(replacement, recovery, 10);
    replacement.statusPath = plan.preservedStatusPath;
    replacement.evolutions = clone(build.evolutions);
    replacement.ordinaryPickLedger = replacement.ordinaryPickLedger.map((entry, order) => ({
      ...entry,
      order,
      source: order < plan.replacements.length ? "reshuffle" : "reshuffleRecovery",
    }));
    return replacement;
  }

  function combatStats(build) {
    invariant(build?.version === VERSION, "BAD_BUILD");
    const damage = Math.floor(BASE_ARROW_DAMAGE_HUNDREDTHS * (10000 + build.stats.damageBonusBps) / 10000);
    const maximumHp = BASE_MAX_HP_HUNDREDTHS + build.stats.maximumHpBonusHundredths;
    const move = Math.floor(BASE_MOVE_UNITS_PER_TICK * (10000 + build.stats.moveSpeedBonusBps) / 10000);
    const cooldown = Math.max(1, Math.round(BASE_SHOT_COOLDOWN_TICKS * 10000 / (10000 + build.stats.arrowsPerSecondBonusBps)));
    return {
      maximumHpHundredths: maximumHp,
      arrowDamageHundredths: damage,
      moveUnitsPerTick: move,
      shotCooldownTicks: cooldown,
      criticalChanceBps: BASE_CRITICAL_CHANCE_BPS + build.stats.criticalChanceBonusBps,
      criticalMultiplierBps: BASE_CRITICAL_MULTIPLIER_BPS + build.stats.criticalDamageBonusBps,
      regenerationHundredthsPerSecond: build.stats.regenerationHundredthsPerSecond,
      damageReductionBps: Math.min(BASE_DAMAGE_REDUCTION_CAP_BPS, build.stats.damageReductionBps),
      techniques: clone(build.techniques),
      statusPath: build.statusPath,
      evolutions: clone(build.evolutions),
    };
  }

  return Object.freeze({
    VERSION,
    LEGENDARY_BASE_THRESHOLD,
    LEGENDARY_THRESHOLD_STEP,
    BASE_DAMAGE_REDUCTION_CAP_BPS,
    FOUNDATION_DEFS,
    UPGRADE_DEFS,
    UPGRADE_BY_ID,
    EVOLUTION_DEFS,
    EVOLUTION_BY_ID,
    createBuild,
    rollRank,
    hasIngredient,
    evolutionEligible,
    upgradeEligible,
    generateOffer,
    applyChoice,
    applyOfferedChoices,
    addLegendaryMeter,
    planReshuffle,
    commitReshuffle,
    combatStats,
    clone,
  });
});
