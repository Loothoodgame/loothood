(function (root, factory) {
  const api = factory(root?.LoothoodAccountClient);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodValueLedgerClient = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (accountClient) {
  "use strict";

  const SCHEMA_VERSION = 4;
  const RETRYABLE_SETTLEMENT_CODES = new Set([
    "randomness_not_ready",
    "randomness_unavailable",
    "ledger_busy",
    "ledger_conflict",
  ]);
  const FATAL_AUTHORITY_CODES = new Set([
    "account_request_timeout",
    "account_service_unreachable",
    "authentication_required",
    "session_profile_changed",
    "value_ledger_unavailable",
    "internal_error",
  ]);

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
  }

  function validSnapshot(value, expectedProfileId) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    if (Number(value.schemaVersion) !== SCHEMA_VERSION) return false;
    if (expectedProfileId && value.profileId !== expectedProfileId) return false;
    if (!Number.isSafeInteger(Number(value.ledgerRevision)) || Number(value.ledgerRevision) < 1) return false;
    if (!Array.isArray(value.inventory?.items) || !Array.isArray(value.pendingDraws) || !Array.isArray(value.pendingCrafts)) return false;
    const nonnegativeInteger = (candidate) => Number.isSafeInteger(Number(candidate)) && Number(candidate) >= 0;
    if (!nonnegativeInteger(value.inventory.capacity) || Number(value.inventory.capacity) < 1) return false;
    if (!nonnegativeInteger(value.inventory.count) || Number(value.inventory.count) !== value.inventory.items.length) return false;
    if (!nonnegativeInteger(value.inventory.reserved)) return false;
    if (!nonnegativeInteger(value.tickets?.standard?.available) || !nonnegativeInteger(value.tickets?.limited?.available)) return false;
    if (!nonnegativeInteger(value.scrap?.available)) return false;
    for (const tier of ["standard", "limited"]) {
      if (!nonnegativeInteger(value.pity?.[tier]?.epicCounter) || !nonnegativeInteger(value.pity?.[tier]?.legendaryCounter)) return false;
    }
    return true;
  }

  function busyError() {
    if (accountClient?.AccountClientError) {
      return new accountClient.AccountClientError(
        409,
        "value_operation_in_progress",
        "Another protected value action is still completing.",
      );
    }
    const error = new Error("Another protected value action is still completing.");
    error.code = "value_operation_in_progress";
    return error;
  }

  function invalidSnapshotError() {
    const error = new Error("The protected value ledger returned an invalid snapshot.");
    error.code = "value_ledger_invalid";
    return error;
  }

  class ValueLedgerAuthority {
    constructor({
      api,
      profileId,
      idempotencyKey,
      onFatal = () => {},
      settlementTimeoutMs = 120_000,
      settlementPollMs = 3_000,
    } = {}) {
      if (!api || typeof api.loadValueLedger !== "function") {
        throw new TypeError("Value-ledger authority requires the account API adapter.");
      }
      if (typeof idempotencyKey !== "function") {
        throw new TypeError("Value-ledger authority requires secure idempotency keys.");
      }
      this.api = api;
      this.profileId = String(profileId || "");
      this.idempotencyKey = idempotencyKey;
      this.onFatal = onFatal;
      this.settlementTimeoutMs = Math.max(1, Number(settlementTimeoutMs) || 120_000);
      this.settlementPollMs = Math.max(0, Number(settlementPollMs) || 0);
      this.loaded = false;
      this.snapshot = null;
      this.activeRunLease = null;
      this.busy = false;
      this.fatalError = null;
    }

    async load() {
      if (this.fatalError) throw this.fatalError;
      try {
        const result = await this.api.loadValueLedger();
        if (!validSnapshot(result, this.profileId)) throw invalidSnapshotError();
        this.snapshot = Object.freeze(cloneJson(result));
        this.loaded = true;
        return this.snapshot;
      } catch (error) {
        if (String(error?.code || "") === "value_ledger_invalid") this.fail(error);
        throw this.maybeFailFatal(error);
      }
    }

    refresh() {
      return this.load();
    }

    equipmentAssetId(itemId) {
      const item = this.snapshot?.inventory?.items?.find((entry) => entry.itemId === itemId);
      return item?.assetId || null;
    }

    itemIdForAsset(equipmentAssetId) {
      const item = this.snapshot?.inventory?.items?.find((entry) => entry.assetId === equipmentAssetId);
      return item?.itemId || null;
    }

    fail(error) {
      if (this.fatalError) return;
      this.fatalError = error instanceof Error ? error : new Error("Protected value authority failed.");
      this.onFatal(this.fatalError);
    }

    maybeFailFatal(error) {
      if (FATAL_AUTHORITY_CODES.has(String(error?.code || ""))) this.fail(error);
      return error;
    }

    async mutation(operation) {
      if (!this.loaded || this.fatalError) throw this.fatalError || new Error("Protected value is not loaded.");
      if (this.busy) throw busyError();
      this.busy = true;
      try {
        return await operation();
      } catch (error) {
        throw this.maybeFailFatal(error);
      } finally {
        this.busy = false;
      }
    }

    async waitForSettlement({ kind, requestId, availableAt, timeoutMs = this.settlementTimeoutMs }) {
      const draw = kind === "draw";
      const load = () => draw
        ? this.api.loadGachaDraw(requestId)
        : this.api.loadEquipmentCraft(requestId);
      const settle = () => draw
        ? this.api.settleGachaDraw(requestId)
        : this.api.settleEquipmentCraft(requestId);
      const deadline = Date.now() + timeoutMs;
      let nextAvailableAt = Date.parse(availableAt || "") || Date.now();
      while (Date.now() < deadline) {
        const waitMs = Math.min(this.settlementPollMs, Math.max(0, nextAvailableAt - Date.now()));
        if (waitMs) await delay(waitMs);
        const current = await load();
        if (current?.status === "settled") return current;
        nextAvailableAt = Date.parse(current?.randomness?.availableAt || "") || Date.now();
        try {
          return await settle();
        } catch (error) {
          if (!RETRYABLE_SETTLEMENT_CODES.has(String(error?.code || ""))) throw error;
          await delay(error?.code === "randomness_unavailable" ? 2_000 : 500);
        }
      }
      return null;
    }

    async waitForRevision(revisionAttemptId, { timeoutMs = this.settlementTimeoutMs } = {}) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const current = await this.api.loadEquipmentRevision(revisionAttemptId);
        if (current?.status === "candidate_ready") return current;
        if (!["quoted", "randomness_pending"].includes(current?.status)) return current;
        const availableAt = Date.parse(current?.randomness?.availableAt || "") || Date.now() + this.settlementPollMs;
        await delay(Math.min(this.settlementPollMs, Math.max(500, availableAt - Date.now())));
      }
      return null;
    }

    requestDraw({ tier, drawCount }) {
      return this.mutation(async () => {
        const idempotencyKey = this.idempotencyKey("gacha-draw");
        const pending = await this.api.requestGachaDraw({ tier, drawCount }, idempotencyKey);
        await this.refresh();
        const result = await this.waitForSettlement({
          kind: "draw",
          requestId: pending.drawRequestId,
          availableAt: pending.randomness?.availableAt,
        });
        await this.refresh();
        return result;
      });
    }

    resumeDraw(drawRequestId) {
      return this.mutation(async () => {
        const current = await this.api.loadGachaDraw(drawRequestId);
        const result = current?.status === "settled" ? current : await this.waitForSettlement({
          kind: "draw",
          requestId: drawRequestId,
          availableAt: current?.randomness?.availableAt,
        });
        await this.refresh();
        return result;
      });
    }

    requestCraft({ rarity, slot = null }) {
      return this.mutation(async () => {
        const idempotencyKey = this.idempotencyKey("equipment-craft");
        const pending = await this.api.requestEquipmentCraft({ rarity, slot }, idempotencyKey);
        await this.refresh();
        const result = await this.waitForSettlement({
          kind: "craft",
          requestId: pending.craftRequestId,
          availableAt: pending.randomness?.availableAt,
        });
        await this.refresh();
        return result;
      });
    }

    resumeCraft(craftRequestId) {
      return this.mutation(async () => {
        const current = await this.api.loadEquipmentCraft(craftRequestId);
        const result = current?.status === "settled" ? current : await this.waitForSettlement({
          kind: "craft",
          requestId: craftRequestId,
          availableAt: current?.randomness?.availableAt,
        });
        await this.refresh();
        return result;
      });
    }

    salvageItem(itemId) {
      return this.mutation(async () => {
        const assetId = this.equipmentAssetId(itemId);
        if (!assetId) throw new Error("Equipment asset is not present in the authoritative inventory.");
        const result = await this.api.salvageEquipment(assetId, this.idempotencyKey("equipment-salvage"));
        await this.refresh();
        return result;
      });
    }

    setLoadout(slot, itemId) {
      return this.mutation(async () => {
        const equipmentAssetId = itemId ? this.equipmentAssetId(itemId) : null;
        if (itemId && !equipmentAssetId) throw new Error("Equipment asset is not present in the authoritative inventory.");
        const result = await this.api.setEquipmentLoadout(slot, {
          equipmentAssetId,
          baseRevision: Number(this.snapshot.ledgerRevision),
        }, this.idempotencyKey("equipment-loadout"));
        await this.refresh();
        return result;
      });
    }

    setProtection(itemId, protectedState) {
      return this.mutation(async () => {
        const equipmentAssetId = this.equipmentAssetId(itemId);
        if (!equipmentAssetId) throw new Error("Equipment asset is not present in the authoritative inventory.");
        const result = await this.api.setEquipmentProtection(equipmentAssetId, {
          protected: Boolean(protectedState),
          baseRevision: Number(this.snapshot.ledgerRevision),
        }, this.idempotencyKey("equipment-protection"));
        await this.refresh();
        return result;
      });
    }

    requestRevision({ equipmentAssetId, product, preservedStatIndexes }) {
      return this.mutation(async () => {
        const result = await this.api.createEquipmentRevision(
          { equipmentAssetId, product, preservedStatIndexes },
          this.idempotencyKey("equipment-revision"),
        );
        await this.refresh();
        return result;
      });
    }

    acceptRevision(revisionAttemptId) {
      return this.mutation(async () => {
        const result = await this.api.acceptEquipmentRevision(
          revisionAttemptId,
          this.idempotencyKey("equipment-revision-accept"),
        );
        await this.refresh();
        return result;
      });
    }

    keepOriginalRevision(revisionAttemptId) {
      return this.mutation(async () => {
        const result = await this.api.keepOriginalEquipmentRevision(
          revisionAttemptId,
          this.idempotencyKey("equipment-revision-keep"),
        );
        await this.refresh();
        return result;
      });
    }

    runLeasesEnabled() {
      return Boolean(this.snapshot?.operations?.runLeases?.enabled);
    }

    acquireOrdinaryRunLease(clientRunKey) {
      return this.mutation(async () => {
        if (!this.runLeasesEnabled()) return null;
        const result = await this.api.acquireEquipmentRunLease({
          clientRunKey,
          baseRevision: Number(this.snapshot.ledgerRevision),
        }, this.idempotencyKey("ordinary-run-lease-acquire"));
        this.activeRunLease = Object.freeze(cloneJson(result));
        return this.activeRunLease;
      });
    }

    releaseOrdinaryRunLease(outcome) {
      return this.mutation(async () => {
        const lease = this.activeRunLease;
        if (!lease) return null;
        const result = await this.api.releaseEquipmentRunLease(lease.leaseId, {
          outcome,
        }, this.idempotencyKey("ordinary-run-lease-release"));
        this.activeRunLease = null;
        await this.refresh();
        return result;
      });
    }
  }

  return Object.freeze({
    FATAL_AUTHORITY_CODES,
    RETRYABLE_SETTLEMENT_CODES,
    SCHEMA_VERSION,
    ValueLedgerAuthority,
    cloneJson,
    validSnapshot,
  });
});
