(function () {
  "use strict";

  const repeatableCopies = 5;
  const standardMaxLevel = 5;

  window.LOOTHOOD_METAPROGRESSION = Object.freeze({
    plotCount: 25,
    starterPlotCount: 6,
    repeatableCopies,
    standardMaxLevel,
    categories: [
      { id: "stat", name: "Permanent Stats", description: "Shape the character that enters every run." },
    ],
    fixtures: [
      {
        id: "outlawCamp", name: "Outlaw Camp", levelLess: true,
        description: "Fixed land office. Gold purchases the next ordinary combat plot.",
      },
      {
        id: "bountyBoard", name: "Bounty Board", levelLess: true,
        description: "Fixed rolling board. Genuine Hunts unlock three staggered twelve-hour objectives.",
      },
      {
        id: "supplyYard", name: "Supply Yard", levelLess: true,
        description: "Fixed operations yard for Lumber, Quarry and their twelve-hour capacities.",
      },
      {
        // The separate art name (blacksmith) has been removed from here. It
        // pointed at the file building_blacksmith_forms_v1, which does not
        // exist and never will: the only blacksmith in the project is a
        // forgotten 128x128 image of the old style, wired up to nothing. The
        // prompt, meanwhile, is called bowyer_smith — meaning the art would
        // have been generated and then never found.
        id: "bowyerSmith", name: "Bowyer Smith", levelLess: true,
        description: "Fixed read-only bow service. Ash Shortbow remains equipped until sidegrade commissions arrive.",
      },
    ],
    buildings: [
      {
        id: "archeryRange", name: "Archery Range", category: "stat", maxCopies: repeatableCopies, maxLevel: standardMaxLevel,
        weight: 1.05, primaryCost: "wood", secondaryCost: "ore",
        stat: { kind: "damage", values: Object.freeze([0, 0.02, 0.04, 0.06, 0.08, 0.10]), label: "arrow damage", format: "percent" },
        desc: "Permanent damage above the equipped bow baseline.",
      },
      {
        id: "trainingGrounds", name: "Training Grounds", category: "stat", maxCopies: repeatableCopies, maxLevel: standardMaxLevel,
        weight: 1, primaryCost: "wood", secondaryCost: "ore",
        stat: { kind: "maxHp", values: Object.freeze([0, 4, 8, 12, 16, 20]), label: "max HP", format: "flat" },
        desc: "Permanent maximum health from village training.",
      },
      {
        id: "infirmary", name: "Infirmary", category: "stat", maxCopies: repeatableCopies, maxLevel: standardMaxLevel,
        weight: 1.05, primaryCost: "wood", secondaryCost: "ore",
        stat: { kind: "regen", values: Object.freeze([0, 0.04, 0.08, 0.12, 0.16, 0.20]), label: "HP/sec", format: "regen" },
        desc: "Permanent health regeneration during runs.",
      },
      {
        id: "rangerLodge", name: "Ranger Lodge", category: "stat", maxCopies: repeatableCopies, maxLevel: standardMaxLevel,
        weight: 1.1, primaryCost: "wood", secondaryCost: "ore",
        stat: {
          kind: "moveSpeed",
          values: Object.freeze([0, 0.01, 0.025, 0.04, 0.06, 0.08]),
          label: "move speed",
          format: "percent",
          capstone: Object.freeze({ copiesAtMax: 5, bonus: 0.02, name: "Pathfinder Network" }),
        },
        desc: "Permanent movement speed from trail drills.",
      },
      {
        id: "quickdrawYard", name: "Quickdraw Yard", category: "stat", maxCopies: repeatableCopies, maxLevel: standardMaxLevel,
        weight: 1.15, primaryCost: "wood", secondaryCost: "ore",
        stat: { kind: "aps", values: Object.freeze([0, 0.015, 0.03, 0.045, 0.06, 0.075]), label: "arrows/sec", format: "percent" },
        cap: { kind: "aps", values: Object.freeze([0, 0.1, 0.2, 0.3, 0.4, 0.5]), label: "APS ceiling", format: "decimal" },
        desc: "Permanent firing speed plus additional run-upgrade headroom.",
      },
      {
        id: "twinshotRange", name: "Twinshot Range", category: "stat", maxCopies: 1, maxLevel: 1,
        weight: 1.25, primaryCost: "wood", secondaryCost: "ore",
        placementRequirement: Object.freeze({ resource: "royalSigils", amount: 1, consume: true }),
        stat: { kind: "projectiles", values: Object.freeze([0, 1]), label: "starting projectile", format: "flat" },
        desc: "Unique P5 pinnacle range. Adds one starting projectile without raising the projectile ceiling.",
      },
      {
        id: "huntsmansHall", name: "Huntsman's Hall", category: "stat", maxCopies: repeatableCopies, maxLevel: standardMaxLevel,
        weight: 1.15, primaryCost: "wood", secondaryCost: "ore",
        stat: { kind: "critDamage", values: Object.freeze([0, 0.05, 0.10, 0.15, 0.20, 0.25]), label: "critical damage", format: "percent" },
        desc: "Permanent critical damage from precision training.",
      },
      {
        id: "bullseyeYard", name: "Bullseye Yard", category: "stat", maxCopies: repeatableCopies, maxLevel: standardMaxLevel,
        weight: 1.1, primaryCost: "wood", secondaryCost: "ore",
        stat: { kind: "critChance", values: Object.freeze([0, 0.02, 0.04, 0.06, 0.08, 0.10]), label: "raw critical chance", format: "percent" },
        desc: "Permanent raw critical chance. Chance above 100% converts one-for-one into critical damage.",
      },
      {
        id: "armoury", name: "Armoury", category: "stat", maxCopies: repeatableCopies, maxLevel: standardMaxLevel,
        weight: 1.2, primaryCost: "ore", secondaryCost: "wood",
        stat: { kind: "damageReduction", values: Object.freeze([0, 0.005, 0.01, 0.015, 0.02, 0.025]), label: "damage reduction", format: "percent" },
        cap: { kind: "damageReduction", values: Object.freeze([0, 0.01, 0.02, 0.03, 0.04, 0.05]), label: "damage-reduction ceiling", format: "percent" },
        desc: "Permanent damage reduction plus defensive run-upgrade headroom.",
      },
    ],
  });
})();
