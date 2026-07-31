(function (root, factory) {
  const library = factory();
  if (typeof module === "object" && module.exports) module.exports = library;
  if (root?.document && root?.location) {
    root.LoothoodSafeUpdate = library.createSafeUpdateController({
      currentVersion: root.LOOTHOOD_VERSION,
      fetchImpl: typeof root.fetch === "function" ? root.fetch.bind(root) : null,
      location: root.location,
      document: root.document,
      setTimeoutImpl: root.setTimeout.bind(root),
      clearTimeoutImpl: root.clearTimeout.bind(root),
    });
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
  const DEFAULT_POLL_INTERVAL_MS = 30_000;
  const DEFAULT_SAFE_RELOAD_DELAY_MS = 5_000;

  function parseVersion(value) {
    const match = VERSION_PATTERN.exec(String(value || "").trim());
    return match ? match.slice(1).map(Number) : null;
  }

  function compareVersions(left, right) {
    const a = parseVersion(left);
    const b = parseVersion(right);
    if (!a || !b) return null;
    for (let index = 0; index < 3; index += 1) {
      if (a[index] > b[index]) return 1;
      if (a[index] < b[index]) return -1;
    }
    return 0;
  }

  function releaseUrl(currentHref, releaseVersion) {
    const url = new URL(currentHref);
    url.searchParams.set("release", releaseVersion);
    return url.href;
  }

  function createSafeUpdateController({
    currentVersion,
    fetchImpl = null,
    location = null,
    document = null,
    setTimeoutImpl = setTimeout,
    clearTimeoutImpl = clearTimeout,
    safeReloadDelayMs = DEFAULT_SAFE_RELOAD_DELAY_MS,
  } = {}) {
    if (!parseVersion(currentVersion)) {
      throw new TypeError("Safe update controller requires a semantic currentVersion");
    }

    let pendingVersion = null;
    let runActive = false;
    let safeBoundary = false;
    let noticeHandler = null;
    let reloadTimer = null;
    let pollTimer = null;
    let pollUrl = null;
    let pollIntervalMs = DEFAULT_POLL_INTERVAL_MS;
    let stopped = false;
    const notices = new Set();

    function clearReloadTimer() {
      if (reloadTimer !== null) clearTimeoutImpl(reloadTimer);
      reloadTimer = null;
    }

    function notify(kind, message) {
      const identity = `${pendingVersion || "none"}:${kind}`;
      if (notices.has(identity)) return;
      notices.add(identity);
      noticeHandler?.(message);
    }

    function reloadNow() {
      clearReloadTimer();
      if (!pendingVersion || runActive || !safeBoundary || !location?.replace) return false;
      if (document?.visibilityState === "hidden") {
        reloadTimer = setTimeoutImpl(reloadNow, 1_000);
        return false;
      }
      location.replace(releaseUrl(location.href, pendingVersion));
      return true;
    }

    function scheduleReload(delayMs = safeReloadDelayMs) {
      if (!pendingVersion || runActive || !safeBoundary || reloadTimer !== null) return false;
      reloadTimer = setTimeoutImpl(reloadNow, Math.max(0, Number(delayMs) || 0));
      return true;
    }

    function observeStatus(status) {
      const availableVersion = String(status?.releaseVersion || "").trim();
      const comparison = compareVersions(availableVersion, currentVersion);
      if (comparison !== 1) return false;
      if (!pendingVersion || compareVersions(availableVersion, pendingVersion) === 1) {
        pendingVersion = availableVersion;
      }
      if (runActive) {
        notify(
          "deferred",
          "A Loothood update is ready. Finish this Hunt; it will apply safely at the menu.",
        );
      } else if (safeBoundary) {
        notify("ready", "Loothood is updating safely before your next Hunt.");
        scheduleReload();
      }
      return true;
    }

    function setRunActive(active) {
      runActive = Boolean(active);
      if (runActive) {
        safeBoundary = false;
        clearReloadTimer();
        if (pendingVersion) {
          notify(
            "deferred",
            "A Loothood update is ready. Finish this Hunt; it will apply safely at the menu.",
          );
        }
        return;
      }
      safeBoundary = true;
      if (pendingVersion) {
        notify("ready", "Loothood is updating safely before your next Hunt.");
        scheduleReload();
      }
    }

    function guardRunStart() {
      if (!pendingVersion) return true;
      safeBoundary = true;
      notify("blocked", "Loothood must finish updating before the next Hunt.");
      clearReloadTimer();
      scheduleReload(0);
      return false;
    }

    async function pollNow() {
      if (!fetchImpl || !pollUrl || stopped) return null;
      try {
        const response = await fetchImpl(pollUrl, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response?.ok) return null;
        const status = await response.json();
        observeStatus(status);
        return status;
      } catch {
        return null;
      }
    }

    function queuePoll() {
      if (stopped || pollTimer !== null || !pollUrl) return;
      pollTimer = setTimeoutImpl(async () => {
        pollTimer = null;
        await pollNow();
        queuePoll();
      }, pollIntervalMs);
    }

    function startPolling({
      baseUrl,
      intervalMs = DEFAULT_POLL_INTERVAL_MS,
    } = {}) {
      if (!fetchImpl || stopped) return false;
      const origin = String(baseUrl || location?.origin || "").replace(/\/+$/, "");
      if (!origin) return false;
      pollUrl = `${origin}/api/v1/status`;
      pollIntervalMs = Math.max(5_000, Number(intervalMs) || DEFAULT_POLL_INTERVAL_MS);
      queuePoll();
      return true;
    }

    function stopPolling() {
      stopped = true;
      clearReloadTimer();
      if (pollTimer !== null) clearTimeoutImpl(pollTimer);
      pollTimer = null;
    }

    return Object.freeze({
      currentVersion,
      observeStatus,
      setRunActive,
      guardRunStart,
      reloadNow,
      pollNow,
      startPolling,
      stopPolling,
      setNoticeHandler(handler) {
        noticeHandler = typeof handler === "function" ? handler : null;
      },
      snapshot() {
        return Object.freeze({
          currentVersion,
          pendingVersion,
          runActive,
          safeBoundary,
          reloadScheduled: reloadTimer !== null,
        });
      },
    });
  }

  return Object.freeze({
    DEFAULT_POLL_INTERVAL_MS,
    DEFAULT_SAFE_RELOAD_DELAY_MS,
    compareVersions,
    createSafeUpdateController,
    parseVersion,
    releaseUrl,
  });
});
