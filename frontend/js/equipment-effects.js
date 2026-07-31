(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodEquipmentEffects = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const RUNTIME_VERSION = 1;
  const IDS = Object.freeze({
    ASHEN_JUDGEMENT: "HELM-AEL-V5-01",
    BLOOD_ACCOUNTANT: "HELM-AEL-V5-03",
    ECHOEYE_HOOD: "HELM-AEL-V5-04",
    EVERVENOM_SIGHT: "HELM-AEL-V5-05",
    RED_HOURGLASS: "HELM-AEL-V5-06",
    VENOM_VESSEL: "HELM-AEL-V5-09",
    THAWLESS_CROWN: "HELM-AEL-V5-11",
    PLAGUE_HEIR: "HELM-AEL-V5-12",
    NEARFANG_COWL: "HELM-AEL-V5-17",
    REDMIST_VEIL: "HELM-AEL-V5-20",
    MERCY_VAULT: "CHEST-AEL-V5-01",
    DEBT_MAIL: "CHEST-AEL-V5-03",
    REDLINE_CUIRASS: "CHEST-AEL-V5-04",
    SECOND_HEART_MAIL: "CHEST-AEL-V5-07",
    SHATTERMEND_PLATE: "CHEST-AEL-V5-08",
    BRIARBLOOD_COAT: "CHEST-AEL-V5-09",
    STORMCELL_VEST: "CHEST-AEL-V5-10",
    UNTOUCHED_PLATE: "CHEST-AEL-V5-13",
    SLIPGUARD_MAIL: "CHEST-AEL-V5-15",
    DRAWGUARD_MAIL: "CHEST-AEL-V5-17",
    ROADMENDER_VEST: "CHEST-AEL-V5-18",
    COLD_GUARD: "CHEST-AEL-V5-19",
    TROPHYHIDE: "CHEST-AEL-V5-20",
    LONG_BRAKE_BOOTS: "BOOTS-AEL-V5-01",
    EDGEFIRE_TREADS: "BOOTS-AEL-V5-03",
    MOMENTUM_GREAVES: "BOOTS-AEL-V5-04",
    ARROWSTRAIGHT_BOOTS: "BOOTS-AEL-V5-05",
    TRAILBACK_SOLES: "BOOTS-AEL-V5-06",
    GRAZER_BOOTS: "BOOTS-AEL-V5-07",
    RED_WARNING_TREADS: "BOOTS-AEL-V5-08",
    HAZARDSKIP_BOOTS: "BOOTS-AEL-V5-14",
    BLOODRUSH_BOOTS: "BOOTS-AEL-V5-15",
    REDLINE_RUNNERS: "BOOTS-AEL-V5-17",
    FOUR_CORNERS_BOOTS: "BOOTS-AEL-V5-18",
    ARROWPATH_SOLES: "BOOTS-AEL-V5-20",
    SINGLEBOLT_GREAVES: "LEGS-AEL-V5-01",
    ECHOCHAIN_LEGGINGS: "LEGS-AEL-V5-02",
    HOMEWARD_BODKINS: "LEGS-AEL-V5-03",
    FORKED_REBOUND: "LEGS-AEL-V5-04",
    OVERFLOW_GREAVES: "LEGS-AEL-V5-05",
    BANKED_BOUNCE: "LEGS-AEL-V5-07",
    ORBIT_QUIVER: "LEGS-AEL-V5-08",
    ECHO_IMPACT: "LEGS-AEL-V5-09",
    EXECUTION_RELAY: "LEGS-AEL-V5-10",
    COMPASS_GREAVES: "LEGS-AEL-V5-12",
    NEEDLE_FAN_LEGGINGS: "LEGS-AEL-V5-13",
    MARCHING_QUIVER: "LEGS-AEL-V5-14",
    BURIED_BURST: "LEGS-AEL-V5-15",
    VENOM_PULSE_LEGGINGS: "LEGS-AEL-V5-16",
    BLOODRUNNER_GREAVES: "LEGS-AEL-V5-17",
    WINTER_PAIR_CUISSES: "LEGS-AEL-V5-18",
  });

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function activeEffectIds(snapshot) {
    return (snapshot?.effects || []).map((effect) => effect.id).filter(Boolean);
  }

  function createRuntime(snapshot = {}) {
    return {
      runtimeVersion: RUNTIME_VERSION,
      active: Object.fromEntries(activeEffectIds(snapshot).map((id) => [id, true])),
      elapsed: 0,
      room: 0,
      stage: 0,
      shotIndex: 0,
      alternatingTopologyIndex: 0,
      alternatingChillIndex: 0,
      poisonPulseIndex: 0,
      slipstreamCounter: 0,
      slipstream: null,
      movementDistanceRemainder: 0,
      movementProjectileBank: 0,
      roadmenderDistance: 0,
      roadmenderReady: false,
      roadmenderUsed: false,
      untouchedMovement: 0,
      untouchedCooldown: 0,
      continuousMovement: 0,
      momentumSeconds: 0,
      momentumBraking: false,
      straightSeconds: 0,
      straightPenalty: 0,
      previousMoveAngle: null,
      trail: [],
      visitedQuadrants: [],
      grazeStacks: 0,
      bloodrushPhase: "ready",
      bloodrushTimer: 0,
      redmistReady: false,
      redmistCooldown: 0,
      slipguardReady: false,
      slipguardTimer: 0,
      slipguardCooldown: 0,
      drawguardRootIds: [],
      secondHeartUsed: false,
      barrierLock: 0,
      hazardImmunity: 0,
      hazardRecovery: 0,
      hazardSkimSources: {},
      damageDebt: [],
      orbitingProjectiles: [],
      bankedRicochets: 0,
      pendingDelayedImpacts: [],
      pendingBurstMines: [],
      relayCounts: {},
      ricochetSplitRoots: {},
      stageSurvivalUsed: false,
      frostBarrierCooldown: 0,
      telemetry: {
        triggers: {},
        damageAdded: 0,
        damageRemoved: 0,
        healingConverted: 0,
        barrierGranted: 0,
      },
    };
  }

  function has(runtime, id) {
    return Boolean(runtime?.active?.[id]);
  }

  function isPrimaryNonChildProjectile(projectile) {
    return Boolean(projectile?.rootContext?.origin === "primary" && !projectile.equipmentChild);
  }

  function record(runtime, id) {
    if (!runtime?.telemetry) return;
    runtime.telemetry.triggers[id] = (runtime.telemetry.triggers[id] || 0) + 1;
  }

  function statusInitiations(snapshot = {}) {
    const result = [];
    for (const item of snapshot.items || []) {
      const initiation = item.legendaryEffectId && item.legendaryEffectId !== "elementalInitiation"
        ? item.legendaryEffectId
        : "";
      const status = [
        IDS.ASHEN_JUDGEMENT,
        IDS.THAWLESS_CROWN,
        IDS.COLD_GUARD,
        IDS.WINTER_PAIR_CUISSES,
      ].includes(initiation)
        ? "frost"
        : [IDS.EVERVENOM_SIGHT, IDS.VENOM_VESSEL, IDS.PLAGUE_HEIR, IDS.VENOM_PULSE_LEGGINGS].includes(initiation)
          ? "poison"
          : [IDS.BLOOD_ACCOUNTANT, IDS.RED_HOURGLASS, IDS.BLOODRUNNER_GREAVES].includes(initiation)
            ? "bleed"
            : "";
      if (status && !result.includes(status)) result.push(status);
    }
    return result;
  }

  function clearRoomState(runtime) {
    runtime.shotIndex = 0;
    runtime.slipstream = null;
    runtime.slipstreamCounter = 0;
    runtime.visitedQuadrants = [];
    runtime.trail = [];
    runtime.movementDistanceRemainder = 0;
    runtime.movementProjectileBank = 0;
    runtime.roadmenderDistance = 0;
    runtime.roadmenderReady = false;
    runtime.roadmenderUsed = false;
    runtime.untouchedMovement = 0;
    runtime.untouchedCooldown = 0;
    runtime.continuousMovement = 0;
    runtime.momentumSeconds = 0;
    runtime.momentumBraking = false;
    runtime.straightSeconds = 0;
    runtime.straightPenalty = 0;
    runtime.previousMoveAngle = null;
    runtime.grazeStacks = 0;
    runtime.bloodrushPhase = "ready";
    runtime.bloodrushTimer = 0;
    runtime.redmistReady = false;
    runtime.redmistCooldown = 0;
    runtime.slipguardReady = false;
    runtime.slipguardTimer = 0;
    runtime.slipguardCooldown = 0;
    runtime.drawguardRootIds = [];
    runtime.barrierLock = 0;
    runtime.hazardImmunity = 0;
    runtime.hazardRecovery = 0;
    runtime.hazardSkimSources = {};
    runtime.damageDebt = [];
    runtime.bankedRicochets = 0;
    runtime.orbitingProjectiles = [];
    runtime.pendingDelayedImpacts = [];
    runtime.pendingBurstMines = [];
    runtime.relayCounts = {};
    runtime.ricochetSplitRoots = {};
    runtime.poisonApplications = {};
    runtime.frostApplications = {};
    runtime.alternatingTopologyIndex = 0;
    runtime.alternatingChillIndex = 0;
    runtime.poisonPulseIndex = 0;
    runtime.secondHeartUsed = false;
    runtime.stageSurvivalUsed = false;
    runtime.frostBarrierCooldown = 0;
  }

  function beginRoom(runtime, room) {
    clearRoomState(runtime);
    runtime.room = room;
  }

  function endRoom(runtime) {
    clearRoomState(runtime);
    runtime.room = 0;
  }

  function tick(runtime, dt, context = {}) {
    runtime.elapsed += dt;
    for (const field of [
      "untouchedCooldown", "straightPenalty", "bloodrushTimer",
      "redmistCooldown", "slipguardTimer", "slipguardCooldown", "barrierLock",
      "hazardImmunity", "hazardRecovery", "frostBarrierCooldown",
    ]) runtime[field] = Math.max(0, runtime[field] - dt);
    if (runtime.bloodrushTimer <= 0 && runtime.bloodrushPhase === "sprint") {
      runtime.bloodrushPhase = "debt";
      runtime.bloodrushTimer = 1.5;
    } else if (runtime.bloodrushTimer <= 0 && runtime.bloodrushPhase === "debt") {
      runtime.bloodrushPhase = "ready";
    }
    runtime.orbitingProjectiles = runtime.orbitingProjectiles
      .map((entry) => ({ ...entry, ttl: entry.ttl - dt }))
      .filter((entry) => entry.ttl > 0)
      .slice(-6);
    runtime.trail = runtime.trail
      .map((point) => ({ ...point, ttl: point.ttl - dt }))
      .filter((point) => point.ttl > 0)
      .slice(-80);
    if (runtime.slipstream) {
      runtime.slipstream.ttl -= dt;
      if (runtime.slipstream.ttl <= 0) runtime.slipstream = null;
    }

    let debtDamage = 0;
    const nextDebt = [];
    for (const debt of runtime.damageDebt) {
      const elapsed = Math.min(dt, debt.ttl);
      const rate = context.stopped ? 0.5 : 1;
      const scheduled = debt.remaining * (elapsed / Math.max(0.001, debt.ttl));
      const paid = scheduled * rate;
      debtDamage += paid;
      const removed = context.stopped ? scheduled - paid : 0;
      const remaining = Math.max(0, debt.remaining - paid - removed);
      if (remaining > 0 && debt.ttl - elapsed > 0) nextDebt.push({ remaining, ttl: debt.ttl - elapsed });
    }
    runtime.damageDebt = nextDebt;
    const readyDelayedImpacts = [];
    runtime.pendingDelayedImpacts = runtime.pendingDelayedImpacts.filter((entry) => {
      entry.ttl -= dt;
      if (entry.ttl > 0) return true;
      readyDelayedImpacts.push(entry);
      return false;
    });
    const readyBurstMines = [];
    runtime.pendingBurstMines = runtime.pendingBurstMines.filter((entry) => {
      entry.ttl -= dt;
      if (entry.ttl > 0) return true;
      readyBurstMines.push(entry);
      return false;
    });
    return { debtDamage, readyDelayedImpacts, readyBurstMines };
  }

  function pointToSegmentDistance(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared <= 0.0001) return Math.hypot(point.x - start.x, point.y - start.y);
    const ratio = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
    return Math.hypot(point.x - (start.x + dx * ratio), point.y - (start.y + dy * ratio));
  }

  function isRetracingTrail(runtime, input = {}) {
    if (!input.moving || !input.position || runtime.trail.length < 3) return false;
    const moveLength = Math.hypot(Number(input.moveX) || 0, Number(input.moveY) || 0);
    if (moveLength <= 0.08) return false;
    const moveX = input.moveX / moveLength;
    const moveY = input.moveY / moveLength;
    for (let index = runtime.trail.length - 2; index >= 1; index -= 1) {
      const segmentStart = runtime.trail[index - 1];
      const segmentEnd = runtime.trail[index];
      if (pointToSegmentDistance(input.position, segmentStart, segmentEnd) > 26) continue;
      const target = runtime.trail[Math.max(0, index - 4)];
      const targetX = target.x - input.position.x;
      const targetY = target.y - input.position.y;
      const targetLength = Math.hypot(targetX, targetY);
      if (targetLength < 8) continue;
      const alignment = moveX * (targetX / targetLength) + moveY * (targetY / targetLength);
      if (alignment >= 0.65) return true;
    }
    return false;
  }

  function movementPlan(runtime, input = {}) {
    const distance = Math.max(0, Number(input.distance) || 0);
    const moving = Boolean(input.moving);
    const angle = Number.isFinite(input.angle) ? input.angle : null;
    let speedMultiplier = 1;
    let brakeMultiplier = 1;
    const actions = [];

    if (moving) {
      runtime.continuousMovement += Number(input.dt) || 0;
      runtime.untouchedMovement += Number(input.dt) || 0;
      runtime.movementDistanceRemainder += distance;
    } else {
      runtime.continuousMovement = 0;
      runtime.untouchedMovement = 0;
    }

    if (has(runtime, IDS.LONG_BRAKE_BOOTS)) {
      speedMultiplier *= 1.3;
      brakeMultiplier *= 1.5;
    }
    if (has(runtime, IDS.EDGEFIRE_TREADS)) speedMultiplier *= input.edgeClearance <= 45 ? 1.75 : 0.9;
    if (has(runtime, IDS.MOMENTUM_GREAVES)) {
      const storedStacks = Math.min(8, Math.floor(runtime.momentumSeconds / 0.5));
      if (moving) {
        runtime.momentumBraking = false;
        runtime.momentumSeconds += Number(input.dt) || 0;
      }
      const stacks = moving
        ? Math.min(8, Math.floor(runtime.momentumSeconds / 0.5))
        : storedStacks;
      speedMultiplier *= 1 + stacks * 0.05;
      if (!moving) {
        if (stacks >= 8 && !input.settled) runtime.momentumBraking = true;
        if (runtime.momentumBraking && !input.settled) brakeMultiplier *= 1.5;
        if (input.settled) runtime.momentumBraking = false;
        runtime.momentumSeconds = 0;
      }
    }
    if (has(runtime, IDS.ARROWSTRAIGHT_BOOTS)) {
      if (moving && angle !== null) {
        const difference = runtime.previousMoveAngle === null
          ? 0
          : Math.abs(Math.atan2(Math.sin(angle - runtime.previousMoveAngle), Math.cos(angle - runtime.previousMoveAngle)));
        if (difference <= 25 * Math.PI / 180) runtime.straightSeconds += Number(input.dt) || 0;
        else {
          runtime.straightSeconds = 0;
          runtime.straightPenalty = 0.5;
        }
        runtime.previousMoveAngle = angle;
      }
      speedMultiplier *= 1 + Math.min(0.5, Math.floor(runtime.straightSeconds / 0.5) * 0.05);
      if (runtime.straightPenalty > 0) speedMultiplier *= 0.85;
    }
    if (has(runtime, IDS.TRAILBACK_SOLES)) {
      const retracing = isRetracingTrail(runtime, input);
      if (moving && input.position) {
        runtime.trail.push({ x: input.position.x, y: input.position.y, ttl: 2 });
        runtime.trail = runtime.trail.slice(-80);
      }
      speedMultiplier *= retracing ? 1.7 : 0.9;
    }
    if (has(runtime, IDS.GRAZER_BOOTS)) speedMultiplier *= 1 + runtime.grazeStacks * 0.1;
    if (has(runtime, IDS.RED_WARNING_TREADS) && input.inHostileWarning) speedMultiplier *= 1.6;
    if (has(runtime, IDS.BLOODRUSH_BOOTS)) {
      if (runtime.bloodrushPhase === "sprint") speedMultiplier *= 1.35;
      if (runtime.bloodrushPhase === "debt") speedMultiplier *= 0.85;
    }
    if (has(runtime, IDS.REDLINE_RUNNERS) && input.healthRatio < 0.35) speedMultiplier *= 1.5;
    if (has(runtime, IDS.FOUR_CORNERS_BOOTS)) {
      speedMultiplier *= 0.95;
      if (input.quadrant && !runtime.visitedQuadrants.includes(input.quadrant)) {
        runtime.visitedQuadrants.push(input.quadrant);
        record(runtime, IDS.FOUR_CORNERS_BOOTS);
      }
      speedMultiplier *= 1 + Math.min(4, runtime.visitedQuadrants.length) * 0.1;
    }
    if (has(runtime, IDS.ARROWPATH_SOLES)) speedMultiplier *= input.inSlipstream ? 1.5 : 0.9;
    if (has(runtime, IDS.BRIARBLOOD_COAT) && input.hostileSlowActive) speedMultiplier *= 2;

    if (has(runtime, IDS.MARCHING_QUIVER)) {
      while (runtime.movementDistanceRemainder >= 50 && runtime.movementProjectileBank < 3) {
        runtime.movementDistanceRemainder -= 50;
        runtime.movementProjectileBank += 1;
        record(runtime, IDS.MARCHING_QUIVER);
      }
    }
    if (
      has(runtime, IDS.ROADMENDER_VEST)
      && !runtime.roadmenderUsed
      && moving
      && Number(input.healthRatio) < 0.75
    ) {
      runtime.roadmenderDistance += distance;
    }
    if (has(runtime, IDS.ROADMENDER_VEST) && !runtime.roadmenderUsed && runtime.roadmenderDistance >= 180) {
      runtime.roadmenderDistance = 180;
      runtime.roadmenderUsed = true;
      runtime.roadmenderReady = true;
      actions.push({ type: "heal", maxHpPercent: 25, source: IDS.ROADMENDER_VEST });
      record(runtime, IDS.ROADMENDER_VEST);
    }
    if (has(runtime, IDS.UNTOUCHED_PLATE) && runtime.untouchedCooldown <= 0 && runtime.untouchedMovement >= 6) {
      runtime.untouchedMovement = 0;
      runtime.untouchedCooldown = 8;
      actions.push({ type: "barrier", maxHpPercent: 13, duration: 9, layerId: "equipment.untouched-plate" });
      record(runtime, IDS.UNTOUCHED_PLATE);
    }

    return { speedMultiplier, brakeMultiplier, actions };
  }

  function createVolleyPlan(runtime, input = {}) {
    runtime.shotIndex += 1;
    const plan = {
      projectileCount: Math.max(1, Math.floor(input.projectileCount || 1)),
      damageMultiplier: 1,
      spreadMultiplier: 1,
      extraPierce: 0,
      extraRicochets: 0,
      equipmentRicochetDamage: 0,
      radialCount: 0,
      radialDamageMultiplier: 1,
      echoProjectiles: [],
      releasedOrbiting: [],
      releasedBankedRicochets: 0,
      topology: "normal",
      forceCritChanceBonus: 0,
      statusMode: "",
    };

    if (has(runtime, IDS.NEARFANG_COWL) && input.targetDistance <= 150) {
      plan.extraPierce += 1;
      plan.damageMultiplier *= 0.9;
    }
    if (has(runtime, IDS.REDMIST_VEIL) && runtime.redmistReady) {
      runtime.redmistReady = false;
      plan.forceCritChanceBonus += 0.75;
      plan.spreadMultiplier *= 1.3;
      record(runtime, IDS.REDMIST_VEIL);
    }
    if (has(runtime, IDS.SLIPGUARD_MAIL) && runtime.slipguardReady) {
      runtime.slipguardReady = false;
      plan.damageMultiplier *= 0.85;
    }
    if (has(runtime, IDS.DRAWGUARD_MAIL)) plan.damageMultiplier *= 0.9;
    if (has(runtime, IDS.ROADMENDER_VEST) && runtime.roadmenderReady) {
      runtime.roadmenderReady = false;
      plan.damageMultiplier *= 0.9;
    }

    if (has(runtime, IDS.SINGLEBOLT_GREAVES)) {
      plan.damageMultiplier *= plan.projectileCount * 0.9;
      plan.projectileCount = 1;
      plan.extraPierce += 2;
      plan.topology = "singlebolt";
    } else if (has(runtime, IDS.ECHOCHAIN_LEGGINGS)) {
      const removed = Math.max(0, plan.projectileCount - 2);
      plan.projectileCount = Math.min(2, plan.projectileCount);
      plan.extraRicochets += removed;
      plan.equipmentRicochetDamage = 4.5;
      plan.topology = "echochain";
    } else if (has(runtime, IDS.OVERFLOW_GREAVES)) {
      const removed = Math.max(0, plan.projectileCount - 3);
      plan.projectileCount = Math.min(3, plan.projectileCount);
      plan.damageMultiplier *= 1 + removed * 0.8;
      plan.widthMultiplier = 1 + removed * 0.12;
      plan.topology = "overflow";
    } else if (has(runtime, IDS.COMPASS_GREAVES)) {
      plan.radialCount = Math.max(0, plan.projectileCount - 2);
      plan.projectileCount = Math.min(2, plan.projectileCount);
      plan.radialDamageMultiplier = 4;
      plan.topology = "compass";
    } else if (has(runtime, IDS.NEEDLE_FAN_LEGGINGS)) {
      runtime.alternatingTopologyIndex += 1;
      if (runtime.alternatingTopologyIndex % 2 === 1) {
        plan.damageMultiplier *= plan.projectileCount * 1.3;
        plan.projectileCount = 1;
        plan.topology = "needle";
      } else {
        plan.damageMultiplier *= 1.2;
        plan.spreadMultiplier *= 1.6;
        plan.topology = "fan";
      }
    }
    if (has(runtime, IDS.MARCHING_QUIVER) && runtime.movementProjectileBank > 0) {
      plan.projectileCount += runtime.movementProjectileBank;
      runtime.movementProjectileBank = 0;
      plan.damageMultiplier *= 0.7;
      plan.topology = `${plan.topology}+marching`;
    }
    if (has(runtime, IDS.ORBIT_QUIVER) && runtime.orbitingProjectiles.length) {
      plan.releasedOrbiting = runtime.orbitingProjectiles.splice(0, 6);
      record(runtime, IDS.ORBIT_QUIVER);
    }
    if (has(runtime, IDS.BANKED_BOUNCE) && runtime.bankedRicochets > 0) {
      plan.releasedBankedRicochets = Math.min(3, runtime.bankedRicochets);
      runtime.bankedRicochets = 0;
      record(runtime, IDS.BANKED_BOUNCE);
    }
    if (has(runtime, IDS.ARROWPATH_SOLES)) {
      runtime.slipstreamCounter += 1;
      if (runtime.slipstreamCounter % 5 === 0) plan.createSlipstream = true;
    }
    if (has(runtime, IDS.VENOM_PULSE_LEGGINGS)) {
      runtime.poisonPulseIndex += 1;
      plan.statusMode = runtime.poisonPulseIndex % 2 === 0 ? "poisonPulse" : "poisonSuppressed";
    }
    if (has(runtime, IDS.WINTER_PAIR_CUISSES)) {
      runtime.alternatingChillIndex += 1;
      plan.statusMode = runtime.alternatingChillIndex % 2 === 0 ? "deepCold" : "cold";
    }
    return plan;
  }

  function criticalPlan(runtime, input = {}) {
    const result = { directMultiplier: input.wouldCrit ? input.critMultiplier : 1, echoMultiplier: 0, bleedPayoutMultiplier: 0 };
    if (has(runtime, IDS.ASHEN_JUDGEMENT)) {
      const bonus = input.frostAffected
        ? Math.min(3.5, input.critChance * input.critMultiplier * 1.1)
        : 0;
      result.directMultiplier = 1 + bonus;
    } else if (has(runtime, IDS.BLOOD_ACCOUNTANT) && input.wouldCrit) {
      const steps = Math.max(0, Math.floor(((input.critMultiplier * 100) - 200) / 50));
      result.directMultiplier = 1;
      result.bleedPayoutMultiplier = Math.min(10, 4 + steps * 1.4);
    } else if (has(runtime, IDS.ECHOEYE_HOOD) && input.wouldCrit) {
      const steps = Math.max(0, Math.floor(((input.critMultiplier * 100) - 200) / 25));
      result.directMultiplier = 1;
      result.echoMultiplier = Math.min(4.75, 2.2 + steps * 0.25);
    }
    return result;
  }

  function incomingDamagePlan(runtime, input = {}) {
    let multiplier = 1;
    let immediateRatio = 1;
    let deferredRatio = 0;
    let immune = false;
    if (has(runtime, IDS.BRIARBLOOD_COAT)) multiplier *= 1.25;
    if (has(runtime, IDS.RED_WARNING_TREADS) && input.inHostileWarning && ["contact", "hazard", "bossZone"].includes(input.damageClass)) multiplier *= 1.25;
    if (has(runtime, IDS.GRAZER_BOOTS) && input.damageClass === "projectile") multiplier *= 1.25;
    if (has(runtime, IDS.STORMCELL_VEST) && input.damageClass === "hazard") {
      if (runtime.hazardImmunity > 0) immune = true;
      else if (runtime.hazardRecovery > 0) multiplier *= 2;
    }
    if (has(runtime, IDS.HAZARDSKIP_BOOTS) && input.damageClass === "hazard") {
      if (runtime.hazardImmunity > 0) immune = true;
      else if (runtime.hazardRecovery > 0) multiplier *= 1.5;
    }
    if (has(runtime, IDS.DEBT_MAIL) && !input.isDebt) {
      immediateRatio = 0.55;
      deferredRatio = 0.45;
    }
    return { multiplier, immediateRatio, deferredRatio, immune };
  }

  function dynamicDamageReduction(runtime, input = {}) {
    let reduction = 0;
    if (has(runtime, IDS.REDLINE_CUIRASS) && Number(input.healthRatio) < 0.6) reduction += 0.12;
    if (has(runtime, IDS.SLIPGUARD_MAIL) && runtime.slipguardTimer > 0) reduction += 0.4;
    return reduction;
  }

  function afterHealthDamage(runtime, input = {}) {
    const actions = [];
    if (has(runtime, IDS.REDMIST_VEIL) && runtime.redmistCooldown <= 0) {
      runtime.redmistReady = true;
      runtime.redmistCooldown = 1.25;
    }
    if (has(runtime, IDS.SLIPGUARD_MAIL) && runtime.slipguardCooldown <= 0) {
      runtime.slipguardTimer = 2;
      runtime.slipguardCooldown = 5;
      runtime.slipguardReady = true;
    }
    if (has(runtime, IDS.BLOODRUSH_BOOTS) && runtime.bloodrushPhase === "ready") {
      runtime.bloodrushPhase = "sprint";
      runtime.bloodrushTimer = 1.25;
    }
    if (has(runtime, IDS.GRAZER_BOOTS) && input.damageClass === "projectile") runtime.grazeStacks = 0;
    if (has(runtime, IDS.UNTOUCHED_PLATE)) runtime.untouchedMovement = 0;
    return actions;
  }

  function registerDeferredDamage(runtime, amount) {
    if (amount > 0) runtime.damageDebt.push({ remaining: amount, ttl: 4 });
  }

  function healingPlan(runtime, amount, maxHp, currentBarrier = 0) {
    if (has(runtime, IDS.MERCY_VAULT)) {
      const barrier = Math.min(
        Math.max(0, maxHp * 0.2 - Math.max(0, currentBarrier)),
        amount * 2
      );
      runtime.telemetry.healingConverted += amount;
      return { healing: 0, barrier };
    }
    return { healing: amount * (has(runtime, IDS.REDLINE_CUIRASS) ? 1.3 : 1), barrier: 0 };
  }

  function maximumHealthMultiplier(runtime) {
    let multiplier = 1;
    if (has(runtime, IDS.SECOND_HEART_MAIL)) multiplier *= 0.8;
    return multiplier;
  }

  function healthCapRatio(runtime) {
    return has(runtime, IDS.REDLINE_CUIRASS) ? 0.6 : 1;
  }

  function lethalSave(runtime) {
    if (!has(runtime, IDS.SECOND_HEART_MAIL) || runtime.secondHeartUsed) return null;
    runtime.secondHeartUsed = true;
    record(runtime, IDS.SECOND_HEART_MAIL);
    return 0.15;
  }

  function barrierAllowed(runtime) {
    return runtime.barrierLock <= 0;
  }

  function onBarrierBroken(runtime, maxHp) {
    if (!has(runtime, IDS.SHATTERMEND_PLATE)) return null;
    runtime.barrierLock = 5;
    record(runtime, IDS.SHATTERMEND_PLATE);
    return maxHp * 0.02;
  }

  function onAutoshotDamaged(runtime, rootVolleyId) {
    const actions = [];
    if (has(runtime, IDS.DRAWGUARD_MAIL) && !runtime.drawguardRootIds.includes(rootVolleyId)) {
      runtime.drawguardRootIds.push(rootVolleyId);
      runtime.drawguardRootIds = runtime.drawguardRootIds.slice(-32);
      actions.push({ type: "barrier", maxHpPercent: 2, duration: 1.25, layerId: "equipment.drawguard" });
    }
    return actions;
  }

  function onFreeze(runtime) {
    if (!has(runtime, IDS.COLD_GUARD) || runtime.frostBarrierCooldown > 0) return null;
    runtime.frostBarrierCooldown = 4;
    return { type: "barrier", maxHpPercent: 6, duration: 2, layerId: "equipment.cold-guard" };
  }

  function onEliteKilled(runtime) {
    return has(runtime, IDS.TROPHYHIDE)
      ? { type: "barrier", maxHpPercent: 12, duration: 5, layerId: "equipment.trophyhide" }
      : null;
  }

  function poisonPlan(runtime, input = {}) {
    if (has(runtime, IDS.EVERVENOM_SIGHT)) {
      const steps = Math.max(0, Math.floor(((input.critMultiplier * 100) - 200) / 25));
      return { persistent: true, cap: 80, damageMultiplier: Math.min(3, 0.25 + steps * 0.35) };
    }
    if (has(runtime, IDS.VENOM_VESSEL)) return { reservoir: true, cap: 80, overflowImmediateMultiplier: 1 };
    if (input.statusMode === "poisonSuppressed") return { suppress: true };
    if (input.statusMode === "poisonPulse") return { applicationMultiplier: 4, maxApplications: 16, durationBonus: 2 };
    return {};
  }

  function bleedPlan(runtime, input = {}) {
    if (has(runtime, IDS.RED_HOURGLASS)) return { duration: 1, totalDamageMultiplier: 2, maxWounds: 10 };
    return {};
  }

  function bleedTickRate(runtime, moving) {
    return has(runtime, IDS.BLOODRUNNER_GREAVES) ? (moving ? 2.2 : 0.5) : 1;
  }

  function frostPlan(runtime, input = {}) {
    if (has(runtime, IDS.THAWLESS_CROWN) && input.rank >= 3) return { chillCap: 3, overcapDamageMultiplier: 0.45, disableFreeze: true };
    if (input.statusMode === "deepCold" && input.rank >= 3) return { fixedChill: 10 };
    if (input.statusMode === "cold" && input.rank >= 3) return { suppressChill: true, slowMultiplier: 0.5 };
    return {};
  }

  function onProjectileGraze(runtime) {
    if (!has(runtime, IDS.GRAZER_BOOTS)) return 0;
    runtime.grazeStacks = Math.min(3, runtime.grazeStacks + 1);
    return runtime.grazeStacks;
  }

  function onHazardEntered(runtime, hazardId) {
    if (has(runtime, IDS.HAZARDSKIP_BOOTS) && !runtime.hazardSkimSources[hazardId]) {
      runtime.hazardSkimSources[hazardId] = true;
      runtime.hazardImmunity = 0.4;
      runtime.hazardRecovery = 2.4;
      return true;
    }
    return false;
  }

  function onHazardDamage(runtime) {
    if (has(runtime, IDS.STORMCELL_VEST) && runtime.hazardImmunity <= 0 && runtime.hazardRecovery <= 0) {
      runtime.hazardImmunity = 1;
      runtime.hazardRecovery = 3;
    }
  }

  function storeMissedProjectile(runtime, projectile) {
    if (!has(runtime, IDS.ORBIT_QUIVER) || projectile?.rootContext?.origin !== "primary") return false;
    runtime.orbitingProjectiles.push({ damage: projectile.damageBeforeCrit * 4, ttl: 4 });
    runtime.orbitingProjectiles = runtime.orbitingProjectiles.slice(-6);
    return true;
  }

  function storeUnusedRicochet(runtime) {
    if (!has(runtime, IDS.BANKED_BOUNCE)) return false;
    runtime.bankedRicochets = Math.min(3, runtime.bankedRicochets + 1);
    return true;
  }

  function queueDelayedImpact(runtime, entry) {
    if (!has(runtime, IDS.ECHO_IMPACT)) return false;
    runtime.pendingDelayedImpacts.push({ ...entry, ttl: 0.7 });
    return true;
  }

  function queueBurstMine(runtime, entry) {
    if (!has(runtime, IDS.BURIED_BURST)) return false;
    runtime.pendingBurstMines.push({ ...entry, ttl: 1 });
    return true;
  }

  return Object.freeze({
    RUNTIME_VERSION,
    IDS,
    createRuntime,
    has,
    isPrimaryNonChildProjectile,
    statusInitiations,
    beginRoom,
    endRoom,
    tick,
    isRetracingTrail,
    movementPlan,
    createVolleyPlan,
    criticalPlan,
    incomingDamagePlan,
    dynamicDamageReduction,
    afterHealthDamage,
    registerDeferredDamage,
    healingPlan,
    maximumHealthMultiplier,
    healthCapRatio,
    lethalSave,
    barrierAllowed,
    onBarrierBroken,
    onAutoshotDamaged,
    onFreeze,
    onEliteKilled,
    poisonPlan,
    bleedPlan,
    bleedTickRate,
    frostPlan,
    onProjectileGraze,
    onHazardEntered,
    onHazardDamage,
    storeMissedProjectile,
    storeUnusedRicochet,
    queueDelayedImpact,
    queueBurstMine,
  });
});
