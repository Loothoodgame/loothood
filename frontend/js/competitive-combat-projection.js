(function (root, factory) {
  const core = typeof module === "object" && module.exports
    ? require("./competitive-run-core")
    : root?.LoothoodCompetitiveRunCore;
  const api = factory(core);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodCompetitiveCombatProjection = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (CORE) {
  "use strict";

  if (!CORE) throw new Error("Loothood competitive run core is required.");

  const PROJECTION_VERSION = "loothood-competitive-combat-projection-v2";
  const WORLD_SCALE = 0.1;
  const TICK_SECONDS = 1 / CORE.TICK_RATE;

  const TYPE_PRESENTATION = Object.freeze({
    forestGrunt: Object.freeze({ name: "Forest Grunt", color: "#7fa867" }),
    wolfRunner: Object.freeze({ name: "Wolf Runner", color: "#aa8a63" }),
    boarCharger: Object.freeze({ name: "Boar Charger", color: "#9a5f43" }),
    shieldGuard: Object.freeze({ name: "Shield Guard", color: "#90b7c9" }),
    poacherArcher: Object.freeze({ name: "Poacher Archer", color: "#a77a54" }),
    netTrapper: Object.freeze({ name: "Net Trapper", color: "#a18a62" }),
    brambleCaster: Object.freeze({ name: "Bramble Caster", color: "#7ca45b" }),
    bannerCaptain: Object.freeze({ name: "Banner Captain", color: "#d6aa3b" }),
    woodlandOoze: Object.freeze({ name: "Woodland Ooze", color: "#6fa66a" }),
    armoredBrute: Object.freeze({ name: "Armoured Brute", color: "#9a6e56" }),
    fletcherThief: Object.freeze({ name: "Fletcher Thief", color: "#e3ad3f" }),
    greenwoodStag: Object.freeze({ name: "Greenwood Stag", color: "#8fe67d" }),
    sheriffEnforcer: Object.freeze({ name: "Sheriff's Enforcer", color: "#d65b42" }),
    brambleWarden: Object.freeze({ name: "Bramble Warden", color: "#79b85f" }),
    royalTrapper: Object.freeze({ name: "Royal Trapper", color: "#c99053" }),
    blackwoodHuntmaster: Object.freeze({ name: "Blackwood Huntmaster", color: "#9c7462" }),
    forestBoss: Object.freeze({ name: "Sheriff's Brute", color: "#cb5d38" }),
    rootHeart: Object.freeze({ name: "Root Heart", color: "#79d66d" }),
  });

  function invariant(condition, code) {
    if (condition) return;
    const error = new Error(code);
    error.code = code;
    throw error;
  }

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function scaled(value) {
    invariant(Number.isFinite(Number(value)), "BAD_PROJECTION_COORDINATE");
    return Number(value) * WORLD_SCALE;
  }

  function seconds(ticks) {
    return Math.max(0, Number(ticks) || 0) * TICK_SECONDS;
  }

  function presentation(typeId) {
    return TYPE_PRESENTATION[typeId] || Object.freeze({
      name: String(typeId || "Unknown Combatant"),
      color: "#d9cda3",
    });
  }

  function previousById(previous, collection) {
    return new Map((previous?.[collection] || []).map((entry) => [entry.id, entry]));
  }

  function facingRadians(entity, previousEntity, player) {
    const facingX = Number(entity.facingX) || 0;
    const facingY = Number(entity.facingY) || 0;
    if (facingX || facingY) return Math.atan2(facingY, facingX);
    if (previousEntity) {
      const dx = scaled(entity.x) - previousEntity.x;
      const dy = scaled(entity.y) - previousEntity.y;
      if (Math.hypot(dx, dy) > 0.01) return Math.atan2(dy, dx);
    }
    return Math.atan2(scaled(player.y) - scaled(entity.y), scaled(player.x) - scaled(entity.x));
  }

  function enemyRadius(enemy) {
    if (Number.isFinite(enemy.radius)) return scaled(enemy.radius);
    if (enemy.bossAspect) return 18;
    const ordinary = CORE.ENEMY_DEFS[enemy.typeId];
    if (ordinary) return ordinary.radius * (enemy.child ? 0.72 : 1);
    const boss = Object.values(CORE.BOSS_DEFS).find((definition) => definition.typeId === enemy.typeId);
    return boss?.radius || 18;
  }

  function enemyMode(mode) {
    const value = String(mode || "ready");
    if (/telegraph|warning|track|lock/i.test(value)) return "telegraph";
    if (/recover|window|stunned|punished|exposed/i.test(value)) return "recover";
    if (/charge|dash|pursuit/i.test(value)) return "charge";
    return "move";
  }

  function projectPlayer(player, previousPlayer, stageTick) {
    const x = scaled(player.x);
    const y = scaled(player.y);
    const movedX = previousPlayer ? x - previousPlayer.x : 0;
    const movedY = previousPlayer ? y - previousPlayer.y : 0;
    const moving = Boolean(player.moving) || Math.hypot(movedX, movedY) > 0.01;
    const facing = moving
      ? Math.atan2(movedY, movedX)
      : previousPlayer?.facing ?? -Math.PI / 2;
    return {
      x,
      y,
      r: scaled(CORE.DEFAULT_RULES.player.radius),
      hp: player.hpHundredths / 100,
      maxHp: player.maxHpHundredths / 100,
      barrier: (player.barrierHundredths || 0) / 100,
      vx: movedX * CORE.TICK_RATE,
      vy: movedY * CORE.TICK_RATE,
      facing,
      aimAngle: facing,
      visualMoving: moving,
      animTime: stageTick * TICK_SECONDS,
      attackTimer: player.shotCooldown > Math.max(0, player.shotCooldownTicks - 8) ? 0.12 : 0,
      shotReady: player.shotCooldown <= 0,
      hurtTimer: 0,
      roomGrace: seconds(player.roomGraceTicks),
      rimeguardBarrierAmount: 0,
      rimeguardTimer: 0,
      survivorsOathActive: Boolean(player.survivorsOathActive),
      silenceTimer: seconds(player.silenceTicks),
    };
  }

  function projectEnemy(enemy, previousEnemy, player, stageTick) {
    const visual = presentation(enemy.bossAspect ? "rootHeart" : enemy.typeId);
    const radius = enemyRadius(enemy);
    const optionalDefinition = CORE.ENEMY_DEFS[enemy.typeId];
    const maxMarks = optionalDefinition?.optionalHitMarks || 0;
    const huntmasterHidden = ["bloodGrandHunt", "bloodGrandHuntResolve", "bloodLureMissRecovery"]
      .includes(enemy.mode);
    const huntmasterConcealed = ["bloodLureRecord", "bloodLurePursuit"].includes(enemy.mode)
      && Boolean(enemy.bloodShadowVisible);
    return {
      id: enemy.id,
      typeId: enemy.typeId,
      sourceTypeId: enemy.typeId,
      name: visual.name,
      color: visual.color,
      behavior: enemy.behavior || CORE.ENEMY_DEFS[enemy.typeId]?.behavior || (enemy.boss ? "boss" : "chase"),
      x: scaled(enemy.x),
      y: scaled(enemy.y),
      r: radius,
      hp: enemy.hpHundredths / 100,
      maxHp: enemy.maxHpHundredths / 100,
      facing: facingRadians(enemy, previousEnemy, player),
      wasMoving: Boolean(previousEnemy && (previousEnemy.x !== scaled(enemy.x) || previousEnemy.y !== scaled(enemy.y))),
      animTime: stageTick * TICK_SECONDS + enemy.id * 0.071,
      state: enemyMode(enemy.mode),
      mode: enemy.mode || "ready",
      modeTimer: seconds(enemy.modeTicks),
      attackTimer: seconds(enemy.actionTicks),
      hurtTimer: 0,
      child: Boolean(enemy.child),
      elite: Boolean(enemy.boss),
      boss: Boolean(enemy.boss),
      bossAspect: enemy.bossAspect ? "rootHeart" : "",
      aspectActive: Boolean(enemy.bossAspect && !enemy.invulnerable),
      aspectIndex: Math.max(0, Number(enemy.aspectIndex) || 0),
      invulnerable: Boolean(enemy.invulnerable),
      bossSeedIds: [...(enemy.bossSeedIds || [])],
      activeSeedId: enemy.activeSeedId || "",
      bossPhase: enemy.phase || 1,
      phasePattern: enemy.mode || "",
      phasePatternStep: enemy.phasePatternIndex || 0,
      phasePatternTimer: seconds(enemy.modeTicks),
      phaseHpMax: enemy.maxHpHundredths / 100,
      armorHp: (enemy.armorHundredths || 0) / 100,
      armorMax: (enemy.armorMaxHundredths || 0) / 100,
      armorSegmentsBroken: enemy.armorSegmentsBroken || 0,
      poisonStacks: clone(enemy.poisonStacks || []),
      bleedTranches: clone(enemy.bleedTranches || []),
      chill: enemy.chill || 0,
      freezeTimer: seconds(enemy.freezeTicks),
      brittleTimer: seconds(enemy.brittleTicks),
      staggerTimer: seconds(enemy.staggerTicks),
      shieldBroken: Boolean(enemy.shieldBroken),
      shieldGuardHits: enemy.shieldHits || 0,
      shieldGuardMax: optionalDefinition?.shieldHits || 5,
      shieldBraceTimer: enemy.mode === "shield" ? seconds(enemy.modeTicks) : 0,
      optionalSprite: Boolean(enemy.optionalSprite),
      optionalEntryTimer: seconds(enemy.optionalEntryTicks),
      optionalHitMarksMax: maxMarks,
      optionalHitMarks: Math.max(0, Math.min(maxMarks, Math.ceil(enemy.hpHundredths / 100))),
      optionalEscapeDuration: seconds(optionalDefinition?.escapeTicks),
      escapeTimer: seconds(enemy.escapeTicks),
      optionalReward: enemy.optionalReward || "",
      hidden: huntmasterHidden,
      huntmasterConcealed,
      huntmasterShadowVisible: huntmasterConcealed,
      dying: false,
      enraged: enemy.phase === 3,
      phaseThreeSegment: enemy.phaseThreeSegment || 0,
      phaseThreeTier: enemy.phaseThreeTier || 0,
      phaseThreeLane: enemy.phaseThreeLane || 0,
      phaseThreeLaneVertical: Boolean(enemy.phaseThreeLaneVertical),
      vulnerableTimer: seconds(enemy.vulnerableTicks || enemy.hunterVulnerableTicks || enemy.bloodVulnerableTicks),
      projection: true,
    };
  }

  function projectArrow(arrow) {
    return {
      id: arrow.id,
      x: scaled(arrow.x),
      y: scaled(arrow.y),
      vx: scaled(arrow.vx),
      vy: scaled(arrow.vy),
      r: scaled(CORE.DEFAULT_RULES.player.arrowRadius),
      isCritical: Boolean(arrow.isCritical),
      legendaryRicochet: Boolean(arrow.remainingBounces > 0),
      special: arrow.siege ? "broadhead" : "",
    };
  }

  function projectEnemyShot(shot) {
    return {
      ...clone(shot),
      x: scaled(shot.x),
      y: scaled(shot.y),
      vx: scaled(shot.vx),
      vy: scaled(shot.vy),
      r: scaled(shot.radius || 50),
      color: shot.kind === "deadeyeBolt" ? "#ffd36b" : "#ff6d4c",
      kind: shot.kind || "arrow",
    };
  }

  function laneRect(hazard, arena) {
    const vertical = hazard.shape === "verticalLane";
    const count = 3;
    const lane = Math.max(0, Math.min(count - 1, Number(hazard.laneIndex) || 0));
    const width = arena.width / count;
    const height = arena.height / count;
    return vertical
      ? { x: lane * width, y: 0, width, height: arena.height }
      : { x: 0, y: lane * height, width: arena.width, height };
  }

  function projectHazard(hazard, arena) {
    const warning = hazard.warningTicks > 0;
    const projected = {
      id: hazard.id,
      type: hazard.type,
      shape: hazard.shape || "circle",
      x: scaled(hazard.x || 0),
      y: scaled(hazard.y || 0),
      radius: scaled(hazard.radius || 0),
      ringInnerRadius: scaled(hazard.ringInnerRadius || 0),
      warning,
      warningSeconds: seconds(hazard.warningTicks),
      activeSeconds: seconds(hazard.activeTicks),
      impacted: Boolean(hazard.impacted),
      sourceEnemyId: hazard.sourceEnemyId || 0,
      hunterImpactCoreRadius: scaled(hazard.hunterImpactCoreRadius || 0),
      phaseThreeErupts: Boolean(hazard.phaseThreeErupts),
      laneIndex: hazard.laneIndex || 0,
    };
    if (projected.shape === "verticalLane" || projected.shape === "horizontalLane") {
      projected.rect = laneRect(projected, arena);
    }
    return projected;
  }

  function projectPoint(point) {
    return { x: scaled(point.x), y: scaled(point.y) };
  }

  function projectHoundRun(run) {
    return {
      ...clone(run),
      x: scaled(run.x),
      y: scaled(run.y),
      radius: scaled(run.radius || 0),
      halfWidth: scaled(run.halfWidth || 0),
      halfDepth: scaled(run.halfDepth || 0),
      points: (run.points || []).map(projectPoint),
      warning: run.delayTicks > 0 || run.warningTicks > 0,
      warningSeconds: seconds((run.delayTicks || 0) + (run.warningTicks || 0)),
    };
  }

  function projectAnchor(anchor) {
    if (!anchor) return null;
    return {
      ...clone(anchor),
      x: scaled(anchor.x),
      y: scaled(anchor.y),
      radius: scaled(anchor.radius || 0),
      limit: scaled(anchor.limit || 0),
    };
  }

  function projectTrail(trail) {
    if (!trail) return null;
    return {
      ...clone(trail),
      points: (trail.points || []).map(projectPoint),
      warningSeconds: seconds(trail.remainingTicks || trail.recordTicks || 0),
    };
  }

  function projectStake(stake) {
    return {
      ...clone(stake),
      x: scaled(stake.x),
      y: scaled(stake.y),
      radius: scaled(stake.radius || 0),
    };
  }

  function projectedRect(rect) {
    return {
      x: scaled(rect.x),
      y: scaled(rect.y),
      width: scaled(rect.width),
      height: scaled(rect.height),
    };
  }

  function projectedRay(enemy, dx, dy, arena, options = {}) {
    const magnitude = Math.hypot(dx, dy) || 1;
    const length = Math.hypot(arena.width, arena.height) * 1.6;
    const x = scaled(enemy.x);
    const y = scaled(enemy.y);
    return {
      kind: "corridor",
      sourceEnemyId: enemy.id,
      sourceMode: enemy.mode,
      x,
      y,
      endX: x + dx / magnitude * length,
      endY: y + dy / magnitude * length,
      halfWidth: options.halfWidth ?? enemyRadius(enemy),
      locked: Boolean(options.locked),
      targetX: options.targetX === undefined ? null : scaled(options.targetX),
      targetY: options.targetY === undefined ? null : scaled(options.targetY),
    };
  }

  function laneTelegraph(enemy, manifest, mode) {
    const phaseThree = mode === "phaseThreeChargeTelegraph";
    const lane = phaseThree ? enemy.phaseThreeLane : enemy.ironLane;
    const vertical = phaseThree ? enemy.phaseThreeLaneVertical : enemy.ironLaneVertical;
    const forward = phaseThree ? enemy.phaseThreeLaneForward : enemy.ironLaneForward;
    const geometry = CORE.IRON_OATH.laneGeometry(
      manifest.rules.arena,
      enemy.radius,
      lane,
      vertical,
      forward,
    );
    return {
      kind: "lane",
      sourceEnemyId: enemy.id,
      sourceMode: mode,
      rect: projectedRect(geometry),
      startX: scaled(geometry.startX),
      startY: scaled(geometry.startY),
      endX: scaled(geometry.endX),
      endY: scaled(geometry.endY),
    };
  }

  function bossTelegraphs(stageState, manifest, arena) {
    const telegraphs = [];
    for (const enemy of stageState.enemies) {
      if (enemy.mode === "ironChargeTelegraph") {
        telegraphs.push(projectedRay(
          enemy,
          stageState.player.x - enemy.x,
          stageState.player.y - enemy.y,
          arena,
          { targetX: stageState.player.x, targetY: stageState.player.y },
        ));
      } else if (enemy.mode === "ironLaneTelegraph" || enemy.mode === "phaseThreeChargeTelegraph") {
        telegraphs.push(laneTelegraph(enemy, manifest, enemy.mode));
      } else if (enemy.mode === "ironSweep") {
        telegraphs.push({
          kind: "sector",
          sourceEnemyId: enemy.id,
          sourceMode: enemy.mode,
          x: scaled(enemy.x),
          y: scaled(enemy.y),
          radius: scaled(CORE.IRON_OATH.RULES.sweepReach),
          angle: enemy.ironSweepFacingRadians,
          halfAngle: CORE.IRON_OATH.RULES.sweepHalfAngleRadians,
          active: !enemy.ironSweepDamagePending,
        });
      } else if (enemy.mode === "hunterDeadeyeTrack" || enemy.mode === "hunterDeadeyeLock") {
        const locked = enemy.mode === "hunterDeadeyeLock";
        const targetX = enemy.hunterDeadeyeTargetX;
        const targetY = enemy.hunterDeadeyeTargetY;
        telegraphs.push(projectedRay(enemy, targetX - enemy.x, targetY - enemy.y, arena, {
          halfWidth: locked ? 15 : 12,
          locked,
          targetX,
          targetY,
        }));
      } else if (enemy.mode === "deepClockTelegraph") {
        const sector = CORE.DEEP_ROOT.clockSector({
          origin: enemy,
          count: enemy.deepCount,
          step: enemy.deepStep,
          direction: enemy.deepDirection,
          centerAngle: enemy.deepClockCenterAngle,
          arcSpan: enemy.deepClockArcSpan,
        });
        telegraphs.push({
          kind: "sector",
          sourceEnemyId: enemy.id,
          sourceMode: enemy.mode,
          x: scaled(enemy.x),
          y: scaled(enemy.y),
          radius: Math.hypot(arena.width, arena.height) * 1.25,
          angle: sector.angle,
          halfAngle: sector.halfAngle,
          active: false,
        });
      } else if (enemy.mode === "deepMarchTelegraph") {
        const safe = new Set(enemy.deepSafeStrips || []);
        telegraphs.push({
          kind: "strips",
          sourceEnemyId: enemy.id,
          sourceMode: enemy.mode,
          vertical: Boolean(enemy.deepVertical),
          strips: Array.from({ length: CORE.DEEP_ROOT.RULES.stripCount }, (_, strip) => ({
            strip,
            safe: safe.has(strip),
            rect: projectedRect(CORE.DEEP_ROOT.stripGeometry(manifest.rules.arena, strip, enemy.deepVertical)),
          })),
        });
      } else if (enemy.mode === "deepRingTelegraph") {
        telegraphs.push({
          kind: "gapRing",
          sourceEnemyId: enemy.id,
          sourceMode: enemy.mode,
          x: scaled(enemy.x),
          y: scaled(enemy.y),
          radius: scaled(enemy.deepRingRadius),
          halfWidth: scaled(CORE.DEEP_ROOT.RULES.ringHalfWidth),
          gapAngle: enemy.deepGapAngle,
          gapHalfAngle: CORE.DEEP_ROOT.RULES.ringGapHalfAngle,
        });
      } else if (enemy.mode === "bloodStakeChargeTelegraph") {
        telegraphs.push(projectedRay(enemy, enemy.bloodChargeVx, enemy.bloodChargeVy, arena, {
          halfWidth: enemyRadius(enemy),
        }));
      }
    }
    return telegraphs;
  }

  function missingTelegraphs(stageState, telegraphs) {
    const missing = [];
    if (stageState.reinforcementWarningTicks > 0 && !stageState.reinforcementReservations?.length) {
      missing.push("reinforcement-reservation-geometry");
    }
    const requiredModes = new Set([
      "ironChargeTelegraph",
      "ironLaneTelegraph",
      "ironSweep",
      "hunterDeadeyeTrack",
      "hunterDeadeyeLock",
      "deepClockTelegraph",
      "deepMarchTelegraph",
      "deepRingTelegraph",
      "phaseThreeChargeTelegraph",
      "bloodStakeChargeTelegraph",
    ]);
    for (const enemy of stageState.enemies) {
      if (!requiredModes.has(enemy.mode)) continue;
      if (!telegraphs.some((telegraph) => (
        telegraph.sourceEnemyId === enemy.id && telegraph.sourceMode === enemy.mode
      ))) missing.push(`${enemy.mode}:${enemy.id}`);
    }
    return missing;
  }

  function projectRun(run, previous = null) {
    invariant(run && typeof run === "object", "BAD_PROJECTION_RUN");
    invariant(run.manifest?.coreVersion === CORE.CORE_VERSION, "PROJECTION_CORE_VERSION_MISMATCH");
    invariant(run.stageState && typeof run.stageState === "object", "BAD_PROJECTION_STAGE");
    const stageState = run.stageState;
    const arena = {
      width: scaled(run.manifest.rules.arena.width),
      height: scaled(run.manifest.rules.arena.height),
      padding: scaled(run.manifest.rules.arena.padding),
    };
    const previousEnemies = previousById(previous, "enemies");
    const player = projectPlayer(stageState.player, previous?.player || null, stageState.stageTick);
    const enemies = stageState.enemies.map((enemy) => projectEnemy(
      enemy,
      previousEnemies.get(enemy.id),
      stageState.player,
      stageState.stageTick,
    ));
    const telegraphs = bossTelegraphs(stageState, run.manifest, arena);
    const currentStageScore = stageState.outcome === "CLEARED" ? 0 : stageState.score;
    const stageDefinition = CORE.stageDef(stageState.stage);
    return Object.freeze({
      projectionVersion: PROJECTION_VERSION,
      coreVersion: CORE.CORE_VERSION,
      rulesetId: CORE.RULESET_ID,
      phase: run.phase,
      outcome: run.outcome,
      stageOutcome: stageState.outcome,
      stage: stageState.stage,
      stageTitle: stageDefinition.title,
      stagesCleared: run.stagesCleared,
      leaderboardEligible: CORE.leaderboardEligible(run.stagesCleared),
      arena,
      elapsedSeconds: seconds(stageState.stageTick),
      totalActiveSeconds: seconds(run.totalActiveTicks),
      completedScore: run.totalScore,
      currentStageScore,
      totalScore: run.totalScore + currentStageScore,
      totalGold: run.totalGold,
      player,
      enemies,
      arrows: stageState.arrows.map(projectArrow),
      enemyShots: stageState.enemyShots.map(projectEnemyShot),
      hazards: stageState.hazards.map((hazard) => projectHazard(hazard, arena)),
      telegraphs,
      bossAnchor: projectAnchor(stageState.bossAnchor),
      houndRuns: stageState.houndRuns.map(projectHoundRun),
      scentTrail: projectTrail(stageState.scentTrail),
      bruteStakes: stageState.bruteStakes.map(projectStake),
      reinforcement: {
        warning: stageState.reinforcementWarningTicks > 0,
        warningSeconds: seconds(stageState.reinforcementWarningTicks),
        nextPulseIndex: stageState.nextPulseIndex,
        reservations: (stageState.reinforcementReservations || []).map((reservation) => ({
          ...clone(reservation),
          x: scaled(reservation.x),
          y: scaled(reservation.y),
          radius: scaled(reservation.radius || 0),
        })),
      },
      streak: {
        count: stageState.streakCount,
        best: stageState.bestStreak,
        windowSeconds: stageState.lastKillTick === null
          ? 0
          : Math.max(0, seconds(run.manifest.rules.scoring.streakWindowTicks - (stageState.stageTick - stageState.lastKillTick))),
      },
      pendingOffer: clone(run.pendingOffer),
      pendingPickCount: run.pendingPickCount,
      build: CORE.BUILD_RULES.clone(run.build),
      relicIds: [...run.relicIds],
      relicState: clone(run.relicState),
      optionalRewards: clone(run.optionalRewards),
      missingTelegraphs: missingTelegraphs(stageState, telegraphs),
    });
  }

  return Object.freeze({
    PROJECTION_VERSION,
    WORLD_SCALE,
    TICK_SECONDS,
    TYPE_PRESENTATION,
    scaled,
    seconds,
    projectRun,
  });
});
