(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodEquipmentLoadout = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const RARITIES = Object.freeze(["common", "uncommon", "rare", "epic", "legendary"]);

  function normalizeFavouriteItemIds(savedIds, items) {
    const ownedIds = new Set((Array.isArray(items) ? items : [])
      .map((item) => item?.itemId)
      .filter((itemId) => typeof itemId === "string" && itemId));
    const result = [];
    const seen = new Set();
    for (const itemId of Array.isArray(savedIds) ? savedIds : []) {
      if (typeof itemId !== "string" || !ownedIds.has(itemId) || seen.has(itemId)) continue;
      seen.add(itemId);
      result.push(itemId);
      if (result.length >= 100) break;
    }
    return result;
  }

  function toggleFavouriteItemId(favouriteIds, itemId, items) {
    const normalized = normalizeFavouriteItemIds(favouriteIds, items);
    if (!(Array.isArray(items) && items.some((item) => item?.itemId === itemId))) return normalized;
    return normalized.includes(itemId)
      ? normalized.filter((candidate) => candidate !== itemId)
      : [...normalized, itemId];
  }

  function normalizeFilters(filters = {}, validSlotIds = []) {
    const slotIds = new Set(validSlotIds);
    const slot = slotIds.has(filters.slot) ? filters.slot : "all";
    const rarity = RARITIES.includes(filters.rarity) ? filters.rarity : "all";
    return Object.freeze({ slot, rarity, favouritesOnly: Boolean(filters.favouritesOnly) });
  }

  function filterOwnedItems(items, filters, favouriteIds, validSlotIds = []) {
    const normalizedFilters = normalizeFilters(filters, validSlotIds);
    const favourites = new Set(normalizeFavouriteItemIds(favouriteIds, items));
    return (Array.isArray(items) ? items : []).filter((item) => (
      (normalizedFilters.slot === "all" || item.slot === normalizedFilters.slot)
      && (normalizedFilters.rarity === "all" || item.rarity === normalizedFilters.rarity)
      && (!normalizedFilters.favouritesOnly || favourites.has(item.itemId))
    ));
  }

  return Object.freeze({
    RARITIES,
    normalizeFavouriteItemIds,
    toggleFavouriteItemId,
    normalizeFilters,
    filterOwnedItems,
  });
});
