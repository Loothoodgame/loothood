(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LOOTHOOD_INDUCTION = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const SEED = 0x484f4f44;
  const STAGE_COUNT = 6;
  const BOSS_STAGE = 6;
  const SOUNDTRACK_STAGE_BY_ROOM = Object.freeze({
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 4,
    6: 5,
  });
  const ACKNOWLEDGEMENT_DELAY = 0.7;
  const GUIDED_BRAMBLE_WARNING = 1.25;
  const LIVE_BRAMBLE_WARNING = 0.9;
  const TAUGHT_GLOSSARY_IDS = Object.freeze([
    "movement",
    "stopToShoot",
    "targeting",
    "upgrades",
    "charges",
    "nets",
    "brambles",
    "elements",
    "shields",
    "shieldBreak",
    "escapeEnemies",
    "bosses",
    "buildings",
    "foundations",
  ]);
  const BUILDER_PACK_BUILDINGS = Object.freeze([
    "archeryRange",
    "trainingGrounds",
    "infirmary",
    "rangerLodge",
    "quickdrawYard",
    "huntsmansHall",
    "bullseyeYard",
    "armoury",
  ]);
  const GUIDANCE_TOUR_IDS = Object.freeze([
    "hunt",
    "settlement",
    "plots",
    "equipment-pulls",
    "outfitter",
    "marketplace",
    "bounties",
    "guide",
    "season-centre",
    "foundation",
  ]);
  const FIXED_UPGRADES = Object.freeze({
    1: Object.freeze(["drawWeight", "fleetfoot", "oakheart"]),
    2: Object.freeze(["serratedHeads", "venomTips", "winterBinding"]),
    3: Object.freeze(["quickNock", "fieldDressing", "leatherGuard"]),
    4: Object.freeze(["eagleEye", "staggeringShot", "burstArrow"]),
    5: Object.freeze(["deadeye", "multishot", "bodkinArrows"]),
  });
  // The current Stage-5 catalogue has no three-item offer that can first be
  // chosen after Stage 5 and then visibly activate during this short boss.
  const FIXED_RELICS = Object.freeze([]);
  const STAGES = Object.freeze([
    Object.freeze({
      number: 1,
      type: "Induction",
      title: "Plant Your Feet",
      objective: "Move, stop, and fire.",
      enemies: Object.freeze([
        Object.freeze({ typeId: "forestGrunt", x: 300, y: 190, hpScale: 0.62 }),
        Object.freeze({ typeId: "forestGrunt", x: 480, y: 150, hpScale: 0.62 }),
        Object.freeze({ typeId: "forestGrunt", x: 660, y: 190, hpScale: 0.62 }),
      ]),
    }),
    Object.freeze({
      number: 2,
      type: "Induction",
      title: "Read the Charge",
      objective: "Leave the marked line before the charge.",
      enemies: Object.freeze([
        Object.freeze({ typeId: "boarCharger", x: 480, y: 340, hpScale: 0.82 }),
      ]),
    }),
    Object.freeze({
      number: 3,
      type: "Induction",
      title: "Nets and Brambles",
      objective: "Escape slows and move before thorns rise.",
      enemies: Object.freeze([
        Object.freeze({ typeId: "brambleCaster", x: 480, y: 155, hpScale: 0.72 }),
      ]),
    }),
    Object.freeze({
      number: 4,
      type: "Induction",
      title: "Break the Guard",
      objective: "Move behind shields to deal full damage.",
      enemies: Object.freeze([
        Object.freeze({ typeId: "shieldGuard", x: 480, y: 190, hpScale: 0.88 }),
      ]),
    }),
    Object.freeze({
      number: 5,
      type: "Induction",
      title: "Catch the Wood Sprite",
      objective: "Catch the optional Wood Sprite within 7 seconds while clearing the room.",
      enemies: Object.freeze([
        Object.freeze({ typeId: "fletcherThief", x: 480, y: 195, escapeTime: 7 }),
        Object.freeze({ typeId: "forestGrunt", x: 480, y: 285, hpScale: 0.72 }),
      ]),
    }),
    Object.freeze({
      number: 6,
      type: "Induction Boss",
      title: "Sheriff's Enforcer",
      objective: "Break the armour, survive Iron Oath, and force a retreat.",
      bossType: "sheriffEnforcer",
    }),
  ]);
  const GLOSSARY = Object.freeze([
    Object.freeze({ id: "movement", name: "Movement", desktopText: "Use WASD to move.", mobileText: "Use the joystick to move.", taughtAt: 1 }),
    Object.freeze({ id: "stopToShoot", name: "Firing", text: "Stop moving to fire.", taughtAt: 1 }),
    Object.freeze({ id: "targeting", name: "Targeting", text: "You automatically target nearby enemies.", taughtAt: 1 }),
    Object.freeze({ id: "upgrades", name: "Upgrades", text: "After each stage you can pick from 3 upgrades.", taughtAt: 1 }),
    Object.freeze({ id: "charges", name: "Charge Lines", text: "Move out of the line before the enemy charges.", taughtAt: 2 }),
    Object.freeze({ id: "elements", name: "Elements", text: "Choosing an element removes the other two for that Hunt.", taughtAt: 2 }),
    Object.freeze({ id: "nets", name: "Nets", text: "Move out of the net to remove its slow.", taughtAt: 3 }),
    Object.freeze({ id: "brambles", name: "Brambles", text: "Move out of the circle before the thorns rise.", taughtAt: 3 }),
    Object.freeze({ id: "shields", name: "Shield Guards", text: "Move around the shield and attack from the side or rear.", taughtAt: 4 }),
    Object.freeze({ id: "shieldBreak", name: "Shield Break", text: "Hit the front of the shield five times to break it.", taughtAt: 4 }),
    Object.freeze({ id: "escapeEnemies", name: "Fleeing Enemies", text: "Defeat them before they escape to gain a temporary reward.", taughtAt: 5 }),
    Object.freeze({ id: "relics", name: "Relic Chests", text: "Open the chest and choose a relic for the current Hunt." }),
    Object.freeze({ id: "bosses", name: "Boss Armour", text: "Break the armour before damaging the boss.", taughtAt: 6 }),
    Object.freeze({ id: "buildings", name: "Buildings", text: "Build on a Plot. Upgrade the building to increase its effect.", taughtAt: 6 }),
    Object.freeze({ id: "foundations", name: "Foundations", text: "Choose one Foundation before each Hunt.", taughtAt: 6 }),
    Object.freeze({ id: "equipment", name: "Equipment", text: "Use the Outfitter to view and equip your gear." }),
    Object.freeze({ id: "gacha", name: "Equipment Pulls", text: "Use a Ticket to get one random equipment item." }),
  ]);

  function createProgress() {
    return {
      status: "notStarted",
      completedAt: 0,
      replayCount: 0,
      glossaryUnlocked: [],
      builderPack: {
        status: "locked",
        buildingId: "",
        plotIndex: null,
      },
      guidance: {
        completed: [],
        skipped: [],
        progress: {},
      },
    };
  }

  function normalizeProgress(raw, options = {}) {
    if (!raw || typeof raw !== "object") {
      if (!options.existingSave) return createProgress();
      return {
        status: "completed",
        completedAt: 0,
        replayCount: 0,
        glossaryUnlocked: [...TAUGHT_GLOSSARY_IDS],
        builderPack: {
          status: "complete",
          buildingId: "",
          plotIndex: null,
        },
        guidance: {
          completed: [...GUIDANCE_TOUR_IDS],
          skipped: [],
          progress: {},
        },
      };
    }
    const progress = createProgress();
    progress.status = raw.status === "completed" ? "completed" : "notStarted";
    progress.completedAt = Math.max(0, Number(raw.completedAt) || 0);
    progress.replayCount = Math.max(0, Math.floor(Number(raw.replayCount) || 0));
    progress.glossaryUnlocked = [...new Set(
      Array.isArray(raw.glossaryUnlocked)
        ? raw.glossaryUnlocked.filter((id) => GLOSSARY.some((entry) => entry.id === id))
        : []
    )];
    const pack = raw.builderPack && typeof raw.builderPack === "object" ? raw.builderPack : {};
    progress.builderPack.status = ["locked", "placement", "upgrade", "complete"].includes(pack.status)
      ? pack.status
      : progress.status === "completed" ? "placement" : "locked";
    progress.builderPack.buildingId = typeof pack.buildingId === "string" ? pack.buildingId : "";
    progress.builderPack.plotIndex = Number.isInteger(Number(pack.plotIndex))
      ? Math.max(0, Math.floor(Number(pack.plotIndex)))
      : null;
    if (progress.builderPack.status === "upgrade" && (!progress.builderPack.buildingId || progress.builderPack.plotIndex === null)) {
      progress.builderPack.status = "placement";
      progress.builderPack.buildingId = "";
      progress.builderPack.plotIndex = null;
    }
    const guidance = raw.guidance && typeof raw.guidance === "object" ? raw.guidance : {};
    progress.guidance.completed = [...new Set(
      Array.isArray(guidance.completed)
        ? guidance.completed.filter((id) => GUIDANCE_TOUR_IDS.includes(id))
        : []
    )];
    progress.guidance.skipped = [...new Set(
      Array.isArray(guidance.skipped)
        ? guidance.skipped.filter((id) => GUIDANCE_TOUR_IDS.includes(id) && !progress.guidance.completed.includes(id))
        : []
    )];
    progress.guidance.progress = Object.fromEntries(
      Object.entries(guidance.progress && typeof guidance.progress === "object" ? guidance.progress : {})
        .filter(([id]) => GUIDANCE_TOUR_IDS.includes(id))
        .map(([id, value]) => [id, Math.max(0, Math.floor(Number(value) || 0))])
    );
    return progress;
  }

  function createRunState() {
    return {
      rngState: SEED >>> 0,
      stagePhase: "",
      promptAction: "",
      startX: 0,
      startY: 0,
      movementDistance: 0,
      shotsAtStart: 0,
      damageCheckpoint: 0,
      trackedEnemyId: 0,
      trackedHazardTag: "",
      chargeWasActive: false,
      chargeThreatened: false,
      chargeDodges: 0,
      chargeStartX: 0,
      chargeStartY: 0,
      brambleDodges: 0,
      flankHits: 0,
      lastFlankBraceCycle: -1,
      acknowledgementTimer: 0,
      acknowledgementAction: "",
      lessonComplete: false,
      firstStatusCalloutShown: false,
      stage5RelicChosen: false,
      relicLessonComplete: false,
      bossPromptShown: false,
      bossFirstChargeResolved: false,
      bossPhaseOneCharges: 0,
      bossPhaseOneVolleys: 0,
      bossWheelComplete: false,
      bossLaneCharges: 0,
      lastBossLaneStep: 0,
      bossRetreated: false,
      previousBowTier: 0,
    };
  }

  function nextRandom(runState) {
    let value = Number(runState?.rngState) >>> 0;
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    if (runState) runState.rngState = value;
    return value / 0x100000000;
  }

  function stage(number) {
    return STAGES[Math.max(1, Math.min(STAGE_COUNT, Math.floor(Number(number) || 1))) - 1];
  }

  function fixedUpgradeIds(number) {
    return [...(FIXED_UPGRADES[Math.floor(Number(number) || 0)] || [])];
  }

  function soundtrackStage(room) {
    const normalized = Math.floor(Number(room) || 0);
    return SOUNDTRACK_STAGE_BY_ROOM[normalized] || 0;
  }

  function isBuilderPackBuilding(id) {
    return BUILDER_PACK_BUILDINGS.includes(id);
  }

  return Object.freeze({
    SEED,
    STAGE_COUNT,
    BOSS_STAGE,
    SOUNDTRACK_STAGE_BY_ROOM,
    ACKNOWLEDGEMENT_DELAY,
    GUIDED_BRAMBLE_WARNING,
    LIVE_BRAMBLE_WARNING,
    STAGES,
    GLOSSARY,
    TAUGHT_GLOSSARY_IDS,
    BUILDER_PACK_BUILDINGS,
    GUIDANCE_TOUR_IDS,
    FIXED_RELICS,
    createProgress,
    normalizeProgress,
    createRunState,
    nextRandom,
    stage,
    fixedUpgradeIds,
    soundtrackStage,
    isBuilderPackBuilding,
  });
});
