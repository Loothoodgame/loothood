(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodMobileInput = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CENTER_ENTER_RATIO = 0.28;
  const CENTER_EXIT_RATIO = 0.38;
  const CENTER_CONFIRM_SECONDS = 0.125;
  const COMBAT_HUD_HEIGHT = 36;
  const COMBAT_FRAME_BORDER = 4;

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function resolveStickGeometry(safeWidth) {
    const width = Math.max(1, Number(safeWidth) || 1);
    const leftRailWidth = clamp(width * 0.15, 100, 132);
    const visualSize = clamp(leftRailWidth - 16, 84, 112);
    const targetSize = Math.min(leftRailWidth - 8, visualSize + 8);
    const knobSize = clamp(visualSize * 0.5, 46, 56);
    const maxTravel = Math.max(24, visualSize * 0.32);
    return Object.freeze({ leftRailWidth, visualSize, targetSize, knobSize, maxTravel });
  }

  function normalizeArenaFit(value) {
    return value === "preserve" ? "preserve" : "fill";
  }

  function resolveCombatViewportLayout(input = {}) {
    const viewportWidth = Math.max(1, Number(input.viewportWidth) || 1);
    const viewportHeight = Math.max(1, Number(input.viewportHeight) || 1);
    const safe = {
      top: Math.max(0, Number(input.safeTop) || 0),
      right: Math.max(0, Number(input.safeRight) || 0),
      bottom: Math.max(0, Number(input.safeBottom) || 0),
      left: Math.max(0, Number(input.safeLeft) || 0),
    };
    const safeWidth = Math.max(1, viewportWidth - safe.left - safe.right);
    const safeHeight = Math.max(1, viewportHeight - safe.top - safe.bottom);
    const hudHeight = Math.min(safeHeight, Math.max(0, Number(input.hudHeight) || COMBAT_HUD_HEIGHT));
    const frameTotal = COMBAT_FRAME_BORDER * 2;
    const availableOuterHeight = Math.max(frameTotal + 1, safeHeight - hudHeight);
    const arenaFit = normalizeArenaFit(input.arenaFit);
    let arenaOuterWidth = safeWidth;
    let arenaOuterHeight = availableOuterHeight;

    if (arenaFit === "preserve") {
      const contentHeight = Math.max(1, Math.min(
        availableOuterHeight - frameTotal,
        (safeWidth - frameTotal) / 1.5,
      ));
      arenaOuterWidth = contentHeight * 1.5 + frameTotal;
      arenaOuterHeight = contentHeight + frameTotal;
    }

    const arenaContentWidth = Math.max(1, arenaOuterWidth - frameTotal);
    const arenaContentHeight = Math.max(1, arenaOuterHeight - frameTotal);
    const arenaOffsetX = Math.max(0, (safeWidth - arenaOuterWidth) / 2);
    const arenaOffsetY = 0;
    const stick = resolveStickGeometry(safeWidth);
    const controlCentreY = clamp(
      hudHeight + availableOuterHeight * 0.62,
      hudHeight + stick.targetSize / 2 + 12,
      safeHeight - stick.targetSize / 2 - 12,
    );
    const stickLeft = clamp(
      Math.max(12, safeWidth * 0.018),
      0,
      Math.max(0, safeWidth - stick.targetSize),
    );
    const stopSize = clamp(viewportHeight * 0.2, 72, 84);
    const stopLeft = Math.max(0, safeWidth - stopSize - Math.max(12, safeWidth * 0.018));
    const stopTop = clamp(
      controlCentreY - stopSize / 2,
      hudHeight + 12,
      Math.max(hudHeight + 12, safeHeight - stopSize - 12),
    );

    return Object.freeze({
      viewportWidth,
      viewportHeight,
      safe: Object.freeze(safe),
      safeWidth,
      safeHeight,
      hudHeight,
      arenaFit,
      arenaOuterWidth,
      arenaOuterHeight,
      arenaContentWidth,
      arenaContentHeight,
      arenaOffsetX,
      arenaOffsetY,
      arenaTop: hudHeight,
      arenaBottomGap: Math.max(0, availableOuterHeight - arenaOuterHeight),
      stick: Object.freeze({
        ...stick,
        left: stickLeft,
        top: controlCentreY - stick.targetSize / 2,
        centerX: stickLeft + stick.targetSize / 2,
        centerY: controlCentreY,
      }),
      stop: Object.freeze({
        size: stopSize,
        left: stopLeft,
        top: stopTop,
        centerX: stopLeft + stopSize / 2,
        centerY: stopTop + stopSize / 2,
      }),
    });
  }

  function mapClientPointToLogical(rect, point, logicalWidth, logicalHeight) {
    const width = Math.max(1, Number(rect?.width) || 1);
    const height = Math.max(1, Number(rect?.height) || 1);
    return Object.freeze({
      x: ((Number(point?.x) - (Number(rect?.left) || 0)) / width) * Math.max(1, Number(logicalWidth) || 1),
      y: ((Number(point?.y) - (Number(rect?.top) || 0)) / height) * Math.max(1, Number(logicalHeight) || 1),
    });
  }

  function resolveStickSample(previousCentered, dx, dy, maxDistance) {
    const radius = Math.max(1, Number(maxDistance) || 1);
    const rawX = Number(dx) || 0;
    const rawY = Number(dy) || 0;
    const distance = Math.hypot(rawX, rawY);
    const normalizedDistance = distance / radius;
    const centered = previousCentered
      ? normalizedDistance <= CENTER_EXIT_RATIO
      : normalizedDistance <= CENTER_ENTER_RATIO;

    if (centered) {
      return Object.freeze({ centered: true, x: 0, y: 0, knobX: 0, knobY: 0, normalizedDistance });
    }

    const scale = distance > radius ? radius / distance : 1;
    const knobX = rawX * scale;
    const knobY = rawY * scale;
    return Object.freeze({
      centered: false,
      x: knobX / radius,
      y: knobY / radius,
      knobX,
      knobY,
      normalizedDistance,
    });
  }

  function advanceCenterConfirmation(state, dt) {
    if (!state?.active || !state.centered) return Object.freeze({ centerHold: 0, planted: false });
    if (state.planted) {
      return Object.freeze({ centerHold: CENTER_CONFIRM_SECONDS, planted: true });
    }
    const centerHold = Math.min(CENTER_CONFIRM_SECONDS, Math.max(0, Number(state.centerHold) || 0) + Math.max(0, Number(dt) || 0));
    return Object.freeze({ centerHold, planted: centerHold >= CENTER_CONFIRM_SECONDS });
  }

  return Object.freeze({
    CENTER_ENTER_RATIO,
    CENTER_EXIT_RATIO,
    CENTER_CONFIRM_SECONDS,
    COMBAT_HUD_HEIGHT,
    resolveStickGeometry,
    normalizeArenaFit,
    resolveCombatViewportLayout,
    mapClientPointToLogical,
    resolveStickSample,
    advanceCenterConfirmation,
  });
});
