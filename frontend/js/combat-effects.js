"use strict";

(function initCombatEffects(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.LoothoodCombatEffects = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCombatEffectsApi() {
  const ROOT_CONTEXT_VERSION = 1;
  const DAMAGE_EVENT_VERSION = 1;
  const CAPABILITY_KEYS = Object.freeze([
    "canCrit",
    "canApplyStatus",
    "canPierce",
    "canRicochet",
    "canBurst",
    "canStagger",
    "canMark",
    "canLifesteal",
    "canTriggerKillRelic",
    "canBossAnchorHit",
    "canAdvanceCadence",
    "canCreateEquipmentEffect",
  ]);

  function clonePlain(value) {
    if (Array.isArray(value)) return value.map(clonePlain);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clonePlain(entry)]));
  }

  function deepFreeze(value, seen = new WeakSet()) {
    if (!value || typeof value !== "object" || seen.has(value)) return value;
    seen.add(value);
    for (const entry of Object.values(value)) deepFreeze(entry, seen);
    return Object.freeze(value);
  }

  function normalizeCapabilities(values = {}) {
    return Object.freeze(Object.fromEntries(CAPABILITY_KEYS.map((key) => [key, Boolean(values[key])])));
  }

  function normalizeHandlerVersions(values = {}) {
    return Object.freeze(Object.fromEntries(
      Object.entries(values)
        .filter(([id, version]) => id && Number.isInteger(Number(version)) && Number(version) > 0)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([id, version]) => [id, Number(version)])
    ));
  }

  function createRootContext(input = {}) {
    const rootVolleyId = Number(input.rootVolleyId);
    if (!Number.isInteger(rootVolleyId) || rootVolleyId < 1) throw new Error("rootVolleyId must be a positive integer.");
    const effectiveness = Number(input.effectiveness ?? 1);
    if (!Number.isFinite(effectiveness) || effectiveness < 0) throw new Error("effectiveness must be a non-negative number.");

    return deepFreeze({
      contextVersion: ROOT_CONTEXT_VERSION,
      rootVolleyId,
      origin: String(input.origin || "unknown"),
      damageClass: String(input.damageClass || "secondary"),
      procPolicy: String(input.procPolicy || "denyByDefault"),
      handlerVersions: normalizeHandlerVersions(input.handlerVersions),
      equipmentManifestHash: String(input.equipmentManifestHash || "none"),
      capabilities: normalizeCapabilities(input.capabilities),
      movingAtCreation: Boolean(input.movingAtCreation),
      effectiveness,
      room: Math.max(0, Math.floor(Number(input.room) || 0)),
      createdAt: Number.isFinite(Number(input.createdAt)) ? Number(input.createdAt) : 0,
      mapping: clonePlain(input.mapping || {}),
    });
  }

  function isRootContext(value) {
    return Boolean(
      value &&
      value.contextVersion === ROOT_CONTEXT_VERSION &&
      Number.isInteger(value.rootVolleyId) &&
      value.rootVolleyId > 0 &&
      value.capabilities &&
      Object.isFrozen(value)
    );
  }

  function createDamageEvent(input = {}) {
    if (!isRootContext(input.rootContext)) throw new Error("Damage events require an immutable root context.");
    const eventId = Number(input.eventId);
    if (!Number.isInteger(eventId) || eventId < 1) throw new Error("eventId must be a positive integer.");
    const requestedAmount = Number(input.requestedAmount);
    if (!Number.isFinite(requestedAmount) || requestedAmount < 0) throw new Error("requestedAmount must be a non-negative number.");

    return deepFreeze({
      eventVersion: DAMAGE_EVENT_VERSION,
      eventId,
      rootVolleyId: input.rootContext.rootVolleyId,
      rootContext: input.rootContext,
      parentEventId: Math.max(0, Math.floor(Number(input.parentEventId) || 0)),
      source: String(input.source || "secondary"),
      origin: input.rootContext.origin,
      damageClass: String(input.damageClass || input.rootContext.damageClass),
      procPolicy: input.rootContext.procPolicy,
      projectileId: Math.max(0, Math.floor(Number(input.projectileId) || 0)),
      requestedAmount,
      metadata: clonePlain(input.metadata || {}),
    });
  }

  return Object.freeze({
    ROOT_CONTEXT_VERSION,
    DAMAGE_EVENT_VERSION,
    CAPABILITY_KEYS,
    createRootContext,
    createDamageEvent,
    isRootContext,
    normalizeCapabilities,
  });
});
