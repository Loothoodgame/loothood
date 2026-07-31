(function initEquipmentRerollPayment(root, factory) {
  "use strict";

  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodEquipmentRerollPayment = api;
})(typeof window !== "undefined" ? window : globalThis, function equipmentRerollPaymentFactory(root) {
  "use strict";

  const STATUSES = Object.freeze(["success", "insufficient_funds", "declined"]);
  const PENDING_COST_LABEL = "—";

  function normalizeResult(result, fallbackStatus = "declined") {
    const source = result && typeof result === "object" ? result : {};
    const status = STATUSES.includes(source.status) ? source.status : fallbackStatus;
    return Object.freeze({
      status,
      transactionId: status === "success" ? String(source.transactionId || "") : "",
      costLabel: String(source.costLabel || PENDING_COST_LABEL),
      shortfallLabel: status === "insufficient_funds" ? String(source.shortfallLabel || PENDING_COST_LABEL) : "",
      message: String(source.message || ""),
    });
  }

  function provider() {
    const candidate = root?.LoothoodEquipmentRerollPaymentProvider;
    return candidate && typeof candidate === "object" ? candidate : null;
  }

  function quote(context) {
    const active = provider();
    if (!active || typeof active.quote !== "function") {
      return normalizeResult({
        status: "declined",
        costLabel: PENDING_COST_LABEL,
        message: "Reroll payment integration pending.",
      });
    }
    try {
      return normalizeResult(active.quote(Object.freeze({ ...context })));
    } catch (error) {
      return normalizeResult({ status: "declined", costLabel: PENDING_COST_LABEL, message: error?.message });
    }
  }

  async function request(context) {
    const active = provider();
    if (!active || typeof active.request !== "function") {
      return normalizeResult({
        status: "declined",
        costLabel: PENDING_COST_LABEL,
        message: "Reroll payment integration pending.",
      });
    }
    try {
      return normalizeResult(await active.request(Object.freeze({ ...context })));
    } catch (error) {
      return normalizeResult({ status: "declined", costLabel: PENDING_COST_LABEL, message: error?.message });
    }
  }

  return Object.freeze({
    STATUSES,
    PENDING_COST_LABEL,
    normalizeResult,
    quote,
    request,
  });
});
