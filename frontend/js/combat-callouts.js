(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodCombatCallouts = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_VISIBLE = 2;
  const SECONDARY_TTL = 1.8;

  const PRESETS = Object.freeze({
    dodge: Object.freeze({ title: "DODGE", detail: "Dodge the hazard.", color: "#ff9b58" }),
    charge: Object.freeze({ title: "CHARGE", detail: "Dodge the charge.", color: "#ff9b58" }),
    move: Object.freeze({ title: "MOVE", detail: "Keep moving.", color: "#ff9b58" }),
    breakFree: Object.freeze({ title: "BREAK FREE", detail: "Move to break free.", color: "#e0b84e" }),
    safeRoute: Object.freeze({ title: "SAFE ROUTE", detail: "Follow the clear route.", color: "#f5d77e" }),
    target: Object.freeze({ title: "TARGET", detail: "Attack the active target.", color: "#79d66d" }),
    wait: Object.freeze({ title: "WAIT", detail: "The boss cannot take damage.", color: "#90d3ff" }),
    exposed: Object.freeze({ title: "EXPOSED", detail: "2x damage", color: "#f5d77e" }),
  });

  const LANE_PRIORITY = Object.freeze({
    secondary: 1,
    urgent: 2,
    tutorial: 3,
  });

  function cleanText(value) {
    return String(value || "").trim();
  }

  function preset(id) {
    const value = PRESETS[id];
    if (!value) throw new Error(`Unknown combat callout preset: ${id}`);
    return value;
  }

  function normalizeEntry(options = {}) {
    const title = cleanText(options.title);
    if (!title) throw new Error("Combat callouts require a title.");
    const ttl = Math.max(0.1, Number(options.ttl) || SECONDARY_TTL);
    const maxTtl = Math.max(ttl, Number(options.maxTtl) || ttl);
    return {
      id: cleanText(options.id) || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      lane: cleanText(options.lane) || "secondary",
      title,
      detail: cleanText(options.detail),
      color: cleanText(options.color) || "#f5d77e",
      ttl,
      maxTtl,
      timed: Boolean(options.timed),
      persistent: Boolean(options.persistent),
    };
  }

  function order(entries) {
    return [...entries]
      .sort((left, right) => (
        (LANE_PRIORITY[right.lane] || 0) - (LANE_PRIORITY[left.lane] || 0)
      ))
      .slice(0, MAX_VISIBLE);
  }

  function put(entries = [], options = {}) {
    const next = normalizeEntry(options);
    const retained = entries.filter((entry) => entry.id !== next.id && entry.lane !== next.lane);
    return order([...retained, next]);
  }

  function addInstant(entries = [], options = {}) {
    const next = normalizeEntry({ ...options, timed: false, persistent: false });
    if (entries.some((entry) => entry.id === next.id && entry.ttl > 0)) return entries;
    return put(entries, next);
  }

  function syncUrgent(entries = [], options = null) {
    const retained = entries.filter((entry) => entry.lane !== "urgent");
    if (!options) return order(retained);
    const next = normalizeEntry({
      ...options,
      lane: "urgent",
      timed: Number.isFinite(options.remaining),
      persistent: !Number.isFinite(options.remaining),
      ttl: Number.isFinite(options.remaining) ? options.remaining : 1,
      maxTtl: Number.isFinite(options.maxDuration) ? options.maxDuration : 1,
    });
    return order([...retained, next]);
  }

  function advance(entries = [], dt = 0) {
    const elapsed = Math.max(0, Number(dt) || 0);
    return order(entries
      .map((entry) => (
        entry.timed || entry.persistent
          ? entry
          : { ...entry, ttl: entry.ttl - elapsed }
      ))
      .filter((entry) => entry.persistent || entry.ttl > 0));
  }

  function barRatio(entry) {
    if (!entry?.timed || !(entry.maxTtl > 0)) return null;
    return Math.max(0, Math.min(1, entry.ttl / entry.maxTtl));
  }

  return Object.freeze({
    MAX_VISIBLE,
    PRESETS,
    preset,
    put,
    addInstant,
    syncUrgent,
    advance,
    barRatio,
  });
});
