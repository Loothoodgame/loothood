(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodStatusEvolutions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CATALOGUE_VERSION = 2;
  const HANDLER_VERSION = 2;

  const POISON = Object.freeze({
    dps: Object.freeze([0, 1, 2, 3.5]),
    duration: Object.freeze([0, 3, 4, 6]),
    plagueCadence: 5,
    plagueDuration: 4,
    plagueDamageMultiplier: 2,
    plagueTimerSpeed: 1.25,
    overdoseExposure: 2,
    overdoseStacks: 10,
    overdoseDuration: 3,
    overdoseCooldown: 4,
    overdoseDamageMultiplier: 2,
    venomReboundDamageMultiplier: 1.35,
    venomReboundApplications: 2,
    venomReboundCap: 3,
  });

  const FROST = Object.freeze({
    whiteoutFreezePerRoot: 1,
    glacialSourceMultiplier: 1.5,
    glacialNearbyMultiplier: 0.25,
    glacialCooldown: 2,
    rimeguardBarrierRatio: 0.12,
    rimeguardDuration: 4,
    rimeguardCooldown: 5,
  });

  const BLEED = Object.freeze({
    ratios: Object.freeze([0, 0.2, 0.35, 0.55]),
    slots: Object.freeze([0, 2, 3, 4]),
    duration: 3,
    skewerStep: 0.1,
    skewerCap: 0.3,
    skewerFallbackRatio: 0.1,
    executionerPayoutRatio: 0.3,
    executionerRetainedRatio: 0.7,
    executionerNewWoundMultiplier: 2,
    executionerCooldown: 0.75,
    bloodPactCadence: 6,
    bloodPactMinimumHpRatio: 0.25,
    bloodPactPaymentRatio: 0.04,
    bloodPactDamageMultiplier: 2,
  });

  const EVOLUTIONS = Object.freeze([
    Object.freeze({ id: "plagueVolley", name: "Plague Volley", ingredients: Object.freeze(["venomTips", "multishot"]), desc: "Every fifth Autoshot Plagues enemies hit for 4 seconds. Their Poison deals double damage but expires 25% faster." }),
    Object.freeze({ id: "venomRebound", name: "Venom Rebound", ingredients: Object.freeze(["venomTips", "ricochet"]), desc: "When an arrow ricochets from a Poisoned enemy, consume its newest Poison stack. The next hit deals 35% bonus damage and applies 2 Poison stacks. Maximum 3 times per arrow." }),
    Object.freeze({ id: "overdose", name: "Overdose", ingredients: Object.freeze(["venomTips", "quickNock"]), desc: "If an enemy has been Poisoned for 2 seconds, reaching 10 stacks triggers Overdose for 3 seconds. During Overdose, Poison deals double damage and stacks build twice as fast. 4-second cooldown." }),
    Object.freeze({ id: "whiteout", name: "Whiteout", ingredients: Object.freeze(["winterBinding", "burstArrow"]), desc: "Burst splash can trigger Freeze. Maximum one splash-triggered Freeze per Autoshot." }),
    Object.freeze({ id: "glacialImpact", name: "Glacial Impact", ingredients: Object.freeze(["winterBinding", "staggeringShot"]), desc: "Freeze or boss Brittle deals 150% of the triggering arrow's damage to that target and 25% to nearby enemies. Maximum once per Autoshot; 2-second cooldown per enemy." }),
    Object.freeze({ id: "rimeguard", name: "Rimeguard", ingredients: Object.freeze(["winterBinding", "leatherGuard"]), desc: "Freeze or boss Brittle grants a barrier worth 12% maximum HP for 4 seconds. 5-second cooldown." }),
    Object.freeze({ id: "skewer", name: "Skewer", ingredients: Object.freeze(["serratedHeads", "bodkinArrows"]), desc: "Pierced hits gain 10% damage per enemy, up to 30%. Each unused pierce adds Bleed equal to 10% of the final hit." }),
    Object.freeze({ id: "executioner", name: "Executioner", ingredients: Object.freeze(["serratedHeads", "deadeye"]), desc: "Crits immediately pay 30% of remaining Bleed, leave 70% to finish, and make the new Bleed twice as strong. 0.75-second cooldown." }),
    Object.freeze({ id: "bloodPact", name: "Blood Pact", ingredients: Object.freeze(["serratedHeads", "oakheart"]), desc: "Every sixth Autoshot at 25% HP or more spends 4% maximum HP. Its arrows deal double damage and each enemy hit receives one extra Bleed." }),
  ]);

  function normalizeRank(rank) {
    return Math.max(0, Math.min(3, Math.floor(Number(rank) || 0)));
  }

  function poisonValues(rank) {
    const value = normalizeRank(rank);
    return Object.freeze({ dps: POISON.dps[value], duration: POISON.duration[value] });
  }

  function normalizeEvolutionMap(value) {
    const source = value && typeof value === "object" ? value : {};
    const result = {};
    for (const [id, active] of Object.entries(source)) {
      if (!active) continue;
      result[id === "contagion" ? "venomRebound" : id] = true;
    }
    delete result.contagion;
    return result;
  }

  function createRuntime() {
    return {
      catalogueVersion: CATALOGUE_VERSION,
      handlerVersion: HANDLER_VERSION,
      whiteoutFreezeRoots: Object.create(null),
      glacialImpactRoots: Object.create(null),
      bloodPactTargets: Object.create(null),
    };
  }

  function poisonDamageMultiplier(plagueRemaining, overdoseRemaining) {
    return plagueRemaining > 0 || overdoseRemaining > 0 ? 2 : 1;
  }

  function poisonTimerSpeed(plagueRemaining) {
    return plagueRemaining > 0 ? POISON.plagueTimerSpeed : 1;
  }

  function poisonApplicationCount(baseCount, overdoseRemaining) {
    const count = Math.max(0, Math.floor(Number(baseCount) || 0));
    return overdoseRemaining > 0 ? count * 2 : count;
  }

  function poisonTick(ttl, dt, plagueRemaining, overdoseRemaining) {
    const remaining = Math.max(0, Number(ttl) || 0);
    const elapsed = Math.max(0, Number(dt) || 0);
    const timerSpeed = poisonTimerSpeed(plagueRemaining);
    const activeTime = Math.min(elapsed, remaining / timerSpeed);
    return Object.freeze({
      activeTime,
      timerConsumed: activeTime * timerSpeed,
      damageMultiplier: poisonDamageMultiplier(plagueRemaining, overdoseRemaining),
    });
  }

  function canTriggerOverdose({ exposure = 0, stackCountAfter = 0, addedCount = 0, active = 0, cooldown = 0 } = {}) {
    return exposure >= POISON.overdoseExposure
      && stackCountAfter >= POISON.overdoseStacks
      && addedCount > 0
      && active <= 0
      && cooldown <= 0;
  }

  function venomReboundPlan({
    active = false,
    ordinaryProjectile = false,
    equipmentChild = false,
    canApplyStatus = false,
    hasDestination = false,
    hasPreImpactPoison = false,
    reboundCount = 0,
  } = {}) {
    const count = Math.max(0, Math.floor(Number(reboundCount) || 0));
    const consume = Boolean(
      active
      && ordinaryProjectile
      && !equipmentChild
      && canApplyStatus
      && hasDestination
      && hasPreImpactPoison
      && count < POISON.venomReboundCap
    );
    return Object.freeze({
      consume,
      nextCount: consume ? count + 1 : count,
      damageMultiplier: consume ? POISON.venomReboundDamageMultiplier : 1,
      applications: consume ? POISON.venomReboundApplications : 1,
    });
  }

  function skewerMultiplier(piercedTargetIndex) {
    const index = Math.max(0, Math.floor(Number(piercedTargetIndex) || 0));
    return 1 + Math.min(BLEED.skewerCap, index * BLEED.skewerStep);
  }

  function executionerPlan(tranches) {
    const eligible = Array.isArray(tranches) ? tranches.filter((entry) => entry && entry.remaining > 0 && entry.ttl > 0) : [];
    const total = eligible.reduce((sum, entry) => sum + Number(entry.remaining || 0), 0);
    return Object.freeze({
      payout: total * BLEED.executionerPayoutRatio,
      retained: total * BLEED.executionerRetainedRatio,
      retainedByTranche: Object.freeze(eligible.map((entry) => Number(entry.remaining || 0) * BLEED.executionerRetainedRatio)),
    });
  }

  function autoshotFlags(shotCount, activeEvolutions, hp, maxHp) {
    const count = Math.max(0, Math.floor(Number(shotCount) || 0));
    const evolutions = normalizeEvolutionMap(activeEvolutions);
    const maximum = Math.max(1, Number(maxHp) || 1);
    const bloodPactCadence = evolutions.bloodPact && count % BLEED.bloodPactCadence === 0;
    return Object.freeze({
      plagueVolley: Boolean(evolutions.plagueVolley && count % POISON.plagueCadence === 0),
      bloodPactCadence: Boolean(bloodPactCadence),
      bloodPact: Boolean(bloodPactCadence && Number(hp) / maximum >= BLEED.bloodPactMinimumHpRatio),
    });
  }

  return Object.freeze({
    CATALOGUE_VERSION,
    HANDLER_VERSION,
    POISON,
    FROST,
    BLEED,
    EVOLUTIONS,
    poisonValues,
    normalizeEvolutionMap,
    createRuntime,
    poisonDamageMultiplier,
    poisonTimerSpeed,
    poisonApplicationCount,
    poisonTick,
    canTriggerOverdose,
    venomReboundPlan,
    skewerMultiplier,
    executionerPlan,
    autoshotFlags,
  });
});
