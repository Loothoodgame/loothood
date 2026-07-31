(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodCloudSaveClient = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CATALOGUE_VERSION = "beta-v1";

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  class CloudSaveAuthority {
    constructor({ api, idempotencyKey, onFatal = () => {} } = {}) {
      if (!api || typeof api.loadCloudSave !== "function" || typeof api.updateCloudSave !== "function") {
        throw new TypeError("Cloud-save authority requires the account API adapter.");
      }
      if (typeof idempotencyKey !== "function") {
        throw new TypeError("Cloud-save authority requires secure idempotency keys.");
      }
      this.api = api;
      this.idempotencyKey = idempotencyKey;
      this.onFatal = onFatal;
      this.loaded = false;
      this.revision = 0;
      this.bootstrap = null;
      this.pendingSaves = [];
      this.drainPromise = null;
      this.fatalError = null;
    }

    async load() {
      if (this.loaded) return this.bootstrap;
      if (this.fatalError) throw this.fatalError;
      const result = await this.api.loadCloudSave();
      if (result?.catalogueVersion !== CATALOGUE_VERSION) {
        throw new Error("The cloud profile uses an unsupported catalogue version.");
      }
      const revision = Number(result.revision);
      if (!Number.isSafeInteger(revision) || revision < 0) {
        throw new Error("The cloud profile returned an invalid revision.");
      }
      if (result.exists === true && (!result.save || typeof result.save !== "object" || Array.isArray(result.save))) {
        throw new Error("The cloud profile returned an invalid save snapshot.");
      }
      this.revision = revision;
      this.bootstrap = Object.freeze({
        exists: result.exists === true,
        revision,
        catalogueVersion: CATALOGUE_VERSION,
        save: result.exists === true ? cloneJson(result.save) : null,
        serverTimestamp: result.serverTimestamp || null,
      });
      this.loaded = true;
      return this.bootstrap;
    }

    enqueue(save, options = {}) {
      if (!this.loaded || this.fatalError || !save || typeof save !== "object" || Array.isArray(save)) return false;
      const mutationId = typeof options.mutationId === "string" && options.mutationId
        ? options.mutationId
        : null;
      const queued = { save: cloneJson(save), mutationId };
      const pending = this.pendingSaves[this.pendingSaves.length - 1];
      if (!mutationId && pending?.mutationId === null) {
        this.pendingSaves[this.pendingSaves.length - 1] = queued;
      } else if (mutationId && pending?.mutationId === mutationId) {
        if (JSON.stringify(pending.save) !== JSON.stringify(queued.save)) return false;
      } else {
        this.pendingSaves.push(queued);
      }
      this.scheduleDrain();
      return true;
    }

    scheduleDrain() {
      if (this.drainPromise || this.fatalError) return;
      this.drainPromise = Promise.resolve()
        .then(() => this.drain())
        .catch((error) => this.fail(error))
        .finally(() => {
          this.drainPromise = null;
          if (this.pendingSaves.length && !this.fatalError) this.scheduleDrain();
        });
    }

    async drain() {
      while (this.pendingSaves.length && !this.fatalError) {
        const pending = this.pendingSaves.shift();
        const save = pending.save;
        const mutationId = pending.mutationId || this.idempotencyKey("cloud-save");
        const result = await this.api.updateCloudSave({
          baseRevision: this.revision,
          catalogueVersion: CATALOGUE_VERSION,
          mutationId,
          save,
        }, mutationId);
        const nextRevision = Number(result?.revision);
        if (!Number.isSafeInteger(nextRevision) || nextRevision !== this.revision + 1) {
          throw new Error("The cloud save returned an unexpected revision.");
        }
        this.revision = nextRevision;
      }
    }

    fail(error) {
      if (this.fatalError) return;
      this.pendingSaves = [];
      this.fatalError = error instanceof Error ? error : new Error("Cloud saving failed.");
      this.onFatal(this.fatalError);
    }

    async awaitIdle() {
      while (this.drainPromise) await this.drainPromise;
      if (this.fatalError) throw this.fatalError;
      return this.revision;
    }
  }

  return Object.freeze({ CATALOGUE_VERSION, CloudSaveAuthority, cloneJson });
});
