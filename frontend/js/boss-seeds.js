(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodBossSeeds = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const capacity = 4;
  const defaults = ["ironOath", "deepRoot"];
  const definitions = [
    {
      id: "ironOath",
      compositionOrder: 0,
      bossType: "sheriffEnforcer",
      minibossName: "Sheriff's Enforcer",
      seedName: "Iron Oath",
      objective: "Armour, projectile wheel, and rhythmic lane charges.",
      stageTemplate: 5,
      soundtrackSlot: "ironOath",
      phaseTwoTransition: "reveal",
      minibossPhaseTwoModule: "ironOath",
      finalPhaseTwoModule: "ironOath",
      hiddenContribution: {},
    },
    {
      id: "deepRoot",
      compositionOrder: 1,
      bossType: "brambleWarden",
      minibossName: "Bramble Warden",
      seedName: "Deep Root",
      objective: "Armour, an aspect intermission, and bramble movement patterns.",
      stageTemplate: 10,
      soundtrackSlot: "deepRoot",
      phaseTwoTransition: "aspectIntermission",
      minibossPhaseTwoModule: "deepRoot",
      finalPhaseTwoModule: "deepRoot",
      hiddenContribution: {},
    },
    {
      id: "huntersKnot",
      compositionOrder: 2,
      bossType: "royalTrapper",
      minibossName: "Royal Trapper",
      seedName: "Hunter's Knot",
      objective: "Read Arrow Storm, break the elastic anchor, and dodge the locked Deadeye Bolt.",
      stageTemplate: 5,
      soundtrackSlot: "huntersKnot",
      phaseTwoTransition: "reveal",
      minibossPhaseTwoModule: "huntersKnot",
      finalPhaseTwoModule: "huntersKnot",
      hiddenContribution: {},
    },
    {
      id: "bloodHunt",
      compositionOrder: 3,
      bossType: "blackwoodHuntmaster",
      minibossName: "Blackwood Huntmaster",
      seedName: "Blood Hunt",
      objective: "Read hound formations and route danger along a locked scent trail.",
      stageTemplate: 10,
      soundtrackSlot: "bloodHunt",
      phaseTwoTransition: "reveal",
      minibossPhaseTwoModule: "bloodHunt",
      finalPhaseTwoModule: "bloodHunt",
      hiddenContribution: {},
    },
  ];

  function byId(id) {
    return definitions.find((seed) => seed.id === id) || null;
  }

  function normalize(ids) {
    const unique = [...new Set((ids || []).filter((id) => byId(id)))];
    for (const fallbackId of defaults) {
      if (unique.length >= 2) break;
      if (!unique.includes(fallbackId)) unique.push(fallbackId);
    }
    return unique
      .slice(0, 2)
      .sort((a, b) => byId(a).compositionOrder - byId(b).compositionOrder);
  }

  function selectTwo(ids, random = Math.random) {
    if (ids.length <= 2) return [...ids];
    const pool = [...ids];
    for (let index = pool.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
    }
    return pool.slice(0, 2);
  }

  function chooseEncounterOrder(random = Math.random) {
    const ids = definitions.map((seed) => seed.id);
    if (ids.length <= 2) return [...defaults];
    return selectTwo(ids, random);
  }

  function hiddenConfig(ids) {
    return normalize(ids).reduce((config, id) => ({
      ...config,
      ...(byId(id)?.hiddenContribution || {}),
    }), {});
  }

  function names(ids) {
    return normalize(ids).map((id) => byId(id)?.seedName || id);
  }

  function pairKey(ids) {
    return normalize(ids).join("+");
  }

  function validate() {
    if (definitions.length > capacity) throw new Error("Boss seed capacity exceeded");
    if (new Set(definitions.map((seed) => seed.id)).size !== definitions.length) {
      throw new Error("Boss seed IDs must be unique");
    }
    if (new Set(definitions.map((seed) => seed.soundtrackSlot)).size !== definitions.length) {
      throw new Error("Boss seed soundtrack slots must be unique");
    }
    for (const seed of definitions) {
      if (
        !seed.id ||
        !seed.bossType ||
        ![5, 10].includes(seed.stageTemplate) ||
        typeof seed.soundtrackSlot !== "string" ||
        !seed.soundtrackSlot ||
        !seed.minibossPhaseTwoModule ||
        !seed.finalPhaseTwoModule
      ) {
        throw new Error(`Incomplete boss seed definition: ${seed.id || "unknown"}`);
      }
    }
    if (normalize(defaults).length !== 2) throw new Error("Two default boss seeds are required");
    return true;
  }

  validate();

  return Object.freeze({
    capacity,
    defaults: Object.freeze([...defaults]),
    definitions: Object.freeze(definitions.map((seed) => Object.freeze(seed))),
    byId,
    chooseEncounterOrder,
    hiddenConfig,
    names,
    normalize,
    pairKey,
    selectTwo,
    validate,
  });
});
