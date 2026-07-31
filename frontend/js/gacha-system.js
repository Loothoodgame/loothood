(function (root, factory) {
  "use strict";

  const equipment = typeof module === "object" && module.exports
    ? require("./equipment.js")
    : root?.LoothoodEquipment;
  const api = factory(equipment);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodGachaSystem = api;
})(typeof window !== "undefined" ? window : globalThis, function (equipment) {
  "use strict";

  if (!equipment) throw new Error("Gacha requires the equipment registry.");

  const SCHEMA_VERSION = 1;
  const ODDS_VERSION = "gacha-odds-v3";
  const EPIC_GUARANTEE_DRAW = 10;
  const LEGENDARY_HARD_PITY_DRAW = 50;
  const BASE_EPIC_PROBABILITY = 0.009;
  const BASE_LEGENDARY_PROBABILITY = 0.001;
  const MAX_HISTORY = 60;
  const MAX_PROCESSED_IDS = 240;
  const MAX_CAPTURED_MANIFESTS = 12;
  const DEFAULT_INVENTORY_CAPACITY = 500;
  const TEMPORARY_PLAYTEST_TICKET_GRANT = Object.freeze({
    id: "alpha-gacha-playtest-ticket-grant-v1",
    standardTickets: 25,
    premiumTickets: 25,
  });
  const BASE_RARITY_RATES = Object.freeze({
    common: 0,
    uncommon: 0.79,
    rare: 0.2,
    epic: BASE_EPIC_PROBABILITY,
    legendary: BASE_LEGENDARY_PROBABILITY,
  });
  const LOWER_RARITY_WEIGHTS = Object.freeze({ common: 0, uncommon: 79, rare: 20 });
  /* How much scrap salvaging gives.
     ------------------------------------------------------------------
     The numbers are required to match the server: src/game-routes.js,
     SALVAGE_SCRAP. The server is what credits the scrap, the client only
     displays it. This file used to hold values of its own, and different
     ones for the two banners at that:

       client, standard   1 / 2 / 4 /  8 / 20
       client, premium    1 / 3 / 6 / 12 / 30
       server             1 / 3 / 8 / 20 / 60

     Which means the player saw four scrap for a rare item and received
     eight, and the split by banner meant nothing: the server knows nothing
     about the banner and counts the same for everyone. Per-banner salvage
     is not the worst idea, but it requires the server to remember where an
     item came from, and it does not remember. Until it does, there is one
     table.

     If the banners ever need separating, the fix has to start on the
     server. */
  const SALVAGE_VALUES = Object.freeze({
    common: 1, uncommon: 3, rare: 8, epic: 20, legendary: 60,
  });
  const PULL_SALVAGE_VALUES = Object.freeze({
    standard: SALVAGE_VALUES,
    premium: SALVAGE_VALUES,
  });
  const TICKET_PRICES_USD = Object.freeze({ standard: null, premium: 5 });
  const SCRAP_RECIPES = Object.freeze({
    uncommon: Object.freeze({ random: 5, exact: 25 }),
    rare: Object.freeze({ random: 10, exact: 50 }),
    epic: Object.freeze({ random: 20, exact: 100 }),
    legendary: Object.freeze({ random: 100, exact: 500 }),
  });
  const SOFT_PITY = Object.freeze({
    41: 1 / 150,
    42: 2 / 150,
    43: 4 / 150,
    44: 7 / 150,
    45: 12 / 150,
    46: 20 / 150,
    47: 32 / 150,
    48: 50 / 150,
    49: 0.5,
    50: 1,
  });

  function plainObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nonNegativeInteger(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
  }

  function boundedArray(value, limit) {
    return Array.isArray(value) ? deepClone(value.slice(-limit)) : [];
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (!plainObject(value)) return JSON.stringify(value);
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }

  function hashString(value) {
    let hash = 0x811c9dc5;
    for (const character of String(value)) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function manifestHash(value) {
    return `hb-manifest-${hashString(stableStringify(value))}`;
  }

  function normalizeTier(value) {
    const tier = String(value || "").toLowerCase();
    if (!["standard", "premium"].includes(tier)) throw new Error(`Unknown Gacha tier: ${value}`);
    return tier;
  }

  function normalizeSlot(value) {
    const slot = String(value || "");
    if (!equipment.slots.some((entry) => entry.id === slot)) {
      throw new Error(`Unknown equipment slot: ${value}`);
    }
    return slot;
  }

  function normalizeManifestBase(raw, expectedTier) {
    const source = plainObject(raw);
    if (!source) throw new Error("Gacha manifest must be an object.");
    const tier = normalizeTier(source.tier);
    if (tier !== expectedTier) throw new Error(`Expected a ${expectedTier} manifest.`);
    const id = String(source.id || "");
    const version = String(source.version || "");
    if (!id || !version) throw new Error("Gacha manifest requires an ID and version.");
    const normalized = {
      id,
      version,
      tier,
      generatorVersion: nonNegativeInteger(source.generatorVersion || equipment.generatorVersion),
      effectCatalogueVersion: String(source.effectCatalogueVersion || equipment.catalogueVersion || ""),
      oddsVersion: String(source.oddsVersion || ODDS_VERSION),
      minimumGameVersion: String(source.minimumGameVersion || ""),
      testOnly: Boolean(source.testOnly),
    };
    if (normalized.generatorVersion !== equipment.generatorVersion) {
      throw new Error(`Unsupported equipment generator version: ${normalized.generatorVersion}`);
    }
    if (!normalized.effectCatalogueVersion) throw new Error("Gacha manifest requires an effect catalogue version.");
    return normalized;
  }

  function normalizeAllowedEffects(values, label, slot = "", channel = "public") {
    const effectIds = [...new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || ""))
        .filter(Boolean)
    )];
    if (!effectIds.length) throw new Error(`${label} requires an explicit non-empty Legendary effect allow-list.`);
    for (const effectId of effectIds) {
      const effect = equipment.legendaryEffects.find((entry) => entry.id === effectId);
      if (!effect || !effect.implemented || (slot && !effect.compatibleSlots.includes(slot))) {
        throw new Error(`${label} contains an unsupported Legendary effect: ${effectId}`);
      }
      const channelEligible = channel === "standard"
        ? equipment.release.isStandardGachaEffect(effectId)
        : channel === "limited"
          ? equipment.release.isLimitedGachaEffect(effectId)
          : equipment.release.isPublicGachaEffect(effectId);
      if (!channelEligible) {
        throw new Error(`${label} contains an unreleased Legendary effect: ${effectId}`);
      }
    }
    return effectIds;
  }

  function normalizePoolManifest(raw) {
    const normalized = normalizeManifestBase(raw, "standard");
    const allowedLegendaryEffectIds = normalizeAllowedEffects(
      raw?.allowedLegendaryEffectIds,
      "Standard Gacha manifest",
      "",
      "standard"
    );
    const withAllowList = { ...normalized, allowedLegendaryEffectIds };
    return Object.freeze({
      ...withAllowList,
      allowedLegendaryEffectIds: Object.freeze(allowedLegendaryEffectIds),
      manifestHash: manifestHash(withAllowList),
    });
  }

  function normalizeBannerManifest(raw) {
    const normalized = normalizeManifestBase(raw, "premium");
    const featuredSlot = normalizeSlot(raw?.featuredSlot);
    const featuredEffectId = String(raw?.featuredEffectId || "");
    const featuredEffect = equipment.legendaryEffects.find((entry) => entry.id === featuredEffectId);
    if (!featuredEffect || !featuredEffect.implemented || !featuredEffect.compatibleSlots.includes(featuredSlot)) {
      throw new Error(`Limited Gacha banner requires an enabled featured Legendary for ${featuredSlot}: ${featuredEffectId || "missing"}`);
    }
    if (!equipment.release.isLimitedGachaEffect(featuredEffectId)) {
      throw new Error(`Limited Gacha banner features an unreleased Legendary effect: ${featuredEffectId}`);
    }
    const allowedAlternativeEffectIds = normalizeAllowedEffects(
      raw?.allowedAlternativeEffectIds,
      "Limited Gacha banner alternatives",
      featuredSlot,
      "limited"
    ).filter((effectId) => effectId !== featuredEffectId);
    if (!allowedAlternativeEffectIds.length) throw new Error(`Limited Gacha banner requires another eligible Legendary in ${featuredSlot}.`);
    const withFeature = { ...normalized, featuredSlot, featuredEffectId, allowedAlternativeEffectIds };
    return Object.freeze({
      ...withFeature,
      allowedAlternativeEffectIds: Object.freeze(allowedAlternativeEffectIds),
      manifestHash: manifestHash(withFeature),
    });
  }

  function createLane() {
    return { epicCounter: 0, legendaryCounter: 0 };
  }

  function createInitialState(initial = {}) {
    return {
      schemaVersion: SCHEMA_VERSION,
      standardTickets: nonNegativeInteger(initial.standardTickets),
      premiumTickets: nonNegativeInteger(initial.premiumTickets),
      scrap: nonNegativeInteger(initial.scrap),
      lanes: {
        standard: createLane(),
        premium: createLane(),
      },
      premiumFeaturedGuarantee: false,
      pendingRequests: [],
      processedTransactionIds: [],
      history: [],
      capturedManifests: [],
      migrations: {
        v098Rewards: false,
        alphaPlaytestTicketGrantV1: false,
        alphaLimitedNamedItemV1: true,
      },
    };
  }

  function normalizeLane(raw) {
    const source = plainObject(raw) || {};
    return {
      epicCounter: Math.min(EPIC_GUARANTEE_DRAW - 1, nonNegativeInteger(source.epicCounter)),
      legendaryCounter: Math.min(LEGENDARY_HARD_PITY_DRAW - 1, nonNegativeInteger(source.legendaryCounter)),
    };
  }

  function normalizePendingRequest(raw) {
    const source = plainObject(raw);
    if (!source) return null;
    try {
      const tier = normalizeTier(source.tier);
      const count = Math.max(1, Math.min(10, nonNegativeInteger(source.count)));
      const requestId = String(source.requestId || "");
      const manifest = tier === "standard"
        ? normalizePoolManifest(source.manifest)
        : normalizeBannerManifest(source.manifest);
      if (!requestId || !count) return null;
      return {
        requestId,
        tier,
        count,
        manifest,
        requestedAt: String(source.requestedAt || ""),
      };
    } catch (error) {
      return null;
    }
  }

  function normalizeState(raw) {
    const source = plainObject(raw) || {};
    const state = createInitialState(source);
    state.schemaVersion = SCHEMA_VERSION;
    state.lanes.standard = normalizeLane(source.lanes?.standard);
    state.lanes.premium = normalizeLane(source.lanes?.premium);
    state.premiumFeaturedGuarantee = Boolean(source.premiumFeaturedGuarantee);
    state.pendingRequests = (Array.isArray(source.pendingRequests) ? source.pendingRequests : [])
      .map(normalizePendingRequest)
      .filter(Boolean)
      .slice(-10);
    state.processedTransactionIds = [...new Set(
      boundedArray(source.processedTransactionIds, MAX_PROCESSED_IDS)
        .map((entry) => String(entry || ""))
        .filter(Boolean)
    )];
    state.history = boundedArray(source.history, MAX_HISTORY);
    state.capturedManifests = boundedArray(source.capturedManifests, MAX_CAPTURED_MANIFESTS);
    state.migrations.v098Rewards = Boolean(source.migrations?.v098Rewards);
    state.migrations.alphaPlaytestTicketGrantV1 = Boolean(source.migrations?.alphaPlaytestTicketGrantV1);
    const needsNamedItemMigration = source.migrations?.alphaLimitedNamedItemV1 !== true;
    if (needsNamedItemMigration) {
      const legacyRequests = (Array.isArray(source.pendingRequests) ? source.pendingRequests : [])
        .filter((entry) => {
          try {
            return normalizeTier(entry?.tier) === "premium"
              && !String(entry?.manifest?.featuredEffectId || "")
              && Boolean(String(entry?.requestId || ""))
              && Boolean(normalizeManifestBase(entry?.manifest, "premium"))
              && Boolean(normalizeSlot(entry?.manifest?.featuredSlot));
          } catch (error) {
            return false;
          }
        });
      const refundedTickets = legacyRequests.reduce(
        (sum, entry) => sum + Math.max(1, Math.min(10, nonNegativeInteger(entry.count))),
        0
      );
      if (refundedTickets) {
        state.premiumTickets += refundedTickets;
        appendHistory(state, {
          type: "limitedNamedItemMigration",
          refundedTickets,
          requestIds: legacyRequests.map((entry) => String(entry.requestId)),
        });
      }
      state.migrations.alphaLimitedNamedItemV1 = true;
    }
    return state;
  }

  function migrateV098Rewards(rawState, legacyRewards) {
    const namedItemMigrationRequired = plainObject(rawState)?.migrations?.alphaLimitedNamedItemV1 !== true;
    const state = normalizeState(rawState);
    if (state.migrations.v098Rewards) {
      return Object.freeze({ state: Object.freeze(state), migrated: namedItemMigrationRequired });
    }
    const legacy = plainObject(legacyRewards) || {};
    state.standardTickets += nonNegativeInteger(legacy.standardTickets);
    state.scrap += nonNegativeInteger(legacy.scrap);
    state.migrations.v098Rewards = true;
    return Object.freeze({ state: Object.freeze(state), migrated: true });
  }

  function applyTemporaryPlaytestTicketGrant(rawState) {
    const state = normalizeState(rawState);
    if (state.migrations.alphaPlaytestTicketGrantV1) {
      return Object.freeze({ state: Object.freeze(state), granted: false });
    }
    state.standardTickets += TEMPORARY_PLAYTEST_TICKET_GRANT.standardTickets;
    state.premiumTickets += TEMPORARY_PLAYTEST_TICKET_GRANT.premiumTickets;
    state.migrations.alphaPlaytestTicketGrantV1 = true;
    appendHistory(state, {
      type: "temporaryPlaytestGrant",
      grantId: TEMPORARY_PLAYTEST_TICKET_GRANT.id,
      standardTickets: TEMPORARY_PLAYTEST_TICKET_GRANT.standardTickets,
      premiumTickets: TEMPORARY_PLAYTEST_TICKET_GRANT.premiumTickets,
    });
    return Object.freeze({ state: Object.freeze(state), granted: true });
  }

  function appendProcessed(state, transactionId) {
    const id = String(transactionId || "");
    if (!id || state.processedTransactionIds.includes(id)) return;
    state.processedTransactionIds.push(id);
    state.processedTransactionIds = state.processedTransactionIds.slice(-MAX_PROCESSED_IDS);
  }

  function appendHistory(state, entry) {
    state.history.push(deepClone(entry));
    state.history = state.history.slice(-MAX_HISTORY);
  }

  function captureManifest(state, manifest) {
    if (state.capturedManifests.some((entry) => entry.manifestHash === manifest.manifestHash)) return;
    state.capturedManifests.push(deepClone(manifest));
    state.capturedManifests = state.capturedManifests.slice(-MAX_CAPTURED_MANIFESTS);
  }

  function depositBoardReward(rawState, reward, transactionId) {
    const state = normalizeState(rawState);
    const id = String(transactionId || "");
    if (!id) throw new Error("Board reward deposit requires a transaction ID.");
    if (state.processedTransactionIds.includes(id)) {
      return Object.freeze({ state: Object.freeze(state), accepted: true, idempotent: true });
    }
    const standardTickets = nonNegativeInteger(reward?.standardTickets);
    const scrap = nonNegativeInteger(reward?.scrap);
    state.standardTickets += standardTickets;
    state.scrap += scrap;
    appendProcessed(state, id);
    appendHistory(state, {
      type: "boardReward",
      transactionId: id,
      standardTickets,
      scrap,
    });
    return Object.freeze({ state: Object.freeze(state), accepted: true, idempotent: false });
  }

  function creditEquipmentSalvage(rawState, options = {}) {
    const state = normalizeState(rawState);
    const transactionId = String(options.transactionId || "");
    if (!transactionId) throw new Error("Equipment salvage requires a transaction ID.");
    if (state.processedTransactionIds.includes(transactionId)) {
      return Object.freeze({ state: Object.freeze(state), accepted: true, idempotent: true, scrap: 0 });
    }
    const items = Array.isArray(options.items) ? options.items : [];
    const seen = new Set();
    let scrap = 0;
    for (const entry of items) {
      const itemId = String(entry?.itemId || "");
      const rarity = String(entry?.rarity || "").toLowerCase();
      const tier = entry?.sourceType === "scrap_craft" ? "standard" : normalizeTier(entry?.salvageTier);
      const value = PULL_SALVAGE_VALUES[tier]?.[rarity];
      if (!itemId || seen.has(itemId) || !Number.isInteger(value) || value <= 0) {
        return Object.freeze({ state: Object.freeze(state), accepted: false, reason: "invalidSalvageItem" });
      }
      seen.add(itemId);
      scrap += value;
    }
    if (!items.length) return Object.freeze({ state: Object.freeze(state), accepted: false, reason: "emptySalvage" });
    state.scrap += scrap;
    appendProcessed(state, transactionId);
    appendHistory(state, { type: "equipmentScrap", transactionId, itemCount: items.length, scrap });
    return Object.freeze({ state: Object.freeze(state), accepted: true, idempotent: false, scrap });
  }

  function legendaryProbability(counterBeforeDraw) {
    const draw = Math.min(LEGENDARY_HARD_PITY_DRAW, nonNegativeInteger(counterBeforeDraw) + 1);
    return SOFT_PITY[draw] ?? BASE_LEGENDARY_PROBABILITY;
  }

  function rarityProbabilities(counterBeforeDraw) {
    const legendary = legendaryProbability(counterBeforeDraw);
    if (legendary === BASE_LEGENDARY_PROBABILITY) return BASE_RARITY_RATES;
    const epic = Math.min(BASE_EPIC_PROBABILITY, Math.max(0, 1 - legendary));
    const lowerRemaining = Math.max(0, 1 - legendary - epic);
    const totalLowerWeight = Object.values(LOWER_RARITY_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    return Object.freeze({
      common: lowerRemaining * (LOWER_RARITY_WEIGHTS.common / totalLowerWeight),
      uncommon: lowerRemaining * (LOWER_RARITY_WEIGHTS.uncommon / totalLowerWeight),
      rare: lowerRemaining * (LOWER_RARITY_WEIGHTS.rare / totalLowerWeight),
      epic,
      legendary,
    });
  }

  function resolveRarity(rarityRoll, probabilities, forcedEpic) {
    if (rarityRoll < probabilities.legendary) return "legendary";
    if (forcedEpic) return "epic";
    let threshold = probabilities.legendary + probabilities.epic;
    if (rarityRoll < threshold) return "epic";
    threshold += probabilities.common;
    if (rarityRoll < threshold) return "common";
    threshold += probabilities.uncommon;
    if (rarityRoll < threshold) return "uncommon";
    return "rare";
  }

  function createRandomStream(randomValues) {
    const values = Array.isArray(randomValues) || ArrayBuffer.isView(randomValues)
      ? Array.from(randomValues)
      : [];
    let index = 0;
    return {
      next(label) {
        if (index >= values.length) throw new Error(`Randomness exhausted while resolving ${label}.`);
        const value = Number(values[index]);
        index += 1;
        if (!Number.isFinite(value) || value < 0 || value >= 1) {
          throw new Error(`Random value for ${label} must be in [0, 1).`);
        }
        return value;
      },
      consumed() {
        return index;
      },
    };
  }

  function chooseIndex(length, random) {
    if (!Number.isInteger(length) || length <= 0) throw new Error("Cannot choose from an empty Gacha pool.");
    return Math.min(length - 1, Math.floor(random * length));
  }

  function equipmentSeed(requestId, drawIndex, stream) {
    const word = Math.floor(stream.next(`equipment seed ${drawIndex + 1}`) * 0x100000000)
      .toString(16)
      .padStart(8, "0");
    return `gacha:${requestId}:${drawIndex}:${word}`;
  }

  function sourceForDraw(tier, request, drawIndex, issuanceId) {
    const common = {
      type: tier === "standard" ? "gacha_standard" : "gacha_premium",
      issuanceId,
      tier,
      manifestHash: request.manifest.manifestHash,
      salvageTier: tier,
      accountBound: false,
      marketplaceEligible: true,
    };
    if (tier === "standard") {
      common.poolId = request.manifest.id;
      common.poolVersion = request.manifest.version;
    } else {
      common.bannerId = request.manifest.id;
      common.bannerVersion = request.manifest.version;
    }
    common.drawIndex = drawIndex;
    return common;
  }

  function generateVerifiedItem(options, adapters = {}) {
    const generateEquipment = adapters.generateEquipment || equipment.generateEquipment;
    const verifyEquipment = adapters.verifyEquipment || equipment.verifyEquipment;
    const item = generateEquipment(options);
    const verification = verifyEquipment(item);
    if (!verification.ok) throw new Error(`Equipment verification failed: ${verification.errors[0]}`);
    return item;
  }

  function resolveOneDraw(context, stream, drawIndex) {
    const { tier, request } = context;
    const lane = context.lane;
    const probabilities = rarityProbabilities(lane.legendaryCounter);
    const rarityRoll = stream.next(`rarity ${drawIndex + 1}`);
    const forcedEpic = lane.epicCounter + 1 >= EPIC_GUARANTEE_DRAW;
    const rarity = resolveRarity(rarityRoll, probabilities, forcedEpic);

    let slot = "";
    let legendaryEffectId = "";
    let featuredResult = "";
    let item = null;
    const issuanceId = `${request.requestId}:${drawIndex + 1}`;

    if (rarity === "legendary") {
      if (tier === "premium") {
        slot = request.manifest.featuredSlot;
        if (context.featuredGuarantee) {
          legendaryEffectId = request.manifest.featuredEffectId;
          featuredResult = "guaranteed";
          context.featuredGuarantee = false;
        } else {
          const featuredRoll = stream.next(`Limited featured item ${drawIndex + 1}`);
          if (featuredRoll < 0.5) {
            legendaryEffectId = request.manifest.featuredEffectId;
            featuredResult = "won";
            context.featuredGuarantee = false;
          } else {
            const allowedAlternatives = new Set(request.manifest.allowedAlternativeEffectIds);
            const alternatives = equipment.legendaryEffects.filter((entry) => allowedAlternatives.has(entry.id));
            legendaryEffectId = alternatives[chooseIndex(alternatives.length, stream.next(`Limited alternate item ${drawIndex + 1}`))].id;
            featuredResult = "lost";
            context.featuredGuarantee = true;
          }
        }
      } else {
        const allowed = new Set(request.manifest.allowedLegendaryEffectIds);
        const eligibleSlots = equipment.slots.filter((entry) => (
          equipment.legendaryEffects.some((effect) => allowed.has(effect.id) && effect.compatibleSlots.includes(entry.id))
        ));
        slot = eligibleSlots[chooseIndex(eligibleSlots.length, stream.next(`Standard Legendary slot ${drawIndex + 1}`))].id;
        const eligible = equipment.legendaryEffects.filter((entry) => (
          entry.implemented
          && entry.compatibleSlots.includes(slot)
          && allowed.has(entry.id)
        ));
        if (!eligible.length) throw new Error(`Standard Gacha pool has no eligible Legendary effect for ${slot}.`);
        legendaryEffectId = eligible[chooseIndex(eligible.length, stream.next(`Standard Legendary item ${drawIndex + 1}`))].id;
      }
    } else {
      slot = equipment.slots[chooseIndex(equipment.slots.length, stream.next(`${rarity} slot ${drawIndex + 1}`))].id;
    }

    const source = sourceForDraw(tier, request, drawIndex, issuanceId);
    item = generateVerifiedItem({
      seed: equipmentSeed(request.requestId, drawIndex, stream),
      source,
      slot,
      rarity,
      ...(legendaryEffectId ? { legendaryEffectId } : {}),
      ...(rarity === "legendary" ? {
        allowedLegendaryEffectIds: tier === "standard"
          ? request.manifest.allowedLegendaryEffectIds
          : [request.manifest.featuredEffectId, ...request.manifest.allowedAlternativeEffectIds],
      } : {}),
      generatorVersion: request.manifest.generatorVersion,
    }, context.adapters);
    if (rarity === "legendary") {
      lane.epicCounter = 0;
      lane.legendaryCounter = 0;
    } else if (rarity === "epic") {
      lane.epicCounter = 0;
      lane.legendaryCounter += 1;
    } else {
      lane.epicCounter += 1;
      lane.legendaryCounter += 1;
    }
    return {
      rarity,
      slot,
      item,
      scrap: 0,
      scrapCredited: 0,
      salvageValue: PULL_SALVAGE_VALUES[tier][rarity],
      disposition: "kept",
      autoScrapped: false,
      tradeable: true,
      featuredResult,
      forcedEpic: rarity === "epic" && forcedEpic,
      pity: { epicCounter: lane.epicCounter, legendaryCounter: lane.legendaryCounter },
    };
  }

  function resolveDrawBatch(options = {}) {
    const tier = normalizeTier(options.tier);
    const count = Math.max(1, Math.min(10, nonNegativeInteger(options.count)));
    const manifest = tier === "standard"
      ? normalizePoolManifest(options.manifest)
      : normalizeBannerManifest(options.manifest);
    const request = {
      requestId: String(options.requestId || "draw-batch"),
      tier,
      count,
      manifest,
    };
    const context = {
      tier,
      request,
      lane: normalizeLane(options.lane),
      featuredGuarantee: Boolean(options.premiumFeaturedGuarantee),
      adapters: options.adapters || {},
    };
    const stream = createRandomStream(options.randomValues);
    const results = [];
    for (let index = 0; index < count; index += 1) {
      results.push(resolveOneDraw(context, stream, index));
    }
    return Object.freeze({
      results: Object.freeze(results),
      lane: Object.freeze(context.lane),
      premiumFeaturedGuarantee: context.featuredGuarantee,
      randomValuesConsumed: stream.consumed(),
    });
  }

  function requestDraw(rawState, options = {}) {
    const state = normalizeState(rawState);
    const requestId = String(options.requestId || "");
    const tier = normalizeTier(options.tier);
    const count = Math.max(1, Math.min(10, nonNegativeInteger(options.count)));
    const manifest = tier === "standard"
      ? normalizePoolManifest(options.manifest)
      : normalizeBannerManifest(options.manifest);
    if (!requestId) throw new Error("Draw request requires a request ID.");
    const existing = state.pendingRequests.find((entry) => entry.requestId === requestId);
    if (existing) return Object.freeze({ state: Object.freeze(state), accepted: true, idempotent: true, request: Object.freeze(existing) });
    if (state.processedTransactionIds.includes(`draw:${requestId}`)) {
      return Object.freeze({ state: Object.freeze(state), accepted: true, idempotent: true, request: null });
    }
    const inventoryCount = nonNegativeInteger(options.inventoryCount);
    const capacity = Math.max(1, nonNegativeInteger(options.inventoryCapacity || DEFAULT_INVENTORY_CAPACITY));
    if (inventoryCount + count > capacity) {
      return Object.freeze({ state: Object.freeze(state), accepted: false, reason: "inventoryCapacity" });
    }
    const balanceKey = `${tier}Tickets`;
    if (state[balanceKey] < count) {
      return Object.freeze({ state: Object.freeze(state), accepted: false, reason: "insufficientTickets" });
    }
    state[balanceKey] -= count;
    const request = {
      requestId,
      tier,
      count,
      manifest,
      requestedAt: String(options.requestedAt || ""),
    };
    state.pendingRequests.push(request);
    captureManifest(state, manifest);
    appendHistory(state, { type: "drawRequested", requestId, tier, count, manifestHash: manifest.manifestHash });
    return Object.freeze({ state: Object.freeze(state), accepted: true, idempotent: false, request: Object.freeze(request) });
  }

  function fulfilDraw(rawState, options = {}) {
    const state = normalizeState(rawState);
    const requestId = String(options.requestId || "");
    const fulfilmentId = String(options.fulfilmentId || "");
    if (!requestId || !fulfilmentId) throw new Error("Draw fulfilment requires request and fulfilment IDs.");
    if (state.processedTransactionIds.includes(fulfilmentId) || state.processedTransactionIds.includes(`draw:${requestId}`)) {
      return Object.freeze({ state: Object.freeze(state), accepted: true, idempotent: true, results: Object.freeze([]), items: Object.freeze([]) });
    }
    const request = state.pendingRequests.find((entry) => entry.requestId === requestId);
    if (!request) return Object.freeze({ state: Object.freeze(state), accepted: false, reason: "unknownRequest" });
    let resolution;
    try {
      resolution = resolveDrawBatch({
        requestId,
        tier: request.tier,
        count: request.count,
        manifest: request.manifest,
        lane: state.lanes[request.tier],
        premiumFeaturedGuarantee: state.premiumFeaturedGuarantee,
        randomValues: options.randomValues,
        adapters: options.adapters,
      });
    } catch (error) {
      return Object.freeze({
        state: Object.freeze(state),
        accepted: false,
        reason: "fulfilmentFailed",
        error: error.message,
      });
    }
    const items = resolution.results.map((entry) => entry.item).filter(Boolean);
    const inventoryCount = nonNegativeInteger(options.inventoryCount);
    const capacity = Math.max(1, nonNegativeInteger(options.inventoryCapacity || DEFAULT_INVENTORY_CAPACITY));
    if (inventoryCount + items.length > capacity) {
      return Object.freeze({ state: Object.freeze(state), accepted: false, reason: "inventoryCapacity" });
    }
    state.lanes[request.tier] = deepClone(resolution.lane);
    state.premiumFeaturedGuarantee = resolution.premiumFeaturedGuarantee;
    state.scrap += resolution.results.reduce((sum, entry) => sum + nonNegativeInteger(entry.scrap), 0);
    state.pendingRequests = state.pendingRequests.filter((entry) => entry.requestId !== requestId);
    appendProcessed(state, `draw:${requestId}`);
    appendProcessed(state, fulfilmentId);
    appendHistory(state, {
      type: "drawFulfilled",
      requestId,
      fulfilmentId,
      tier: request.tier,
      count: request.count,
      manifestHash: request.manifest.manifestHash,
      results: resolution.results.map((entry) => ({
        rarity: entry.rarity,
        slot: entry.slot || "",
        scrap: entry.scrap || 0,
        scrapCredited: entry.scrapCredited || 0,
        salvageValue: entry.salvageValue || 0,
        disposition: entry.disposition || "kept",
        autoScrapped: Boolean(entry.autoScrapped),
        tradeable: Boolean(entry.tradeable),
        itemId: entry.item?.itemId || "",
        featuredResult: entry.featuredResult || "",
      })),
    });
    return Object.freeze({
      state: Object.freeze(state),
      accepted: true,
      idempotent: false,
      results: resolution.results,
      items: Object.freeze(items),
    });
  }

  function recoverFailedDraw(rawState, options = {}) {
    const state = normalizeState(rawState);
    const requestId = String(options.requestId || "");
    const recoveryId = String(options.recoveryId || "");
    if (!requestId || !recoveryId) throw new Error("Draw recovery requires request and recovery IDs.");
    if (state.processedTransactionIds.includes(recoveryId)) {
      return Object.freeze({ state: Object.freeze(state), accepted: true, idempotent: true });
    }
    const request = state.pendingRequests.find((entry) => entry.requestId === requestId);
    if (!request) return Object.freeze({ state: Object.freeze(state), accepted: false, reason: "unknownRequest" });
    state[`${request.tier}Tickets`] += request.count;
    state.pendingRequests = state.pendingRequests.filter((entry) => entry.requestId !== requestId);
    appendProcessed(state, recoveryId);
    appendProcessed(state, `draw:${requestId}`);
    appendHistory(state, { type: "drawRecovered", requestId, recoveryId, tier: request.tier, count: request.count });
    return Object.freeze({ state: Object.freeze(state), accepted: true, idempotent: false });
  }

  function craftWithScrap(rawState, options = {}) {
    const state = normalizeState(rawState);
    const transactionId = String(options.transactionId || "");
    if (!transactionId) throw new Error("Scrap craft requires a transaction ID.");
    if (state.processedTransactionIds.includes(transactionId)) {
      return Object.freeze({ state: Object.freeze(state), accepted: true, idempotent: true, item: null });
    }
    const rarity = String(options.rarity || "").toLowerCase();
    const recipe = SCRAP_RECIPES[rarity];
    if (!recipe) return Object.freeze({ state: Object.freeze(state), accepted: false, reason: "invalidRarity" });
    const exactSlot = options.slot ? normalizeSlot(options.slot) : "";
    const mode = exactSlot ? "exact" : "random";
    const cost = recipe[mode];
    if (state.scrap < cost) return Object.freeze({ state: Object.freeze(state), accepted: false, reason: "insufficientScrap", cost });
    const inventoryCount = nonNegativeInteger(options.inventoryCount);
    const capacity = Math.max(1, nonNegativeInteger(options.inventoryCapacity || DEFAULT_INVENTORY_CAPACITY));
    if (inventoryCount + 1 > capacity) {
      return Object.freeze({ state: Object.freeze(state), accepted: false, reason: "inventoryCapacity", cost });
    }
    const stream = createRandomStream(options.randomValues);
    let item;
    try {
      const allowedLegendaryEffectIds = rarity === "legendary"
        ? [...new Set((options.allowedLegendaryEffectIds || []).map(String))]
        : [];
      const eligibleSlots = rarity === "legendary"
        ? equipment.slots.filter((entry) => equipment.legendaryEffects.some((effect) => (
          allowedLegendaryEffectIds.includes(effect.id) && effect.compatibleSlots.includes(entry.id)
        )))
        : equipment.slots;
      const slot = exactSlot || eligibleSlots[chooseIndex(eligibleSlots.length, stream.next("Scrap craft slot"))].id;
      const recipeId = `${rarity}:${mode === "exact" ? slot : "random"}`;
      const source = {
        type: "scrap_craft",
        issuanceId: transactionId,
        recipeId,
        manifestHash: String(options.manifestHash || "hb-scrap-craft-v1"),
        accountBound: true,
        marketplaceEligible: false,
      };
      const legendaryEffectId = rarity === "legendary"
        ? equipment.legendaryEffects.filter((effect) => (
          allowedLegendaryEffectIds.includes(effect.id) && effect.compatibleSlots.includes(slot)
        ))[chooseIndex(
          equipment.legendaryEffects.filter((effect) => (
            allowedLegendaryEffectIds.includes(effect.id) && effect.compatibleSlots.includes(slot)
          )).length,
          stream.next("Scrap craft Legendary effect")
        )].id
        : "";
      item = generateVerifiedItem({
        seed: equipmentSeed(transactionId, 0, stream),
        source,
        slot,
        rarity,
        ...(legendaryEffectId ? { legendaryEffectId } : {}),
        ...(rarity === "legendary" ? { allowedLegendaryEffectIds } : {}),
        generatorVersion: equipment.generatorVersion,
      }, options.adapters);
    } catch (error) {
      return Object.freeze({
        state: Object.freeze(state),
        accepted: false,
        reason: "issuanceFailed",
        error: error.message,
        cost,
      });
    }
    state.scrap -= cost;
    appendProcessed(state, transactionId);
    appendHistory(state, {
      type: "scrapCraft",
      transactionId,
      recipeId: item.source.recipeId,
      cost,
      itemId: item.itemId,
      rarity: item.rarity,
      slot: item.slot,
    });
    return Object.freeze({ state: Object.freeze(state), accepted: true, idempotent: false, item, cost });
  }

  return Object.freeze({
    SCHEMA_VERSION,
    ODDS_VERSION,
    EPIC_GUARANTEE_DRAW,
    LEGENDARY_HARD_PITY_DRAW,
    BASE_EPIC_PROBABILITY,
    BASE_LEGENDARY_PROBABILITY,
    BASE_RARITY_RATES,
    LOWER_RARITY_WEIGHTS,
    PULL_SALVAGE_VALUES,
    SOFT_PITY,
    SCRAP_RECIPES,
    TICKET_PRICES_USD,
    DEFAULT_INVENTORY_CAPACITY,
    TEMPORARY_PLAYTEST_TICKET_GRANT,
    createInitialState,
    normalizeState,
    migrateV098Rewards,
    applyTemporaryPlaytestTicketGrant,
    depositBoardReward,
    creditEquipmentSalvage,
    requestDraw,
    fulfilDraw,
    recoverFailedDraw,
    resolveDrawBatch,
    craftWithScrap,
    normalizePoolManifest,
    normalizeBannerManifest,
    legendaryProbability,
    rarityProbabilities,
    manifestHash,
  });
});
