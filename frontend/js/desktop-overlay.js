(function initDesktopOverlay(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root?.document) root.LoothoodDesktopOverlay = api;
})(typeof window !== "undefined" ? window : globalThis, function desktopOverlayFactory() {
  "use strict";

  const coordinators = new WeakMap();

  function createOverlayStateMachine(callbacks = {}) {
    const state = {
      primary: null,
      suspendedPrimary: null,
      confirmation: null,
    };

    function notify() {
      callbacks.change?.(snapshot());
    }

    function snapshot() {
      return Object.freeze({
        primary: state.primary,
        suspendedPrimary: state.suspendedPrimary,
        confirmation: state.confirmation,
      });
    }

    function dismiss(entry, reason) {
      if (!entry) return;
      callbacks.dismiss?.(entry, reason);
    }

    function openPrimary(entry, options = {}) {
      if (!entry?.id) throw new Error("A primary overlay id is required.");
      if (state.primary?.replaceable === false && state.primary.id !== entry.id) return false;
      if (
        state.primary?.id === entry.id
        && state.primary?.element
        && state.primary.element === entry.element
      ) {
        state.primary = {
          ...state.primary,
          ...entry,
          invoker: state.primary.invoker || entry.invoker,
        };
        callbacks.refresh?.(state.primary);
        notify();
        return true;
      }

      if (state.confirmation) {
        const confirmation = state.confirmation;
        state.confirmation = null;
        dismiss(confirmation, "primary-opened");
      }

      if (state.primary && state.primary !== entry) {
        if (options.suspendCurrent && !state.suspendedPrimary) {
          state.suspendedPrimary = state.primary;
          callbacks.suspend?.(state.suspendedPrimary);
        } else {
          dismiss(state.primary, "primary-replaced");
        }
      }

      state.primary = entry;
      callbacks.activate?.(entry);
      notify();
      return true;
    }

    function closePrimary(id, options = {}) {
      if (!state.primary || (id && state.primary.id !== id)) return false;
      const closed = state.primary;
      state.primary = null;
      dismiss(closed, options.reason || "primary-closed");

      if (options.resumeSuspended !== false && state.suspendedPrimary) {
        state.primary = state.suspendedPrimary;
        state.suspendedPrimary = null;
        callbacks.resume?.(state.primary);
      } else if (options.resumeSuspended === false && state.suspendedPrimary) {
        dismiss(state.suspendedPrimary, "suspended-primary-discarded");
        state.suspendedPrimary = null;
      }

      notify();
      return closed;
    }

    function replacePrimaryElement(id, element) {
      if (!state.primary || state.primary.id !== id || !element) return false;
      callbacks.replaceElement?.(state.primary, element);
      state.primary.element = element;
      notify();
      return true;
    }

    function openConfirmation(entry) {
      if (!entry?.id) throw new Error("A confirmation overlay id is required.");
      if (state.confirmation) dismiss(state.confirmation, "confirmation-replaced");
      state.confirmation = entry;
      callbacks.activate?.(entry);
      notify();
      return true;
    }

    function closeConfirmation(id, options = {}) {
      if (!state.confirmation || (id && state.confirmation.id !== id)) return false;
      const closed = state.confirmation;
      state.confirmation = null;
      dismiss(closed, options.reason || "confirmation-closed");
      notify();
      return closed;
    }

    function top() {
      return state.confirmation || state.primary || null;
    }

    return Object.freeze({
      openPrimary,
      closePrimary,
      replacePrimaryElement,
      openConfirmation,
      closeConfirmation,
      snapshot,
      top,
    });
  }

  function createCoordinator(options = {}) {
    const documentRoot = options.documentRoot;
    if (!documentRoot?.body) throw new Error("A browser document is required.");
    const view = documentRoot.defaultView || globalThis;
    const appBackground = options.appBackground || null;
    const portalRoot = options.portalRoot || null;
    const enabled = typeof options.enabled === "function" ? options.enabled : () => true;
    const HTMLElementCtor = view.HTMLElement || globalThis.HTMLElement;
    let lockedScroll = null;

    function isEnabled() {
      return Boolean(enabled());
    }

    function isElement(value) {
      return Boolean(HTMLElementCtor && value instanceof HTMLElementCtor);
    }

    function isValidFocusTarget(target) {
      if (!isElement(target) || !target.isConnected || target.disabled || target.hidden) return false;
      if (target.closest?.("[inert], [aria-hidden='true']")) return false;
      const style = view.getComputedStyle?.(target);
      if (style?.display === "none" || style?.visibility === "hidden") return false;
      return typeof target.getClientRects !== "function" || target.getClientRects().length > 0;
    }

    function firstValidSelector(selectors = []) {
      for (const selector of selectors) {
        for (const candidate of documentRoot.querySelectorAll(selector)) {
          if (isValidFocusTarget(candidate)) return candidate;
        }
      }
      return null;
    }

    function captureInvoker(event, fallbackSelectors = [], explicitInvoker = null) {
      if (explicitInvoker?.element || Array.isArray(explicitInvoker?.fallbackSelectors)) return explicitInvoker;
      const eventInvoker = event?.currentTarget;
      const active = documentRoot.activeElement;
      const element = isValidFocusTarget(explicitInvoker)
        ? explicitInvoker
        : isValidFocusTarget(eventInvoker)
          ? eventInvoker
          : isValidFocusTarget(active) && active !== documentRoot.body
            ? active
            : null;
      return Object.freeze({ element, fallbackSelectors: Object.freeze([...fallbackSelectors]) });
    }

    function restoreInvoker(token, additionalSelectors = []) {
      const exact = token?.element || (isElement(token) ? token : null);
      const selectors = [
        ...(Array.isArray(token?.fallbackSelectors) ? token.fallbackSelectors : []),
        ...additionalSelectors,
      ];
      const target = isValidFocusTarget(exact) ? exact : firstValidSelector(selectors);
      if (!target) return false;
      target.focus();
      return documentRoot.activeElement === target;
    }

    function resolveInitialFocus(entry) {
      const requested = typeof entry.initialFocus === "function" ? entry.initialFocus() : entry.initialFocus;
      if (isValidFocusTarget(requested)) return requested;
      return firstValidSelector(entry.initialFocusSelectors || [])
        || Array.from(entry.element?.querySelectorAll?.("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])") || [])
          .find(isValidFocusTarget)
        || null;
    }

    function focusInitial(entry) {
      view.requestAnimationFrame?.(() => {
        if (machine.top() !== entry || !isValidFocusTarget(entry.element)) return;
        resolveInitialFocus(entry)?.focus();
      });
    }

    function configureElement(entry) {
      if (!entry.element) throw new Error(`Overlay ${entry.id} requires an element.`);
      entry.element.dataset.overlayKind = entry.kind;
      entry.element.dataset.overlayId = entry.id;
      entry.element.hidden = false;
      entry.element.inert = false;
      entry.element.removeAttribute("aria-hidden");
      delete entry.element.dataset.overlaySuspended;
    }

    function hideEntry(entry, reason) {
      entry.onDismiss?.(reason);
      if (!entry.element) return;
      entry.element.hidden = true;
      entry.element.inert = false;
      entry.element.removeAttribute("aria-hidden");
      delete entry.element.dataset.overlaySuspended;
    }

    function suspendEntry(entry) {
      if (!entry?.element) return;
      entry.element.dataset.overlaySuspended = "true";
      entry.element.inert = true;
      entry.element.setAttribute("aria-hidden", "true");
    }

    function resumeEntry(entry) {
      if (!entry?.element) return;
      delete entry.element.dataset.overlaySuspended;
      entry.element.hidden = false;
      entry.element.inert = false;
      entry.element.removeAttribute("aria-hidden");
    }

    function replaceElement(entry, element) {
      const previous = entry.element;
      if (previous && previous !== element) previous.remove();
      entry.element = element;
      configureElement(entry);
    }

    function syncIsolation(snapshot) {
      const modalActive = Boolean(snapshot.primary || snapshot.confirmation);
      if (appBackground) appBackground.inert = modalActive;
      if (modalActive && !lockedScroll) {
        lockedScroll = Object.freeze({ x: view.scrollX || 0, y: view.scrollY || 0 });
        const scrollbarWidth = Math.max(0, (view.innerWidth || 0) - (documentRoot.documentElement?.clientWidth || 0));
        documentRoot.body.style.setProperty("--overlay-scrollbar-compensation", `${scrollbarWidth}px`);
      }
      documentRoot.body.classList.toggle("desktop-modal-open", modalActive);
      if (!modalActive && lockedScroll) {
        const restore = lockedScroll;
        lockedScroll = null;
        documentRoot.body.style.removeProperty("--overlay-scrollbar-compensation");
        view.scrollTo?.(restore.x, restore.y);
      }
      if (snapshot.primary?.element) {
        const blocked = Boolean(snapshot.confirmation);
        snapshot.primary.element.inert = blocked;
        if (blocked) snapshot.primary.element.setAttribute("aria-hidden", "true");
        else snapshot.primary.element.removeAttribute("aria-hidden");
      }
      if (portalRoot) {
        const portalActive = Boolean(snapshot.primary?.element && portalRoot.contains(snapshot.primary.element));
        portalRoot.dataset.active = String(portalActive);
      }
      documentRoot.body.dataset.primaryOverlay = snapshot.primary?.id || "";
      documentRoot.body.dataset.confirmationOverlay = snapshot.confirmation?.id || "";
    }

    const machine = createOverlayStateMachine({
      activate(entry) {
        configureElement(entry);
      },
      dismiss: hideEntry,
      suspend: suspendEntry,
      resume: resumeEntry,
      refresh: configureElement,
      replaceElement,
      change: syncIsolation,
    });

    function normalizedEntry(kind, config) {
      return {
        ...config,
        kind,
        dismissible: config.dismissible !== false,
        replaceable: config.replaceable !== false,
        invoker: config.invoker || captureInvoker(null, config.fallbackSelectors || []),
      };
    }

    function openPrimary(config, options = {}) {
      if (!isEnabled()) return false;
      const entry = normalizedEntry("primary", config);
      const opened = machine.openPrimary(entry, options);
      if (opened) focusInitial(entry);
      return opened;
    }

    function closePrimary(id, options = {}) {
      if (!isEnabled()) return false;
      const closed = machine.closePrimary(id, options);
      if (!closed) return false;
      const resumed = machine.snapshot().primary;
      if (resumed) {
        if (!restoreInvoker(closed.invoker, closed.fallbackSelectors)) focusInitial(resumed);
      } else if (options.restoreFocus !== false) {
        restoreInvoker(closed.invoker, closed.fallbackSelectors);
      }
      return true;
    }

    function openConfirmation(config) {
      if (!isEnabled()) return false;
      const entry = normalizedEntry("confirmation", config);
      machine.openConfirmation(entry);
      focusInitial(entry);
      return true;
    }

    function closeConfirmation(id, options = {}) {
      if (!isEnabled()) return false;
      const closed = machine.closeConfirmation(id, options);
      if (!closed) return false;
      if (options.restoreFocus !== false) restoreInvoker(closed.invoker, closed.fallbackSelectors);
      return true;
    }

    function replacePrimaryElement(id, element) {
      if (!isEnabled()) return false;
      return machine.replacePrimaryElement(id, element);
    }

    function activeElement() {
      return isEnabled() ? machine.top()?.element || null : null;
    }

    function isPrimary(id) {
      return isEnabled() && machine.snapshot().primary?.id === id;
    }

    function isConfirmation(id) {
      return isEnabled() && machine.snapshot().confirmation?.id === id;
    }

    function handleEscape(event) {
      if (!isEnabled() || String(event?.key || "").toLowerCase() !== "escape") return false;
      const top = machine.top();
      if (!top) return false;
      event.preventDefault?.();
      if (!top.dismissible) return true;
      if (typeof top.onEscape === "function") {
        top.onEscape(event);
        return true;
      }
      if (top.kind === "confirmation") closeConfirmation(top.id, { reason: "escape" });
      else closePrimary(top.id, { reason: "escape" });
      return true;
    }

    const coordinator = Object.freeze({
      enabled: isEnabled,
      captureInvoker,
      restoreInvoker,
      openPrimary,
      closePrimary,
      replacePrimaryElement,
      openConfirmation,
      closeConfirmation,
      activeElement,
      isPrimary,
      isConfirmation,
      handleEscape,
      snapshot: machine.snapshot,
    });
    coordinators.set(documentRoot, coordinator);
    return coordinator;
  }

  function getCoordinator(documentRoot) {
    return coordinators.get(documentRoot) || null;
  }

  return Object.freeze({ createOverlayStateMachine, createCoordinator, getCoordinator });
});
