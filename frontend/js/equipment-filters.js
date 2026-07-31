(function initEquipmentFilters(root, factory) {
  "use strict";

  const equipment = typeof module === "object" && module.exports
    ? require("./equipment.js")
    : root?.LoothoodEquipment;
  const api = factory(equipment);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodEquipmentFilters = api;
})(typeof window !== "undefined" ? window : globalThis, function equipmentFiltersFactory(equipment) {
  "use strict";

  if (!equipment) throw new Error("Equipment filters require the equipment registry.");

  const RARITIES = Object.freeze(["common", "uncommon", "rare", "epic", "legendary"]);
  const SLOT_IDS = Object.freeze(equipment.slots.map((slot) => slot.id));
  const STAT_OPTIONS = Object.freeze(equipment.stats.map((stat) => Object.freeze({ id: stat.id, label: stat.label })));
  const STAT_IDS = new Set(STAT_OPTIONS.map((stat) => stat.id));

  function normalize(input = {}) {
    const slot = SLOT_IDS.includes(input.slot) ? input.slot : "all";
    const rarity = RARITIES.includes(input.rarity) ? input.rarity : "all";
    const stats = [...new Set((Array.isArray(input.stats) ? input.stats : [])
      .map((statId) => String(statId || ""))
      .filter((statId) => STAT_IDS.has(statId)))];
    return { slot, rarity, stats };
  }

  function matches(item, input = {}) {
    const filter = normalize(input);
    if (!item || (filter.slot !== "all" && item.slot !== filter.slot)) return false;
    if (filter.rarity !== "all" && item.rarity !== filter.rarity) return false;
    const itemStats = new Set((item.affixes || []).map((affix) => affix?.statId).filter(Boolean));
    return filter.stats.every((statId) => itemStats.has(statId));
  }

  function filterItems(items, input = {}) {
    return (Array.isArray(items) ? items : []).filter((item) => matches(item, input));
  }

  function activeCount(input = {}) {
    const filter = normalize(input);
    return Number(filter.slot !== "all") + Number(filter.rarity !== "all") + filter.stats.length;
  }

  function toggleStat(input = {}, statId = "") {
    const filter = normalize(input);
    if (!STAT_IDS.has(statId)) return filter;
    const selected = new Set(filter.stats);
    if (selected.has(statId)) selected.delete(statId);
    else selected.add(statId);
    return normalize({ ...filter, stats: [...selected] });
  }

  function clear() {
    return { slot: "all", rarity: "all", stats: [] };
  }

  return Object.freeze({
    RARITIES,
    SLOT_IDS,
    STAT_OPTIONS,
    normalize,
    matches,
    filterItems,
    activeCount,
    toggleStat,
    clear,
  });
});
