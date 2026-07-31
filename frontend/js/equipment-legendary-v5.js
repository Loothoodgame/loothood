(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodEquipmentLegendaryV5 = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  return Object.freeze({
  "catalogueVersion": "LEG-EQ-AEL-V5.2",
  "implementationState": "alpha-playtest",
  "counts": {
    "helmet": 10,
    "chest": 13,
    "boots": 12,
    "legs": 16
  },
  "effects": [
    {
      "id": "HELM-AEL-V5-01",
      "displayName": "Ashen Judgement",
      "itemName": "Ashen Judgement",
      "description": "You begin every run with Uncommon Frost, and Poison and Bleed cannot be chosen. Your Autoshots can no longer Crit normally. Against enemies affected by Frost, your damage bonus is Critical Chance multiplied by Critical Damage, then multiplied by 1.1, up to 350%. Against enemies without Frost, neither Critical stat grants bonus damage.",
      "primaryDescription": "You begin every run with Uncommon Frost, and Poison and Bleed cannot be chosen. Your Autoshots can no longer Crit normally. Against enemies affected by Frost, your damage bonus is Critical Chance multiplied by Critical Damage, then multiplied by 1.1, up to 350%. Against enemies without Frost, neither Critical stat grants bonus damage.",
      "howItWorks": "You begin every run with Uncommon Frost, and Poison and Bleed cannot be chosen. Your Autoshots can no longer Crit normally. Against enemies affected by Frost, your damage bonus is Critical Chance multiplied by Critical Damage, then multiplied by 1.1, up to 350%. Against enemies without Frost, neither Critical stat grants bonus damage.",
      "compatibleSlots": [
        "helmet"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "frostCriticalPowerConversion",
      "statusInitiation": {
        "path": "frost",
        "rank": 1
      },
      "incompatibilities": [
        "normalCriticalDamage",
        "statusPath.bleed",
        "statusPath.poison",
        "string.longshotCriticalSnapshot"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.helmet.helm-ael-v5-01.v5",
        "compatibilitySignature": "ael-v1-574fcb508c76be72"
      }
    },
    {
      "id": "HELM-AEL-V5-03",
      "displayName": "Bloodreeve",
      "itemName": "Bloodreeve",
      "description": "You begin every run with Uncommon Bleed, and Poison and Frost cannot be chosen. Critical Hits no longer deal normal bonus damage. A Critical Hit removes 100% of each Bleed wound's remaining damage and pays 400% of the removed amount. Every 50 percentage points of Critical Damage above 200% add 140% payout, up to 1000%. That Hit deals 100% normal direct damage, and removed Bleed cannot tick or be paid again.",
      "primaryDescription": "You begin every run with Uncommon Bleed, and Poison and Frost cannot be chosen. Critical Hits no longer deal normal bonus damage. A Critical Hit removes 100% of each Bleed wound's remaining damage and pays 400% of the removed amount. Every 50 percentage points of Critical Damage above 200% add 140% payout, up to 1000%. That Hit deals 100% normal direct damage, and removed Bleed cannot tick or be paid again.",
      "howItWorks": "You begin every run with Uncommon Bleed, and Poison and Frost cannot be chosen. Critical Hits no longer deal normal bonus damage. A Critical Hit removes 100% of each Bleed wound's remaining damage and pays 400% of the removed amount. Every 50 percentage points of Critical Damage above 200% add 140% payout, up to 1000%. That Hit deals 100% normal direct damage, and removed Bleed cannot tick or be paid again.",
      "compatibleSlots": [
        "helmet"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "bleedCashoutDividend",
      "statusInitiation": {
        "path": "bleed",
        "rank": 1
      },
      "incompatibilities": [
        "evolution.executionerDefaultCashout"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.helmet.helm-ael-v5-03.v5",
        "compatibilitySignature": "ael-v1-c4d86e03797a982b"
      }
    },
    {
      "id": "HELM-AEL-V5-04",
      "displayName": "Echoeye Hood",
      "itemName": "Echoeye Hood",
      "description": "Critical Hits deal no bonus damage. Instead, each arrow that would Crit fires a powerful extra arrow strengthened by Critical Damage.",
      "primaryDescription": "Critical Hits deal no bonus damage. Instead, each arrow that would Crit fires a powerful extra arrow strengthened by Critical Damage.",
      "howItWorks": "Critical Hits deal normal damage instead of bonus damage. Each projectile that would Crit creates one extra projectile at 220% damage. Multishot projectiles roll separately, and the extras can exceed the projectile cap. Every 25 percentage points of Critical Damage above 200% add 25% damage to the extra projectile, up to 475%; extra projectiles cannot create more extra projectiles.",
      "compatibleSlots": [
        "helmet"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "criticalProjectileEcho",
      "statusInitiation": null,
      "incompatibilities": [
        "normalCriticalDamage",
        "recursiveProjectileCreation"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.helmet.helm-ael-v5-04.v5",
        "compatibilitySignature": "ael-v1-0a8923d36c3b40d3"
      }
    },
    {
      "id": "HELM-AEL-V5-05",
      "displayName": "Evervenom Sight",
      "itemName": "Evervenom Sight",
      "description": "You begin every run with Uncommon Poison, and Frost and Bleed cannot be chosen. Poison stacks no longer expire. They remain until the enemy dies, up to 80 stacks. Every 25 percentage points of Critical Damage above 200% restore 35 percentage points of stack damage, up to 300% of normal damage. Without extra Critical Damage, each stack deals only 25% of its normal damage.",
      "primaryDescription": "You begin every run with Uncommon Poison, and Frost and Bleed cannot be chosen. Poison stacks no longer expire. They remain until the enemy dies, up to 80 stacks. Every 25 percentage points of Critical Damage above 200% restore 35 percentage points of stack damage, up to 300% of normal damage. Without extra Critical Damage, each stack deals only 25% of its normal damage.",
      "howItWorks": "You begin every run with Uncommon Poison, and Frost and Bleed cannot be chosen. Poison stacks no longer expire. They remain until the enemy dies, up to 80 stacks. Every 25 percentage points of Critical Damage above 200% restore 35 percentage points of stack damage, up to 300% of normal damage. Without extra Critical Damage, each stack deals only 25% of its normal damage.",
      "compatibleSlots": [
        "helmet"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "persistentPoison",
      "statusInitiation": {
        "path": "poison",
        "rank": 1
      },
      "incompatibilities": [
        "defaultPoisonExpiry",
        "relic.poisonTimeAcceleration"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.helmet.helm-ael-v5-05.v5",
        "compatibilitySignature": "ael-v1-8f4bdd23b669c483"
      }
    },
    {
      "id": "HELM-AEL-V5-06",
      "displayName": "Red Hourglass",
      "itemName": "Red Hourglass",
      "description": "You begin every run with Uncommon Bleed, and Poison and Frost cannot be chosen. Bleed wounds last 1 second instead of their normal duration. Each wound stores 200% of its normal total damage. Only 10 wounds can be active at once; the oldest is replaced first.",
      "primaryDescription": "You begin every run with Uncommon Bleed, and Poison and Frost cannot be chosen. Bleed wounds last 1 second instead of their normal duration. Each wound stores 200% of its normal total damage. Only 10 wounds can be active at once; the oldest is replaced first.",
      "howItWorks": "You begin every run with Uncommon Bleed, and Poison and Frost cannot be chosen. Bleed wounds last 1 second instead of their normal duration. Each wound stores 200% of its normal total damage. Only 10 wounds can be active at once; the oldest is replaced first.",
      "compatibleSlots": [
        "helmet"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "compressedBleed",
      "statusInitiation": {
        "path": "bleed",
        "rank": 1
      },
      "incompatibilities": [
        "defaultBleedDuration"
      ],
      "implementationTier": "medium",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.helmet.helm-ael-v5-06.v5",
        "compatibilitySignature": "ael-v1-179eefd811418228"
      }
    },
    {
      "id": "HELM-AEL-V5-09",
      "displayName": "Venom Vessel",
      "itemName": "Venom Vessel",
      "description": "You begin every run with Uncommon Poison, and Frost and Bleed cannot be chosen. Poison stacks are stored in one reservoir with 80-stack capacity. New Poison refreshes the reservoir instead of creating separate expiry timers. Poison above the cap deals only 100% of that stack's total damage immediately and is not stored.",
      "primaryDescription": "You begin every run with Uncommon Poison, and Frost and Bleed cannot be chosen. Poison stacks are stored in one reservoir with 80-stack capacity. New Poison refreshes the reservoir instead of creating separate expiry timers. Poison above the cap deals only 100% of that stack's total damage immediately and is not stored.",
      "howItWorks": "You begin every run with Uncommon Poison, and Frost and Bleed cannot be chosen. Poison stacks are stored in one reservoir with 80-stack capacity. New Poison refreshes the reservoir instead of creating separate expiry timers. Poison above the cap deals only 100% of that stack's total damage immediately and is not stored.",
      "compatibleSlots": [
        "helmet"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "poisonReservoir",
      "statusInitiation": {
        "path": "poison",
        "rank": 1
      },
      "incompatibilities": [
        "defaultPoisonStacks",
        "overdosePhysicalStackCount"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.helmet.helm-ael-v5-09.v5",
        "compatibilitySignature": "ael-v1-ff7573325835e110"
      }
    },
    {
      "id": "HELM-AEL-V5-11",
      "displayName": "Thawless Crown",
      "itemName": "Thawless Crown",
      "description": "You begin every run with Uncommon Frost, and Poison and Bleed cannot be chosen. The status rule activates when Frost reaches Epic. Chill can no longer Freeze or Stagger enemies and is capped at 3. Each Chill that would exceed the cap deals 45% base-arrow damage instead. Freeze effects, boss Stagger from Frost, Glacial Impact and Rimeguard cannot trigger.",
      "primaryDescription": "You begin every run with Uncommon Frost, and Poison and Bleed cannot be chosen. The status rule activates when Frost reaches Epic. Chill can no longer Freeze or Stagger enemies and is capped at 3. Each Chill that would exceed the cap deals 45% base-arrow damage instead. Freeze effects, boss Stagger from Frost, Glacial Impact and Rimeguard cannot trigger.",
      "howItWorks": "You begin every run with Uncommon Frost, and Poison and Bleed cannot be chosen. The status rule activates when Frost reaches Epic. Chill can no longer Freeze or Stagger enemies and is capped at 3. Each Chill that would exceed the cap deals 45% base-arrow damage instead. Freeze effects, boss Stagger from Frost, Glacial Impact and Rimeguard cannot trigger.",
      "compatibleSlots": [
        "helmet"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "chillOvercapDamage",
      "statusInitiation": {
        "path": "frost",
        "rank": 1
      },
      "incompatibilities": [
        "evolution.glacialImpact",
        "evolution.rimeguard",
        "freeze"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.helmet.helm-ael-v5-11.v5",
        "compatibilitySignature": "ael-v1-98fda0a2c5cb45b2"
      }
    },
    {
      "id": "HELM-AEL-V5-12",
      "displayName": "Plague Heir",
      "itemName": "Plague Heir",
      "description": "You begin every run with Uncommon Poison, and Frost and Bleed cannot be chosen. When an enemy with Poison dies, 100% of its remaining Poison damage is divided between up to 2 nearby enemies. Transferred damage can transfer again whenever its new enemy dies, with no transfer-count limit. Each death moves only the stated total share, divided between the new enemies; the rest is lost and no death can duplicate damage.",
      "primaryDescription": "You begin every run with Uncommon Poison, and Frost and Bleed cannot be chosen. When an enemy with Poison dies, 100% of its remaining Poison damage is divided between up to 2 nearby enemies. Transferred damage can transfer again whenever its new enemy dies, with no transfer-count limit. Each death moves only the stated total share, divided between the new enemies; the rest is lost and no death can duplicate damage.",
      "howItWorks": "You begin every run with Uncommon Poison, and Frost and Bleed cannot be chosen. When an enemy with Poison dies, 100% of its remaining Poison damage is divided between up to 2 nearby enemies. Transferred damage can transfer again whenever its new enemy dies, with no transfer-count limit. Each death moves only the stated total share, divided between the new enemies; the rest is lost and no death can duplicate damage.",
      "compatibleSlots": [
        "helmet"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "conservedTransferOnKill",
      "statusInitiation": {
        "path": "poison",
        "rank": 1
      },
      "incompatibilities": [
        "duplicatingStatusTransfer",
        "sameDeathRecursiveTransfer"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.helmet.helm-ael-v5-12.v5",
        "compatibilitySignature": "ael-v1-7ef6957703c9f5f7"
      }
    },
    {
      "id": "HELM-AEL-V5-17",
      "displayName": "Nearfang Cowl",
      "itemName": "Nearfang Cowl",
      "description": "Autoshots within 150 units gain +1 Pierce but deal 10% less damage.",
      "primaryDescription": "Autoshots within 150 units gain +1 Pierce but deal 10% less damage.",
      "howItWorks": "When an Autoshot begins within 150 units, it can Pierce one additional enemy but deals 10% less damage.",
      "compatibleSlots": [
        "helmet"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Modifier",
      "mode": "",
      "statusInitiation": null,
      "incompatibilities": [],
      "implementationTier": "medium",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.helmet.helm-ael-v5-17.v5",
        "compatibilitySignature": "ael-v1-6b5368faeec68530"
      }
    },
    {
      "id": "HELM-AEL-V5-20",
      "displayName": "Redmist Veil",
      "itemName": "Redmist Veil",
      "description": "After taking health damage, your next Autoshot gains 75 percentage points of Critical Chance but has 30% more spread. A miss consumes it. 1.25-second cooldown.",
      "primaryDescription": "After taking health damage, your next Autoshot gains 75 percentage points of Critical Chance but has 30% more spread. A miss consumes it. 1.25-second cooldown.",
      "howItWorks": "After taking health damage, your next Autoshot gains 75 percentage points of Critical Chance but has 30% more spread. A miss consumes it. 1.25-second cooldown.",
      "compatibleSlots": [
        "helmet"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Modifier",
      "mode": "",
      "statusInitiation": null,
      "incompatibilities": [],
      "implementationTier": "low",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.helmet.helm-ael-v5-20.v5",
        "compatibilitySignature": "ael-v1-4cb75e9f867fe1df"
      }
    },
    {
      "id": "CHEST-AEL-V5-01",
      "displayName": "Mercy Vault",
      "itemName": "Mercy Vault",
      "description": "Healing can no longer restore health. It creates Barrier equal to 200% of the healing amount, capped at 20% maximum health. The Barrier cannot be healed, lasts only until broken, and never raises current health.",
      "primaryDescription": "Healing can no longer restore health. It creates Barrier equal to 200% of the healing amount, capped at 20% maximum health. The Barrier cannot be healed, lasts only until broken, and never raises current health.",
      "howItWorks": "Healing can no longer restore health. It creates Barrier equal to 200% of the healing amount, capped at 20% maximum health. The Barrier cannot be healed, lasts only until broken, and never raises current health.",
      "compatibleSlots": [
        "chest"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "healingToBarrier",
      "statusInitiation": null,
      "incompatibilities": [
        "directHealthHealing"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.chest.chest-ael-v5-01.v5",
        "compatibilitySignature": "ael-v1-ac5647b7cb6bac0f"
      }
    },
    {
      "id": "CHEST-AEL-V5-03",
      "displayName": "Debt Mail",
      "itemName": "Debt Mail",
      "description": "Only 55% of health damage is taken immediately; the rest becomes visible damage debt for 4 seconds. While stopped, debt damage is reduced by 50%, and the prevented portion is removed from that debt. Debt ignores Barrier, deals full damage while you move and can kill you.",
      "primaryDescription": "Only 55% of health damage is taken immediately; the rest becomes visible damage debt for 4 seconds. While stopped, debt damage is reduced by 50%, and the prevented portion is removed from that debt. Debt ignores Barrier, deals full damage while you move and can kill you.",
      "howItWorks": "Only 55% of health damage is taken immediately; the rest becomes visible damage debt for 4 seconds. While stopped, debt damage is reduced by 50%, and the prevented portion is removed from that debt. Debt ignores Barrier, deals full damage while you move and can kill you.",
      "compatibleSlots": [
        "chest"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "stoppedDamageDebt",
      "statusInitiation": null,
      "incompatibilities": [
        "barrierDebtAbsorption",
        "damageDebtRecursion"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.chest.chest-ael-v5-03.v5",
        "compatibilitySignature": "ael-v1-0954294be3d2cb83"
      }
    },
    {
      "id": "CHEST-AEL-V5-04",
      "displayName": "Redline Cuirass",
      "itemName": "Redline Cuirass",
      "description": "Health is capped at 60%. Below that, gain 12% Damage Reduction and 30% stronger healing.",
      "primaryDescription": "Health is capped at 60%. Below that, gain 12% Damage Reduction and 30% stronger healing.",
      "howItWorks": "Your health cannot rise above 60% of maximum health. Below that cap, gain 12% Damage Reduction and 30% stronger healing. Health above the cap is lost when a run starts, and the normal 90% Damage Reduction ceiling still applies.",
      "compatibleSlots": [
        "chest"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "lowHealthCovenant",
      "statusInitiation": null,
      "incompatibilities": [
        "fullHealthConditionalEffects"
      ],
      "implementationTier": "medium",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.chest.chest-ael-v5-04.v5",
        "compatibilitySignature": "ael-v1-836c64e796740d3f"
      }
    },
    {
      "id": "CHEST-AEL-V5-07",
      "displayName": "Second Heart Mail",
      "itemName": "Second Heart Mail",
      "description": "Once per stage, lethal damage leaves you at 15% maximum health instead. The survival works against ordinary, elite and boss damage after normal immunity and Barrier rules. Maximum health is reduced by 20% for the entire run, and the survival resets only on a new stage.",
      "primaryDescription": "Once per stage, lethal damage leaves you at 15% maximum health instead. The survival works against ordinary, elite and boss damage after normal immunity and Barrier rules. Maximum health is reduced by 20% for the entire run, and the survival resets only on a new stage.",
      "howItWorks": "Once per stage, lethal damage leaves you at 15% maximum health instead. The survival works against ordinary, elite and boss damage after normal immunity and Barrier rules. Maximum health is reduced by 20% for the entire run, and the survival resets only on a new stage.",
      "compatibleSlots": [
        "chest"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "lastLife",
      "statusInitiation": null,
      "incompatibilities": [
        "multipleLethalPrevention"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.chest.chest-ael-v5-07.v5",
        "compatibilitySignature": "ael-v1-8d4f919797ff2387"
      }
    },
    {
      "id": "CHEST-AEL-V5-08",
      "displayName": "Shattermend Plate",
      "itemName": "Shattermend Plate",
      "description": "When a named Barrier breaks, restore 2% maximum health. The heal occurs once for that Barrier layer and cannot exceed maximum health. You cannot gain Barrier for 5 seconds afterward; other healing remains normal.",
      "primaryDescription": "When a named Barrier breaks, restore 2% maximum health. The heal occurs once for that Barrier layer and cannot exceed maximum health. You cannot gain Barrier for 5 seconds afterward; other healing remains normal.",
      "howItWorks": "When a named Barrier breaks, restore 2% maximum health. The heal occurs once for that Barrier layer and cannot exceed maximum health. You cannot gain Barrier for 5 seconds afterward; other healing remains normal.",
      "compatibleSlots": [
        "chest"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "barrierBreakHealingLock",
      "statusInitiation": null,
      "incompatibilities": [
        "barrierBreakRecursion"
      ],
      "implementationTier": "medium",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.chest.chest-ael-v5-08.v5",
        "compatibilitySignature": "ael-v1-3b27555dcb26b411"
      }
    },
    {
      "id": "CHEST-AEL-V5-09",
      "displayName": "Briarblood Coat",
      "itemName": "Briarblood Coat",
      "description": "Hostile slows increase your Movement Speed by 100% instead. You take 25% more damage.",
      "primaryDescription": "Hostile slows increase your Movement Speed by 100% instead. You take 25% more damage.",
      "howItWorks": "Hostile slows no longer slow you. While affected, they grant 100% movement speed instead. All incoming damage is increased to 125% of normal.",
      "compatibleSlots": [
        "chest"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "slowToSpeedGlobalVulnerability",
      "statusInitiation": null,
      "incompatibilities": [
        "hostileSlowImmunity"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.chest.chest-ael-v5-09.v5",
        "compatibilitySignature": "ael-v1-1c3b389f7c1ab4af"
      }
    },
    {
      "id": "CHEST-AEL-V5-10",
      "displayName": "Stormcell Vest",
      "itemName": "Stormcell Vest",
      "description": "After 1 hostile hazard hit, gain hazard immunity for 1 second. Hazards cannot damage or slow you during that immunity. For 2 seconds afterward, hazard damage is doubled; projectiles and contact are unchanged.",
      "primaryDescription": "After 1 hostile hazard hit, gain hazard immunity for 1 second. Hazards cannot damage or slow you during that immunity. For 2 seconds afterward, hazard damage is doubled; projectiles and contact are unchanged.",
      "howItWorks": "After 1 hostile hazard hit, gain hazard immunity for 1 second. Hazards cannot damage or slow you during that immunity. For 2 seconds afterward, hazard damage is doubled; projectiles and contact are unchanged.",
      "compatibleSlots": [
        "chest"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "hazardCharge",
      "statusInitiation": null,
      "incompatibilities": [
        "globalDamageImmunity"
      ],
      "implementationTier": "medium",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.chest.chest-ael-v5-10.v5",
        "compatibilitySignature": "ael-v1-5124c6b58390ee59"
      }
    },
    {
      "id": "CHEST-AEL-V5-13",
      "displayName": "Untouched Plate",
      "itemName": "Untouched Plate",
      "description": "After moving continuously for 6 seconds, gain a Barrier worth 13% of maximum health for 9 seconds. 8-second cooldown.",
      "primaryDescription": "After moving continuously for 6 seconds, gain a Barrier worth 13% of maximum health for 9 seconds. 8-second cooldown.",
      "howItWorks": "After moving continuously for 6 seconds, gain a Barrier worth 13% of maximum health for 9 seconds. 8-second cooldown.",
      "compatibleSlots": [
        "chest"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Modifier",
      "mode": "",
      "statusInitiation": null,
      "incompatibilities": [],
      "implementationTier": "medium",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.chest.chest-ael-v5-13.v5",
        "compatibilitySignature": "ael-v1-5b4ab35952e36789"
      }
    },
    {
      "id": "CHEST-AEL-V5-15",
      "displayName": "Slipguard Mail",
      "itemName": "Slipguard Mail",
      "description": "After taking health damage, gain 40% Damage Reduction for 2 seconds. Your next Autoshot deals 15% less damage. 5-second cooldown.",
      "primaryDescription": "After taking health damage, gain 40% Damage Reduction for 2 seconds. Your next Autoshot deals 15% less damage. 5-second cooldown.",
      "howItWorks": "After taking health damage, gain 40% damage reduction for 2 seconds but your next Autoshot deals 15% less damage. 5-second cooldown.",
      "compatibleSlots": [
        "chest"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Modifier",
      "mode": "",
      "statusInitiation": null,
      "incompatibilities": [],
      "implementationTier": "low",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.chest.chest-ael-v5-15.v5",
        "compatibilitySignature": "ael-v1-2181867103d78e1d"
      }
    },
    {
      "id": "CHEST-AEL-V5-17",
      "displayName": "Drawguard Mail",
      "itemName": "Drawguard Mail",
      "description": "When an Autoshot damages an enemy, it grants a Barrier worth 2% of maximum health for 1.25 seconds but deals 10% less damage.",
      "primaryDescription": "When an Autoshot damages an enemy, it grants a Barrier worth 2% of maximum health for 1.25 seconds but deals 10% less damage.",
      "howItWorks": "When an Autoshot damages an enemy, it grants a Barrier worth 2% of maximum health for 1.25 seconds but deals 10% less damage.",
      "compatibleSlots": [
        "chest"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Modifier",
      "mode": "",
      "statusInitiation": null,
      "incompatibilities": [],
      "implementationTier": "medium",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.chest.chest-ael-v5-17.v5",
        "compatibilitySignature": "ael-v1-4c81834389436dfb"
      }
    },
    {
      "id": "CHEST-AEL-V5-18",
      "displayName": "Roadmender Vest",
      "itemName": "Roadmender Vest",
      "description": "Once per stage, move 180 units while below 75% health to recover 25% maximum health. Your next Autoshot deals 10% less damage.",
      "primaryDescription": "Once per stage, move 180 units while below 75% health to recover 25% maximum health. Your next Autoshot deals 10% less damage.",
      "howItWorks": "Once per stage, move 180 units while below 75% health to recover 25% maximum health. Your next Autoshot deals 10% less damage.",
      "compatibleSlots": [
        "chest"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Modifier",
      "mode": "",
      "statusInitiation": null,
      "incompatibilities": [],
      "implementationTier": "low",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.chest.chest-ael-v5-18.v5",
        "compatibilitySignature": "ael-v1-a018bb0c05ce0a2e"
      }
    },
    {
      "id": "CHEST-AEL-V5-19",
      "displayName": "Cold Guard",
      "itemName": "Cold Guard",
      "description": "You begin every run with Uncommon Frost, and Poison and Bleed cannot be chosen. When an enemy is Frozen or a boss is Staggered by Frost, gain a Barrier worth 6% of maximum health for 2 seconds. The Barrier has a 4-second cooldown and cannot trigger without building enough Chill.",
      "primaryDescription": "You begin every run with Uncommon Frost, and Poison and Bleed cannot be chosen. When an enemy is Frozen or a boss is Staggered by Frost, gain a Barrier worth 6% of maximum health for 2 seconds. The Barrier has a 4-second cooldown and cannot trigger without building enough Chill.",
      "howItWorks": "You begin every run with Uncommon Frost, and Poison and Bleed cannot be chosen. When an enemy is Frozen or a boss is Staggered by Frost, gain a Barrier worth 6% of maximum health for 2 seconds. The Barrier has a 4-second cooldown and cannot trigger without building enough Chill.",
      "compatibleSlots": [
        "chest"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "frostInitiationBarrier",
      "statusInitiation": {
        "path": "frost",
        "rank": 1
      },
      "incompatibilities": [
        "statusPath.bleed",
        "statusPath.poison"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.chest.chest-ael-v5-19.v5",
        "compatibilitySignature": "ael-v1-c47999202a0e0918"
      }
    },
    {
      "id": "CHEST-AEL-V5-20",
      "displayName": "Trophyhide",
      "itemName": "Trophyhide",
      "description": "When an elite is defeated, gain a Barrier worth 12% of maximum health for 5 seconds.",
      "primaryDescription": "When an elite is defeated, gain a Barrier worth 12% of maximum health for 5 seconds.",
      "howItWorks": "When an elite is defeated, gain a Barrier worth 12% of maximum health for 5 seconds.",
      "compatibleSlots": [
        "chest"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Modifier",
      "mode": "",
      "statusInitiation": null,
      "incompatibilities": [],
      "implementationTier": "medium",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.chest.chest-ael-v5-20.v5",
        "compatibilitySignature": "ael-v1-9a6dad70f611cc9e"
      }
    },
    {
      "id": "BOOTS-AEL-V5-01",
      "displayName": "Long Brake Boots",
      "itemName": "Long Brake Boots",
      "description": "Gain 30% Movement Speed, but stopping takes 50% longer.",
      "primaryDescription": "Gain 30% Movement Speed, but stopping takes 50% longer.",
      "howItWorks": "Gain 30% movement speed. Resolved movement covers more ground and still uses the normal arena clamp. Stopping takes 50% longer before you become eligible to Autoshot.",
      "compatibleSlots": [
        "boots"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "speedToBraking",
      "statusInitiation": null,
      "incompatibilities": [
        "instantSettlement"
      ],
      "implementationTier": "medium",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.boots.boots-ael-v5-01.v5",
        "compatibilitySignature": "ael-v1-7ceb7474f1b6d292"
      }
    },
    {
      "id": "BOOTS-AEL-V5-03",
      "displayName": "Edgefire Treads",
      "itemName": "Edgefire Treads",
      "description": "Within 45 units of the visible arena edge, gain 75% movement speed. The band uses body-edge clearance and remains identical on every viewport. Outside the band, movement speed is reduced by 10%.",
      "primaryDescription": "Within 45 units of the visible arena edge, gain 75% movement speed. The band uses body-edge clearance and remains identical on every viewport. Outside the band, movement speed is reduced by 10%.",
      "howItWorks": "Within 45 units of the visible arena edge, gain 75% movement speed. The band uses body-edge clearance and remains identical on every viewport. Outside the band, movement speed is reduced by 10%.",
      "compatibleSlots": [
        "boots"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "edgeMomentum",
      "statusInitiation": null,
      "incompatibilities": [
        "hiddenEdgeBand"
      ],
      "implementationTier": "medium",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.boots.boots-ael-v5-03.v5",
        "compatibilitySignature": "ael-v1-5132a5faa10d7eac"
      }
    },
    {
      "id": "BOOTS-AEL-V5-04",
      "displayName": "Momentum Greaves",
      "itemName": "Momentum Greaves",
      "description": "Continuous movement builds up to 40% Movement Speed. Stopping removes the bonus and takes 50% longer at maximum Momentum.",
      "primaryDescription": "Continuous movement builds up to 40% Movement Speed. Stopping removes the bonus and takes 50% longer at maximum Momentum.",
      "howItWorks": "Every 0.5 seconds of continuous movement adds 5% movement speed, up to 40%. Momentum remains while you keep moving and turns with normal movement input. Stopping clears all Momentum and takes 50% longer at maximum Momentum.",
      "compatibleSlots": [
        "boots"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "momentumRamp",
      "statusInitiation": null,
      "incompatibilities": [
        "hiddenMovementMomentum"
      ],
      "implementationTier": "medium",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.boots.boots-ael-v5-04.v5",
        "compatibilitySignature": "ael-v1-fbfd1efefed9b262"
      }
    },
    {
      "id": "BOOTS-AEL-V5-05",
      "displayName": "Arrowstraight Boots",
      "itemName": "Arrowstraight Boots",
      "description": "Moving within 25 degrees of your current direction builds up to 50% movement speed. The bonus is fully visible and follows resolved voluntary movement, not held input against a wall. A sharper turn clears the bonus and reduces movement speed by 15% for 0.5 seconds.",
      "primaryDescription": "Moving within 25 degrees of your current direction builds up to 50% movement speed. The bonus is fully visible and follows resolved voluntary movement, not held input against a wall. A sharper turn clears the bonus and reduces movement speed by 15% for 0.5 seconds.",
      "howItWorks": "Moving within 25 degrees of your current direction builds up to 50% movement speed. The bonus is fully visible and follows resolved voluntary movement, not held input against a wall. A sharper turn clears the bonus and reduces movement speed by 15% for 0.5 seconds.",
      "compatibleSlots": [
        "boots"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "straightLineMomentum",
      "statusInitiation": null,
      "incompatibilities": [
        "hiddenDirectionThreshold"
      ],
      "implementationTier": "medium",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.boots.boots-ael-v5-05.v5",
        "compatibilitySignature": "ael-v1-9db5cc814f9a944d"
      }
    },
    {
      "id": "BOOTS-AEL-V5-06",
      "displayName": "Trailback Soles",
      "itemName": "Trailback Soles",
      "description": "Retracing your recent movement path grants 70% Movement Speed. Moving elsewhere reduces it by 10%.",
      "primaryDescription": "Retracing your recent movement path grants 70% Movement Speed. Moving elsewhere reduces it by 10%.",
      "howItWorks": "Your last 2 seconds of movement remain as one visible trail. Moving back along that trail grants 70% movement speed. Movement away from the trail is 10% slower, and only the newest trail exists.",
      "compatibleSlots": [
        "boots"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "backtrackTrail",
      "statusInitiation": null,
      "incompatibilities": [
        "multipleMovementTrails"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.boots.boots-ael-v5-06.v5",
        "compatibilitySignature": "ael-v1-16a4669c75413784"
      }
    },
    {
      "id": "BOOTS-AEL-V5-07",
      "displayName": "Grazer Boots",
      "itemName": "Grazer Boots",
      "description": "A hostile projectile passing within 24 units without Hitting you grants 10% movement speed. The bonus stacks up to 3 times, and every stack remains until an enemy projectile Hits you. A projectile Hit clears all stacks and deals 125% of normal damage.",
      "primaryDescription": "A hostile projectile passing within 24 units without Hitting you grants 10% movement speed. The bonus stacks up to 3 times, and every stack remains until an enemy projectile Hits you. A projectile Hit clears all stacks and deals 125% of normal damage.",
      "howItWorks": "A hostile projectile passing within 24 units without Hitting you grants 10% movement speed. The bonus stacks up to 3 times, and every stack remains until an enemy projectile Hits you. A projectile Hit clears all stacks and deals 125% of normal damage.",
      "compatibleSlots": [
        "boots"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "persistentProjectileGrazeMomentum",
      "statusInitiation": null,
      "incompatibilities": [
        "hiddenGrazeRadius"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.boots.boots-ael-v5-07.v5",
        "compatibilitySignature": "ael-v1-25706528c1f63d16"
      }
    },
    {
      "id": "BOOTS-AEL-V5-08",
      "displayName": "Red Warning Treads",
      "itemName": "Red Warning Treads",
      "description": "Inside a visible hostile warning, gain 60% movement speed. The bonus ends immediately when you leave the warning and never changes the warning's timing or size. Contact, hazard and boss-zone damage deal 125% of normal while the bonus is active.",
      "primaryDescription": "Inside a visible hostile warning, gain 60% movement speed. The bonus ends immediately when you leave the warning and never changes the warning's timing or size. Contact, hazard and boss-zone damage deal 125% of normal while the bonus is active.",
      "howItWorks": "Inside a visible hostile warning, gain 60% movement speed. The bonus ends immediately when you leave the warning and never changes the warning's timing or size. Contact, hazard and boss-zone damage deal 125% of normal while the bonus is active.",
      "compatibleSlots": [
        "boots"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "telegraphOverdrive",
      "statusInitiation": null,
      "incompatibilities": [
        "hiddenWarningGeometry"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.boots.boots-ael-v5-08.v5",
        "compatibilitySignature": "ael-v1-4406dd4a864e4e10"
      }
    },
    {
      "id": "BOOTS-AEL-V5-14",
      "displayName": "Hazardskip Boots",
      "itemName": "Hazardskip Boots",
      "description": "Entering a hostile hazard grants hazard immunity for 0.4 seconds. The immunity can trigger once per hazard and lets movement carry you through a narrow danger zone. For 2 seconds afterward, hazard damage is 150% of normal; projectiles and contact are unchanged.",
      "primaryDescription": "Entering a hostile hazard grants hazard immunity for 0.4 seconds. The immunity can trigger once per hazard and lets movement carry you through a narrow danger zone. For 2 seconds afterward, hazard damage is 150% of normal; projectiles and contact are unchanged.",
      "howItWorks": "Entering a hostile hazard grants hazard immunity for 0.4 seconds. The immunity can trigger once per hazard and lets movement carry you through a narrow danger zone. For 2 seconds afterward, hazard damage is 150% of normal; projectiles and contact are unchanged.",
      "compatibleSlots": [
        "boots"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "hazardSkim",
      "statusInitiation": null,
      "incompatibilities": [
        "globalDamageImmunity"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.boots.boots-ael-v5-14.v5",
        "compatibilitySignature": "ael-v1-be0bdb89f279cb1d"
      }
    },
    {
      "id": "BOOTS-AEL-V5-15",
      "displayName": "Bloodrush Boots",
      "itemName": "Bloodrush Boots",
      "description": "Taking health damage grants 35% movement speed for 1.25 seconds. The sprint begins immediately and refreshes only after its slow debt has ended. Afterward, movement speed is reduced by 15% for 1.5 seconds.",
      "primaryDescription": "Taking health damage grants 35% movement speed for 1.25 seconds. The sprint begins immediately and refreshes only after its slow debt has ended. Afterward, movement speed is reduced by 15% for 1.5 seconds.",
      "howItWorks": "Taking health damage grants 35% movement speed for 1.25 seconds. The sprint begins immediately and refreshes only after its slow debt has ended. Afterward, movement speed is reduced by 15% for 1.5 seconds.",
      "compatibleSlots": [
        "boots"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "damageSprintDebt",
      "statusInitiation": null,
      "incompatibilities": [
        "damageSprintRefresh"
      ],
      "implementationTier": "medium",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.boots.boots-ael-v5-15.v5",
        "compatibilitySignature": "ael-v1-a61de060e62408e8"
      }
    },
    {
      "id": "BOOTS-AEL-V5-17",
      "displayName": "Redline Runners",
      "itemName": "Redline Runners",
      "description": "Gain 50% Movement Speed while below 35% health.",
      "primaryDescription": "Gain 50% Movement Speed while below 35% health.",
      "howItWorks": "Below 35% health, gain 50% movement speed. The bonus turns on and off immediately when health crosses the visible threshold. At 35% health or higher, this Equipment provides no benefit.",
      "compatibleSlots": [
        "boots"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "lowHealthRush",
      "statusInitiation": null,
      "incompatibilities": [
        "hiddenLowHealthThreshold"
      ],
      "implementationTier": "low",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.boots.boots-ael-v5-17.v5",
        "compatibilitySignature": "ael-v1-0b8ea65a83f52aa2"
      }
    },
    {
      "id": "BOOTS-AEL-V5-18",
      "displayName": "Four-Corners Boots",
      "itemName": "Four-Corners Boots",
      "description": "The first visit to each visible arena quadrant grants 10% movement speed for that room, up to 40%. The four quadrants reset on room transition and use the logical arena on every device. Base movement speed is reduced by 5%, and revisiting a quadrant gives nothing.",
      "primaryDescription": "The first visit to each visible arena quadrant grants 10% movement speed for that room, up to 40%. The four quadrants reset on room transition and use the logical arena on every device. Base movement speed is reduced by 5%, and revisiting a quadrant gives nothing.",
      "howItWorks": "The first visit to each visible arena quadrant grants 10% movement speed for that room, up to 40%. The four quadrants reset on room transition and use the logical arena on every device. Base movement speed is reduced by 5%, and revisiting a quadrant gives nothing.",
      "compatibleSlots": [
        "boots"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "quadrantMomentum",
      "statusInitiation": null,
      "incompatibilities": [
        "hiddenArenaQuadrants"
      ],
      "implementationTier": "medium",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.boots.boots-ael-v5-18.v5",
        "compatibilitySignature": "ael-v1-46461d0d1395a6a1"
      }
    },
    {
      "id": "BOOTS-AEL-V5-20",
      "displayName": "Arrowpath Soles",
      "itemName": "Arrowpath Soles",
      "description": "Every 5th Autoshot leaves one visible 52-unit movement lane for 4 seconds. Moving along that lane grants 50% movement speed. Moving outside it is 10% slower, and only one lane can exist.",
      "primaryDescription": "Every 5th Autoshot leaves one visible 52-unit movement lane for 4 seconds. Moving along that lane grants 50% movement speed. Moving outside it is 10% slower, and only one lane can exist.",
      "howItWorks": "Every 5th Autoshot leaves one visible 52-unit movement lane for 4 seconds. Moving along that lane grants 50% movement speed. Moving outside it is 10% slower, and only one lane can exist.",
      "compatibleSlots": [
        "boots"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "periodicAutoshotSlipstream",
      "statusInitiation": null,
      "incompatibilities": [
        "multipleAutoshotLanes"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.boots.boots-ael-v5-20.v5",
        "compatibilitySignature": "ael-v1-ae1b9da173e01309"
      }
    },
    {
      "id": "LEGS-AEL-V5-01",
      "displayName": "Singlebolt Greaves",
      "itemName": "Singlebolt Greaves",
      "description": "Each Autoshot combines its ordinary arrows into one arrow with 90% of their total damage and +2 Pierce.",
      "primaryDescription": "Each Autoshot combines its ordinary arrows into one arrow with 90% of their total damage and +2 Pierce.",
      "howItWorks": "Each Autoshot merges all ordinary projectiles into one projectile. It keeps 90% of their combined damage and gains 2 Pierce. Multishot no longer covers several lanes or rolls separate Critical Hits.",
      "compatibleSlots": [
        "legs"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "mergeProjectiles",
      "statusInitiation": null,
      "incompatibilities": [
        "independentProjectileCrits",
        "splitStringSupplementalProjectiles"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.legs.legs-ael-v5-01.v5",
        "compatibilitySignature": "ael-v1-41de5938b2bee0aa"
      }
    },
    {
      "id": "LEGS-AEL-V5-02",
      "displayName": "Echochain Leggings",
      "itemName": "Echochain Leggings",
      "description": "Autoshots fire at most two ordinary arrows. Each removed arrow adds a Ricochet dealing 450% damage.",
      "primaryDescription": "Autoshots fire at most two ordinary arrows. Each removed arrow adds a Ricochet dealing 450% damage.",
      "howItWorks": "Autoshots fire at most 2 ordinary projectiles. Each removed projectile adds 1 Ricochet at 450% damage. The Ricochets cannot Crit, apply statuses, trigger Equipment or return to an enemy already Hit.",
      "compatibleSlots": [
        "legs"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "countToRicochet",
      "statusInitiation": null,
      "incompatibilities": [
        "evolution.pinballCarrier",
        "relic.ricochetIdol"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.legs.legs-ael-v5-02.v5",
        "compatibilitySignature": "ael-v1-f48a7e0729e69527"
      }
    },
    {
      "id": "LEGS-AEL-V5-03",
      "displayName": "Homeward Bodkins",
      "itemName": "Homeward Bodkins",
      "description": "After Piercing an enemy, a projectile turns back once instead of continuing forward. It can return through up to 2 previous enemies at 150% damage. While any projectile is returning, no new Autoshot is fired. The return cannot Pierce again, Ricochet, apply statuses or trigger Equipment.",
      "primaryDescription": "After Piercing an enemy, a projectile turns back once instead of continuing forward. It can return through up to 2 previous enemies at 150% damage. While any projectile is returning, no new Autoshot is fired. The return cannot Pierce again, Ricochet, apply statuses or trigger Equipment.",
      "howItWorks": "After Piercing an enemy, a projectile turns back once instead of continuing forward. It can return through up to 2 previous enemies at 150% damage. While any projectile is returning, no new Autoshot is fired. The return cannot Pierce again, Ricochet, apply statuses or trigger Equipment.",
      "compatibleSlots": [
        "legs"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "pierceReturns",
      "statusInitiation": null,
      "incompatibilities": [
        "evolution.pinballCarrier",
        "siegeUnlimitedPierce"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.legs.legs-ael-v5-03.v5",
        "compatibilitySignature": "ael-v1-de2c3ec01d15ab86"
      }
    },
    {
      "id": "LEGS-AEL-V5-04",
      "displayName": "Forked Rebound",
      "itemName": "Forked Rebound",
      "description": "The first Ricochet from an Autoshot splits into 2 projectiles. Each split deals 55% damage and can reach a different valid enemy. Ordinary projectiles lose all Pierce and stop at the first enemy. Only 1 split can occur per Autoshot, and split projectiles cannot Ricochet, Crit or apply statuses.",
      "primaryDescription": "The first Ricochet from an Autoshot splits into 2 projectiles. Each split deals 55% damage and can reach a different valid enemy. Ordinary projectiles lose all Pierce and stop at the first enemy. Only 1 split can occur per Autoshot, and split projectiles cannot Ricochet, Crit or apply statuses.",
      "howItWorks": "The first Ricochet from an Autoshot splits into 2 projectiles. Each split deals 55% damage and can reach a different valid enemy. Ordinary projectiles lose all Pierce and stop at the first enemy. Only 1 split can occur per Autoshot, and split projectiles cannot Ricochet, Crit or apply statuses.",
      "compatibleSlots": [
        "legs"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "ricochetSplits",
      "statusInitiation": null,
      "incompatibilities": [
        "evolution.pinballCarrier",
        "relic.ricochetIdol"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.legs.legs-ael-v5-04.v5",
        "compatibilitySignature": "ael-v1-bcaa2c8e1b273e86"
      }
    },
    {
      "id": "LEGS-AEL-V5-05",
      "displayName": "Overflow Greaves",
      "itemName": "Overflow Greaves",
      "description": "Autoshots fire at most three ordinary arrows. Each removed arrow gives the remaining arrows 80% more damage and 12% more width.",
      "primaryDescription": "Autoshots fire at most three ordinary arrows. Each removed arrow gives the remaining arrows 80% more damage and 12% more width.",
      "howItWorks": "Autoshots fire at most 3 ordinary projectiles. Each projectile removed by that limit gives every remaining projectile 80% more damage and 12% more width. Removed projectiles no longer cover separate lanes or roll separate Critical Hits.",
      "compatibleSlots": [
        "legs"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "projectileOverflowConversion",
      "statusInitiation": null,
      "incompatibilities": [
        "unconvertedProjectileOverflow"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.legs.legs-ael-v5-05.v5",
        "compatibilitySignature": "ael-v1-7616a5c29eb73f3a"
      }
    },
    {
      "id": "LEGS-AEL-V5-07",
      "displayName": "Banked Bounce",
      "itemName": "Banked Bounce",
      "description": "A Ricochet with no valid enemy is stored instead of being lost. The next Autoshot releases stored projectiles at 55% damage, up to 3 stored projectiles. Stored projectiles cannot Crit, apply statuses, Ricochet again or survive a room transition.",
      "primaryDescription": "A Ricochet with no valid enemy is stored instead of being lost. The next Autoshot releases stored projectiles at 55% damage, up to 3 stored projectiles. Stored projectiles cannot Crit, apply statuses, Ricochet again or survive a room transition.",
      "howItWorks": "A Ricochet with no valid enemy is stored instead of being lost. The next Autoshot releases stored projectiles at 55% damage, up to 3 stored projectiles. Stored projectiles cannot Crit, apply statuses, Ricochet again or survive a room transition.",
      "compatibleSlots": [
        "legs"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "unusedRicochetBank",
      "statusInitiation": null,
      "incompatibilities": [
        "evolution.pinballCarrier",
        "relic.ricochetIdol"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.legs.legs-ael-v5-07.v5",
        "compatibilitySignature": "ael-v1-d908dbba71837612"
      }
    },
    {
      "id": "LEGS-AEL-V5-08",
      "displayName": "Orbit Quiver",
      "itemName": "Orbit Quiver",
      "description": "Missed ordinary projectiles orbit you for up to 4 seconds instead of disappearing. Your next Autoshot releases up to 6 orbiting projectiles at 400% damage. Orbiting projectiles cannot Crit, apply statuses or create more orbiting projectiles, and unused ones expire.",
      "primaryDescription": "Missed ordinary projectiles orbit you for up to 4 seconds instead of disappearing. Your next Autoshot releases up to 6 orbiting projectiles at 400% damage. Orbiting projectiles cannot Crit, apply statuses or create more orbiting projectiles, and unused ones expire.",
      "howItWorks": "Missed ordinary projectiles orbit you for up to 4 seconds instead of disappearing. Your next Autoshot releases up to 6 orbiting projectiles at 400% damage. Orbiting projectiles cannot Crit, apply statuses or create more orbiting projectiles, and unused ones expire.",
      "compatibleSlots": [
        "legs"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "missedProjectileOrbit",
      "statusInitiation": null,
      "incompatibilities": [
        "recursiveProjectileCreation"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.legs.legs-ael-v5-08.v5",
        "compatibilitySignature": "ael-v1-a06f2c8d6cbacf75"
      }
    },
    {
      "id": "LEGS-AEL-V5-09",
      "displayName": "Echo Impact",
      "itemName": "Echo Impact",
      "description": "Projectile Hits deal only 60% of their damage immediately. After 0.7 seconds, the impact location deals another 75% damage in a visible 42-unit area. Enemies can move out before the delayed strike, which cannot Crit, apply statuses or create another strike.",
      "primaryDescription": "Projectile Hits deal only 60% of their damage immediately. After 0.7 seconds, the impact location deals another 75% damage in a visible 42-unit area. Enemies can move out before the delayed strike, which cannot Crit, apply statuses or create another strike.",
      "howItWorks": "Projectile Hits deal only 60% of their damage immediately. After 0.7 seconds, the impact location deals another 75% damage in a visible 42-unit area. Enemies can move out before the delayed strike, which cannot Crit, apply statuses or create another strike.",
      "compatibleSlots": [
        "legs"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "delayedImpact",
      "statusInitiation": null,
      "incompatibilities": [
        "recursiveDelayedImpact"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.legs.legs-ael-v5-09.v5",
        "compatibilitySignature": "ael-v1-b7b605b56cbc453d"
      }
    },
    {
      "id": "LEGS-AEL-V5-10",
      "displayName": "Execution Relay",
      "itemName": "Execution Relay",
      "description": "Ordinary projectiles deal 85% damage. Ordinary-arrow kills launch an arrow at a nearby enemy for 75% damage. Maximum two per Autoshot.",
      "primaryDescription": "Ordinary projectiles deal 85% damage. Ordinary-arrow kills launch an arrow at a nearby enemy for 75% damage. Maximum two per Autoshot.",
      "howItWorks": "Ordinary projectiles deal 100% of normal damage. When one kills an enemy, it continues to a nearby valid enemy at 75% damage, up to 2 relays per Autoshot. A relay cannot Crit, apply statuses, Pierce, Ricochet or create another relay.",
      "compatibleSlots": [
        "legs"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "killRelay",
      "statusInitiation": null,
      "incompatibilities": [
        "relic.killProjectileChains"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.legs.legs-ael-v5-10.v5",
        "compatibilitySignature": "ael-v1-57de3ad3fe35da0b"
      }
    },
    {
      "id": "LEGS-AEL-V5-12",
      "displayName": "Compass Greaves",
      "itemName": "Compass Greaves",
      "description": "Only 2 ordinary projectiles follow normal targeting. All remaining ordinary projectiles fire evenly around you at 400% damage. Radial projectiles cannot all converge on one enemy and do not retarget after release.",
      "primaryDescription": "Only 2 ordinary projectiles follow normal targeting. All remaining ordinary projectiles fire evenly around you at 400% damage. Radial projectiles cannot all converge on one enemy and do not retarget after release.",
      "howItWorks": "Only 2 ordinary projectiles follow normal targeting. All remaining ordinary projectiles fire evenly around you at 400% damage. Radial projectiles cannot all converge on one enemy and do not retarget after release.",
      "compatibleSlots": [
        "legs"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "radialRelease",
      "statusInitiation": null,
      "incompatibilities": [
        "spreadScaleEffects"
      ],
      "implementationTier": "medium",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.legs.legs-ael-v5-12.v5",
        "compatibilitySignature": "ael-v1-def07a41f66628e5"
      }
    },
    {
      "id": "LEGS-AEL-V5-13",
      "displayName": "Needle-and-Fan Leggings",
      "itemName": "Needle-and-Fan Leggings",
      "description": "Autoshots alternate between a Needle and a Fan. Needles merge ordinary projectiles at 130% combined damage; Fans use 160% spread at 120% damage per projectile. The order never resets inside a room, and each shape gives up the other shape's coverage.",
      "primaryDescription": "Autoshots alternate between a Needle and a Fan. Needles merge ordinary projectiles at 130% combined damage; Fans use 160% spread at 120% damage per projectile. The order never resets inside a room, and each shape gives up the other shape's coverage.",
      "howItWorks": "Autoshots alternate between a Needle and a Fan. Needles merge ordinary projectiles at 130% combined damage; Fans use 160% spread at 120% damage per projectile. The order never resets inside a room, and each shape gives up the other shape's coverage.",
      "compatibleSlots": [
        "legs"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "alternatingTopology",
      "statusInitiation": null,
      "incompatibilities": [
        "topologySequenceReset"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.legs.legs-ael-v5-13.v5",
        "compatibilitySignature": "ael-v1-74d9d63e26d3ef6a"
      }
    },
    {
      "id": "LEGS-AEL-V5-14",
      "displayName": "Marching Quiver",
      "itemName": "Marching Quiver",
      "description": "Every 50 units moved stores one extra projectile, up to 3 stored projectiles. Your next Autoshot fires them beyond the normal projectile cap. Every projectile in that Autoshot deals 70% of normal damage, and a miss consumes all stored projectiles.",
      "primaryDescription": "Every 50 units moved stores one extra projectile, up to 3 stored projectiles. Your next Autoshot fires them beyond the normal projectile cap. Every projectile in that Autoshot deals 70% of normal damage, and a miss consumes all stored projectiles.",
      "howItWorks": "Every 50 units moved stores one extra projectile, up to 3 stored projectiles. Your next Autoshot fires them beyond the normal projectile cap. Every projectile in that Autoshot deals 70% of normal damage, and a miss consumes all stored projectiles.",
      "compatibleSlots": [
        "legs"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "movementOvercapProjectiles",
      "statusInitiation": null,
      "incompatibilities": [
        "kingRainMovementMeter",
        "recursiveProjectileCreation"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.legs.legs-ael-v5-14.v5",
        "compatibilitySignature": "ael-v1-7c96cd4cd26bf818"
      }
    },
    {
      "id": "LEGS-AEL-V5-15",
      "displayName": "Buried Burst",
      "itemName": "Buried Burst",
      "description": "Burst no longer deals immediate area damage. It leaves a visible 70-unit mine that explodes after a 1-second delay for 35% of the Hit's damage. Enemies can move out before it explodes, and mines cannot Crit, apply statuses or create more mines.",
      "primaryDescription": "Burst no longer deals immediate area damage. It leaves a visible 70-unit mine that explodes after a 1-second delay for 35% of the Hit's damage. Enemies can move out before it explodes, and mines cannot Crit, apply statuses or create more mines.",
      "howItWorks": "Burst no longer deals immediate area damage. It leaves a visible 70-unit mine that explodes after a 1-second delay for 35% of the Hit's damage. Enemies can move out before it explodes, and mines cannot Crit, apply statuses or create more mines.",
      "compatibleSlots": [
        "legs"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "burstDelayedMine",
      "statusInitiation": null,
      "incompatibilities": [
        "evolution.concussiveBlast",
        "evolution.whiteout"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.legs.legs-ael-v5-15.v5",
        "compatibilitySignature": "ael-v1-3b233b3cceb1e404"
      }
    },
    {
      "id": "LEGS-AEL-V5-16",
      "displayName": "Venom Pulse Leggings",
      "itemName": "Venom Pulse Leggings",
      "description": "You begin every run with Uncommon Poison, and Frost and Bleed cannot be chosen. Poison can be applied only once every 2 Autoshots. That Autoshot applies 4 times its planned Poison, up to 16 applications per enemy, and those applications last 2 seconds longer. Other Autoshots apply no Poison, and projectile count cannot exceed the per-enemy application cap.",
      "primaryDescription": "You begin every run with Uncommon Poison, and Frost and Bleed cannot be chosen. Poison can be applied only once every 2 Autoshots. That Autoshot applies 4 times its planned Poison, up to 16 applications per enemy, and those applications last 2 seconds longer. Other Autoshots apply no Poison, and projectile count cannot exceed the per-enemy application cap.",
      "howItWorks": "You begin every run with Uncommon Poison, and Frost and Bleed cannot be chosen. Poison can be applied only once every 2 Autoshots. That Autoshot applies 4 times its planned Poison, up to 16 applications per enemy, and those applications last 2 seconds longer. Other Autoshots apply no Poison, and projectile count cannot exceed the per-enemy application cap.",
      "compatibleSlots": [
        "legs"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "poisonPulseExtended",
      "statusInitiation": {
        "path": "poison",
        "rank": 1
      },
      "incompatibilities": [
        "perAutoshotPoisonApplication",
        "unboundedPlagueApplications"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.legs.legs-ael-v5-16.v5",
        "compatibilitySignature": "ael-v1-5122300e1da040ba"
      }
    },
    {
      "id": "LEGS-AEL-V5-17",
      "displayName": "Bloodrunner Greaves",
      "itemName": "Bloodrunner Greaves",
      "description": "You begin every run with Uncommon Bleed, and Poison and Frost cannot be chosen. Bleed wounds drain at 220% speed while you move. Movement pays stored Bleed damage faster without changing its total damage. While stopped, Bleed drains at only 50% speed.",
      "primaryDescription": "You begin every run with Uncommon Bleed, and Poison and Frost cannot be chosen. Bleed wounds drain at 220% speed while you move. Movement pays stored Bleed damage faster without changing its total damage. While stopped, Bleed drains at only 50% speed.",
      "howItWorks": "You begin every run with Uncommon Bleed, and Poison and Frost cannot be chosen. Bleed wounds drain at 220% speed while you move. Movement pays stored Bleed damage faster without changing its total damage. While stopped, Bleed drains at only 50% speed.",
      "compatibleSlots": [
        "legs"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "movingBleedRate",
      "statusInitiation": {
        "path": "bleed",
        "rank": 1
      },
      "incompatibilities": [
        "unboundedBleedTimeAcceleration"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.legs.legs-ael-v5-17.v5",
        "compatibilitySignature": "ael-v1-1ad541c7c039e17f"
      }
    },
    {
      "id": "LEGS-AEL-V5-18",
      "displayName": "Winter Pair Cuisses",
      "itemName": "Winter Pair Cuisses",
      "description": "You begin every run with Uncommon Frost, and Poison and Bleed cannot be chosen. The status rule activates when Frost reaches Epic. Frost Autoshots alternate between Cold and Deep Cold. Deep Cold applies 10 Chill once, regardless of projectile count. Cold Autoshots add no Chill and apply only 50% of normal Frost slow.",
      "primaryDescription": "You begin every run with Uncommon Frost, and Poison and Bleed cannot be chosen. The status rule activates when Frost reaches Epic. Frost Autoshots alternate between Cold and Deep Cold. Deep Cold applies 10 Chill once, regardless of projectile count. Cold Autoshots add no Chill and apply only 50% of normal Frost slow.",
      "howItWorks": "You begin every run with Uncommon Frost, and Poison and Bleed cannot be chosen. The status rule activates when Frost reaches Epic. Frost Autoshots alternate between Cold and Deep Cold. Deep Cold applies 10 Chill once, regardless of projectile count. Cold Autoshots add no Chill and apply only 50% of normal Frost slow.",
      "compatibleSlots": [
        "legs"
      ],
      "implemented": true,
      "enabled": true,
      "handlerVersion": 1,
      "catalogueVersion": "LEG-EQ-AEL-V5.2",
      "effectType": "Transformation",
      "mode": "alternatingChill",
      "statusInitiation": {
        "path": "frost",
        "rank": 1
      },
      "incompatibilities": [
        "perAutoshotChillApplication"
      ],
      "implementationTier": "high",
      "implementationState": "alpha-playtest",
      "typedContract": {
        "recipeId": "equipment.legs.legs-ael-v5-18.v5",
        "compatibilitySignature": "ael-v1-7249b57a35a15746"
      }
    }
  ]
});
});
