(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LOOTHOOD_TUTORIAL_GUIDANCE = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const TOURS = Object.freeze({
    hunt: Object.freeze([
      Object.freeze({ target: '[data-hunt-action="standard"]', title: "Standard Hunt", text: "Start a 15-stage Forest Hunt here." }),
      Object.freeze({ target: '[data-hunt-action="seasonal"]', title: "Season Centre", text: "Open the Season Centre to enter a Seasonal Hunt." }),
    ]),
    settlement: Object.freeze([
      Object.freeze({ target: '[data-focus-key="settlement-open-plots"]', title: "Plots", text: "Open Plots to build and inspect buildings." }),
      Object.freeze({ target: ".hb-settlement-passive", title: "Stored Resources", text: "Claim Wood and Ore that your Village stores." }),
      Object.freeze({ target: ".hb-settlement-operations", title: "Operations", text: "Upgrade an operation to increase its resource output." }),
    ]),
    plots: Object.freeze([
      Object.freeze({ target: ".hb-plot-grid", title: "Building Plots", text: "Select a plot to build or inspect a building." }),
      Object.freeze({ target: ".hb-plots-heading", title: "Plot Totals", text: "This area shows your unlocked, occupied, and empty plots." }),
    ]),
    "equipment-pulls": Object.freeze([
      Object.freeze({ target: ".hb-equipment-tabs", title: "Pull Type", text: "Choose Standard or Limited Equipment Pulls." }),
      Object.freeze({ target: ".hb-gacha-pity-stack", title: "Pity", text: "Each pull adds progress to these guarantees." }),
      Object.freeze({ target: ".hb-gacha-draw-row", title: "Use Tickets", text: "Use a Ticket to get one random equipment item." }),
    ]),
    outfitter: Object.freeze([
      Object.freeze({ target: ".hb-equipped-strip", title: "Equipped Gear", text: "These items enter your next Hunt." }),
      Object.freeze({ target: ".hb-outfitter-grid", title: "Owned Equipment", text: "Select an item to view and compare its stats." }),
      Object.freeze({ target: ".hb-outfitter-inventory-header__tools", title: "Equipment Tools", text: "Use Scrap Forge or destroy eligible gear for Scrap." }),
    ]),
    marketplace: Object.freeze([
      Object.freeze({ target: ".hb-market-tabs", title: "Marketplace", text: "Browse listings or sell eligible equipment." }),
      Object.freeze({ target: ".hb-market-filters", title: "Filters", text: "Use filters to find equipment with the stats that you need." }),
      Object.freeze({ target: ".hb-market-view", title: "Listings", text: "Select a listing to review its item and price." }),
    ]),
    bounties: Object.freeze([
      Object.freeze({ target: "#weeklyBounties", title: "Weekly Bounties", text: "Complete Weekly Bounties to get Standard Tickets." }),
      Object.freeze({ target: "#bounties", title: "Rolling Bounties", text: "Complete Rolling Bounties to get Gold." }),
    ]),
    guide: Object.freeze([
      Object.freeze({ target: ".tutorial-guide__body", title: "Tutorial Guide", text: "Review the lessons and rules that you have unlocked." }),
      Object.freeze({ target: ".tutorial-guide__buildings", title: "Buildings", text: "Review each building name and its effect here." }),
      Object.freeze({ target: ".tutorial-guide__tour-list", title: "Screen Tips", text: "Use these buttons to show a screen tour again." }),
    ]),
    "season-centre": Object.freeze([
      Object.freeze({ target: ".hb-season-ticket", title: "Entry Ticket", text: "You need one Entry Ticket to start a Seasonal Hunt." }),
      Object.freeze({ target: ".hb-season-rules", title: "Seasonal Hunt", text: "Finish a Seasonal Hunt. The game verifies your score." }),
      Object.freeze({ target: ".hb-season-leaderboard", title: "Leaderboard", text: "Your verified score sets your place. Season rewards use the final leaderboard." }),
    ]),
    foundation: Object.freeze([
      Object.freeze({ target: '.hb-prepare-foundation, .run-setup-step[data-step="3"]', title: "Foundation", text: "Choose one Foundation for your first Hunt." }),
    ]),
  });

  function visibleTarget(documentRef, selector) {
    return [...documentRef.querySelectorAll(selector)].find((target) => {
      if (target.hidden) return false;
      const rect = target.getBoundingClientRect();
      const style = documentRef.defaultView.getComputedStyle(target);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    }) || null;
  }

  function createController(options) {
    const documentRef = options.document || document;
    const windowRef = documentRef.defaultView || window;
    const layer = documentRef.getElementById("tutorialSpotlight");
    if (!layer) throw new Error("Tutorial spotlight layer is missing");
    const scrims = {
      top: layer.querySelector('[data-spotlight-scrim="top"]'),
      right: layer.querySelector('[data-spotlight-scrim="right"]'),
      bottom: layer.querySelector('[data-spotlight-scrim="bottom"]'),
      left: layer.querySelector('[data-spotlight-scrim="left"]'),
    };
    const windowEl = layer.querySelector("[data-spotlight-window]");
    const card = layer.querySelector("[data-spotlight-card]");
    const progressEl = layer.querySelector("[data-spotlight-progress]");
    const titleEl = layer.querySelector("[data-spotlight-title]");
    const textEl = layer.querySelector("[data-spotlight-text]");
    const backButton = layer.querySelector("[data-spotlight-back]");
    const nextButton = layer.querySelector("[data-spotlight-next]");
    const skipButton = layer.querySelector("[data-spotlight-skip]");
    let active = null;
    let previousFocus = null;
    let targetClickHandler = null;

    function completed(tourId) {
      const state = options.getState?.() || {};
      return state.completed?.includes(tourId) || state.skipped?.includes(tourId);
    }

    function clearTargetListener() {
      if (active?.target && targetClickHandler) active.target.removeEventListener("click", targetClickHandler);
      targetClickHandler = null;
    }

    function close(reason = "close", restoreFocus = true) {
      if (!active) return;
      clearTargetListener();
      active.target?.classList.remove("tutorial-spotlight__target");
      layer.hidden = true;
      documentRef.body.classList.remove("tutorial-spotlight-open");
      const focus = previousFocus;
      active = null;
      previousFocus = null;
      if (restoreFocus && focus?.isConnected) focus.focus({ preventScroll: true });
      options.onClose?.(reason);
    }

    function place() {
      if (!active?.target?.isConnected) {
        close("target-missing", false);
        return;
      }
      const padding = 6;
      const viewportWidth = windowRef.innerWidth;
      const viewportHeight = windowRef.innerHeight;
      const raw = active.target.getBoundingClientRect();
      const left = Math.max(0, raw.left - padding);
      const top = Math.max(0, raw.top - padding);
      const right = Math.min(viewportWidth, raw.right + padding);
      const bottom = Math.min(viewportHeight, raw.bottom + padding);
      Object.assign(windowEl.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${Math.max(1, right - left)}px`,
        height: `${Math.max(1, bottom - top)}px`,
      });
      Object.assign(scrims.top.style, { left: "0px", top: "0px", width: `${viewportWidth}px`, height: `${top}px` });
      Object.assign(scrims.bottom.style, { left: "0px", top: `${bottom}px`, width: `${viewportWidth}px`, height: `${Math.max(0, viewportHeight - bottom)}px` });
      Object.assign(scrims.left.style, { left: "0px", top: `${top}px`, width: `${left}px`, height: `${Math.max(0, bottom - top)}px` });
      Object.assign(scrims.right.style, { left: `${right}px`, top: `${top}px`, width: `${Math.max(0, viewportWidth - right)}px`, height: `${Math.max(0, bottom - top)}px` });

      const margin = 12;
      const cardRect = card.getBoundingClientRect();
      const cardWidth = Math.min(cardRect.width || 360, viewportWidth - margin * 2);
      const cardLeft = Math.max(margin, Math.min(viewportWidth - cardWidth - margin, (left + right - cardWidth) / 2));
      const below = bottom + margin;
      const cardTop = below + cardRect.height <= viewportHeight - margin
        ? below
        : Math.max(margin, top - cardRect.height - margin);
      Object.assign(card.style, { left: `${cardLeft}px`, top: `${cardTop}px`, width: `${cardWidth}px` });
    }

    function show() {
      if (!active) return false;
      clearTargetListener();
      const step = active.steps[active.index];
      const target = visibleTarget(documentRef, step.target);
      if (!target) {
        active.steps.splice(active.index, 1);
        if (!active.steps.length) {
          close("no-targets", false);
          return false;
        }
        if (active.index >= active.steps.length) active.index = active.steps.length - 1;
        return show();
      }
      active.target?.classList.remove("tutorial-spotlight__target");
      active.target = target;
      target.classList.add("tutorial-spotlight__target");
      target.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
      const displayIndex = active.displayIndex ?? active.index + 1;
      const displayTotal = active.displayTotal ?? active.steps.length;
      progressEl.textContent = `${displayIndex} / ${displayTotal}`;
      titleEl.textContent = step.title;
      textEl.textContent = step.text;
      backButton.hidden = active.required || active.index === 0;
      skipButton.hidden = active.required;
      nextButton.hidden = Boolean(active.actionRequired);
      nextButton.textContent = active.index === active.steps.length - 1 ? "Done" : "Next";
      windowEl.style.pointerEvents = active.allowTarget ? "none" : "auto";
      layer.hidden = false;
      documentRef.body.classList.add("tutorial-spotlight-open");
      windowRef.requestAnimationFrame(() => {
        place();
        if (active?.allowTarget) target.focus({ preventScroll: true });
        else nextButton.focus({ preventScroll: true });
      });
      if (active.allowTarget) {
        targetClickHandler = () => {
          options.onProgress?.(active.tourId, displayIndex);
          const callback = active.onTarget;
          close("target-action", false);
          callback?.();
        };
        target.addEventListener("click", targetClickHandler, { once: true });
      }
      return true;
    }

    function start(tourId, config = {}) {
      if (!config.force && completed(tourId)) return false;
      const catalogue = TOURS[tourId] || [];
      const steps = catalogue.filter((step) => visibleTarget(documentRef, step.target));
      if (!steps.length) return false;
      close("replace", false);
      previousFocus = documentRef.activeElement;
      const stored = Math.max(0, Math.floor(Number(options.getState?.().progress?.[tourId]) || 0));
      active = {
        tourId,
        steps: [...steps],
        index: config.force ? 0 : Math.min(stored, steps.length - 1),
        required: false,
        allowTarget: false,
        actionRequired: false,
      };
      return show();
    }

    function showRequired(config) {
      const target = visibleTarget(documentRef, config.target);
      if (!target) return false;
      close("replace", false);
      previousFocus = documentRef.activeElement;
      active = {
        tourId: config.tourId || "builder-pack",
        steps: [{ target: config.target, title: config.title, text: config.text }],
        index: 0,
        required: true,
        allowTarget: true,
        actionRequired: true,
        displayIndex: config.index,
        displayTotal: config.total,
        onTarget: config.onTarget,
      };
      return show();
    }

    function next() {
      if (!active || active.required) return;
      if (active.index >= active.steps.length - 1) {
        const id = active.tourId;
        options.onComplete?.(id);
        close("complete");
        return;
      }
      active.index += 1;
      options.onProgress?.(active.tourId, active.index);
      show();
    }

    function back() {
      if (!active || active.required || active.index === 0) return;
      active.index -= 1;
      options.onProgress?.(active.tourId, active.index);
      show();
    }

    function skip() {
      if (!active || active.required) return;
      const id = active.tourId;
      options.onSkip?.(id);
      close("skip");
    }

    nextButton.addEventListener("click", next);
    backButton.addEventListener("click", back);
    skipButton.addEventListener("click", skip);
    windowRef.addEventListener("resize", place);
    documentRef.addEventListener("scroll", place, true);
    documentRef.addEventListener("keydown", (event) => {
      if (!active) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (!active.required) skip();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = active.allowTarget
        ? [active.target]
        : [backButton, nextButton, skipButton].filter((control) => !control.hidden);
      if (!controls.length) return;
      event.preventDefault();
      const current = controls.indexOf(documentRef.activeElement);
      const direction = event.shiftKey ? -1 : 1;
      controls[(current + direction + controls.length) % controls.length].focus({ preventScroll: true });
    });

    return Object.freeze({ start, showRequired, close, isActive: () => Boolean(active) });
  }

  return Object.freeze({ TOURS, createController });
});
