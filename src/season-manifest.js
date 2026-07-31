/**
 * The Season manifest — the thing every participant plays.
 *
 * WHY IT EXISTS AT ALL. A competitive run has to be identical for everyone: the
 * same pulses, the same bosses, the same randomness seeds. Otherwise comparing
 * scores is meaningless — somebody simply drew an easy layout. The manifest is
 * that shared layout, and its fingerprint is published before the Season starts
 * so that the layout cannot be swapped after the fact.
 *
 * WHERE THE CONTENT COMES FROM. Everything that can be derived from the rules is
 * derived from the rules instead of being written out: the list of stages, the
 * pulse sizes, the reinforcement configuration and the rules table all come from
 * competitive-run-core.js and forest-balance.js — the very modules the client
 * plays with. The only things that have to be chosen are the genuinely random
 * ones: three simulation seeds, the order of the two bosses and the composition
 * of every pulse. Those are derived deterministically from a SINGLE Season seed,
 * so the manifest can be rebuilt from the Season key by anyone, at any time.
 *
 * WHY WE DO NOT STORE IT WHOLE IN THE DATABASE. We could, and we do store the
 * fingerprint. But the manifest itself is better rebuilt: it is tied to the core
 * version, and a database row would outlive a balance patch and diverge from
 * what the client actually plays. The validateManifest check would then fail for
 * everybody at once, and the cause would look like "the server broke".
 */
import { createHash, createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JS = path.join(HERE, "..", "frontend", "js");

let CORE = null;
let FOREST = null;
let SHARED = null;

export async function loadRunCore() {
  if (CORE) return { CORE, FOREST };
  const importClientModule = (name) => import(path.join(JS, name));
  // The order is taken from index.html and matters literally: every next module
  // looks the previous ones up in globalThis and fails if they are not there.
  // Writing the order out "by meaning" is useless — the dependencies are not
  // visible from the file names.
  await importClientModule("boss-seeds.js");
  await importClientModule("boss-balance.js");
  await importClientModule("forest-balance.js");
  await importClientModule("run-relics.js");
  await importClientModule("continuous-reinforcement.js");
  await importClientModule("blood-hunt.js");
  await importClientModule("competitive-build-rules.js");
  await importClientModule("competitive-hunters-knot-rules.js");
  await importClientModule("competitive-iron-oath-rules.js");
  await importClientModule("competitive-blood-hunt-rules.js");
  await importClientModule("competitive-deep-root-rules.js");
  await importClientModule("competitive-phase-three-rules.js");
  await importClientModule("competitive-run-core.js");
  await importClientModule("competitive-run-session.js");
  // The shared verification maths. The same file is loaded by the "verify it
  // yourself" page in the browser — the server and the visitor both compute with
  // ONE piece of code, otherwise the promise "recompute it yourself" is worth
  // nothing.
  await importClientModule("verify-shared.js");
  SHARED = globalThis.LoothoodVerifyShared;
  CORE = globalThis.LoothoodCompetitiveRunCore;
  FOREST = globalThis.LoothoodForestBalance;
  if (!CORE) throw new Error("Competitive run core failed to load");
  if (!FOREST) throw new Error("Forest balance tables failed to load");
  return { CORE, FOREST };
}

export function runSessionModule() {
  return globalThis.LoothoodCompetitiveRunSession;
}

/**
 * A stream of integers derived from the Season seed. HMAC rather than
 * Math.random: the manifest must be rebuilt from the Season key exactly,
 * otherwise the fingerprint published before the start guarantees nothing.
 */
function intStream(seed, label) {
  let block = 0;
  let pending = [];
  return () => {
    if (!pending.length) {
      const digest = createHmac("sha256", seed).update(`${label}:${block}`).digest();
      block += 1;
      for (let i = 0; i + 4 <= digest.length; i += 4) pending.push(digest.readUInt32BE(i));
    }
    return pending.shift();
  };
}

function pick(list, next) {
  return list[next() % list.length];
}

/**
 * The composition of the pulses of one stage. The enemy type is picked by weight
 * from the stage's pool — the same weights the ordinary forest uses, so a Season
 * stage feels like a stage of the game rather than a separate mode.
 *
 * Banner captains are capped at one per stage — that is a rule of the core, not
 * a matter of taste: validateStagePlan rejects a second one.
 */
function buildPulses(stage, next) {
  const def = CORE.stageDef(stage);
  const sizes = FOREST.pulseSizes(stage, 0);
  const pool = def.enemyPool.map(([id, weight]) => ({ id, weight: Number(weight) || 1 }));
  const weightSum = pool.reduce((sum, entry) => sum + entry.weight, 0);
  const pulses = [];
  let bannerCaptains = 0;
  let spawned = 0;

  for (const size of sizes) {
    const pulse = [];
    for (let i = 0; i < size; i += 1) {
      let point = next() % weightSum;
      let chosen = pool[lastPoolIndex(pool)].id;
      for (const entry of pool) {
        if (point < entry.weight) { chosen = entry.id; break; }
        point -= entry.weight;
      }
      if (chosen === "bannerCaptain" && bannerCaptains >= 1) {
        // A second banner captain is forbidden by the rules. We take any other
        // enemy from the pool rather than skipping the spawn: the number of
        // bodies on a stage is fixed and has to add up.
        chosen = pool.find((entry) => entry.id !== "bannerCaptain")?.id || chosen;
      }
      if (chosen === "bannerCaptain") bannerCaptains += 1;
      pulse.push(chosen);
      spawned += 1;
    }
    pulses.push(pulse);
  }

  // The number of bodies on a stage is set by the stage definition, and the sum
  // of the pulse sizes may fail to match it if the tables drift apart. We top up
  // or trim the last pulse — the validator will check the total anyway.
  const required = def.enemyCount;
  while (spawned < required) {
    const ordinary = pool.find((entry) => entry.id !== "bannerCaptain")?.id || pool[0].id;
    pulses[pulses.length - 1].push(ordinary);
    spawned += 1;
  }
  while (spawned > required && pulses[pulses.length - 1].length > 1) {
    pulses[pulses.length - 1].pop();
    spawned -= 1;
  }
  return pulses;
}

function lastPoolIndex(pool) { return pool.length - 1; }

/** The reinforcement configuration is derived from the forest tables — we have none of our own. */
function reinforcement(stage) {
  const scheduler = FOREST.schedulerConfig(stage, 0);
  return {
    ageFloorTicks: Math.round(scheduler.ageFloor * CORE.TICK_RATE),
    livingThreshold: scheduler.livingThreshold,
    livingCap: scheduler.livingCap,
    // The field is called warningDuration, not warning. Getting the name wrong
    // yields NaN and an "Unexpected warningTicks" from the validator — with no
    // hint as to where exactly the typo is.
    warningTicks: Math.round(scheduler.warningDuration * CORE.TICK_RATE),
    zeroLivingWarningTicks: Math.round(scheduler.zeroLivingWarning * CORE.TICK_RATE),
  };
}

/** Four 32-bit seed words. */
function seedWordsFrom(next) {
  return [next(), next(), next(), next()];
}

/**
 * Build the Season manifest. seasonKey and gameBuild feed into the seed, so two
 * different Seasons will never get the same layout, while one and the same
 * Season is rebuilt byte for byte.
 */
export function buildSeasonManifest({ seasonKey, gameBuild }) {
  if (!CORE) throw new Error("Call loadRunCore() first");
  const seed = createHash("sha256").update(`loothood-season:${seasonKey}:${gameBuild}`).digest("hex");
  const nextShared = intStream(seed, "manifest");

  const bossOrder = [];
  const available = [...CORE.BOSS_SEED_IDS];
  while (bossOrder.length < 2) {
    const chosen = pick(available, nextShared);
    bossOrder.push(chosen);
    available.splice(available.indexOf(chosen), 1);
  }

  const stagePlans = [];
  for (let stage = 1; stage <= CORE.STAGE_COUNT; stage += 1) {
    if (CORE.ORDINARY_STAGES.includes(stage)) {
      stagePlans.push({
        stage,
        kind: "ordinary",
        planId: "LD-FR-V1-BR",
        pulses: buildPulses(stage, intStream(seed, `stage:${stage}`)),
        reinforcement: reinforcement(stage),
        bossSeedIds: [],
      });
      continue;
    }
    // The fifth and tenth stages get one boss each in the announced order, the
    // fifteenth gets both at once. That is a requirement of the core, not our
    // presentation choice.
    const seeds = stage === 15 ? [...bossOrder]
      : stage === 5 ? [bossOrder[0]]
        : stage === 10 ? [bossOrder[1]]
          : [bossOrder[0]];
    stagePlans.push({
      stage, kind: "boss", planId: "AUTHORED-BOSS-V1",
      pulses: [], reinforcement: null, bossSeedIds: seeds,
    });
  }

  const manifest = {
    coreVersion: CORE.CORE_VERSION,
    rulesetId: CORE.RULESET_ID,
    seasonId: String(seasonKey),
    gameBuild: String(gameBuild),
    tickRate: CORE.TICK_RATE,
    maxRunTicks: CORE.MAX_RUN_TICKS,
    simulationSeeds: {
      combat: seedWordsFrom(intStream(seed, "seed:combat")),
      rewards: seedWordsFrom(intStream(seed, "seed:rewards")),
      bosses: seedWordsFrom(intStream(seed, "seed:bosses")),
    },
    bossSeedOrder: bossOrder,
    stagePlans,
    rules: CORE.clone(CORE.DEFAULT_RULES),
    loadoutPolicy: CORE.clone(CORE.LOADOUT_POLICY),
    // ENDLESS SEASON MODE.
    //
    // Fifteen stages are described above one by one. Beyond that there is
    // nothing left to describe — there are infinitely many stages — so the
    // manifest carries not a list but a seed. The composition of any stage past
    // the threshold is derived from it deterministically, and derived
    // identically by the player, by the server during a recount, and by an
    // outsider checking somebody else's record.
    //
    // The seed is published together with the manifest before the Season starts,
    // so "we were unlucky with the layout on the forty-second" is not an
    // argument: the layout of the forty-second was predetermined before anybody
    // started playing at all.
    endless: {
      fromStage: CORE.ENDLESS_FROM,
      seedWords: seedWordsFrom(intStream(seed, "seed:endless")),
    },
    reviewPolicy: {
      simulatorScore: null,
      // The share of the theoretical ceiling above which a run goes to manual
      // review. 9500 out of 10000 — that is 95%: nobody hits that on live hands.
      nearCeilingBps: 9500,
      quarantineAutomationSignals: true,
    },
  };
  // The core's own validator. If a manifest does not pass it, it cannot be
  // played on anyway — better to fail here than in front of every player.
  CORE.validateManifest(manifest);
  return manifest;
}

/**
 * The canonical representation and the transcript assembly live in
 * frontend/js/verify-shared.js — the same file the "verify it yourself" page
 * loads. What is here is only a re-export: two copies of one piece of maths
 * would drift apart, and they would drift apart silently.
 */
export function canonicalJson(value) {
  return SHARED.canonicalJson(value);
}

export function manifestHash(manifest) {
  return `sha256:${createHash("sha256").update(canonicalJson(manifest)).digest("hex")}`;
}

export function transcriptFromPackets(packets) {
  return SHARED.transcriptFromPackets(packets, CORE.RUN_TRANSCRIPT_VERSION);
}

/** Replaying a run on the server. This is what verification is. */
export function replayAttempt({ manifest, packets, loadout }) {
  const transcript = transcriptFromPackets(packets);
  return { transcript, outcome: CORE.replayRun(manifest, transcript, loadout || CORE.FIXED_LOADOUT) };
}
