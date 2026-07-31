(function initRunOutcome(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodRunOutcome = api;
})(typeof window !== "undefined" ? window : globalThis, function runOutcomeFactory() {
  "use strict";

  const EMPTY_VALUE = "None";
  const OUTCOME_DEFS = Object.freeze({
    complete: Object.freeze({ title: "Forest Run Complete" }),
    defeat: Object.freeze({ title: "Run Failed" }),
    abandon: Object.freeze({ title: "Run Abandoned" }),
  });

  function integer(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
  }

  function listValue(values) {
    const normalized = Array.isArray(values)
      ? values.map(String).map((value) => value.trim()).filter(Boolean)
      : [];
    return normalized.length ? normalized.join(" · ") : EMPTY_VALUE;
  }

  function item(label, value, collection = false) {
    return Object.freeze({ label, value: String(value), collection });
  }

  // Fifteen stages is an ordinary run. Anything beyond that comes from endless
  // mode, and the outcome screen has to tell the two apart.
  const BASE_STAGE_COUNT = 15;

  function createModel(input = {}) {
    const outcome = OUTCOME_DEFS[input.outcome] ? input.outcome : "abandon";
    const clearedStages = integer(input.clearedStages);
    const maxStages = Math.max(1, integer(input.maxStages) || 15);
    const reachedStage = Math.max(1, integer(input.reachedStage));
    const prestigeUnlocked = Number.isInteger(input.prestigeUnlocked) ? input.prestigeUnlocked : null;
    const performance = input.performance || {};
    const rewards = input.rewards || {};
    const record = input.record || {};
    const rewardItems = [
      item("Gold Banked", integer(rewards.goldBanked).toLocaleString("en-GB")),
      item("Wood", integer(rewards.wood).toLocaleString("en-GB")),
      item("Ore", integer(rewards.ore).toLocaleString("en-GB")),
      item("Boss Trophies", integer(rewards.bossTrophies).toLocaleString("en-GB")),
    ];
    if (integer(rewards.sheriffsCrests) > 0) {
      rewardItems.push(item("Sheriff’s Crest", integer(rewards.sheriffsCrests).toLocaleString("en-GB")));
    }

    /* A run that went past the fifteenth stage has to say so on its own.
       Otherwise a player who reached the twenty-third sees exactly the same
       summary as one who reached the twelfth, and the whole point of depth is
       lost. */
    const endless = reachedStage > BASE_STAGE_COUNT;
    const deepest = integer(input.deepestStage);
    const newRecord = endless && reachedStage >= deepest && deepest > BASE_STAGE_COUNT;

    return Object.freeze({
      outcome,
      title: OUTCOME_DEFS[outcome].title,
      progress: endless
        ? `Reached Stage ${reachedStage}`
        : `${clearedStages} / ${maxStages} Stages Cleared`,
      kicker: newRecord
        ? `Deepest Run Yet`
        : endless
          ? `Deepest: Stage ${Math.max(deepest, reachedStage)}`
          : outcome === "complete" && prestigeUnlocked !== null
            ? `Prestige P${prestigeUnlocked} Unlocked`
            : outcome === "complete"
              ? ""
              : `Stage ${reachedStage} Reached`,
      columns: Object.freeze([
        Object.freeze({
          id: "performance",
          title: "Performance",
          items: Object.freeze([
            item("Score", integer(performance.score).toLocaleString("en-GB")),
            item("Kills", integer(performance.kills).toLocaleString("en-GB")),
            item("Best Streak", integer(performance.bestStreak).toLocaleString("en-GB")),
            item("Damage Taken", integer(performance.damageTaken).toLocaleString("en-GB")),
          ]),
        }),
        Object.freeze({ id: "rewards", title: "Rewards Secured", items: Object.freeze(rewardItems) }),
        Object.freeze({
          id: "record",
          title: "Run Record",
          items: Object.freeze([
            item("Foundation", listValue(record.foundation)),
            item("Status Path", record.statusPath || "Unbound"),
            item("Relics", listValue(record.relics), true),
            item("Evolutions", listValue(record.evolutions), true),
          ]),
        }),
      ]),
    });
  }

  function createDismissalGate(onDismiss) {
    let dismissed = false;
    return Object.freeze({
      dismiss() {
        if (dismissed) return false;
        dismissed = true;
        onDismiss?.();
        return true;
      },
      isDismissed: () => dismissed,
    });
  }

  return Object.freeze({ createModel, createDismissalGate, EMPTY_VALUE });
});
