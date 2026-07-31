(function (root, factory) {
  "use strict";

  const legendaryCatalogue = typeof module === "object" && module.exports
    ? require("./equipment-legendary-v5.js")
    : root?.LoothoodEquipmentLegendaryV5;
  const release = typeof module === "object" && module.exports
    ? require("./equipment-release.js")
    : root?.LoothoodEquipmentRelease;
  const api = factory(legendaryCatalogue, release);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodEquipment = api;
})(typeof window !== "undefined" ? window : globalThis, function (legendaryCatalogue, release) {
  "use strict";

  if (!release) throw new Error("Equipment release availability registry failed to load");

  const CURRENT_SCHEMA_VERSION = 3;
  const CURRENT_GENERATOR_VERSION = 3;
  const PREVIOUS_SCHEMA_VERSION = 2;
  const PREVIOUS_GENERATOR_VERSION = 2;
  const LEGACY_VERSION = 1;
  const BAND_PROFILE_VERSION = "rising-floor-v1";
  const STAT_BASE_CHANCE = 1 / 8;
  const MAX_REROLL_HISTORY = 1000;
  const VALUE_STEP_WEIGHTS = Object.freeze([1, 4, 6, 4, 1]);
  const QUALITY_FLOORS = Object.freeze({
    common: 50,
    uncommon: 25,
    rare: 50,
    epic: 75,
    legendary: 75,
  });

  const slots = Object.freeze([
    { id: "bowstring", label: "Bowstring" },
    { id: "helmet", label: "Helmet" },
    { id: "chest", label: "Chest" },
    { id: "boots", label: "Boots" },
    { id: "legs", label: "Legs" },
  ]);

  const rarities = Object.freeze([
    { id: "common", label: "Common", affixCount: 1 },
    { id: "uncommon", label: "Uncommon", affixCount: 2 },
    { id: "rare", label: "Rare", affixCount: 3 },
    { id: "epic", label: "Epic", affixCount: 4 },
    { id: "legendary", label: "Legendary", affixCount: 4 },
  ]);

  function freezeBands(uncommon, rare, epic) {
    return Object.freeze({
      common: Object.freeze([...rare]),
      uncommon: Object.freeze(uncommon),
      rare: Object.freeze(rare),
      epic: Object.freeze(epic),
      legendary: Object.freeze([...epic]),
    });
  }

  const stats = Object.freeze([
    {
      id: "maxHp", label: "Maximum HP", legacyValue: 10, value: 10,
      values: Object.freeze([6, 8, 10, 12, 14]),
      v3Bands: freezeBands([5, 9, 13, 16, 20], [10, 13, 15, 18, 20], [15, 16, 18, 19, 20]),
      format: "flat",
    },
    {
      id: "regen", label: "HP regeneration", legacyValue: 0.1, value: 0.1,
      values: Object.freeze([0.06, 0.08, 0.1, 0.12, 0.14]),
      v3Bands: freezeBands([0.05, 0.09, 0.13, 0.16, 0.2], [0.1, 0.13, 0.15, 0.18, 0.2], [0.15, 0.16, 0.18, 0.19, 0.2]),
      format: "regen",
    },
    {
      id: "moveSpeed", label: "Move speed", legacyValue: 0.03, value: 0.03,
      values: Object.freeze([0.01, 0.02, 0.03, 0.04, 0.05]),
      v3Bands: freezeBands([0.02, 0.035, 0.05, 0.065, 0.08], [0.04, 0.05, 0.06, 0.07, 0.08], [0.06, 0.065, 0.07, 0.075, 0.08]),
      format: "percent",
    },
    {
      id: "damage", label: "Damage", legacyValue: 0.04, value: 0.04,
      values: Object.freeze([0.02, 0.03, 0.04, 0.05, 0.06]),
      v3Bands: freezeBands([0.025, 0.045, 0.065, 0.08, 0.1], [0.05, 0.065, 0.075, 0.09, 0.1], [0.075, 0.08, 0.085, 0.095, 0.1]),
      format: "percent",
    },
    {
      id: "aps", label: "Arrows per second", legacyValue: 0.04, value: 0.04,
      values: Object.freeze([0.02, 0.03, 0.04, 0.05, 0.06]),
      v3Bands: freezeBands([0.025, 0.045, 0.065, 0.08, 0.1], [0.05, 0.065, 0.075, 0.09, 0.1], [0.075, 0.08, 0.085, 0.095, 0.1]),
      format: "percent",
    },
    {
      id: "critChance", label: "Critical chance", legacyValue: 0.03, value: 0.03,
      values: Object.freeze([0.01, 0.02, 0.03, 0.04, 0.05]),
      v3Bands: freezeBands([0.02, 0.035, 0.05, 0.065, 0.08], [0.04, 0.05, 0.06, 0.07, 0.08], [0.06, 0.065, 0.07, 0.075, 0.08]),
      format: "points",
    },
    {
      id: "critDamage", label: "Critical damage", legacyValue: 0.1, value: 0.1,
      values: Object.freeze([0.06, 0.08, 0.1, 0.12, 0.14]),
      v3Bands: freezeBands([0.05, 0.09, 0.13, 0.16, 0.2], [0.1, 0.13, 0.15, 0.18, 0.2], [0.15, 0.16, 0.18, 0.19, 0.2]),
      format: "percent",
    },
    {
      id: "damageReduction", label: "Damage reduction", legacyValue: 0.03, value: 0.03,
      values: Object.freeze([0.01, 0.02, 0.03, 0.04, 0.05]),
      v3Bands: freezeBands([0.02, 0.035, 0.05, 0.065, 0.08], [0.04, 0.05, 0.06, 0.07, 0.08], [0.06, 0.065, 0.07, 0.075, 0.08]),
      format: "points",
    },
  ]);

  const legendaryEffects = Object.freeze([
    {
      id: "elementalInitiation",
      displayName: "Elemental Initiation",
      itemName: "Outlaw's Bowstring",
      description: "Your first Run Upgrade offers Uncommon Bleed, Poison, and Frost.",
      primaryDescription: "Your first Run Upgrade offers Uncommon Bleed, Poison, and Frost.",
      compatibleSlots: Object.freeze(["bowstring"]),
      implemented: true,
      enabled: true,
      handlerVersion: 1,
    },
    ...((legendaryCatalogue?.effects || []).map((effect) => Object.freeze({
      ...effect,
      compatibleSlots: Object.freeze([...(effect.compatibleSlots || [])]),
      incompatibilities: Object.freeze([...(effect.incompatibilities || [])]),
    }))),
  ]);

  const blueprints = Object.freeze([
    {
      id: "outlawsBowstring",
      itemName: "Outlaw's Bowstring",
      slot: "bowstring",
      rarity: "legendary",
      legendaryEffectId: "elementalInitiation",
    },
  ]);

  const slotById = new Map(slots.map((entry) => [entry.id, entry]));
  const rarityById = new Map(rarities.map((entry) => [entry.id, entry]));
  const statById = new Map(stats.map((entry) => [entry.id, entry]));
  const effectById = new Map(legendaryEffects.map((entry) => [entry.id, entry]));
  const blueprintById = new Map(blueprints.map((entry) => [entry.id, entry]));

  function hashString(value) {
    let hash = 0x811c9dc5;
    for (const character of String(value)) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  function hashHex(value) {
    const normal = hashString(value).toString(16).padStart(8, "0");
    const reversed = hashString([...String(value)].reverse().join("")).toString(16).padStart(8, "0");
    return `${normal}${reversed}`;
  }

  function createRng(seed, lane, generatorVersion = CURRENT_GENERATOR_VERSION) {
    let state = hashString(`loothood-equipment-v${generatorVersion}:${lane}:${seed}`);
    return function random() {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function choose(values, random) {
    if (!values.length) throw new Error("Cannot choose from an empty equipment pool");
    return values[Math.min(values.length - 1, Math.floor(random() * values.length))];
  }

  function normalizeSource(source) {
    const normalized = { type: String(source?.type || "generated") };
    if (source?.runId !== undefined && source?.runId !== null && String(source.runId)) {
      normalized.runId = String(source.runId);
    }
    const provenanceFields = [
      "issuanceId",
      "tier",
      "poolId",
      "poolVersion",
      "bannerId",
      "bannerVersion",
      "manifestHash",
      "recipeId",
      "salvageTier",
    ];
    for (const field of provenanceFields) {
      if (source?.[field] !== undefined && source?.[field] !== null && String(source[field])) {
        normalized[field] = String(source[field]);
      }
    }
    if (Number.isInteger(source?.drawIndex) && source.drawIndex >= 0) {
      normalized.drawIndex = source.drawIndex;
    }
    if (source?.accountBound !== undefined) normalized.accountBound = Boolean(source.accountBound);
    if (source?.marketplaceEligible !== undefined) {
      normalized.marketplaceEligible = Boolean(source.marketplaceEligible);
    }
    return normalized;
  }

  function validateSourceProvenance(item, errors) {
    const source = normalizeSource(item.source);
    const requiredText = (field) => {
      if (!source[field]) errors.push(`${source.type} equipment requires ${field}.`);
    };
    const requiredFlag = (field, value) => {
      if (source[field] !== value) errors.push(`${source.type} equipment requires ${field}=${value}.`);
    };

    if (source.type === "gacha_standard") {
      requiredText("issuanceId");
      requiredText("poolId");
      requiredText("poolVersion");
      requiredText("manifestHash");
      requiredText("salvageTier");
      if (source.tier !== "standard") errors.push("Standard Gacha equipment requires tier=standard.");
      requiredFlag("accountBound", false);
      requiredFlag("marketplaceEligible", true);
    } else if (source.type === "gacha_premium") {
      requiredText("issuanceId");
      requiredText("bannerId");
      requiredText("bannerVersion");
      requiredText("manifestHash");
      requiredText("salvageTier");
      if (source.tier !== "premium") errors.push("Premium Gacha equipment requires tier=premium.");
      requiredFlag("accountBound", false);
      requiredFlag("marketplaceEligible", true);
    } else if (source.type === "scrap_craft") {
      requiredText("issuanceId");
      requiredText("recipeId");
      requiredText("manifestHash");
      requiredFlag("accountBound", true);
      requiredFlag("marketplaceEligible", false);
    }
  }

  function probabilityMap(rollCounts = {}) {
    const normalizedCounts = Object.fromEntries(stats.map((stat) => {
      const count = Number(rollCounts[stat.id] || 0);
      if (!Number.isInteger(count) || count < 0) throw new Error(`Invalid roll count for ${stat.id}`);
      return [stat.id, count];
    }));
    const seen = stats.filter((stat) => normalizedCounts[stat.id] > 0);
    const unseen = stats.filter((stat) => normalizedCounts[stat.id] === 0);
    if (!seen.length) return Object.fromEntries(stats.map((stat) => [stat.id, STAT_BASE_CHANCE]));

    const probabilities = {};
    let seenProbability = 0;
    for (const stat of seen) {
      const probability = STAT_BASE_CHANCE ** (normalizedCounts[stat.id] + 1);
      probabilities[stat.id] = probability;
      seenProbability += probability;
    }

    if (!unseen.length) {
      const total = seen.reduce((sum, stat) => sum + probabilities[stat.id], 0);
      return Object.fromEntries(seen.map((stat) => [stat.id, probabilities[stat.id] / total]));
    }

    const unseenProbability = (1 - seenProbability) / unseen.length;
    for (const stat of unseen) probabilities[stat.id] = unseenProbability;
    return Object.fromEntries(stats.map((stat) => [stat.id, probabilities[stat.id]]));
  }

  function chooseWeightedStat(probabilities, random, excludedStatId = "") {
    const eligible = stats.filter((stat) => stat.id !== excludedStatId);
    const total = eligible.reduce((sum, stat) => sum + (probabilities[stat.id] || 0), 0);
    if (total <= 0) throw new Error("No weighted equipment stat is available");
    const roll = random() * total;
    let cumulative = 0;
    for (const stat of eligible) {
      cumulative += probabilities[stat.id] || 0;
      if (roll < cumulative) return stat;
    }
    return eligible[eligible.length - 1];
  }

  function chooseStat(rollCounts, random) {
    return chooseWeightedStat(probabilityMap(rollCounts), random);
  }

  function valuesFor(stat, rarity, generatorVersion) {
    if (!stat) return [];
    if (generatorVersion === CURRENT_GENERATOR_VERSION) return stat.v3Bands?.[rarity] || [];
    return stat.values || [];
  }

  function rollStepForValue(stat, value, rarity = "", generatorVersion = PREVIOUS_GENERATOR_VERSION) {
    const index = valuesFor(stat, rarity, generatorVersion).findIndex((candidate) => candidate === value);
    return index >= 0 ? index + 1 : 0;
  }

  function chooseWeightedStep(random, excludedStep = 0) {
    const eligible = VALUE_STEP_WEIGHTS
      .map((weight, index) => ({ step: index + 1, weight }))
      .filter((entry) => entry.step !== excludedStep);
    const total = eligible.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = random() * total;
    for (const entry of eligible) {
      roll -= entry.weight;
      if (roll < 0) return entry.step;
    }
    return eligible[eligible.length - 1].step;
  }

  function qualityForStep(rarity, rollStep) {
    const floor = QUALITY_FLOORS[rarity];
    if (!Number.isFinite(floor) || rollStep < 1 || rollStep > 5) return 0;
    return floor + ((100 - floor) * (rollStep - 1)) / 4;
  }

  function rollBandValue(stat, rarity, random, generatorVersion, excludedValue) {
    const values = valuesFor(stat, rarity, generatorVersion);
    if (generatorVersion === CURRENT_GENERATOR_VERSION) {
      const excludedStep = excludedValue === undefined
        ? 0
        : rollStepForValue(stat, excludedValue, rarity, generatorVersion);
      const rollStep = chooseWeightedStep(random, excludedStep);
      return {
        value: values[rollStep - 1],
        rollStep,
        quality: qualityForStep(rarity, rollStep),
        lowerBound: values[0],
        upperBound: values[values.length - 1],
        bandProfileVersion: BAND_PROFILE_VERSION,
      };
    }
    const eligible = values.filter((value) => value !== excludedValue);
    const value = choose(eligible, random);
    return { value, rollStep: rollStepForValue(stat, value, rarity, generatorVersion) };
  }

  function rollInitialAffixes(seed, count, generatorVersion, rarity) {
    const rollCounts = Object.fromEntries(stats.map((stat) => [stat.id, 0]));
    const affixes = [];
    if (generatorVersion === LEGACY_VERSION) {
      const random = createRng(seed, "affixes", LEGACY_VERSION);
      for (let rollIndex = 0; rollIndex < count; rollIndex += 1) {
        const stat = chooseStat(rollCounts, random);
        affixes.push({ rollIndex, statId: stat.id, value: stat.legacyValue });
        rollCounts[stat.id] += 1;
      }
      return affixes;
    }

    const statRandom = createRng(seed, "affix-stats", generatorVersion);
    const valueRandom = createRng(seed, "affix-values", generatorVersion);
    for (let rollIndex = 0; rollIndex < count; rollIndex += 1) {
      const stat = chooseStat(rollCounts, statRandom);
      const duplicateCountBefore = rollCounts[stat.id];
      const bandRoll = rollBandValue(stat, rarity, valueRandom, generatorVersion);
      affixes.push({
        rollIndex,
        statId: stat.id,
        value: bandRoll.value,
        rollStep: bandRoll.rollStep,
        ...(generatorVersion === CURRENT_GENERATOR_VERSION ? {
          quality: bandRoll.quality,
          lowerBound: bandRoll.lowerBound,
          upperBound: bandRoll.upperBound,
          bandProfileVersion: bandRoll.bandProfileVersion,
          duplicateCountBefore,
        } : {}),
      });
      rollCounts[stat.id] += 1;
    }
    return affixes;
  }

  function eligibleEffects(slotId, allowedEffectIds = null) {
    const allowed = Array.isArray(allowedEffectIds) ? new Set(allowedEffectIds) : null;
    return legendaryEffects.filter((effect) => (
      effect.implemented
      && effect.compatibleSlots.includes(slotId)
      && (!allowed || allowed.has(effect.id))
    ));
  }

  function resolveGeneration(options, generatorVersion) {
    const source = normalizeSource(options.source);
    let blueprintId = options.blueprintId ? String(options.blueprintId) : null;
    if (source.type === "p0_first_clear") blueprintId = "outlawsBowstring";
    const blueprint = blueprintId ? blueprintById.get(blueprintId) : null;
    if (blueprintId && !blueprint) throw new Error(`Unknown equipment blueprint: ${blueprintId}`);

    const slot = String(blueprint?.slot || options.slot || "");
    const rarity = String(blueprint?.rarity || options.rarity || "");
    if (!slotById.has(slot)) throw new Error(`Unknown or missing equipment slot: ${slot}`);
    if (!rarityById.has(rarity)) throw new Error(`Unknown or missing equipment rarity: ${rarity}`);
    if (generatorVersion === LEGACY_VERSION && rarity === "common") {
      throw new Error("Common equipment is not supported by generator v1");
    }

    let legendaryEffectId = null;
    let legendaryEffectSelection = null;
    const publicIssuance = ["gacha_standard", "gacha_premium", "scrap_craft"].includes(source.type);
    const allowedLegendaryEffectIds = Array.isArray(options.allowedLegendaryEffectIds)
      ? [...new Set(options.allowedLegendaryEffectIds.map(String))]
      : null;
    if (rarity === "legendary" && publicIssuance && !options.replay && !allowedLegendaryEffectIds?.length) {
      throw new Error(`${source.type} Legendary generation requires an explicit release allow-list`);
    }
    if (rarity === "legendary") {
      if (blueprint?.legendaryEffectId) {
        legendaryEffectId = blueprint.legendaryEffectId;
        legendaryEffectSelection = "blueprint";
      } else if (options.legendaryEffectId) {
        const requested = effectById.get(String(options.legendaryEffectId));
        if (!requested || !requested.implemented || !requested.compatibleSlots.includes(slot)) {
          throw new Error(`Legendary effect is not implemented for ${slot}: ${options.legendaryEffectId}`);
        }
        if (allowedLegendaryEffectIds && !allowedLegendaryEffectIds.includes(requested.id)) {
          throw new Error(`Legendary effect is not allowed for this issuance: ${requested.id}`);
        }
        legendaryEffectId = requested.id;
        legendaryEffectSelection = `requested:${requested.id}`;
      } else {
        const effects = eligibleEffects(slot, allowedLegendaryEffectIds);
        if (!effects.length) throw new Error(`No implemented Legendary effect is available for ${slot}`);
        legendaryEffectId = choose(effects, createRng(options.seed, "legendary-effect", generatorVersion)).id;
        legendaryEffectSelection = "random";
      }
    }

    return { source, blueprintId, slot, rarity, legendaryEffectId, legendaryEffectSelection };
  }

  function normalizedRerolls(rerolls) {
    return Array.isArray(rerolls)
      ? rerolls.map((operation) => ({
        type: operation?.type,
        affixIndex: operation?.affixIndex,
        seed: operation?.seed,
      }))
      : [];
  }

  function canonicalManifest(item) {
    const base = {
      schemaVersion: item.schemaVersion,
      generatorVersion: item.generatorVersion,
      seed: item.seed,
      source: normalizeSource(item.source),
      blueprintId: item.blueprintId || null,
      slot: item.slot,
      rarity: item.rarity,
      legendaryEffectId: item.legendaryEffectId || null,
    };
    if (item.generatorVersion === LEGACY_VERSION) {
      base.affixes = Array.isArray(item.affixes)
        ? item.affixes.map((affix) => ({ rollIndex: affix.rollIndex, statId: affix.statId, value: affix.value }))
        : [];
      return base;
    }
    return {
      ...base,
      originGeneratorVersion: item.originGeneratorVersion,
      ...(item.generatorVersion === CURRENT_GENERATOR_VERSION ? {
        legendaryHandlerVersion: item.legendaryHandlerVersion || null,
        legendaryEffectSelection: item.legendaryEffectSelection || null,
        originRevision: item.originRevision || 0,
        originRerolls: normalizedRerolls(item.originRerolls),
      } : {}),
      bandProfileVersion: item.bandProfileVersion,
      revision: item.revision,
      rerolls: normalizedRerolls(item.rerolls),
      affixes: Array.isArray(item.affixes)
        ? item.affixes.map((affix) => ({
          rollIndex: affix.rollIndex,
          statId: affix.statId,
          value: affix.value,
          rollStep: affix.rollStep,
          ...(item.generatorVersion === CURRENT_GENERATOR_VERSION ? {
            quality: affix.quality,
            lowerBound: affix.lowerBound,
            upperBound: affix.upperBound,
            bandProfileVersion: affix.bandProfileVersion,
            duplicateCountBefore: affix.duplicateCountBefore,
          } : {}),
        }))
        : [],
    };
  }

  function deriveItemId(item) {
    const generatorVersion = Number(item?.generatorVersion) || CURRENT_GENERATOR_VERSION;
    return `hb-equipment-v${generatorVersion}-${hashHex(JSON.stringify(canonicalManifest(item)))}`;
  }

  function generateEquipment(options = {}) {
    const seed = String(options.seed || "");
    if (!seed) throw new Error("Equipment generation requires a non-empty seed");
    const generatorVersion = Number(options.generatorVersion || CURRENT_GENERATOR_VERSION);
    if (![LEGACY_VERSION, PREVIOUS_GENERATOR_VERSION, CURRENT_GENERATOR_VERSION].includes(generatorVersion)) {
      throw new Error(`Unsupported equipment generator version: ${generatorVersion}`);
    }
    const resolved = resolveGeneration({ ...options, seed }, generatorVersion);
    const rarity = rarityById.get(resolved.rarity);
    const effect = effectById.get(resolved.legendaryEffectId);
    const item = {
      schemaVersion: generatorVersion,
      generatorVersion,
      itemId: "",
      seed,
      source: resolved.source,
      blueprintId: resolved.blueprintId,
      slot: resolved.slot,
      rarity: resolved.rarity,
      legendaryEffectId: resolved.legendaryEffectId,
      affixes: rollInitialAffixes(seed, rarity.affixCount, generatorVersion, resolved.rarity),
    };
    if (generatorVersion === CURRENT_GENERATOR_VERSION) {
      item.originGeneratorVersion = CURRENT_GENERATOR_VERSION;
      item.bandProfileVersion = BAND_PROFILE_VERSION;
      item.legendaryHandlerVersion = effect?.handlerVersion || null;
      item.legendaryEffectSelection = resolved.legendaryEffectSelection;
      item.originRevision = 0;
      item.originRerolls = [];
      item.revision = 0;
      item.rerolls = [];
    } else if (generatorVersion === PREVIOUS_GENERATOR_VERSION) {
      item.originGeneratorVersion = PREVIOUS_GENERATOR_VERSION;
      item.revision = 0;
      item.rerolls = [];
    }
    item.itemId = deriveItemId(item);
    return item;
  }

  function generateRandomEquipment(options = {}) {
    const seed = String(options.seed || "");
    if (!seed) throw new Error("Random equipment generation requires a non-empty seed");
    const generatorVersion = Number(options.generatorVersion || CURRENT_GENERATOR_VERSION);
    const random = createRng(seed, "routing", generatorVersion);
    const rarity = options.rarity || choose(rarities, random).id;
    let slot = options.slot;
    if (!slot) {
      const availableSlots = rarity === "legendary"
        ? slots.filter((entry) => eligibleEffects(entry.id, options.allowedLegendaryEffectIds).length)
        : slots;
      slot = choose(availableSlots, random).id;
    }
    return generateEquipment({ ...options, seed, generatorVersion, rarity, slot });
  }

  function promoteLegacyToVersionTwoUnchecked(item) {
    const promoted = {
      schemaVersion: PREVIOUS_SCHEMA_VERSION,
      generatorVersion: PREVIOUS_GENERATOR_VERSION,
      originGeneratorVersion: LEGACY_VERSION,
      itemId: "",
      seed: item.seed,
      source: normalizeSource(item.source),
      blueprintId: item.blueprintId || null,
      slot: item.slot,
      rarity: item.rarity,
      legendaryEffectId: item.legendaryEffectId || null,
      revision: 0,
      rerolls: [],
      affixes: item.affixes.map((affix) => {
        const stat = statById.get(affix.statId);
        return {
          rollIndex: affix.rollIndex,
          statId: affix.statId,
          value: affix.value,
          rollStep: rollStepForValue(stat, affix.value, item.rarity, PREVIOUS_GENERATOR_VERSION),
        };
      }),
    };
    promoted.itemId = deriveItemId(promoted);
    return promoted;
  }

  function legacyAffixMetadata(item, affix, rollCounts) {
    const stat = statById.get(affix.statId);
    const sourceValues = item.generatorVersion === LEGACY_VERSION ? [stat.legacyValue] : stat.values;
    const maxValue = stat.v3Bands.legendary[stat.v3Bands.legendary.length - 1];
    const metadata = {
      rollIndex: affix.rollIndex,
      statId: affix.statId,
      value: affix.value,
      rollStep: item.generatorVersion === LEGACY_VERSION
        ? 1
        : rollStepForValue(stat, affix.value, item.rarity, PREVIOUS_GENERATOR_VERSION),
      quality: Math.round((affix.value / maxValue) * 10000) / 100,
      lowerBound: sourceValues[0],
      upperBound: sourceValues[sourceValues.length - 1],
      bandProfileVersion: item.generatorVersion === LEGACY_VERSION ? "legacy-v1" : "generator-v2",
      duplicateCountBefore: rollCounts[affix.statId] || 0,
    };
    rollCounts[affix.statId] = metadata.duplicateCountBefore + 1;
    return metadata;
  }

  function promoteToCurrentUnchecked(item) {
    if (item.generatorVersion === LEGACY_VERSION) {
      return promoteToCurrentUnchecked(promoteLegacyToVersionTwoUnchecked(item));
    }
    const rollCounts = Object.fromEntries(stats.map((stat) => [stat.id, 0]));
    const effect = effectById.get(item.legendaryEffectId);
    const historicalOriginVersion = item.generatorVersion === PREVIOUS_GENERATOR_VERSION
      ? item.originGeneratorVersion
      : item.generatorVersion;
    const promoted = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      generatorVersion: CURRENT_GENERATOR_VERSION,
      originGeneratorVersion: historicalOriginVersion,
      bandProfileVersion: BAND_PROFILE_VERSION,
      itemId: "",
      seed: item.seed,
      source: normalizeSource(item.source),
      blueprintId: item.blueprintId || null,
      slot: item.slot,
      rarity: item.rarity,
      legendaryEffectId: item.legendaryEffectId || null,
      legendaryHandlerVersion: effect?.handlerVersion || null,
      legendaryEffectSelection: item.legendaryEffectId ? `requested:${item.legendaryEffectId}` : null,
      originRevision: item.generatorVersion === PREVIOUS_GENERATOR_VERSION ? item.revision || 0 : 0,
      originRerolls: item.generatorVersion === PREVIOUS_GENERATOR_VERSION ? normalizedRerolls(item.rerolls) : [],
      revision: 0,
      rerolls: [],
      affixes: item.affixes.map((affix) => legacyAffixMetadata(item, affix, rollCounts)),
    };
    promoted.itemId = deriveItemId(promoted);
    return promoted;
  }

  function applyVersionTwoRerollUnchecked(item, operation) {
    const affixIndex = operation.affixIndex;
    const currentAffix = item.affixes[affixIndex];
    const lane = `${operation.type}:${item.itemId}:${item.revision}:${affixIndex}`;
    let candidateAffix;

    if (operation.type === "temper") {
      const stat = statById.get(currentAffix.statId);
      const bandRoll = rollBandValue(
        stat,
        item.rarity,
        createRng(operation.seed, lane, PREVIOUS_GENERATOR_VERSION),
        PREVIOUS_GENERATOR_VERSION,
        currentAffix.value
      );
      candidateAffix = { ...currentAffix, value: bandRoll.value, rollStep: bandRoll.rollStep };
    } else {
      const rollCounts = Object.fromEntries(stats.map((stat) => [stat.id, 0]));
      item.affixes.forEach((affix, index) => {
        if (index !== affixIndex) rollCounts[affix.statId] += 1;
      });
      const replacementStat = chooseWeightedStat(
        probabilityMap(rollCounts),
        createRng(operation.seed, `${lane}:stat`, PREVIOUS_GENERATOR_VERSION),
        currentAffix.statId
      );
      const bandRoll = rollBandValue(
        replacementStat,
        item.rarity,
        createRng(operation.seed, `${lane}:value`, PREVIOUS_GENERATOR_VERSION),
        PREVIOUS_GENERATOR_VERSION
      );
      candidateAffix = {
        rollIndex: affixIndex,
        statId: replacementStat.id,
        value: bandRoll.value,
        rollStep: bandRoll.rollStep,
      };
    }

    const next = {
      ...item,
      itemId: "",
      revision: item.revision + 1,
      rerolls: [...item.rerolls, { type: operation.type, affixIndex, seed: operation.seed }],
      affixes: item.affixes.map((affix, index) => index === affixIndex ? candidateAffix : { ...affix }),
    };
    next.itemId = deriveItemId(next);
    return next;
  }

  function applyRerollUnchecked(item, operation) {
    const affixIndex = operation.affixIndex;
    const currentAffix = item.affixes[affixIndex];
    const lane = `${operation.type}:${item.itemId}:${item.revision}:${affixIndex}`;
    let candidateAffix;

    if (operation.type === "temper") {
      const stat = statById.get(currentAffix.statId);
      const bandRoll = rollBandValue(
        stat,
        item.rarity,
        createRng(operation.seed, lane, CURRENT_GENERATOR_VERSION),
        CURRENT_GENERATOR_VERSION,
        currentAffix.value
      );
      candidateAffix = {
        ...currentAffix,
        value: bandRoll.value,
        rollStep: bandRoll.rollStep,
        quality: bandRoll.quality,
        lowerBound: bandRoll.lowerBound,
        upperBound: bandRoll.upperBound,
        bandProfileVersion: bandRoll.bandProfileVersion,
      };
    } else {
      const rollCounts = Object.fromEntries(stats.map((stat) => [stat.id, 0]));
      item.affixes.forEach((affix, index) => {
        if (index !== affixIndex) rollCounts[affix.statId] += 1;
      });
      const replacementStat = chooseWeightedStat(
        probabilityMap(rollCounts),
        createRng(operation.seed, `${lane}:stat`, CURRENT_GENERATOR_VERSION),
        currentAffix.statId
      );
      const bandRoll = rollBandValue(
        replacementStat,
        item.rarity,
        createRng(operation.seed, `${lane}:value`, CURRENT_GENERATOR_VERSION),
        CURRENT_GENERATOR_VERSION
      );
      candidateAffix = {
        rollIndex: affixIndex,
        statId: replacementStat.id,
        value: bandRoll.value,
        rollStep: bandRoll.rollStep,
        quality: bandRoll.quality,
        lowerBound: bandRoll.lowerBound,
        upperBound: bandRoll.upperBound,
        bandProfileVersion: bandRoll.bandProfileVersion,
        duplicateCountBefore: rollCounts[replacementStat.id] || 0,
      };
    }

    const nextAffixes = item.affixes.map((affix, index) => index === affixIndex ? candidateAffix : { ...affix });
    if (item.generatorVersion === CURRENT_GENERATOR_VERSION) {
      const duplicateCounts = Object.fromEntries(stats.map((stat) => [stat.id, 0]));
      nextAffixes.forEach((affix) => {
        affix.duplicateCountBefore = duplicateCounts[affix.statId] || 0;
        duplicateCounts[affix.statId] = affix.duplicateCountBefore + 1;
      });
    }

    const next = {
      ...item,
      itemId: "",
      revision: item.revision + 1,
      rerolls: [...item.rerolls, { type: operation.type, affixIndex, seed: operation.seed }],
      affixes: nextAffixes,
    };
    next.itemId = deriveItemId(next);
    return next;
  }

  function replayVersionTwo(item) {
    let current;
    if (item.originGeneratorVersion === LEGACY_VERSION) {
      const legacy = generateEquipment({
        seed: item.seed,
        source: item.source,
        blueprintId: item.blueprintId,
        slot: item.slot,
        rarity: item.rarity,
        generatorVersion: LEGACY_VERSION,
        replay: true,
      });
      current = promoteLegacyToVersionTwoUnchecked(legacy);
    } else {
      current = generateEquipment({
        seed: item.seed,
        source: item.source,
        blueprintId: item.blueprintId,
        slot: item.slot,
        rarity: item.rarity,
        generatorVersion: PREVIOUS_GENERATOR_VERSION,
        replay: true,
      });
    }
    for (const operation of item.rerolls) current = applyVersionTwoRerollUnchecked(current, operation);
    return current;
  }

  function replayVersionThree(item) {
    let current;
    if (item.originGeneratorVersion === LEGACY_VERSION || item.originGeneratorVersion === PREVIOUS_GENERATOR_VERSION) {
      let original = generateEquipment({
        seed: item.seed,
        source: item.source,
        blueprintId: item.blueprintId,
        slot: item.slot,
        rarity: item.rarity,
        legendaryEffectId: item.legendaryEffectId,
        generatorVersion: item.originGeneratorVersion,
        replay: true,
      });
      if (item.originGeneratorVersion === LEGACY_VERSION) {
        original = promoteLegacyToVersionTwoUnchecked(original);
      }
      for (const operation of item.originRerolls || []) original = applyVersionTwoRerollUnchecked(original, operation);
      current = promoteToCurrentUnchecked(original);
    } else {
      const requestedEffect = String(item.legendaryEffectSelection || "").startsWith("requested:")
        ? item.legendaryEffectId
        : undefined;
      current = generateEquipment({
        seed: item.seed,
        source: item.source,
        blueprintId: item.blueprintId,
        slot: item.slot,
        rarity: item.rarity,
        legendaryEffectId: requestedEffect,
        generatorVersion: CURRENT_GENERATOR_VERSION,
        replay: true,
      });
    }
    for (const operation of item.rerolls) current = applyRerollUnchecked(current, operation);
    return current;
  }

  // Comparing affixes must not depend on KEY ORDER.
  //
  // This used to be `JSON.stringify(left) === JSON.stringify(right)`, and for
  // as long as items lived only in the browser it worked: the objects were
  // assembled by one and the same generator, so the fields came out in the
  // same order. The moment an item started being stored on the server, it all
  // broke — Postgres stores jsonb with its own key order and returns, say,
  // {"value":…,"statId":…} where the generator wrote {"statId":…,"value":…}.
  // The values match down to the last digit, the strings do not.
  //
  // And it broke silently, in the least convenient place: verifyEquipment
  // declared ANY item coming back from the server invalid ("Stat rolls do not
  // match deterministic regeneration"), and the screens that verify an item
  // first simply refused to work with it without printing anything.
  //
  // We compare stable representations instead: keys are sorted at every
  // level, order stops meaning anything, and the values are still checked
  // exactly.
  function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort()
        .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function sameAffixes(left, right) {
    return stableJson(left) === stableJson(right);
  }

  function validateRerolls(item, errors) {
    if (!Array.isArray(item.rerolls)) {
      errors.push("Version 2 equipment rerolls must be an array.");
      return;
    }
    if (item.rerolls.length > MAX_REROLL_HISTORY) errors.push("Equipment reroll history exceeds the supported limit.");
    if (!Number.isInteger(item.revision) || item.revision < 0 || item.revision !== item.rerolls.length) {
      errors.push("Equipment revision must equal the accepted reroll count.");
    }
    item.rerolls.forEach((operation, index) => {
      if (!operation || typeof operation !== "object" || !["temper", "reforge"].includes(operation.type)) {
        errors.push(`Reroll ${index} has an unknown action.`);
        return;
      }
      if (!Number.isInteger(operation.affixIndex) || operation.affixIndex < 0 || operation.affixIndex >= item.affixes.length) {
        errors.push(`Reroll ${index} has an invalid affix index.`);
      }
      if (typeof operation.seed !== "string" || !operation.seed) errors.push(`Reroll ${index} requires a non-empty seed.`);
    });
  }

  function verifyEquipment(item) {
    const errors = [];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, errors: ["Equipment manifest must be an object."] };
    }
    const versionPair = `${item.schemaVersion}:${item.generatorVersion}`;
    if (![
      `${LEGACY_VERSION}:${LEGACY_VERSION}`,
      `${PREVIOUS_SCHEMA_VERSION}:${PREVIOUS_GENERATOR_VERSION}`,
      `${CURRENT_SCHEMA_VERSION}:${CURRENT_GENERATOR_VERSION}`,
    ].includes(versionPair)) {
      errors.push(`Unsupported equipment schema/generator versions: ${versionPair}`);
    }
    if (!item.seed || typeof item.seed !== "string") errors.push("Equipment seed must be a non-empty string.");
    if (!item.source || typeof item.source !== "object" || Array.isArray(item.source) || typeof item.source.type !== "string" || !item.source.type) {
      errors.push("Equipment source must contain a non-empty type.");
    }
    if (!slotById.has(item.slot)) errors.push(`Unknown equipment slot: ${item.slot}`);
    if (!rarityById.has(item.rarity)) errors.push(`Unknown equipment rarity: ${item.rarity}`);

    const isLegacy = item.generatorVersion === LEGACY_VERSION;
    const isVersionTwo = item.generatorVersion === PREVIOUS_GENERATOR_VERSION;
    const isVersionThree = item.generatorVersion === CURRENT_GENERATOR_VERSION;
    const rarity = rarityById.get(item.rarity);
    if (isLegacy && item.rarity === "common") {
      errors.push("Common equipment is not supported by generator v1.");
    }
    const duplicateCounts = Object.fromEntries(stats.map((stat) => [stat.id, 0]));
    if (!Array.isArray(item.affixes)) {
      errors.push("Equipment stat rolls must be stored in the affixes array.");
    } else {
      if (rarity && item.affixes.length !== rarity.affixCount) {
        errors.push(`${rarity.label} equipment requires exactly ${rarity.affixCount} stat roll${rarity.affixCount === 1 ? "" : "s"}.`);
      }
      item.affixes.forEach((affix, index) => {
        if (!affix || typeof affix !== "object") {
          errors.push(`Stat roll ${index} must be an object.`);
          return;
        }
        if (affix.rollIndex !== index) errors.push(`Stat roll ${index} has an invalid rollIndex.`);
        const stat = statById.get(affix.statId);
        if (!stat) {
          errors.push(`Stat roll ${index} uses unknown stat: ${affix.statId}`);
          return;
        }
        if (!Number.isFinite(affix.value)) errors.push(`Stat roll ${index} has a non-finite value.`);
        if (isVersionTwo) {
          const rollStep = rollStepForValue(stat, affix.value, item.rarity, PREVIOUS_GENERATOR_VERSION);
          if (!rollStep) errors.push(`Stat roll ${index} has an illegal ${stat.label} band value.`);
          if (affix.rollStep !== rollStep) errors.push(`Stat roll ${index} has an invalid rollStep.`);
        } else if (isVersionThree) {
          if (!Number.isInteger(affix.rollStep) || affix.rollStep < 1 || affix.rollStep > 5) {
            errors.push(`Stat roll ${index} has an invalid rollStep.`);
          }
          if (!Number.isFinite(affix.quality) || affix.quality <= 0 || affix.quality > 100) {
            errors.push(`Stat roll ${index} has an invalid roll quality.`);
          }
          if (!Number.isFinite(affix.lowerBound) || !Number.isFinite(affix.upperBound) || affix.lowerBound > affix.upperBound) {
            errors.push(`Stat roll ${index} has invalid declared bounds.`);
          }
          if (typeof affix.bandProfileVersion !== "string" || !affix.bandProfileVersion) {
            errors.push(`Stat roll ${index} has no band profile.`);
          }
          if (affix.duplicateCountBefore !== duplicateCounts[affix.statId]) {
            errors.push(`Stat roll ${index} has an invalid duplicate-count state.`);
          }
          if (affix.bandProfileVersion === BAND_PROFILE_VERSION) {
            const legalValues = valuesFor(stat, item.rarity, CURRENT_GENERATOR_VERSION);
            const rollStep = rollStepForValue(stat, affix.value, item.rarity, CURRENT_GENERATOR_VERSION);
            if (!rollStep || rollStep !== affix.rollStep) errors.push(`Stat roll ${index} has an illegal ${stat.label} v3 value.`);
            if (affix.quality !== qualityForStep(item.rarity, affix.rollStep)) errors.push(`Stat roll ${index} has an invalid v3 quality.`);
            if (affix.lowerBound !== legalValues[0] || affix.upperBound !== legalValues[legalValues.length - 1]) {
              errors.push(`Stat roll ${index} has invalid v3 bounds.`);
            }
          } else if (!["legacy-v1", "generator-v2"].includes(affix.bandProfileVersion)) {
            errors.push(`Stat roll ${index} uses an unknown historical band profile.`);
          }
        } else if (isLegacy) {
          if (affix.value !== stat.legacyValue) errors.push(`Stat roll ${index} has an illegal legacy ${stat.label} value.`);
          if (affix.rollStep !== undefined) errors.push(`Legacy stat roll ${index} must not declare rollStep.`);
        }
        duplicateCounts[affix.statId] += 1;
      });
    }

    if (item.rarity === "legendary") {
      const effect = effectById.get(item.legendaryEffectId);
      if (!effect) errors.push(`Unknown or missing Legendary effect: ${item.legendaryEffectId}`);
      else {
        if (!effect.implemented) errors.push(`Legendary effect has no runtime handler: ${effect.id}`);
        if (!effect.compatibleSlots.includes(item.slot)) errors.push(`${effect.displayName} is not compatible with ${item.slot}.`);
        if (isVersionThree && item.legendaryHandlerVersion !== effect.handlerVersion) {
          errors.push(`${effect.displayName} handler version does not match the live registry.`);
        }
        if (isVersionThree) {
          const selection = String(item.legendaryEffectSelection || "");
          if (!["blueprint", "random", `requested:${effect.id}`].includes(selection)) {
            errors.push(`${effect.displayName} has an invalid effect-selection manifest.`);
          }
        }
      }
    } else if (item.legendaryEffectId !== null && item.legendaryEffectId !== undefined && item.legendaryEffectId !== "") {
      errors.push("Only Legendary equipment may have a Legendary effect.");
    } else if (isVersionThree && item.legendaryHandlerVersion !== null) {
      errors.push("Non-Legendary equipment cannot declare a Legendary handler version.");
    } else if (isVersionThree && item.legendaryEffectSelection !== null) {
      errors.push("Non-Legendary equipment cannot declare a Legendary effect selection.");
    }

    if (item.blueprintId && !blueprintById.has(item.blueprintId)) errors.push(`Unknown equipment blueprint: ${item.blueprintId}`);
    if (item.source?.type === "p0_first_clear") {
      if (item.blueprintId !== "outlawsBowstring") errors.push("The P0 first-clear reward must use the Outlaw's Bowstring blueprint.");
      if (item.slot !== "bowstring" || item.rarity !== "legendary" || item.legendaryEffectId !== "elementalInitiation") {
        errors.push("The P0 first-clear reward does not match Outlaw's Bowstring.");
      }
    }
    validateSourceProvenance(item, errors);

    if (isVersionTwo) {
      if (![LEGACY_VERSION, PREVIOUS_GENERATOR_VERSION].includes(item.originGeneratorVersion)) {
        errors.push(`Unsupported equipment origin generator: ${item.originGeneratorVersion}`);
      }
      if (Array.isArray(item.affixes)) validateRerolls(item, errors);
    } else if (isVersionThree) {
      if (![LEGACY_VERSION, PREVIOUS_GENERATOR_VERSION, CURRENT_GENERATOR_VERSION].includes(item.originGeneratorVersion)) {
        errors.push(`Unsupported equipment origin generator: ${item.originGeneratorVersion}`);
      }
      if (item.bandProfileVersion !== BAND_PROFILE_VERSION) errors.push("Version 3 equipment has an invalid rarity band profile.");
      if (!Array.isArray(item.originRerolls)) errors.push("Version 3 equipment originRerolls must be an array.");
      if (!Number.isInteger(item.originRevision) || item.originRevision < 0 || item.originRevision !== (item.originRerolls?.length || 0)) {
        errors.push("Version 3 equipment originRevision must equal its origin reroll count.");
      }
      if (![LEGACY_VERSION, PREVIOUS_GENERATOR_VERSION].includes(item.originGeneratorVersion) && (item.originRerolls?.length || item.originRevision)) {
        errors.push("Only historical generator origins may carry origin rerolls.");
      }
      if (Array.isArray(item.originRerolls)) {
        validateRerolls({ ...item, rerolls: item.originRerolls, revision: item.originRevision }, errors);
      }
      if (Array.isArray(item.affixes)) validateRerolls(item, errors);
    } else if ((item.rerolls && item.rerolls.length) || (item.revision && item.revision !== 0)) {
      errors.push("Legacy equipment cannot contain reroll history.");
    }

    if (!errors.length) {
      try {
        const expected = isVersionThree
          ? replayVersionThree(item)
          : isVersionTwo
            ? replayVersionTwo(item)
            : generateEquipment({
            seed: item.seed,
            source: item.source,
            blueprintId: item.blueprintId,
            slot: item.slot,
            rarity: item.rarity,
            generatorVersion: LEGACY_VERSION,
            replay: true,
            });
        if (expected.legendaryEffectId !== (item.legendaryEffectId || null)) {
          errors.push("Legendary effect does not match deterministic regeneration.");
        }
        if (!sameAffixes(expected.affixes, item.affixes)) errors.push("Stat rolls do not match deterministic regeneration and reroll replay.");
        if (deriveItemId(item) !== item.itemId || expected.itemId !== item.itemId) {
          errors.push("Item ID does not match the canonical equipment manifest.");
        }
      } catch (error) {
        errors.push(`Equipment regeneration failed: ${error.message}`);
      }
    }

    return { ok: errors.length === 0, errors };
  }

  function promoteLegacyItem(item) {
    const verification = verifyEquipment(item);
    if (!verification.ok) throw new Error(`Cannot promote invalid legacy equipment: ${verification.errors.join(" ")}`);
    if (item.generatorVersion !== LEGACY_VERSION) return JSON.parse(JSON.stringify(item));
    return promoteLegacyToVersionTwoUnchecked(item);
  }

  function createRerollCandidate(item, action, affixIndex, seed) {
    const verification = verifyEquipment(item);
    if (!verification.ok) throw new Error(`Cannot reroll invalid equipment: ${verification.errors.join(" ")}`);
    if (!["temper", "reforge"].includes(action)) throw new Error(`Unknown equipment reroll action: ${action}`);
    if (!Number.isInteger(affixIndex) || affixIndex < 0 || affixIndex >= item.affixes.length) {
      throw new Error(`Invalid equipment affix index: ${affixIndex}`);
    }
    const rerollSeed = String(seed || "");
    if (!rerollSeed) throw new Error("Equipment reroll requires a non-empty seed");

    const current = item.generatorVersion === CURRENT_GENERATOR_VERSION
      ? JSON.parse(JSON.stringify(item))
      : promoteToCurrentUnchecked(item);
    const operation = { type: action, affixIndex, seed: rerollSeed };
    const candidate = applyRerollUnchecked(current, operation);
    const candidateVerification = verifyEquipment(candidate);
    if (!candidateVerification.ok) throw new Error(`Generated reroll candidate failed verification: ${candidateVerification.errors.join(" ")}`);
    return {
      item: candidate,
      costContext: {
        action,
        itemId: item.itemId,
        revision: candidate.revision,
        affixIndex,
        currentAffix: { ...current.affixes[affixIndex] },
        candidateAffix: { ...candidate.affixes[affixIndex] },
      },
    };
  }

  function aggregateAffixes(items) {
    const totals = Object.fromEntries(stats.map((stat) => [stat.id, 0]));
    for (const item of items || []) {
      if (!verifyEquipment(item).ok) continue;
      for (const affix of item.affixes) totals[affix.statId] += affix.value;
    }
    return totals;
  }

  function emptyLoadout() {
    return Object.fromEntries(slots.map((slot) => [slot.id, null]));
  }

  function isPlaytestItem(item) {
    return item?.source?.type === "equipment_playtest_crate";
  }

  function equipmentAvailability(item, options = {}) {
    const verification = verifyEquipment(item);
    if (!verification.ok) return Object.freeze({ usable: false, reason: "invalidEquipment", errors: verification.errors });
    return release.availabilityForItem(item, options);
  }

  function marketplaceEligibility(item) {
    const verification = verifyEquipment(item);
    if (!verification.ok) return { eligible: false, reason: "invalidEquipment" };
    const availability = equipmentAvailability(item);
    if (!availability.usable) return { eligible: false, reason: availability.reason };
    const sourceType = item?.source?.type;
    if (sourceType === "gacha_premium" && item.source.marketplaceEligible === true) {
      return { eligible: true, reason: "limitedGacha" };
    }
    if (sourceType === "gacha_standard" && item.source.marketplaceEligible === true) {
      return { eligible: true, reason: "standardGacha" };
    }
    if (sourceType === "scrap_craft") return { eligible: false, reason: "scrapCraftAccountBound" };
    if (sourceType === "equipment_playtest_crate") return { eligible: false, reason: "testEquipment" };
    if (sourceType === "p0_first_clear") return { eligible: false, reason: "p0RewardAccountBound" };
    return { eligible: false, reason: "unsupportedProvenance" };
  }

  function normalizeLoadoutSnapshot(snapshot) {
    const normalized = emptyLoadout();
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return normalized;
    for (const slot of slots) {
      const itemId = snapshot[slot.id];
      normalized[slot.id] = typeof itemId === "string" && itemId ? itemId : null;
    }
    return normalized;
  }

  function capturePrePlaytestLoadout(equipmentState) {
    const snapshot = emptyLoadout();
    const items = Array.isArray(equipmentState?.items) ? equipmentState.items : [];
    const itemById = new Map(items.map((item) => [item.itemId, item]));
    for (const slot of slots) {
      const itemId = equipmentState?.equipped?.[slot.id];
      const item = typeof itemId === "string" ? itemById.get(itemId) : null;
      if (item && !isPlaytestItem(item) && equipmentAvailability(item).usable) snapshot[slot.id] = itemId;
    }
    return snapshot;
  }

  function beginPlaytestOverride(equipmentState) {
    if (!equipmentState || typeof equipmentState !== "object") {
      throw new Error("Playtest equipment override requires equipment state");
    }
    if (!equipmentState.playtestOverride || !equipmentState.playtestOriginalEquipped) {
      equipmentState.playtestOriginalEquipped = capturePrePlaytestLoadout(equipmentState);
    }
    equipmentState.playtestOverride = true;
    return normalizeLoadoutSnapshot(equipmentState.playtestOriginalEquipped);
  }

  function migratePlaytestOverrideState(equipmentState) {
    if (!equipmentState || typeof equipmentState !== "object") return false;
    const items = Array.isArray(equipmentState.items) ? equipmentState.items : [];
    const hasPlaytestItems = items.some(isPlaytestItem);
    let changed = false;

    if (!equipmentState.playtestOverride || !hasPlaytestItems) {
      if (equipmentState.playtestOverride) changed = true;
      if (equipmentState.playtestOriginalEquipped !== null && equipmentState.playtestOriginalEquipped !== undefined) changed = true;
      equipmentState.playtestOverride = false;
      equipmentState.playtestOriginalEquipped = null;
      return changed;
    }

    const normalized = equipmentState.playtestOriginalEquipped
      ? normalizeLoadoutSnapshot(equipmentState.playtestOriginalEquipped)
      : capturePrePlaytestLoadout(equipmentState);
    if (JSON.stringify(equipmentState.playtestOriginalEquipped || null) !== JSON.stringify(normalized)) changed = true;
    equipmentState.playtestOriginalEquipped = normalized;
    return changed;
  }

  function resetPlaytestOverride(equipmentState) {
    if (!equipmentState || typeof equipmentState !== "object") {
      throw new Error("Playtest equipment reset requires equipment state");
    }
    const items = Array.isArray(equipmentState.items) ? equipmentState.items : [];
    const snapshot = equipmentState.playtestOriginalEquipped
      ? normalizeLoadoutSnapshot(equipmentState.playtestOriginalEquipped)
      : capturePrePlaytestLoadout(equipmentState);
    const retainedItems = items.filter((item) => !isPlaytestItem(item));
    const itemById = new Map(retainedItems.map((item) => [item.itemId, item]));
    const restoredLoadout = emptyLoadout();
    let restoredCount = 0;

    for (const slot of slots) {
      const item = itemById.get(snapshot[slot.id]);
      if (!item || item.slot !== slot.id || !verifyEquipment(item).ok || !equipmentAvailability(item).usable) continue;
      restoredLoadout[slot.id] = item.itemId;
      restoredCount += 1;
    }

    const removedCount = items.length - retainedItems.length;
    equipmentState.items = retainedItems;
    equipmentState.equipped = restoredLoadout;
    equipmentState.playtestOverride = false;
    equipmentState.playtestOriginalEquipped = null;
    return { removedCount, restoredCount };
  }

  function itemName(item) {
    const blueprint = blueprintById.get(item?.blueprintId);
    if (blueprint?.itemName) return blueprint.itemName;
    const effect = effectById.get(item?.legendaryEffectId);
    if (effect?.itemName) return effect.itemName;
    const rarity = rarityById.get(item?.rarity)?.label || "Unknown";
    const slot = slotById.get(item?.slot)?.label || "Equipment";
    return `${rarity} ${slot}`;
  }

  function formatStatValue(stat, value) {
    if (stat.format === "flat") return `+${value} ${stat.label}`;
    if (stat.format === "regen") return `+${value.toFixed(2)} HP/sec`;
    if (stat.format === "points") return `+${Math.round(value * 100)} points ${stat.label}`;
    return `+${Math.round(value * 100)}% ${stat.label}`;
  }

  function formatAffix(affix) {
    const stat = statById.get(affix?.statId);
    return stat ? formatStatValue(stat, affix.value) : "Unknown stat roll";
  }

  function affixRollStep(affix) {
    return Number.isInteger(affix?.rollStep) ? affix.rollStep : 0;
  }

  function formatAffixRange(affix) {
    const stat = statById.get(affix?.statId);
    if (!stat) return "Unknown range";
    const lowerValue = Number.isFinite(affix?.lowerBound) ? affix.lowerBound : stat.values[0];
    const upperValue = Number.isFinite(affix?.upperBound) ? affix.upperBound : stat.values[stat.values.length - 1];
    const lower = formatStatValue(stat, lowerValue);
    const upper = formatStatValue(stat, upperValue);
    const quality = Number.isFinite(affix?.quality) ? ` · Quality ${affix.quality}%` : "";
    return `Roll ${affixRollStep(affix)} / 5${quality} · ${lower} to ${upper}`;
  }

  return Object.freeze({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    generatorVersion: CURRENT_GENERATOR_VERSION,
    previousGeneratorVersion: PREVIOUS_GENERATOR_VERSION,
    legacyVersion: LEGACY_VERSION,
    bandProfileVersion: BAND_PROFILE_VERSION,
    valueStepWeights: VALUE_STEP_WEIGHTS,
    qualityFloors: QUALITY_FLOORS,
    catalogueVersion: legendaryCatalogue?.catalogueVersion || "",
    slots,
    rarities,
    stats,
    legendaryEffects,
    release,
    blueprints,
    probabilityMap,
    generateEquipment,
    generateRandomEquipment,
    verifyEquipment,
    equipmentAvailability,
    promoteLegacyItem,
    createRerollCandidate,
    aggregateAffixes,
    normalizeLoadoutSnapshot,
    capturePrePlaytestLoadout,
    beginPlaytestOverride,
    migratePlaytestOverrideState,
    resetPlaytestOverride,
    marketplaceEligibility,
    deriveItemId,
    itemName,
    formatAffix,
    affixRollStep,
    formatAffixRange,
  });
});
