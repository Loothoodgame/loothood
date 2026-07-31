/**
 * Server-side item catalogue.
 *
 * The main decision this file exists for: **the catalogue is never duplicated**.
 * The server imports the very same modules the client does —
 * frontend/js/equipment.js, equipment-legendary-v5.js and gacha-system.js —
 * and calls the very same functions.
 *
 * The temptation was to rewrite the rarity and pity tables on the server "the
 * proper way". That would have been a second truth about items, and it would
 * have diverged from the first one on the very first balance patch: 52
 * legendaries, five slots, the stat value ranges and the soft-pity thresholds
 * all live in the client and change together with the game. Two lists of the
 * same thing always drift apart; the only question is when.
 *
 * Wiring goes through globalThis rather than through export. The client modules
 * are written as a UMD wrapper: under Node they put themselves into
 * module.exports, in the browser into window. But package.json is marked
 * "type": "module", so .js files are read as ES modules, module.exports does not
 * exist there, and the module falls through into the second branch — globalThis.
 * That is where we pick it up from.
 *
 * Randomness comes from the OUTSIDE. createRandomStream in gacha-system.js has
 * no source of its own and throws once the values run out. That is not an
 * oversight, it is what the honesty of a draw rests on: the server first
 * publishes a commitment (a request together with the reveal moment), and only
 * afterwards discloses the secret the values were derived from. A player can
 * verify the draw themselves by running that same secret through that same
 * function.
 */
import { createHash, createHmac, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JS = path.join(HERE, "..", "frontend", "js");

let equipment = null;
let gacha = null;
let release = null;

/** Pull in the client modules once per process lifetime. */
export async function loadCatalogue() {
  if (equipment && gacha) return { equipment, gacha, release };
  const importClientModule = (name) => import(path.join(JS, name));
  await importClientModule("equipment-legendary-v5.js");
  await importClientModule("equipment-release.js");
  await importClientModule("equipment.js");
  await importClientModule("gacha-system.js");
  equipment = globalThis.LoothoodEquipment;
  gacha = globalThis.LoothoodGachaSystem || globalThis.LoothoodGacha;
  release = globalThis.LoothoodEquipmentRelease;
  if (!equipment) throw new Error("Equipment catalogue failed to load");
  if (!gacha) throw new Error("Gacha module failed to load");
  return { equipment, gacha, release };
}

/**
 * The legendaries that are allowed to drop from an ordinary pull at all.
 * We take the list from the client instead of writing it out here: the release
 * registry is what decides which effects have shipped.
 */
function standardLegendaryPool() {
  return equipment.legendaryEffects
    .filter((e) => e.implemented && release.isStandardGachaEffect(e.id))
    .map((e) => e.id);
}

/** Manifest of the ordinary pull. Versions are filled in from the catalogue itself. */
export function standardManifest() {
  return {
    id: "loothood-standard-pool",
    version: "1",
    tier: "standard",
    generatorVersion: equipment.generatorVersion,
    effectCatalogueVersion: equipment.catalogueVersion,
    allowedLegendaryEffectIds: standardLegendaryPool(),
  };
}

/**
 * Catalogue fingerprint. Crafting has neither a banner nor a pool, yet the
 * manifestHash field in the item's provenance is mandatory — and for good
 * reason: it shows which version of the generator and of the tables the item was
 * issued under. Across a balance patch this is the only way to tell an item of
 * the old issue from a new one.
 */
function catalogueFingerprint() {
  const versionLine = `${equipment.generatorVersion}:${equipment.catalogueVersion}`;
  return `hb-craft-${createHash("sha256").update(versionLine).digest("hex").slice(0, 8)}`;
}

/** Draw secret. Kept on the server until the reveal moment. */
export function newSecret() {
  return randomBytes(32).toString("hex");
}

/**
 * Random values derived from a secret. HMAC rather than Math.random: the result
 * must be reproducible from the secret by anyone, otherwise the draw cannot be
 * verified at all.
 *
 * We take them with a margin: a single pull consumes between one value (an
 * ordinary item) and four (a legendary with a slot and an effect roll), and the
 * stream throws if the values run out in the middle of a batch.
 */
export function randomValuesFromSecret(secret, count) {
  const needed = Math.max(16, count * 8);
  const values = [];
  let block = 0;
  while (values.length < needed) {
    const digest = createHmac("sha256", secret).update(`draw:${block}`).digest();
    for (let i = 0; i + 6 <= digest.length && values.length < needed; i += 6) {
      // six bytes -> integer below 2^48, divided by 2^48: value strictly in [0, 1)
      values.push(Number(digestToBigInt(digest, i)) / 281474976710656);
    }
    block += 1;
  }
  return values;
}

function digestToBigInt(buffer, offset) {
  let n = 0n;
  for (let i = 0; i < 6; i += 1) n = (n << 8n) | BigInt(buffer[offset + i]);
  return n;
}

/** Fingerprint of a secret. Published together with the request — this is the commitment. */
export function commitment(secret) {
  return createHash("sha256").update(secret).digest("hex");
}

/**
 * Resolve a batch of pulls. `lane` holds the account's pity counters as they
 * were before the draw. Returns the results and the counters after it.
 */
export function resolveDraw({ tier = "standard", count = 1, lane, requestId, secret }) {
  const manifest = standardManifest();
  const outcome = gacha.resolveDrawBatch({
    requestId,
    tier,
    count,
    manifest,
    lane,
    randomValues: randomValuesFromSecret(secret, count),
  });
  return {
    results: outcome.results.map((r) => ({
      rarity: r.rarity,
      slot: r.slot,
      item: r.item,
      salvageValue: r.salvageValue,
      pity: r.pity,
    })),
    lane: outcome.lane,
  };
}

/**
 * A single item of the given rarity and slot — for crafting out of scrap.
 *
 * WHY THE SOURCE IS FILLED IN COMPLETELY. This used to be just
 * `{ type: "scrap_craft" }`, and it was a silent breakage: the client verifier
 * demands five provenance fields on a crafted item — issuanceId, recipeId,
 * manifestHash, accountBound=true, marketplaceEligible=false — and without them
 * verifyEquipment rejects the item. Crafting still went through, the item landed
 * in the inventory and looked perfectly normal, yet any screen that verifies an
 * item first (the reforge workbench above all) silently refused to work with it.
 * The breakage produced neither an error nor a trace in the logs: the item was
 * simply not genuine.
 *
 * accountBound=true and marketplaceEligible=false are not our invention but a
 * rule from the client catalogue: crafted goods are not for sale. Otherwise
 * scrap turns into a printing press for the marketplace.
 */
export function craftItem({ rarity, slot = null, secret, requestId = "" }) {
  const params = {
    seed: createHmac("sha256", secret).update("craft").digest("hex"),
    source: {
      type: "scrap_craft",
      // Issue number. We use the request id — it is unique by construction; if
      // it was not passed in, we derive one from the secret so that the field is
      // never left empty.
      issuanceId: requestId || `craft:${commitment(secret).slice(0, 24)}`,
      recipeId: `scrap-${rarity}-${slot ? "exact" : "random"}`,
      manifestHash: catalogueFingerprint(),
      accountBound: true,
      marketplaceEligible: false,
    },
    rarity,
    generatorVersion: equipment.generatorVersion,
  };
  if (slot) params.slot = slot;
  if (rarity === "legendary") params.allowedLegendaryEffectIds = standardLegendaryPool();
  return slot
    ? equipment.generateEquipment(params)
    : equipment.generateRandomEquipment(params);
}

/**
 * Reforge: reroll part of an item's affixes while keeping the named ones.
 *
 * The client can roll EXACTLY ONE affix at a time — createRerollCandidate(item,
 * action, affixIndex, seed). The product, however, is sold as a batch: "reroll
 * everything except the two I picked". So the batch is assembled here as a chain
 * of single rerolls rather than as a second generator: every step passes the
 * client's verification, the item's reroll history stays truthful, and the
 * result is reproducible from the secret by anyone.
 *
 * The order of the steps is fixed (ascending by index) because every reroll
 * changes itemId and revision, and those feed into the randomness track. Swap
 * the steps around and you get a different item out of the same secret, and
 * verification stops adding up.
 *
 * The action is reforge, not temper: temper rerolls only the VALUE, keeping the
 * stat. A player who paid for a full reroll expects different stats, not the
 * same ones with smaller numbers.
 */
export function rerollAffixes({ item, preservedIndexes = [], secret }) {
  const check = equipment.verifyEquipment(item);
  if (!check.ok) throw new Error(`Source item fails verification: ${check.errors.join(" ")}`);
  const preserved = new Set(preservedIndexes.map((n) => Number(n)));
  const steps = item.affixes.map((_, i) => i).filter((i) => !preserved.has(i));
  if (!steps.length) throw new Error("A reforge with not a single rerollable affix is pointless");
  let current = JSON.parse(JSON.stringify(item));
  for (const index of steps) {
    const seed = createHmac("sha256", secret).update(`reforge:${index}`).digest("hex");
    current = equipment.createRerollCandidate(current, "reforge", index, seed).item;
  }
  return current;
}

/** A legendary effect by its id — needed to lay the pool out across the slots. */
export function legendaryEffectById(id) {
  return equipment.legendaryEffects.find((e) => e.id === id) || null;
}

export function scrapRecipes() {
  return gacha.SCRAP_RECIPES;
}

export function catalogueInfo() {
  return {
    generatorVersion: equipment.generatorVersion,
    effectCatalogueVersion: equipment.catalogueVersion,
    slots: equipment.slots.map((s) => s.id),
    rarities: equipment.rarities.map((r) => r.id),
    legendaryCount: equipment.legendaryEffects.length,
    standardPoolSize: standardLegendaryPool().length,
  };
}
