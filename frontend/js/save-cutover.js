(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodSaveCutover = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CURRENT_SCHEMA = 4;

  function plainObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  }

  function normalizeSettings(value) {
    const source = plainObject(value) || {};
    const controls = plainObject(source.controls) || {};
    const accessibility = plainObject(source.accessibility) || {};
    const volume = Number.isFinite(Number(source.volume)) ? Math.max(0, Math.min(1, Number(source.volume))) : null;
    const muted = Boolean(source.muted) || volume === 0;
    const savedPositive = Number(source.lastPositiveVolume);
    const lastPositiveVolume = Number.isFinite(savedPositive) && savedPositive > 0
      ? Math.max(0.01, Math.min(1, savedPositive))
      : volume !== null && volume > 0
        ? volume
        : 1;
    return Object.freeze({
      volume,
      muted,
      lastPositiveVolume,
      controls: Object.freeze({
        touchSide: controls.touchSide === "right" ? "right" : "left",
        arenaFit: controls.arenaFit === "preserve" ? "preserve" : "fill",
      }),
      accessibility: Object.freeze({
        reducedMotion: Boolean(accessibility.reducedMotion),
        highContrast: Boolean(accessibility.highContrast),
      }),
    });
  }

  function savedBuildingIds(saved) {
    const ids = new Set();
    if (Array.isArray(saved?.buildingPlots)) {
      for (const plot of saved.buildingPlots) {
        if (plot && typeof plot.id === "string" && plot.id.trim()) ids.add(plot.id.trim());
      }
    }
    const aggregate = plainObject(saved?.buildings);
    if (aggregate) {
      for (const [id, level] of Object.entries(aggregate)) {
        if (typeof id === "string" && id.trim() && Number(level) > 0) ids.add(id.trim());
      }
    }
    return [...ids].sort();
  }

  function inspect(saved, knownBuildingIds = []) {
    if (!plainObject(saved)) return Object.freeze({ reset: false, reason: "fresh", retiredIds: [] });
    const schema = Number(saved.progressionSaveSchemaVersion);
    if (!Number.isInteger(schema) || schema !== CURRENT_SCHEMA) {
      return Object.freeze({ reset: true, reason: "preCutoverSchema", retiredIds: [] });
    }
    const known = new Set(knownBuildingIds);
    const retiredIds = savedBuildingIds(saved).filter((id) => !known.has(id));
    if (retiredIds.length) return Object.freeze({ reset: true, reason: "retiredBuilding", retiredIds });
    return Object.freeze({ reset: false, reason: "current", retiredIds: [] });
  }

  return Object.freeze({ CURRENT_SCHEMA, normalizeSettings, savedBuildingIds, inspect });
});
