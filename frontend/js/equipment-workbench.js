(function initEquipmentWorkbench(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodEquipmentWorkbench = api;
})(typeof window !== "undefined" ? window : globalThis, function equipmentWorkbenchFactory() {
  "use strict";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createCandidate(equipment, item, action, affixIndex, seed) {
    if (!equipment?.createRerollCandidate) throw new Error("Equipment revision mechanics are unavailable.");
    const result = equipment.createRerollCandidate(item, action, affixIndex, seed);
    return Object.freeze({
      originalItemId: item.itemId,
      action,
      affixIndex,
      item: clone(result.item),
      costContext: clone(result.costContext),
    });
  }

  function commitCandidate(equipment, equipmentState, pending) {
    if (!equipmentState || !Array.isArray(equipmentState.items) || !pending?.item) {
      return { accepted: false, reason: "invalidCandidate", state: equipmentState };
    }
    const sourceIndex = equipmentState.items.findIndex((item) => item.itemId === pending.originalItemId);
    if (sourceIndex < 0) return { accepted: false, reason: "itemChanged", state: equipmentState };
    const verification = equipment.verifyEquipment(pending.item);
    if (!verification.ok) {
      return { accepted: false, reason: "verification", errors: verification.errors, state: equipmentState };
    }
    const next = clone(equipmentState);
    const original = next.items[sourceIndex];
    if (original.itemId !== pending.costContext?.itemId) {
      return { accepted: false, reason: "itemChanged", state: equipmentState };
    }
    next.items[sourceIndex] = clone(pending.item);
    if (next.equipped?.[original.slot] === original.itemId) next.equipped[original.slot] = pending.item.itemId;
    if (Array.isArray(next.favouriteItemIds)) {
      next.favouriteItemIds = [...new Set(next.favouriteItemIds.map((itemId) => (
        itemId === original.itemId ? pending.item.itemId : itemId
      )))];
    }
    if (Array.isArray(next.protectedItemIds)) {
      next.protectedItemIds = [...new Set(next.protectedItemIds.map((itemId) => (
        itemId === original.itemId ? pending.item.itemId : itemId
      )))];
    }
    return { accepted: true, state: next, item: clone(pending.item) };
  }

  return Object.freeze({ createCandidate, commitCandidate });
});
