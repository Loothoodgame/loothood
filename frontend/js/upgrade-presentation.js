(function initUpgradePresentation(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodUpgradePresentation = api;
})(typeof window !== "undefined" ? window : globalThis, function upgradePresentationFactory() {
  "use strict";

  const ART_BY_UPGRADE_ID = Object.freeze({
    drawWeight: "assets/upgrades/attributes/draw-weight-master.png",
    oakheart: "assets/upgrades/attributes/oak-heart-master.png",
    fieldDressing: "assets/upgrades/attributes/field-dressing-master.png",
    fleetfoot: "assets/upgrades/attributes/fleetfoot-master.png",
    quickNock: "assets/upgrades/attributes/quick-nock-master.png",
    eagleEye: "assets/upgrades/attributes/eagle-eye-master.png",
    deadeye: "assets/upgrades/attributes/deadeye-master.png",
    leatherGuard: "assets/upgrades/attributes/leather-guard-master.png",
    multishot: "assets/upgrades/techniques/multishot-master.png",
    bodkinArrows: "assets/upgrades/techniques/bodkin-arrows-master.png",
    ricochet: "assets/upgrades/techniques/ricochet-master.png",
    venomTips: "assets/upgrades/techniques/venom-tips-master.png",
    winterBinding: "assets/upgrades/techniques/winter-binding-master.png",
    serratedHeads: "assets/upgrades/techniques/serrated-heads-master.png",
    burstArrow: "assets/upgrades/techniques/burst-arrow-master.png",
    staggeringShot: "assets/upgrades/techniques/staggering-shot-master.png",
  });

  function assetFor(upgradeId) {
    return ART_BY_UPGRADE_ID[upgradeId] || "";
  }

  return Object.freeze({
    ART_BY_UPGRADE_ID,
    assetFor,
  });
});
