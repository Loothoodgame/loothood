(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodEquipmentRelease = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const MANIFEST_SCHEMA_VERSION = 1;
  const OUTLAW_EFFECT_ID = "elementalInitiation";
  const STANDARD_GACHA_EFFECT_IDS = Object.freeze([
    // Everything that has a branch in the runtime is released: 48 out of 51.
    // Previously only fifteen were in circulation, and the player kept seeing
    // the same handful of items over and over, even though all fifty-one are
    // written and drawn.
    //
    // Now everything is released, 51 out of 51.
    //
    // About the last three — HOMEWARD_BODKINS, FORKED_REBOUND and
    // EXECUTION_RELAY — this comment used to claim that "there is not a single
    // line of code that handles them". That was untrue, and I wrote it myself
    // without looking in game.js: the branches for all three were in place and
    // working, and the descriptions matched them.
    //
    // What they were missing was something else. For the other forty-eight,
    // every legendary breaks one rule and pays for it, whereas these three were
    // pure upside with no downside whatsoever. The prices have now been written
    // in: the arrow return holds back the volley, the branching gives up
    // pierce, the relay cuts ordinary damage by 15%.
    "HELM-AEL-V5-01",
    "HELM-AEL-V5-03",
    "HELM-AEL-V5-04",
    "HELM-AEL-V5-05",
    "HELM-AEL-V5-06",
    "HELM-AEL-V5-09",
    "HELM-AEL-V5-11",
    "HELM-AEL-V5-12",
    "HELM-AEL-V5-17",
    "HELM-AEL-V5-20",

    "CHEST-AEL-V5-01",
    "CHEST-AEL-V5-03",
    "CHEST-AEL-V5-04",
    "CHEST-AEL-V5-07",
    "CHEST-AEL-V5-08",
    "CHEST-AEL-V5-09",
    "CHEST-AEL-V5-10",
    "CHEST-AEL-V5-13",
    "CHEST-AEL-V5-15",
    "CHEST-AEL-V5-17",
    "CHEST-AEL-V5-18",
    "CHEST-AEL-V5-19",
    "CHEST-AEL-V5-20",

    "BOOTS-AEL-V5-01",
    "BOOTS-AEL-V5-03",
    "BOOTS-AEL-V5-04",
    "BOOTS-AEL-V5-05",
    "BOOTS-AEL-V5-06",
    "BOOTS-AEL-V5-07",
    "BOOTS-AEL-V5-08",
    "BOOTS-AEL-V5-14",
    "BOOTS-AEL-V5-15",
    "BOOTS-AEL-V5-17",
    "BOOTS-AEL-V5-18",
    "BOOTS-AEL-V5-20",

    "LEGS-AEL-V5-01",
    "LEGS-AEL-V5-02",
    "LEGS-AEL-V5-03",
    "LEGS-AEL-V5-04",
    "LEGS-AEL-V5-05",
    "LEGS-AEL-V5-07",
    "LEGS-AEL-V5-08",
    "LEGS-AEL-V5-09",
    "LEGS-AEL-V5-10",
    "LEGS-AEL-V5-12",
    "LEGS-AEL-V5-13",
    "LEGS-AEL-V5-14",
    "LEGS-AEL-V5-15",
    "LEGS-AEL-V5-16",
    "LEGS-AEL-V5-17",
    "LEGS-AEL-V5-18",
  ]);
  const LIMITED_GACHA_EFFECT_IDS = Object.freeze([...STANDARD_GACHA_EFFECT_IDS]);
  const PUBLIC_GACHA_EFFECT_IDS = Object.freeze([
    ...new Set([...STANDARD_GACHA_EFFECT_IDS, ...LIMITED_GACHA_EFFECT_IDS]),
  ]);
  const PUBLIC_USABLE_EFFECT_IDS = Object.freeze([OUTLAW_EFFECT_ID, ...PUBLIC_GACHA_EFFECT_IDS]);
  const standardGachaSet = new Set(STANDARD_GACHA_EFFECT_IDS);
  const limitedGachaSet = new Set(LIMITED_GACHA_EFFECT_IDS);
  const publicGachaSet = new Set(PUBLIC_GACHA_EFFECT_IDS);
  const publicUsableSet = new Set(PUBLIC_USABLE_EFFECT_IDS);

  function isPublicGachaEffect(effectId) {
    return publicGachaSet.has(String(effectId || ""));
  }

  function isStandardGachaEffect(effectId) {
    return standardGachaSet.has(String(effectId || ""));
  }

  function isLimitedGachaEffect(effectId) {
    return limitedGachaSet.has(String(effectId || ""));
  }

  function isPubliclyUsableEffect(effectId) {
    return publicUsableSet.has(String(effectId || ""));
  }

  function isInternalQaItem(item, playtestOverride = false) {
    return Boolean(playtestOverride && item?.source?.type === "equipment_playtest_crate");
  }

  function availabilityForItem(item, options = {}) {
    if (!item || typeof item !== "object") return Object.freeze({ usable: false, reason: "missingItem" });
    if (item.rarity !== "legendary") return Object.freeze({ usable: true, reason: "ordinaryEquipment" });
    const suspendedEffectIds = new Set(
      (Array.isArray(options.suspendedEffectIds) ? options.suspendedEffectIds : [])
        .map((effectId) => String(effectId || ""))
        .filter(Boolean)
    );
    if (suspendedEffectIds.has(String(item.legendaryEffectId || ""))) {
      return Object.freeze({ usable: false, reason: "safetySuspension" });
    }
    if (isPubliclyUsableEffect(item.legendaryEffectId)) {
      return Object.freeze({ usable: true, reason: item.legendaryEffectId === OUTLAW_EFFECT_ID ? "earnedOutlaw" : "releaseRoster" });
    }
    if (isInternalQaItem(item, options.playtestOverride)) {
      return Object.freeze({ usable: true, reason: "internalQaOverride" });
    }
    return Object.freeze({ usable: false, reason: "unreleasedLegendary" });
  }

  return Object.freeze({
    MANIFEST_SCHEMA_VERSION,
    OUTLAW_EFFECT_ID,
    STANDARD_GACHA_EFFECT_IDS,
    LIMITED_GACHA_EFFECT_IDS,
    PUBLIC_GACHA_EFFECT_IDS,
    PUBLIC_USABLE_EFFECT_IDS,
    isPublicGachaEffect,
    isStandardGachaEffect,
    isLimitedGachaEffect,
    isPubliclyUsableEffect,
    isInternalQaItem,
    availabilityForItem,
  });
});
