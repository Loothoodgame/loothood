(function (root) {
  "use strict";

  const score = {
    bpm: 88,
    stageBpms: {
      1: 100, 2: 100, 3: 100, 4: 108,
      5: 80,
      6: 104, 7: 104, 8: 104, 9: 112,
      10: 72,
      11: 108, 12: 108, 13: 108, 14: 116,
      15: 78,
    },
    stepsPerBeat: 2,
    stepsPerBar: 8,
    stepsPerSection: 16,
    totalSteps: 256,
    frameDrumSignature: [0, 3, 4, 6, 8, 11, 12, 14],
    frameDrumLayers: [
      [0, 8],
      [0, 4, 8, 12],
      [0, 3, 4, 8, 11, 12],
      [0, 3, 4, 6, 8, 11, 12, 14],
    ],
    themes: {
      village: {
        harmony: [[50, [0, 3, 7]], [48, [0, 4, 7]], [46, [0, 4, 7]], [45, [0, 4, 7]]],
        melody: [62, null, 65, null, 67, null, 65, null, 62, null, 60, null, 62, null, null, null],
        counter: null,
        drums: 0,
        urgency: 0,
      },
      greenwood: {
        harmony: [[50, [0, 3, 7]], [48, [0, 4, 7]], [46, [0, 4, 7]], [45, [0, 4, 7]]],
        melody: [62, null, 65, 67, 69, null, 67, 65, 62, null, 60, 62, 65, 64, 62, null],
        counter: [null, null, null, null, 69, null, 67, null, null, null, 65, null, 64, null, null, null],
        drums: 1,
        urgency: 0,
        identity: "journey",
      },
      wardenBoss: {
        harmony: [[50, [0, 3, 7]], [50, [0, 3, 7]], [46, [0, 4, 7]], [45, [0, 4, 7]]],
        melody: [62, null, null, 65, null, null, 67, null, 62, null, null, 58, null, null, 61, null],
        counter: null,
        drums: 3,
        urgency: 1,
        boss: "warden",
        identity: "percussion",
      },
      brambleRise: {
        harmony: [[50, [0, 3, 7]], [53, [0, 4, 7]], [48, [0, 4, 7]], [46, [0, 4, 7]], [50, [0, 3, 7]], [48, [0, 4, 7]], [53, [0, 4, 7]], [45, [0, 4, 7]]],
        melody: [65, null, 67, 69, 70, 69, 67, null, 65, 62, 60, null, 62, 65, 69, null],
        counter: [null, null, 62, null, null, null, 65, null, null, null, 60, null, null, null, 61, null],
        drums: 2,
        urgency: 1,
        identity: "journey",
      },
      sheriffBoss: {
        harmony: [[50, [0, 3, 7]], [46, [0, 4, 7]], [43, [0, 3, 7]], [45, [0, 4, 7]]],
        melody: [50, null, null, null, 53, null, 52, null, 50, null, null, null, 46, null, 49, null],
        counter: [null, null, 69, null, null, null, 70, null, null, null, 65, null, null, null, 61, null],
        drums: 3,
        urgency: 2,
        boss: "sheriff",
        identity: "counterpoint",
      },
      royalPursuit: {
        harmony: [[50, [0, 3, 7]], [48, [0, 4, 7]], [46, [0, 4, 7]], [45, [0, 4, 7]], [50, [0, 3, 7]], [43, [0, 3, 7]], [46, [0, 4, 7]], [45, [0, 4, 7]]],
        melody: [69, 67, 65, 67, 69, 72, 70, 69, 67, 65, 64, 61, 62, 65, 69, null],
        counter: [null, 62, null, 65, null, 67, null, 65, null, 60, null, 61, null, 62, null, 61],
        drums: 3,
        urgency: 3,
        identity: "journey",
      },
      finalConvergence: {
        harmony: [[50, [0, 3, 7]], [50, [0, 3, 7]], [46, [0, 4, 7]], [45, [0, 4, 7]], [50, [0, 3, 7]], [46, [0, 4, 7]], [43, [0, 3, 7]], [45, [0, 4, 7]]],
        melody: [62, null, null, 65, null, null, 67, null, 62, null, null, 58, null, null, 61, null],
        counter: null,
        sheriffCall: [50, null, null, null, 53, null, 52, null, 50, null, null, null, 46, null, 49, null],
        sheriffBell: [null, null, 69, null, null, null, 70, null, null, null, 65, null, null, null, 61, null],
        drums: 4,
        urgency: 3,
        boss: "final",
        identity: "convergence",
      },
    },
    soundtrackForStage(stage) {
      if (stage <= 0) return { id: "village", stage: 0, lift: 0 };
      if (stage <= 4) return { id: "greenwood", stage, lift: stage - 1 };
      if (stage === 5) return { id: "wardenBoss", stage, lift: 3 };
      if (stage <= 9) return { id: "brambleRise", stage, lift: stage - 6 };
      if (stage === 10) return { id: "sheriffBoss", stage, lift: 3 };
      if (stage <= 14) return { id: "royalPursuit", stage, lift: stage - 11 };
      return { id: "finalConvergence", stage: 15, lift: 3 };
    },
    tempoForStage(stage) {
      return this.stageBpms[stage] || this.bpm;
    },
  };

  root.LoothoodScore = score;
  if (typeof module !== "undefined" && module.exports) module.exports = score;
})(typeof window !== "undefined" ? window : globalThis);
