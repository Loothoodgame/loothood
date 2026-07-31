/* Guide content.
   ------------------------------------------------------------------
   Pulled out into its own file on purpose: this is text, not logic, and it
   should be editable without going into game.js and its twenty-eight
   thousand lines.

   The old guide consisted of seventeen one-sentence lines ("Stop moving to
   fire.") and explained none of the mechanics the game rests on: that the
   elements are picked once per run, that the boss carries armour on top of
   its health, that the legendary pity hits on the fiftieth pull. The player
   found all of that out only by losing.

   The order of the sections mirrors the order in which the player runs into
   them: first how to shoot, then what happens between stages, then the
   elements, the enemies, the bosses, and only after that the camp. Within a
   section, the rule that is most often misunderstood comes first.

   The numbers are taken from the code, not invented. If the balance is
   changed, this file is changed too: forest-balance.js for difficulty,
   gacha-system.js for pulls, equipment.js for rarities. */

window.LOOTHOOD_GUIDE = Object.freeze({
  version: "guide-v1",

  sections: Object.freeze([
    Object.freeze({
      id: "bow",
      icon: "nav-hunt-v1.png",
      title: "Bow and footwork",
      lede: "The whole fight comes down to when you stand still.",
      entries: Object.freeze([
        Object.freeze({
          key: true,
          name: "You fire only while standing",
          text: "Moving stops the bow entirely. Every fight is a rhythm of short runs and short stops, and the stop is when damage happens.",
        }),
        Object.freeze({
          name: "The bow picks its own target",
          text: "It takes the nearest enemy, but anything roughly in front of you counts as closer than it is. Facing a direction is how you aim.",
        }),
        Object.freeze({
          name: "Arrows pass through one enemy",
          text: "One extra body by default. Pierce upgrades add more, and each body after the first takes a little less.",
        }),
        Object.freeze({
          name: "More arrows, less each",
          text: "Multishot splits the volley: two arrows deal 60% each, three deal 45%, four deal 37.5%. Total damage still rises, but the gain shrinks. You are buying width, not power.",
        }),
      ]),
    }),

    Object.freeze({
      id: "upgrades",
      icon: "nav-pulls-v1.png",
      title: "Between stages",
      lede: "Every stage ends with a choice that lasts the rest of the run.",
      entries: Object.freeze([
        Object.freeze({
          key: true,
          name: "Three cards, one pick",
          text: "Higher Prestige cuts the offer to two. Nothing carries over to the next Hunt.",
        }),
        Object.freeze({
          name: "Cards get stronger the deeper you are",
          text: "On the first five stages a card is almost always rank 1. From stage eleven, rank 3 comes up about one time in five.",
        }),
        Object.freeze({
          name: "Evolutions",
          text: "Two upgrades can combine into something new. They unlock on gold collected this run: the first at 325, then every 250 after. When one is available it always takes the first slot in the offer.",
        }),
      ]),
    }),

    Object.freeze({
      id: "elements",
      icon: "item-legendary-venom-vessel-v1.png",
      title: "Elements",
      lede: "This is the choice players regret most, because it cannot be taken back.",
      entries: Object.freeze([
        Object.freeze({
          key: true,
          name: "One element per Hunt",
          text: "Poison, Frost and Bleed. The moment you take a card from one of them, the other two disappear from the offer until the run ends.",
        }),
        Object.freeze({
          name: "Frost",
          text: "Hits build Chill. At enough stacks an ordinary enemy freezes; a boss turns Brittle instead. Brittle targets take 20% more damage and deal 20% less.",
        }),
        Object.freeze({
          name: "Poison",
          text: "Stacks damage over time, and the stacks add up rather than refresh. Slow to start, heavy on anything that survives a few seconds.",
        }),
        Object.freeze({
          name: "Bleed",
          text: "Each hit opens a wound worth part of that hit. Only a few wounds fit on one target at once, so it rewards hitting hard rather than often.",
        }),
      ]),
    }),

    Object.freeze({
      id: "enemies",
      icon: "nav-bounties-v1.png",
      title: "Reading the forest",
      lede: "Most deaths come from one of these five, and all five telegraph.",
      entries: Object.freeze([
        Object.freeze({
          key: true,
          name: "Charges",
          text: "The boar aims down a straight line before it moves. Step out of the line, not away from it.",
        }),
        Object.freeze({
          name: "Nets",
          text: "The net slows you where it lands. Walk out of it rather than waiting for it to fade.",
        }),
        Object.freeze({
          name: "Brambles",
          text: "A circle marks the ground before thorns come up. Leave the circle.",
        }),
        Object.freeze({
          name: "Shields",
          text: "The shield covers the front only. Go around, or break it with five hits to the face.",
        }),
        Object.freeze({
          name: "Runners",
          text: "Some enemies never attack and only flee. Bringing one down before it escapes gives a bonus for the current stage.",
        }),
      ]),
    }),

    Object.freeze({
      id: "bosses",
      icon: "resource-boss-trophy-v3.png",
      title: "Bosses",
      lede: "Stages 5, 10 and 15.",
      entries: Object.freeze([
        Object.freeze({
          key: true,
          name: "Armour first",
          text: "A boss carries armour on top of its health, worth most of its health again. Damage does nothing to the health bar until the armour is gone.",
        }),
        Object.freeze({
          name: "Which boss you get is your own choice",
          text: "Boss Seeds decide who stands on stages 5 and 10, and which pattern the final boss uses. Changing seeds changes the run.",
        }),
        Object.freeze({
          name: "The last one gets up again",
          text: "The final boss has three phases, and the third begins with more health than it started with. Save whatever you have been holding.",
        }),
      ]),
    }),

    Object.freeze({
      id: "camp",
      icon: "nav-village-v1.png",
      title: "Between Hunts",
      lede: "What you keep when the run ends.",
      entries: Object.freeze([
        Object.freeze({
          key: true,
          name: "Buildings",
          text: "Raised on Plots and upgraded by rank. Their bonuses apply to every Hunt from then on.",
        }),
        Object.freeze({
          name: "Foundations",
          text: "One is chosen before each Hunt and lasts that Hunt only.",
        }),
        Object.freeze({
          name: "Equipment",
          text: "Five slots, five rarities. Rarity decides how many bonuses an item carries and how good the rolls can be: one on Common, four on Epic and Legendary.",
        }),
        Object.freeze({
          name: "Named Legendaries",
          text: "A Legendary carries a named effect on top of its bonuses, and almost every one of them breaks a rule in exchange for something. Read the drawback before equipping.",
        }),
        Object.freeze({
          name: "Pulls",
          text: "An Epic or better is guaranteed every ten pulls. A Legendary is guaranteed by the fiftieth, and the odds start climbing from the forty-first. Standard and Limited count separately.",
        }),
      ]),
    }),
  ]),
});
