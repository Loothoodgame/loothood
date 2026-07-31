(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports
      ? require("./forest-balance.js")
      : root.LoothoodForestBalance
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodContinuousReinforcement = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (forestBalance) {
  "use strict";

  if (!forestBalance) throw new Error("Forest balance contract is required.");

  const ORDINARY_STAGES = Object.freeze([1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14]);
  const ROLE_POOL_MANIFESTS = Object.freeze({
    1: [["forestGrunt", ["forestGrunt", "wolfRunner"]], ["wolfRunner", ["forestGrunt", "wolfRunner"]]],
    2: [[["forestGrunt", "wolfRunner"], ["forestGrunt", "wolfRunner"], "poacherArcher"], [["forestGrunt", "wolfRunner"], "poacherArcher"]],
    3: [[["forestGrunt", "wolfRunner"], ["forestGrunt", "wolfRunner"], "poacherArcher"], ["wolfRunner", "boarCharger", ["forestGrunt", "wolfRunner", "boarCharger"]]],
    4: [[["forestGrunt", "shieldGuard"], ["forestGrunt", "wolfRunner"], "poacherArcher"], ["shieldGuard", "boarCharger", ["wolfRunner", "boarCharger"], ["forestGrunt", "shieldGuard"]]],
    6: [[["forestGrunt", "wolfRunner"], ["forestGrunt", "woodlandOoze"], "woodlandOoze"], ["netTrapper", ["forestGrunt", "wolfRunner"]], ["brambleCaster", ["forestGrunt", "wolfRunner", "woodlandOoze"]]],
    7: [["woodlandOoze", ["woodlandOoze", "wolfRunner"], "wolfRunner"], ["woodlandOoze", "netTrapper", ["woodlandOoze", "wolfRunner"]], ["brambleCaster", ["woodlandOoze", "shieldGuard"]]],
    8: [["netTrapper", ["netTrapper", "poacherArcher"], "poacherArcher"], [["boarCharger", "wolfRunner"], ["shieldGuard", "armoredBrute"], ["boarCharger", "wolfRunner"]], ["netTrapper", "armoredBrute", ["poacherArcher", "shieldGuard"]]],
    9: [[["shieldGuard", "armoredBrute"], "poacherArcher", "netTrapper"], ["bannerCaptain", ["shieldGuard", "armoredBrute"], "poacherArcher"], ["armoredBrute", ["boarCharger", "shieldGuard"], ["netTrapper", "poacherArcher"]]],
    11: [[["shieldGuard", "armoredBrute"], ["boarCharger", "wolfRunner"], ["poacherArcher", "brambleCaster"]], ["armoredBrute", ["shieldGuard", "boarCharger"], "wolfRunner"], ["armoredBrute", "boarCharger", "brambleCaster"]],
    12: [["wolfRunner", ["poacherArcher", "netTrapper"], "netTrapper"], [["wolfRunner", "poacherArcher"], ["poacherArcher", "woodlandOoze"], "woodlandOoze"], [["bannerCaptain", "armoredBrute"], ["netTrapper", "poacherArcher"], ["armoredBrute", "woodlandOoze"]]],
    13: [[["shieldGuard", "armoredBrute"], "armoredBrute", "poacherArcher"], ["shieldGuard", ["shieldGuard", "armoredBrute"], "brambleCaster"], ["bannerCaptain", "boarCharger", ["poacherArcher", "brambleCaster"]]],
    14: [["armoredBrute", "boarCharger", ["poacherArcher", "netTrapper", "brambleCaster"], ["netTrapper", "brambleCaster"]], ["armoredBrute", "brambleCaster", "woodlandOoze"], ["bannerCaptain", "brambleCaster", "boarCharger"]],
  });
  const ESCALATION_ROLE_SLOTS = Object.freeze({
    1: [[["forestGrunt", "wolfRunner"]], [["forestGrunt", "wolfRunner"]]],
    2: [[["forestGrunt", "wolfRunner", "poacherArcher"]], [["forestGrunt", "wolfRunner", "poacherArcher"]]],
    3: [[["forestGrunt", "wolfRunner", "poacherArcher"]], [["forestGrunt", "wolfRunner", "boarCharger"]]],
    4: [[["forestGrunt", "wolfRunner", "boarCharger"]], [["forestGrunt", "shieldGuard", "poacherArcher"]]],
    6: [[["forestGrunt", "wolfRunner", "woodlandOoze"]], [["forestGrunt", "woodlandOoze", "netTrapper"]], [["forestGrunt", "wolfRunner", "brambleCaster"]]],
    7: [[["woodlandOoze", "wolfRunner", "shieldGuard"]], [["woodlandOoze", "wolfRunner", "netTrapper"]], [["woodlandOoze", "brambleCaster", "shieldGuard"]]],
    8: [[["netTrapper", "poacherArcher", "wolfRunner"]], [["boarCharger", "shieldGuard", "wolfRunner"]], [["netTrapper", "poacherArcher", "armoredBrute"]]],
    9: [[["shieldGuard", "armoredBrute", "netTrapper"]], [["shieldGuard", "poacherArcher", "boarCharger"]], [["armoredBrute", "boarCharger", "netTrapper"]]],
    11: [[["shieldGuard", "armoredBrute", "wolfRunner"]], [["shieldGuard", "boarCharger", "poacherArcher"]], [["armoredBrute", "boarCharger", "brambleCaster"], ["shieldGuard", "wolfRunner", "poacherArcher"]]],
    12: [[["wolfRunner", "poacherArcher", "netTrapper"]], [["wolfRunner", "poacherArcher", "woodlandOoze"]], [["netTrapper", "armoredBrute", "woodlandOoze"], ["wolfRunner", "poacherArcher", "woodlandOoze"]]],
    13: [[["shieldGuard", "armoredBrute", "poacherArcher"]], [["shieldGuard", "armoredBrute", "brambleCaster"]], [["armoredBrute", "boarCharger", "poacherArcher"], ["shieldGuard", "boarCharger", "brambleCaster"]]],
    14: [[["armoredBrute", "boarCharger", "netTrapper"]], [["armoredBrute", "brambleCaster", "woodlandOoze"]], [["armoredBrute", "boarCharger", "brambleCaster"], ["netTrapper", "woodlandOoze", "poacherArcher"]]],
  });
  const REVISED_ROLE_SLOTS = Object.freeze({
    8: Object.freeze([
      Object.freeze(["netTrapper", "poacherArcher", Object.freeze(["shieldGuard", "wolfRunner"]), Object.freeze(["shieldGuard", "wolfRunner"])]),
      Object.freeze([Object.freeze(["boarCharger", "wolfRunner"]), Object.freeze(["shieldGuard", "armoredBrute"]), Object.freeze(["boarCharger", "wolfRunner"]), Object.freeze(["boarCharger", "shieldGuard", "wolfRunner"])]),
      Object.freeze(["netTrapper", "armoredBrute", Object.freeze(["poacherArcher", "shieldGuard"]), Object.freeze(["boarCharger", "wolfRunner", "shieldGuard"])]),
    ]),
    12: Object.freeze([
      Object.freeze(["wolfRunner", "netTrapper", Object.freeze(["poacherArcher", "woodlandOoze"])]),
      Object.freeze([Object.freeze(["wolfRunner", "poacherArcher"]), Object.freeze(["poacherArcher", "woodlandOoze"]), "woodlandOoze", Object.freeze(["wolfRunner", "woodlandOoze"])]),
      Object.freeze([Object.freeze(["bannerCaptain", "armoredBrute"]), Object.freeze(["netTrapper", "poacherArcher"]), Object.freeze(["armoredBrute", "woodlandOoze"]), Object.freeze(["wolfRunner", "poacherArcher"])]),
      Object.freeze(["wolfRunner", Object.freeze(["netTrapper", "woodlandOoze"]), Object.freeze(["armoredBrute", "woodlandOoze"]), Object.freeze(["poacherArcher", "netTrapper"])]),
    ]),
    13: Object.freeze([
      Object.freeze(["shieldGuard", "armoredBrute", "poacherArcher", Object.freeze(["shieldGuard", "poacherArcher"])]),
      Object.freeze(["shieldGuard", Object.freeze(["shieldGuard", "armoredBrute"]), "brambleCaster", Object.freeze(["boarCharger", "shieldGuard"])]),
      Object.freeze(["bannerCaptain", "boarCharger", Object.freeze(["poacherArcher", "brambleCaster"]), Object.freeze(["shieldGuard", "boarCharger"])]),
      Object.freeze(["armoredBrute", Object.freeze(["shieldGuard", "boarCharger"]), Object.freeze(["poacherArcher", "brambleCaster"]), Object.freeze(["boarCharger", "shieldGuard"])]),
    ]),
    14: Object.freeze([
      Object.freeze(["armoredBrute", "boarCharger", Object.freeze(["poacherArcher", "netTrapper", "brambleCaster"]), Object.freeze(["netTrapper", "brambleCaster"])]),
      Object.freeze(["armoredBrute", "brambleCaster", "woodlandOoze", Object.freeze(["boarCharger", "woodlandOoze"])]),
      Object.freeze(["bannerCaptain", Object.freeze(["brambleCaster", "netTrapper"]), "boarCharger", Object.freeze(["poacherArcher", "woodlandOoze"])]),
      Object.freeze(["armoredBrute", Object.freeze(["boarCharger", "woodlandOoze"]), Object.freeze(["netTrapper", "woodlandOoze"]), Object.freeze(["poacherArcher", "brambleCaster"])]),
      Object.freeze(["armoredBrute", "boarCharger", "brambleCaster", Object.freeze(["woodlandOoze", "netTrapper"])]),
    ]),
  });
  const BACKLINE_TYPES = new Set(["poacherArcher", "netTrapper", "brambleCaster"]);
  const SIGNATURES = Object.freeze({
    1: ["wolfRunner"], 2: ["poacherArcher"], 3: ["wolfRunner", "boarCharger"],
    4: ["shieldGuard", "boarCharger"], 6: ["netTrapper", "brambleCaster"],
    7: ["woodlandOoze", "netTrapper", "brambleCaster"], 8: ["netTrapper", "armoredBrute"],
    9: ["bannerCaptain"], 11: ["armoredBrute"], 12: ["wolfRunner", "netTrapper", "woodlandOoze"],
    13: ["shieldGuard", "armoredBrute", "bannerCaptain"], 14: ["armoredBrute", "brambleCaster", "bannerCaptain"],
  });

  function configForStage(stage, prestigeTier = 0) {
    return ORDINARY_STAGES.includes(stage)
      ? forestBalance.schedulerConfig(stage, prestigeTier)
      : null;
  }

  function scoreDifficulty(stage) {
    const r = stage - 1;
    return {
      hp: 1 + r * 0.13 + r * r * 0.0045,
      stageHp: 1 + r * 0.085 + Math.max(0, stage - 5) * 0.04 + Math.max(0, stage - 10) * 0.04,
      danger: 1 + r * 0.04 + r * r * 0.004,
    };
  }

  function roundedUniformExpected(minimum, maximum) {
    const width = maximum - minimum;
    if (!(width > 0)) return Math.round(minimum);
    let expected = 0;
    for (let value = Math.floor(minimum) - 2; value <= Math.ceil(maximum) + 2; value += 1) {
      const low = Math.max(minimum, value - 0.5);
      const high = Math.min(maximum, value + 0.5);
      expected += value * Math.max(0, high - low) / width;
    }
    return expected;
  }

  function expectedEnemyScore(enemyDefs, typeId, stage, elite = false, child = false) {
    const def = enemyDefs[typeId];
    if (!def) throw new Error(`Unknown reinforcement enemy ${typeId}`);
    const difficulty = scoreDifficulty(stage);
    const hpScale = child ? 0.45 : elite ? 1.18 : 1;
    const radius = Math.max(8, def.radius * (child ? 0.72 : 1));
    const hp = Math.max(4, Math.round((def.hp + stage * def.hpPerRoom) * difficulty.hp * difficulty.stageHp * hpScale));
    const speedMin = (def.speed + stage * def.speedPerRoom + (child ? 24 : 0)) * 0.85 * Math.min(1.6, difficulty.danger);
    const speedMax = (def.speed + stage * def.speedPerRoom + (child ? 24 : 0) + 8) * 0.85 * Math.min(1.6, difficulty.danger);
    const touch = Math.max(0, (def.touch + stage * def.touchPerRoom) * difficulty.danger);
    const fixed = 6 + radius * 0.75 + hp * 0.12 + touch * 0.8 + (elite ? 34 : 0) + (def.scoreBonus || 0);
    const value = roundedUniformExpected(fixed + speedMin * 0.06, fixed + speedMax * 0.06);
    if (typeId !== "woodlandOoze" || child) return value;
    return value + 2 * expectedEnemyScore(enemyDefs, typeId, stage, false, true);
  }

  function rosterScore(enemyDefs, stage, pulses) {
    return pulses.flat().reduce((sum, typeId) => sum + expectedEnemyScore(enemyDefs, typeId, stage), 0);
  }

  function liveExpectedScore(stageDef, enemyDefs, count) {
    const pool = stageDef.enemyPool.filter(([, weight]) => Number(weight) > 0);
    const memo = new Map();
    function visit(remaining, captainSeen) {
      const key = `${remaining}:${captainSeen ? 1 : 0}`;
      if (memo.has(key)) return memo.get(key);
      if (!remaining) return 0;
      const legal = pool.filter(([id]) => !(captainSeen && id === "bannerCaptain"));
      const total = legal.reduce((sum, [, weight]) => sum + Number(weight), 0);
      const value = legal.reduce((sum, [id, weight]) => sum + Number(weight) / total * (
        expectedEnemyScore(enemyDefs, id, stageDef.number) + visit(remaining - 1, captainSeen || id === "bannerCaptain")
      ), 0);
      memo.set(key, value);
      return value;
    }
    return visit(count, false);
  }

  function rolePoolSlots(stageNumber) {
    if (REVISED_ROLE_SLOTS[stageNumber]) return REVISED_ROLE_SLOTS[stageNumber].map((pulse) => [...pulse]);
    const base = ROLE_POOL_MANIFESTS[stageNumber];
    const escalation = ESCALATION_ROLE_SLOTS[stageNumber];
    if (!base || !escalation || base.length !== escalation.length) {
      throw new Error(`Missing Stage ${stageNumber} escalation role slots`);
    }
    return base.map((pulse, index) => [...pulse, ...escalation[index]]);
  }

  function pulseLegal(pulse) {
    return pulse.filter((id) => id === "armoredBrute").length <= 1
      && pulse.filter((id) => BACKLINE_TYPES.has(id)).length <= 2;
  }

  function enumeratePlans(stageDef, enemyDefs) {
    const slots = rolePoolSlots(stageDef.number);
    const weights = Object.fromEntries(stageDef.enemyPool.map(([id, weight]) => [id, Number(weight)]));
    const variants = [];
    function choose(pulseIndex, slotIndex, pulses, weight) {
      if (pulseIndex >= slots.length) {
        const flat = pulses.flat();
        const signaturesOk = SIGNATURES[stageDef.number].every((id) => flat.includes(id));
        const captainOk = flat.filter((id) => id === "bannerCaptain").length <= 1;
        const score = rosterScore(enemyDefs, stageDef.number, pulses);
        if (signaturesOk && captainOk && pulses.every(pulseLegal)) {
          variants.push({ pulses: pulses.map((pulse) => [...pulse]), weight, expectedScore: score });
        }
        return;
      }
      if (slotIndex >= slots[pulseIndex].length) {
        const nextPulses = pulseIndex + 1 < slots.length ? [...pulses, []] : pulses;
        choose(pulseIndex + 1, 0, nextPulses, weight);
        return;
      }
      const slot = slots[pulseIndex][slotIndex];
      const alternatives = Array.isArray(slot) ? slot : [slot];
      for (const id of alternatives) {
        if (!(weights[id] > 0)) throw new Error(`Illegal Stage ${stageDef.number} role option ${id}`);
        const next = pulses.map((pulse) => [...pulse]);
        next[pulseIndex].push(id);
        choose(pulseIndex, slotIndex + 1, next, weight * (Array.isArray(slot) ? weights[id] : 1));
      }
    }
    choose(0, 0, [[]], 1);
    if (variants.length < 2) throw new Error(`Stage ${stageDef.number} has no viable role-pool range`);
    return variants;
  }

  function chooseWeighted(variants, random = Math.random) {
    const total = variants.reduce((sum, item) => sum + item.weight, 0);
    let roll = random() * total;
    for (const item of variants) {
      roll -= item.weight;
      if (roll <= 0) return item;
    }
    return variants[variants.length - 1];
  }

  function chooseWeightedId(pool, random) {
    const legal = pool.filter(([, weight]) => Number(weight) > 0);
    const total = legal.reduce((sum, [, weight]) => sum + Number(weight), 0);
    let roll = random() * total;
    for (const [id, weight] of legal) {
      roll -= Number(weight);
      if (roll <= 0) return id;
    }
    return legal[legal.length - 1]?.[0] || "forestGrunt";
  }

  function buildP3Pulses(stageDef, authoredPulses, random = Math.random) {
    const sizes = forestBalance.pulseSizes(stageDef.number, 3);
    const signatures = SIGNATURES[stageDef.number] || [];
    const authoredRoles = authoredPulses.flat();
    for (let attempt = 0; attempt < 300; attempt += 1) {
      const pulses = sizes.map(() => []);
      let captainSeen = false;
      let failed = false;
      for (const id of [...authoredRoles].sort(() => random() - 0.5)) {
        let placed = false;
        const pulseOrder = pulses.map((_, index) => index).sort(() => random() - 0.5);
        for (const index of pulseOrder) {
          if (pulses[index].length >= sizes[index]) continue;
          const next = [...pulses[index], id];
          if (!pulseLegal(next) || (id === "bannerCaptain" && captainSeen)) continue;
          pulses[index].push(id);
          captainSeen ||= id === "bannerCaptain";
          placed = true;
          break;
        }
        if (!placed) {
          failed = true;
          break;
        }
      }
      for (let pulseIndex = 0; pulseIndex < pulses.length && !failed; pulseIndex += 1) {
        while (pulses[pulseIndex].length < sizes[pulseIndex]) {
          const legalPool = stageDef.enemyPool.filter(([id, weight]) => {
            if (!(Number(weight) > 0)) return false;
            if (id === "bannerCaptain" && captainSeen) return false;
            return pulseLegal([...pulses[pulseIndex], id]);
          });
          if (!legalPool.length) {
            failed = true;
            break;
          }
          const id = chooseWeightedId(legalPool, random);
          pulses[pulseIndex].push(id);
          captainSeen ||= id === "bannerCaptain";
        }
      }
      const flat = pulses.flat();
      if (
        !failed
        && flat.length === forestBalance.stageCount(stageDef.number, 3)
        && signatures.every((id) => flat.includes(id))
        && pulses.every(pulseLegal)
      ) return pulses;
    }
    throw new Error(`Unable to build legal P3 Stage ${stageDef.number} reinforcement plan`);
  }

  function buildPlan(stageDef, enemyDefs, prestigeTier = 0, random = Math.random) {
    if (!configForStage(stageDef.number, prestigeTier)) return null;
    const variants = enumeratePlans(stageDef, enemyDefs);
    const chosen = chooseWeighted(variants, random);
    const pulses = forestBalance.normalizeActiveTier(prestigeTier) >= 3
      ? buildP3Pulses(stageDef, chosen.pulses, random)
      : chosen.pulses;
    return {
      id: "LD-FR-V1-BR",
      stage: stageDef.number,
      pulses: pulses.map((pulse) => [...pulse]),
      expectedScore: rosterScore(enemyDefs, stageDef.number, pulses),
      acceptedVariantCount: variants.length,
      config: configForStage(stageDef.number, prestigeTier),
    };
  }

  function capAwareRelease({ living, coreIncoming, rareIncoming, livingCap, unsplitOozes = 0 }) {
    const projectedLiving = forestBalance.projectedCapOccupancy(living, unsplitOozes);
    if (projectedLiving + coreIncoming > livingCap) {
      return Object.freeze({ kind: "blocked", coreRelease: 0, rareRelease: 0, capBlockedBy: "core" });
    }
    if (projectedLiving + coreIncoming + rareIncoming <= livingCap) {
      return Object.freeze({
        kind: rareIncoming > 0 ? "coreAndRare" : "core",
        coreRelease: coreIncoming,
        rareRelease: rareIncoming,
        capBlockedBy: "",
      });
    }
    return Object.freeze({
      kind: "core",
      coreRelease: coreIncoming,
      rareRelease: 0,
      capBlockedBy: rareIncoming > 0 ? "rare" : "",
    });
  }

  function deferredRareCanRelease({
    living,
    rareIncoming,
    nextCoreIncoming,
    livingThreshold,
    livingCap,
  }) {
    if (!(rareIncoming > 0)) return false;
    const projectedLiving = living + rareIncoming;
    return projectedLiving <= livingThreshold
      && projectedLiving + nextCoreIncoming <= livingCap;
  }

  return Object.freeze({
    ORDINARY_STAGES,
    ROLE_POOL_MANIFESTS,
    ESCALATION_ROLE_SLOTS,
    REVISED_ROLE_SLOTS,
    SIGNATURES,
    configForStage,
    rolePoolSlots,
    enumeratePlans,
    pulseLegal,
    buildPlan,
    capAwareRelease,
    deferredRareCanRelease,
  });
});
