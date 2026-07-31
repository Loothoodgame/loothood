(function () {
  "use strict";

  const CANONICAL_WIDTH = 1672;
  const CANONICAL_HEIGHT = 941;
  const DESKTOP_QUERY = "(hover: hover) and (pointer: fine)";
  const stage = document.querySelector(".hb-fit-stage");
  const desktop = window.matchMedia(DESKTOP_QUERY);

  function clearFit() {
    if (!stage) return;
    stage.style.removeProperty("transform");
    stage.style.removeProperty("zoom");
    stage.style.removeProperty("left");
    stage.style.removeProperty("top");
    document.documentElement.style.removeProperty("--hb-stage-scale");
    document.documentElement.style.removeProperty("--hb-stage-left");
    document.documentElement.style.removeProperty("--hb-stage-top");
    delete stage.dataset.scale;
  }

  function fit() {
    if (!stage || !desktop.matches) {
      clearFit();
      return;
    }
    const scale = Math.min(window.innerWidth / CANONICAL_WIDTH, window.innerHeight / CANONICAL_HEIGHT);
    const left = Math.max(0, (window.innerWidth - CANONICAL_WIDTH * scale) / 2);
    const top = Math.max(0, (window.innerHeight - CANONICAL_HEIGHT * scale) / 2);
    // zoom, not transform: scale. transform rasterises the layer and only then
    // scales the finished picture — every sprite and border gets resampled, and
    // seams show up along the 9-slice boundaries (measured: a step of 27
    // against 0). zoom scales the layout itself, so elements are recomputed at
    // the new size and redrawn from scratch. The combat canvas does not suffer
    // from this: its contents are a raster anyway, and input works out
    // coordinates as fractions inside the rectangle rather than as absolute
    // pixels.
    stage.style.transform = "none";
    stage.style.zoom = String(scale);
    stage.style.left = `${left / scale}px`;
    stage.style.top = `${top / scale}px`;
    document.documentElement.style.setProperty("--hb-stage-scale", String(scale));
    document.documentElement.style.setProperty("--hb-stage-left", `${left}px`);
    document.documentElement.style.setProperty("--hb-stage-top", `${top}px`);
    stage.dataset.scale = scale.toFixed(6);
  }

  window.addEventListener("resize", fit);
  window.addEventListener("pageshow", fit);
  window.visualViewport?.addEventListener("resize", fit);
  desktop.addEventListener?.("change", fit);

  window.LoothoodCombatFoundation = Object.freeze({
    canonicalWidth: CANONICAL_WIDTH,
    canonicalHeight: CANONICAL_HEIGHT,
    fit,
  });
  fit();
})();
