(function initEquipmentManagement(root, factory) {
  "use strict";

  const equipment = typeof module === "object" && module.exports
    ? require("./equipment.js")
    : root?.LoothoodEquipment;
  const api = factory(equipment);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodEquipmentManagement = api;
})(typeof window !== "undefined" ? window : globalThis, function equipmentManagementFactory(equipment) {
  "use strict";

  if (!equipment) throw new Error("Equipment management requires the equipment registry.");

  const RARITIES = Object.freeze(["common", "uncommon", "rare", "epic", "legendary"]);
  const ELIGIBLE_SOURCES = Object.freeze(["gacha_standard", "gacha_premium", "scrap_craft", "tutorial_grant"]);
  const BLOCKING_REASON_PRIORITY = Object.freeze([
    Object.freeze({ id: "equipped", label: "Equipped" }),
    Object.freeze({ id: "locked", label: "Unavailable" }),
    Object.freeze({ id: "reward", label: "Reward" }),
    Object.freeze({ id: "test", label: "Test" }),
    Object.freeze({ id: "protected", label: "Protected" }),
    Object.freeze({ id: "invalid", label: "Invalid" }),
  ]);
  const COMPARISON_EPSILON = 1e-9;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeProtectedItemIds(rawIds, items) {
    const owned = new Set((Array.isArray(items) ? items : []).map((item) => item?.itemId).filter(Boolean));
    return [...new Set((Array.isArray(rawIds) ? rawIds : [])
      .map((itemId) => String(itemId || ""))
      .filter((itemId) => owned.has(itemId)))];
  }

  function salvageTier(item) {
    if (item?.source?.type === "gacha_premium") return "premium";
    if (["gacha_standard", "scrap_craft", "tutorial_grant"].includes(item?.source?.type)) return "standard";
    return "";
  }

  function salvageValue(item, values) {
    const tier = salvageTier(item);
    return Number(values?.[tier]?.[item?.rarity]) || 0;
  }

  function scrapEligibility(equipmentState, item, values) {
    const verification = item ? equipment.verifyEquipment(item) : { ok: false, errors: ["Equipment is missing."] };
    const availability = item
      ? equipment.equipmentAvailability(item, { playtestOverride: equipmentState?.playtestOverride })
      : { usable: false };
    const sourceType = item?.source?.type || "";
    const classes = new Set();
    if (item && Object.values(equipmentState?.equipped || {}).includes(item.itemId)) classes.add("equipped");
    if (item && (equipmentState?.unavailableItemIds || []).includes(item.itemId)) classes.add("locked");
    if (sourceType === "p0_first_clear") classes.add("reward");
    if (sourceType === "equipment_playtest_crate") classes.add("test");
    if (item && (equipmentState?.protectedItemIds || []).includes(item.itemId)) classes.add("protected");
    if (!verification.ok || !availability.usable || (item && !ELIGIBLE_SOURCES.includes(sourceType) && !classes.has("reward") && !classes.has("test"))) classes.add("invalid");
    const value = salvageValue(item, values);
    if (item && ELIGIBLE_SOURCES.includes(sourceType) && value <= 0) classes.add("invalid");
    const blockers = BLOCKING_REASON_PRIORITY.filter((entry) => classes.has(entry.id));
    if (blockers.length) {
      return {
        eligible: false,
        reason: blockers[0].label,
        reasonClass: blockers[0].id,
        blockingClasses: blockers.map((entry) => entry.id),
        value: 0,
      };
    }
    return { eligible: true, reason: "Eligible", reasonClass: "eligible", blockingClasses: [], value };
  }

  function selectBelowRarity(equipmentState, rarity, values, visibleItemIds = null) {
    const threshold = RARITIES.indexOf(String(rarity || "").toLowerCase());
    if (threshold < 0) return [];
    const visible = Array.isArray(visibleItemIds) ? new Set(visibleItemIds) : null;
    return (equipmentState?.items || [])
      .filter((item) => !visible || visible.has(item.itemId))
      .filter((item) => RARITIES.indexOf(item.rarity) < threshold)
      .filter((item) => scrapEligibility(equipmentState, item, values).eligible)
      .map((item) => item.itemId);
  }

  function buildScrapReview(equipmentState, selectedIds, values) {
    const selected = new Set(Array.isArray(selectedIds) ? selectedIds : []);
    const items = (equipmentState?.items || []).map((item) => {
      const eligibility = scrapEligibility(equipmentState, item, values);
      return { item, ...eligibility, selected: selected.has(item.itemId) && eligibility.eligible };
    });
    const chosen = items.filter((entry) => entry.selected);
    return {
      items,
      selectedIds: chosen.map((entry) => entry.item.itemId),
      selectedCount: chosen.length,
      projectedScrap: chosen.reduce((sum, entry) => sum + entry.value, 0),
    };
  }

  function removeScrappedItems(equipmentState, selectedIds) {
    const selected = new Set(Array.isArray(selectedIds) ? selectedIds : []);
    const next = clone(equipmentState);
    const equippedIds = new Set(Object.values(next.equipped || {}).filter(Boolean));
    if ([...selected].some((itemId) => equippedIds.has(itemId))) throw new Error("Equipped equipment cannot be scrapped.");
    next.items = next.items.filter((item) => !selected.has(item.itemId));
    next.favouriteItemIds = (next.favouriteItemIds || []).filter((itemId) => !selected.has(itemId));
    next.protectedItemIds = (next.protectedItemIds || []).filter((itemId) => !selected.has(itemId));
    return next;
  }

  function itemStatTotals(item) {
    const totals = new Map();
    for (const affix of item?.affixes || []) {
      if (!affix?.statId || !Number.isFinite(affix.value)) continue;
      totals.set(affix.statId, (totals.get(affix.statId) || 0) + affix.value);
    }
    return totals;
  }

  function compareItems(equippedItem, selectedItem) {
    if (!equippedItem || !selectedItem || equippedItem.slot !== selectedItem.slot) {
      return { comparable: false, verdict: "none", rows: [] };
    }

    const equipped = itemStatTotals(equippedItem);
    const selected = itemStatTotals(selectedItem);
    const rows = equipment.stats
      .filter((stat) => equipped.has(stat.id) || selected.has(stat.id))
      .map((stat) => {
        const hasEquipped = equipped.has(stat.id);
        const hasSelected = selected.has(stat.id);
        const equippedValue = hasEquipped ? equipped.get(stat.id) : 0;
        const selectedValue = hasSelected ? selected.get(stat.id) : 0;
        const delta = selectedValue - equippedValue;
        let state = "same";
        if (!hasEquipped && hasSelected) state = "new";
        else if (hasEquipped && !hasSelected) state = "lost";
        else if (delta > COMPARISON_EPSILON) state = "gain";
        else if (delta < -COMPARISON_EPSILON) state = "loss";
        return Object.freeze({
          statId: stat.id,
          label: stat.label,
          format: stat.format,
          hasEquipped,
          hasSelected,
          equippedValue,
          selectedValue,
          delta,
          state,
        });
      });

    const hasGain = rows.some((row) => row.delta > COMPARISON_EPSILON);
    const hasLoss = rows.some((row) => row.delta < -COMPARISON_EPSILON);
    const verdict = hasGain && !hasLoss
      ? "upgrade"
      : hasLoss && !hasGain
        ? "downgrade"
        : "mixed";
    return Object.freeze({ comparable: true, verdict, rows: Object.freeze(rows) });
  }

  return Object.freeze({
    RARITIES,
    ELIGIBLE_SOURCES,
    BLOCKING_REASON_PRIORITY,
    normalizeProtectedItemIds,
    salvageTier,
    salvageValue,
    scrapEligibility,
    selectBelowRarity,
    buildScrapReview,
    removeScrappedItems,
    itemStatTotals,
    compareItems,
  });
});
