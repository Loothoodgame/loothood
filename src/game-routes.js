// LOOTHOOD — game data
// ---------------------------------------------------------------------------
// Before this module the backend did exactly two things: let you into an
// account and keep a save as a single JSON blob. Everything else answered with
// stubs full of empty arrays, and the inventory, mail, marketplace and season
// screens showed nothing — not because the player owned nothing, but because
// there was nobody to ask.
//
// Here those endpoints are wired to real tables. The split is simple: the blob
// in saves stays the personal progress of one player, while everything that
// crosses an account boundary or needs the server's word — owning an item,
// pity counters, mail, listings, season standings — lives in tables.

import { createHash } from "node:crypto";
import * as MANIFEST from "./season-manifest.js";
import { loadCatalogue, newSecret, commitment, resolveDraw, craftItem, scrapRecipes,
         standardManifest, legendaryEffectById, rerollAffixes } from "./catalogue.js";

const LEDGER_SCHEMA_VERSION = 4;      // the client checks this number strictly
// The helmet slot is called helmet, not helm. This used to say helm, and
// PUT /equipment/loadout/helmet answered 400 invalid_slot for every helmet:
// the client takes slot names from equipment.js, and there it is helmet. A
// one-letter typo made helmets unequippable.
const SLOTS = ["bowstring", "helmet", "chest", "boots", "legs"];
const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];

// Weekly bounty targets. They duplicate js/village-services.js: the server does
// not execute the client catalogue, but without a target a progress row is
// meaningless — "17" on its own says nothing about how close it is to done.
const WEEKLY_BOUNTY_GOALS = {
  "WB-01": 1, "WB-02": 4, "WB-03": 4, "WB-04": 4,
  "WB-05": 18, "WB-06": 6, "WB-07": 3000,
};

// Pity counters of the lane the pull runs on. We store them on the request
// rather than reading them at reveal time: between the request and the reveal
// the player can pull again, and the reveal would then be settled against
// somebody else's counters.
function pityCounters(ledgerRow, tier) {
  const lane = tier === "premium" ? "limited" : "standard";
  return {
    epicCounter: Number(ledgerRow[`pity_${lane}_epic`]) || 0,
    legendaryCounter: Number(ledgerRow[`pity_${lane}_legendary`]) || 0,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerGameRoutes(app, ctx) {
  const { query, pool, fail, requireCsrf, loadSession } = ctx;

  // ---- shared --------------------------------------------------------------

  // The ledger row is created on first use, not at registration: accounts exist
  // from the previous version, and catching them up with a migration costs more
  // than inserting the row the moment it is first needed.
  async function ensureLedger(accountId) {
    const { rows } = await query(
      `INSERT INTO gacha_state(account_id) VALUES ($1)
       ON CONFLICT (account_id) DO UPDATE SET account_id = EXCLUDED.account_id
       RETURNING *`, [accountId]);
    return rows[0];
  }

  function equipmentView(row) {
    return {
      assetId: row.asset_id,
      itemId: row.item_id,
      slot: row.slot,
      rarity: row.rarity,
      origin: row.origin,
      state: row.state,
      protected: row.protected,
      canonicalItem: row.canonical || {},
      acquiredAt: row.created_at,
    };
  }

  async function loadInventory(accountId) {
    const items = await query(
      `SELECT * FROM equipment
        WHERE account_id=$1 AND state <> 'salvaged'
        ORDER BY created_at DESC`, [accountId]);
    const loadoutRows = await query(
      "SELECT slot, asset_id FROM loadout WHERE account_id=$1 AND asset_id IS NOT NULL", [accountId]);
    const loadout = {};
    for (const row of loadoutRows.rows) loadout[row.slot] = row.asset_id;
    return { items: items.rows.map(equipmentView), loadout };
  }

  // Snapshot of protected value. The client validates it as a whole and shuts
  // the entire protocol down on a mismatch — so the shape is assembled here
  // once and reused by every response that returns it.
  async function ledgerSnapshot(account) {
    const ledger = await ensureLedger(account.id);
    const { items, loadout } = await loadInventory(account.id);
    const listed = items.filter((item) => item.state === "listed").length;
    return {
      schemaVersion: LEDGER_SCHEMA_VERSION,
      profileId: account.profile_id,
      ledgerRevision: Math.max(1, Number(ledger.ledger_revision) || 1),
      inventory: {
        capacity: Math.max(1, Number(ledger.inventory_capacity) || 240),
        count: items.length,
        reserved: listed,
        items,
      },
      loadout,
      tickets: {
        standard: { available: Number(ledger.standard_tickets) || 0 },
        limited: { available: Number(ledger.limited_tickets) || 0 },
      },
      scrap: { available: Number(ledger.scrap) || 0 },
      pity: {
        standard: {
          epicCounter: Number(ledger.pity_standard_epic) || 0,
          legendaryCounter: Number(ledger.pity_standard_legendary) || 0,
        },
        limited: {
          epicCounter: Number(ledger.pity_limited_epic) || 0,
          legendaryCounter: Number(ledger.pity_limited_legendary) || 0,
        },
      },
      // Unfinished requests. This used to be empty arrays, and a client that
      // reloaded the page mid-pull lost sight of it: tickets spent, no items,
      // nothing to continue from. Now it sees the request and carries it
      // through to the end itself.
      pendingDraws: await pendingDraws(account.id),
      pendingCrafts: await pendingCrafts(account.id),
      // Unresolved reforges. A player who left the page between paying and
      // deciding would otherwise lose the candidate: scrap spent, item
      // unchanged, nothing to offer. The client picks the attempt up from here.
      pendingRevisions: await pendingRevisions(account.id),

      // Pool manifest and operation flags. Without them the pull screen is
      // dead, and that is not a detail: with the protocol enabled the client
      // takes the legendary list ONLY from here (activeGachaManifest in
      // game.js), and the draw buttons require both the manifest and
      // operations.draws.<lane>.enabled at the same time.
      //
      // While the fields were missing, the spotlight said the pool was not
      // published, legendary icons disappeared, and Draw 1 and Draw 10 would
      // not press. I enabled the protocol, checked that the ledger loaded and
      // stopped there — I should have opened the screen itself.
      activeManifests: { standard: clientManifest() },
      operations: {
        draws: { standard: { enabled: true }, limited: { enabled: false } },
        scrapCrafting: { enabled: true },
        salvage: { enabled: true },
        protection: { enabled: true },
        loadout: { enabled: true },
        runLeases: { enabled: true },
        // Reforging is paid in scrap while there is no chain. The client reads
        // this price from here instead of writing its own: two price tables
        // drift apart at the first change, and the player sees one number while
        // another is charged.
        equipmentServices: { enabled: true, currency: "scrap", prices: reforgePriceTable() },
        marketplace: {
          enabled: true, currency: "scrap", feeDivisor: FEE_DIVISOR, maxPrice: MAX_PRICE,
          // 90 to the seller, 5 into the fire, 5 to the treasury for the prize.
          // The client shows these numbers to the player and does not derive
          // them itself.
          split: { sellerBps: 9000, burnBps: 500, treasuryBps: 500 },
        },
      },
      serverTimestamp: new Date().toISOString(),
    };
  }

  // The manifest in the shape activeGachaManifest reads it: legendaries laid
  // out BY SLOT, not as one list. The client glues them back into a flat list
  // afterwards, but it expects exactly this layout.
  function clientManifest() {
    const source = standardManifest();
    const bySlot = {};
    for (const id of source.allowedLegendaryEffectIds) {
      const effect = legendaryEffectById(id);
      const slot = effect?.compatibleSlots?.[0];
      if (!slot) continue;
      (bySlot[slot] ||= []).push(id);
    }
    return {
      key: source.id,
      manifestHash: `${source.id}-${source.version}-${source.effectCatalogueVersion}`,
      tier: "standard",
      opensAt: null,
      closesAt: null,
      content: { legendaryEffectsBySlot: bySlot },
    };
  }

  async function pendingDraws(accountId) {
    const { rows } = await query(
      `SELECT draw_request_id, tier, draw_count, available_at, commitment
         FROM gacha_draws WHERE account_id=$1 AND status='pending'
        ORDER BY created_at`, [accountId]);
    return rows.map((r) => ({
      drawRequestId: r.draw_request_id,
      tier: r.tier,
      drawCount: r.draw_count,
      randomness: { availableAt: r.available_at, commitment: r.commitment },
    }));
  }

  async function pendingCrafts(accountId) {
    const { rows } = await query(
      `SELECT craft_request_id, rarity, slot, available_at, commitment
         FROM equipment_crafts WHERE account_id=$1 AND status='pending'
        ORDER BY created_at`, [accountId]);
    return rows.map((r) => ({
      craftRequestId: r.craft_request_id,
      rarity: r.rarity,
      slot: r.slot,
      randomness: { availableAt: r.available_at, commitment: r.commitment },
    }));
  }

  async function bumpRevision(accountId) {
    await query(
      "UPDATE gacha_state SET ledger_revision = ledger_revision + 1, updated_at = now() WHERE account_id=$1",
      [accountId]);
  }

  // ---- protected value -----------------------------------------------------

  app.get("/api/v1/gacha/state", async (req, res) => {
    const s = await loadSession(req);
    if (!s) return fail(res, 401, "authentication_required", "Log in to continue.");
    try {
      res.json(await ledgerSnapshot(s.account));
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not load your inventory."); }
  });

  // ---- pulls ---------------------------------------------------------------
  //
  // Commit first, reveal later, and this is the one place worth explaining why.
  //
  // The request creates a secret but publishes only its fingerprint and the
  // moment from which the reveal is allowed. ALL the randomness of the draw is
  // derived from that secret. So the server cannot pick a result after the
  // fact: the fingerprint has already been named, and the secret cannot be
  // changed while keeping the same fingerprint. After the reveal the player
  // gets the secret and can run it through the same code the server ran — the
  // draw is checked, not taken on trust. This is exactly the place where lying
  // pays, and exactly why it is built this way instead of Math.random on the
  // server.
  //
  // Tickets are charged at request time, not at reveal. Otherwise a player who
  // saw a bad batch would simply never call settle.

  const REVEAL_DELAY_MS = 1500;

  function drawView(row, { secret = false } = {}) {
    const settled = row.status === "settled";
    return {
      drawRequestId: row.draw_request_id,
      tier: row.tier,
      drawCount: row.draw_count,
      status: row.status,
      randomness: {
        availableAt: row.available_at,
        commitment: row.commitment,
        ...(settled && secret ? { secret: row.secret } : {}),
      },
      results: settled ? row.results : [],
      createdAt: row.created_at,
      settledAt: row.settled_at,
    };
  }

  app.post("/api/v1/gacha/draws", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const tier = String(req.body?.tier || "standard");
    const count = Number(req.body?.drawCount || 1);
    if (!["standard", "premium"].includes(tier)) {
      return fail(res, 400, "invalid_input", "Unknown pull tier.");
    }
    if (!Number.isInteger(count) || count < 1 || count > 10) {
      return fail(res, 400, "invalid_input", "Pull count must be between 1 and 10.");
    }
    // The idempotency key IS the request id: repeating the same request has to
    // return the same request, not charge the tickets a second time.
    const idempotencyKey = String(req.get("idempotency-key") || "").trim();
    if (!idempotencyKey) return fail(res, 400, "invalid_input", "Idempotency key is required.");

    await ensureLedger(s.account.id);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        "SELECT * FROM gacha_draws WHERE draw_request_id=$1 AND account_id=$2", [idempotencyKey, s.account.id]);
      if (existing.rows[0]) {
        await client.query("COMMIT");
        client.release();
        return res.json(drawView(existing.rows[0]));
      }

      const ledgerRow = (await client.query(
        "SELECT * FROM gacha_state WHERE account_id=$1 FOR UPDATE", [s.account.id])).rows[0];
      const ticketColumn = tier === "premium" ? "limited_tickets" : "standard_tickets";
      if (Number(ledgerRow[ticketColumn]) < count) {
        throw Object.assign(new Error("tickets"), { http: 409, code: "insufficient_tickets" });
      }
      const usedSlots = (await client.query(
        "SELECT count(*)::int AS n FROM equipment WHERE account_id=$1 AND state <> 'salvaged'",
        [s.account.id])).rows[0].n;
      if (usedSlots + count > Number(ledgerRow.inventory_capacity)) {
        throw Object.assign(new Error("capacity"), { http: 409, code: "inventory_full" });
      }

      const secret = newSecret();
      await client.query(
        `UPDATE gacha_state SET ${ticketColumn} = ${ticketColumn} - $1, ledger_revision = ledger_revision + 1,
                updated_at = now() WHERE account_id=$2`, [count, s.account.id]);
      const { rows } = await client.query(
        `INSERT INTO gacha_draws
           (account_id, draw_request_id, tier, draw_count, status, pity_before,
            secret, commitment, available_at)
         VALUES ($1,$2,$3,$4,'pending',$5,$6,$7, now() + ($8 || ' milliseconds')::interval)
         RETURNING *`,
        [s.account.id, idempotencyKey, tier, count,
         JSON.stringify(pityCounters(ledgerRow, tier)),
         secret, commitment(secret), String(REVEAL_DELAY_MS)]);
      await client.query("COMMIT");
      client.release();
      return res.json(drawView(rows[0]));
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "That pull could not be started.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not start that pull.");
    }
  });

  app.get("/api/v1/gacha/draws/:drawRequestId", async (req, res) => {
    const s = await loadSession(req);
    if (!s) return fail(res, 401, "authentication_required", "Log in to continue.");
    try {
      const { rows } = await query(
        "SELECT * FROM gacha_draws WHERE draw_request_id=$1 AND account_id=$2",
        [String(req.params.drawRequestId || ""), s.account.id]);
      if (!rows[0]) return fail(res, 404, "draw_not_found", "That pull does not exist.");
      res.json(drawView(rows[0], { secret: true }));
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not load that pull."); }
  });

  app.post("/api/v1/gacha/draws/:drawRequestId/settle", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const requestId = String(req.params.drawRequestId || "");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT * FROM gacha_draws WHERE draw_request_id=$1 AND account_id=$2 FOR UPDATE",
        [requestId, s.account.id]);
      const draw = rows[0];
      if (!draw) throw Object.assign(new Error("missing"), { http: 404, code: "draw_not_found" });
      if (draw.status === "settled") {
        await client.query("COMMIT");
        client.release();
        return res.json(drawView(draw, { secret: true }));
      }
      if (new Date(draw.available_at).getTime() > Date.now()) {
        throw Object.assign(new Error("too_early"), { http: 409, code: "randomness_unavailable" });
      }

      const outcome = resolveDraw({
        tier: draw.tier,
        count: draw.draw_count,
        lane: draw.pity_before || { epicCounter: 0, legendaryCounter: 0 },
        requestId: draw.draw_request_id,
        secret: draw.secret,
      });

      const granted = [];
      for (const result of outcome.results) {
        const { rows: created } = await client.query(
          `INSERT INTO equipment (account_id, item_id, slot, rarity, origin, canonical)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [s.account.id, result.item.itemId, result.slot, result.rarity,
           draw.tier === "premium" ? "limited_gacha" : "standard_gacha",
           JSON.stringify(result.item)]);
        granted.push({ ...result, assetId: created[0].asset_id });
      }

      const lane = draw.tier === "premium" ? "limited" : "standard";
      await client.query(
        `UPDATE gacha_state
            SET pity_${lane}_epic = $1, pity_${lane}_legendary = $2,
                ledger_revision = ledger_revision + 1, updated_at = now()
          WHERE account_id=$3`,
        [outcome.lane.epicCounter, outcome.lane.legendaryCounter, s.account.id]);
      const { rows: settled } = await client.query(
        `UPDATE gacha_draws SET status='settled', results=$1, settled_at=now()
          WHERE draw_request_id=$2 RETURNING *`,
        [JSON.stringify(granted), requestId]);
      await client.query("COMMIT");
      client.release();
      return res.json(drawView(settled[0], { secret: true }));
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "That pull is not ready yet.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not settle that pull.");
    }
  });

  app.get("/api/v1/gacha/history", async (req, res) => {
    const s = await loadSession(req);
    if (!s) return fail(res, 401, "authentication_required", "Log in to continue.");
    try {
      const { rows } = await query(
        `SELECT draw_request_id, tier, draw_count, status, results, created_at, settled_at
           FROM gacha_draws WHERE account_id=$1 ORDER BY created_at DESC LIMIT 100`, [s.account.id]);
      res.json({ draws: rows.map((r) => ({
        drawRequestId: r.draw_request_id,
        tier: r.tier,
        drawCount: r.draw_count,
        status: r.status,
        results: r.results,
        createdAt: r.created_at,
        settledAt: r.settled_at,
      })) });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not load pull history."); }
  });

  // ---- equipment -----------------------------------------------------------

  app.get(/^\/api\/v1\/equipment\/?$/, async (req, res) => {
    const s = await loadSession(req);
    if (!s) return fail(res, 401, "authentication_required", "Log in to continue.");
    try {
      res.json(await loadInventory(s.account.id));
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not load equipment."); }
  });

  // Registered before /equipment/:assetId/..., otherwise "loadout" would be
  // parsed as an item id.
  app.put("/api/v1/equipment/loadout/:slot", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const slot = String(req.params.slot || "").toLowerCase();
    if (!SLOTS.includes(slot)) return fail(res, 400, "invalid_slot", "Unknown equipment slot.");
    const assetId = req.body?.equipmentAssetId ?? null;
    if (assetId !== null && !UUID_RE.test(String(assetId))) {
      return fail(res, 400, "invalid_input", "Equipment asset id is invalid.");
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Equipment cannot be rebuilt in the middle of a Hunt — neither equipped
      // nor unequipped. We check the lease rather than the item alone:
      // unequipping touches whatever already sits in the slot, and its asset_id
      // is not named in the request.
      if (await activeLease(s.account.id, client)) {
        throw Object.assign(new Error("run_active"), { http: 409, code: "equipment_leased" });
      }
      if (assetId) {
        const owned = await client.query(
          "SELECT * FROM equipment WHERE asset_id=$1 AND account_id=$2 FOR UPDATE",
          [assetId, s.account.id]);
        const item = owned.rows[0];
        if (!item) throw Object.assign(new Error("not_owned"), { http: 404, code: "equipment_not_found" });
        if (item.slot !== slot) throw Object.assign(new Error("wrong_slot"), { http: 409, code: "slot_mismatch" });
        // An item listed for sale cannot be equipped: otherwise it goes into
        // combat while still hanging as a listing, and the buyer pays for
        // something the seller keeps using.
        if (item.state === "listed") throw Object.assign(new Error("listed"), { http: 409, code: "equipment_listed" });
        if (item.state === "salvaged") throw Object.assign(new Error("gone"), { http: 409, code: "equipment_salvaged" });
      }
      // Unequip what was in the slot, and what this item might have occupied.
      await client.query(
        `UPDATE equipment SET state='inventory', updated_at=now()
          WHERE account_id=$1 AND state='equipped'
            AND asset_id IN (SELECT asset_id FROM loadout WHERE account_id=$1 AND slot=$2)`,
        [s.account.id, slot]);
      await client.query(
        `INSERT INTO loadout(account_id, slot, asset_id) VALUES ($1,$2,$3)
         ON CONFLICT (account_id, slot) DO UPDATE SET asset_id=$3, updated_at=now()`,
        [s.account.id, slot, assetId]);
      if (assetId) {
        await client.query(
          "UPDATE equipment SET state='equipped', updated_at=now() WHERE asset_id=$1", [assetId]);
      }
      await client.query(
        "UPDATE gacha_state SET ledger_revision = ledger_revision + 1, updated_at=now() WHERE account_id=$1",
        [s.account.id]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "That item cannot be equipped.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not change your loadout.");
    }
    client.release();
    try { res.json(await ledgerSnapshot(s.account)); }
    catch (e) { console.error(e); fail(res, 500, "server_error", "Loadout saved but the snapshot failed."); }
  });

  app.put("/api/v1/equipment/:assetId/protection", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const assetId = String(req.params.assetId || "");
    if (!UUID_RE.test(assetId)) return fail(res, 400, "invalid_input", "Equipment asset id is invalid.");
    try {
      const { rowCount } = await query(
        "UPDATE equipment SET protected=$1, updated_at=now() WHERE asset_id=$2 AND account_id=$3",
        [Boolean(req.body?.protected), assetId, s.account.id]);
      if (!rowCount) return fail(res, 404, "equipment_not_found", "That item is not in your inventory.");
      await bumpRevision(s.account.id);
      res.json(await ledgerSnapshot(s.account));
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not change protection."); }
  });

  // Salvaging an item. Salvage protection is not decoration: this is the only
  // irreversible operation in the inventory, and the confirmation is ticked in
  // advance, not at the moment the finger has already pressed.
  const SALVAGE_SCRAP = { common: 1, uncommon: 3, rare: 8, epic: 20, legendary: 60 };
  app.post("/api/v1/equipment/:assetId/salvage", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const assetId = String(req.params.assetId || "");
    if (!UUID_RE.test(assetId)) return fail(res, 400, "invalid_input", "Equipment asset id is invalid.");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT * FROM equipment WHERE asset_id=$1 AND account_id=$2 FOR UPDATE", [assetId, s.account.id]);
      const item = rows[0];
      if (!item) throw Object.assign(new Error("missing"), { http: 404, code: "equipment_not_found" });
      if (item.protected) throw Object.assign(new Error("protected"), { http: 409, code: "equipment_protected" });
      if (item.state === "listed") throw Object.assign(new Error("listed"), { http: 409, code: "equipment_listed" });
      if (item.state === "salvaged") throw Object.assign(new Error("gone"), { http: 409, code: "equipment_salvaged" });
      // An item that left on a Hunt is untouchable until it ends: otherwise the
      // player salvages the bow from another tab and finishes the run with it.
      if (item.leased_until && new Date(item.leased_until).getTime() > Date.now()) {
        throw Object.assign(new Error("leased"), { http: 409, code: "equipment_leased" });
      }
      await client.query("UPDATE equipment SET state='salvaged', updated_at=now() WHERE asset_id=$1", [assetId]);
      await client.query("UPDATE loadout SET asset_id=NULL, updated_at=now() WHERE account_id=$1 AND asset_id=$2",
        [s.account.id, assetId]);
      await client.query(
        `UPDATE gacha_state SET scrap = scrap + $1, ledger_revision = ledger_revision + 1, updated_at=now()
          WHERE account_id=$2`, [SALVAGE_SCRAP[item.rarity] || 1, s.account.id]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "That item cannot be salvaged.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not salvage that item.");
    }
    client.release();
    try { res.json(await ledgerSnapshot(s.account)); }
    catch (e) { console.error(e); fail(res, 500, "server_error", "Salvaged, but the snapshot failed."); }
  });

  // ---- crafting from scrap -------------------------------------------------
  //
  // Built the same way as pulls and for the same reason: commit, then reveal.
  // The only difference is that it is paid in scrap rather than a ticket, and
  // the player orders the rarity and the slot. Recipes come from the client
  // (SCRAP_RECIPES) so the price in the interface and the price on the server
  // cannot drift apart: "random" is any slot, "exact" is the named one.

  function craftView(row, { secret = false } = {}) {
    const settled = row.status === "settled";
    return {
      craftRequestId: row.craft_request_id,
      rarity: row.rarity,
      slot: row.slot,
      status: row.status,
      scrapSpent: row.scrap_spent,
      randomness: {
        availableAt: row.available_at,
        commitment: row.commitment,
        ...(settled && secret ? { secret: row.secret } : {}),
      },
      result: settled ? row.result : null,
      createdAt: row.created_at,
      settledAt: row.settled_at,
    };
  }

  app.post("/api/v1/equipment/crafts", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const rarity = String(req.body?.rarity || "");
    const slot = req.body?.slot ? String(req.body.slot) : null;
    const recipes = scrapRecipes();
    if (!recipes[rarity]) return fail(res, 400, "invalid_input", "That rarity cannot be crafted.");
    if (slot && !SLOTS.includes(slot)) return fail(res, 400, "invalid_slot", "Unknown equipment slot.");
    const price = slot ? recipes[rarity].exact : recipes[rarity].random;
    const idempotencyKey = String(req.get("idempotency-key") || "").trim();
    if (!idempotencyKey) return fail(res, 400, "invalid_input", "Idempotency key is required.");

    await ensureLedger(s.account.id);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        "SELECT * FROM equipment_crafts WHERE craft_request_id=$1 AND account_id=$2", [idempotencyKey, s.account.id]);
      if (existing.rows[0]) {
        await client.query("COMMIT"); client.release();
        return res.json(craftView(existing.rows[0]));
      }
      const ledgerRow = (await client.query(
        "SELECT * FROM gacha_state WHERE account_id=$1 FOR UPDATE", [s.account.id])).rows[0];
      if (Number(ledgerRow.scrap) < price) {
        throw Object.assign(new Error("scrap"), { http: 409, code: "insufficient_scrap" });
      }
      const usedSlots = (await client.query(
        "SELECT count(*)::int AS n FROM equipment WHERE account_id=$1 AND state <> 'salvaged'",
        [s.account.id])).rows[0].n;
      if (usedSlots + 1 > Number(ledgerRow.inventory_capacity)) {
        throw Object.assign(new Error("no_space"), { http: 409, code: "inventory_full" });
      }
      const secret = newSecret();
      await client.query(
        `UPDATE gacha_state SET scrap = scrap - $1, ledger_revision = ledger_revision + 1,
                updated_at = now() WHERE account_id=$2`, [price, s.account.id]);
      const { rows } = await client.query(
        `INSERT INTO equipment_crafts
           (account_id, craft_request_id, rarity, slot, scrap_spent, status,
            secret, commitment, available_at)
         VALUES ($1,$2,$3,$4,$5,'pending',$6,$7, now() + ($8 || ' milliseconds')::interval)
         RETURNING *`,
        [s.account.id, idempotencyKey, rarity, slot, price, secret, commitment(secret),
         String(REVEAL_DELAY_MS)]);
      await client.query("COMMIT"); client.release();
      return res.json(craftView(rows[0]));
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "That craft could not be started.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not start that craft.");
    }
  });

  app.get("/api/v1/equipment/crafts/:craftRequestId", async (req, res) => {
    const s = await loadSession(req);
    if (!s) return fail(res, 401, "authentication_required", "Log in to continue.");
    try {
      const { rows } = await query(
        "SELECT * FROM equipment_crafts WHERE craft_request_id=$1 AND account_id=$2",
        [String(req.params.craftRequestId || ""), s.account.id]);
      if (!rows[0]) return fail(res, 404, "craft_not_found", "That craft does not exist.");
      res.json(craftView(rows[0], { secret: true }));
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not load that craft."); }
  });

  app.post("/api/v1/equipment/crafts/:craftRequestId/settle", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const requestId = String(req.params.craftRequestId || "");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT * FROM equipment_crafts WHERE craft_request_id=$1 AND account_id=$2 FOR UPDATE",
        [requestId, s.account.id]);
      const craft = rows[0];
      if (!craft) throw Object.assign(new Error("missing"), { http: 404, code: "craft_not_found" });
      if (craft.status === "settled") {
        await client.query("COMMIT"); client.release();
        return res.json(craftView(craft, { secret: true }));
      }
      if (new Date(craft.available_at).getTime() > Date.now()) {
        throw Object.assign(new Error("too_early"), { http: 409, code: "randomness_unavailable" });
      }
      const item = craftItem({
        rarity: craft.rarity, slot: craft.slot, secret: craft.secret,
        requestId: craft.craft_request_id,
      });
      const { rows: created } = await client.query(
        `INSERT INTO equipment (account_id, item_id, slot, rarity, origin, canonical)
         VALUES ($1,$2,$3,$4,'scrap_craft',$5) RETURNING *`,
        [s.account.id, item.itemId, item.slot, item.rarity, JSON.stringify(item)]);
      await client.query(
        "UPDATE gacha_state SET ledger_revision = ledger_revision + 1, updated_at=now() WHERE account_id=$1",
        [s.account.id]);
      const { rows: settled } = await client.query(
        `UPDATE equipment_crafts SET status='settled', result=$1, settled_at=now()
          WHERE craft_request_id=$2 RETURNING *`,
        [JSON.stringify({ ...item, assetId: created[0].asset_id }), requestId]);
      await client.query("COMMIT"); client.release();
      return res.json(craftView(settled[0], { secret: true }));
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "That craft is not ready yet.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not settle that craft.");
    }
  });

  // ---- equipment leases for a Hunt -----------------------------------------
  //
  // A Hunt runs for minutes, and all that time the items taking part in it stay
  // ordinary inventory rows: they can be salvaged, listed or reforged from
  // another tab. The Hunt then finishes with equipment the player no longer
  // owns, and its result lands in the season table next to honest ones.
  //
  // The lease closes that with two moves at once:
  //   1. a SNAPSHOT of the equipped items is taken — that is what goes into
  //      combat. Even if an item is reforged afterwards, the Hunt stays scored
  //      against what the player started with;
  //   2. the items themselves are locked until the Hunt ends.
  //
  // The lease deadline is not decoration. A player who closes the tab in combat
  // releases nothing: the browser does not send the closing request. Without a
  // deadline such an inventory would freeze forever, and the only cure would be
  // a support ticket.
  const LEASE_HOURS = 6;

  // Item fingerprint. The client demands exactly 64 hexadecimal characters and
  // checks the record's fields against the item's own, so the fingerprint is
  // taken over the whole canonical item: swapping any affix along the way
  // changes the number.
  function itemFingerprint(canonical) {
    return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
  }

  async function activeLease(accountId, client = null) {
    const q = client ? client.query.bind(client) : query;
    const { rows } = await q(
      "SELECT * FROM run_leases WHERE account_id=$1 AND status='active' AND expires_at > now()", [accountId]);
    return rows[0] || null;
  }

  function leaseView(row) {
    return {
      leaseId: row.lease_id,
      clientRunKey: row.client_run_key,
      status: row.status,
      loadout: row.loadout,
      acquiredAt: row.acquired_at,
      expiresAt: row.expires_at,
      releasedAt: row.released_at,
    };
  }

  app.post("/api/v1/equipment/run-leases", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const runKey = String(req.body?.clientRunKey || "").trim();
    if (!runKey || runKey.length > 128) {
      return fail(res, 400, "invalid_input", "A client run key is required.");
    }
    await ensureLedger(s.account.id);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Expired leases are closed right here instead of waiting for a sweeper:
      // a player coming back a day later has to be able to start a Hunt at once.
      await client.query(
        `UPDATE run_leases SET status='expired', released_at=now()
          WHERE account_id=$1 AND status='active' AND expires_at < now()`, [s.account.id]);
      await client.query(
        "UPDATE equipment SET leased_until=NULL WHERE account_id=$1 AND leased_until < now()", [s.account.id]);

      // Same run key, same lease. The client repeats the request when the
      // connection drops, and that must not start a second Hunt.
      const existing = await client.query(
        "SELECT * FROM run_leases WHERE account_id=$1 AND client_run_key=$2", [s.account.id, runKey]);
      if (existing.rows[0]) {
        await client.query("COMMIT"); client.release();
        return res.json(leaseView(existing.rows[0]));
      }
      // Another lease still active means a Hunt the player abandoned by
      // reloading the tab: the browser does not send the closing request.
      // Refusing here is not an option. The player would see "equipment is
      // busy" and could not play until the deadline passed, having broken
      // nothing. Starting a new Hunt is itself evidence that the previous one
      // is over — so we close it as abandoned and release the items.
      const previousLease = await activeLease(s.account.id, client);
      if (previousLease) {
        const assetIds = (previousLease.loadout?.items || []).map((i) => i.assetId).filter(Boolean);
        if (assetIds.length) {
          await client.query(
            "UPDATE equipment SET leased_until=NULL, updated_at=now() WHERE asset_id = ANY($1::uuid[])", [assetIds]);
        }
        await client.query(
          "UPDATE run_leases SET status='abandon', released_at=now() WHERE lease_id=$1", [previousLease.lease_id]);
      }

      const equippedRows = await client.query(
        `SELECT e.* FROM loadout l
           JOIN equipment e ON e.asset_id = l.asset_id
          WHERE l.account_id=$1 AND e.account_id=$1 AND e.state='equipped'
          ORDER BY e.slot FOR UPDATE OF e`, [s.account.id]);

      const equipped = Object.fromEntries(SLOTS.map((slot) => [slot, null]));
      const items = [];
      for (const row of equippedRows.rows) {
        const canonical = row.canonical || {};
        // An empty canonical item is one issued before we started writing the
        // canonical form. It cannot go into a Hunt: the client rejects the whole
        // snapshot, and the player is left with no Hunt at all, not
        // understanding why.
        if (!canonical.itemId || !Array.isArray(canonical.affixes)) {
          throw Object.assign(new Error("canonical"), { http: 409, code: "equipment_unverifiable" });
        }
        equipped[row.slot] = canonical.itemId;
        items.push({
          assetId: row.asset_id,
          itemId: canonical.itemId,
          slot: row.slot,
          rarity: row.rarity,
          manifestHash: itemFingerprint(canonical),
          canonicalItem: canonical,
        });
      }

      const { rows } = await client.query(
        `INSERT INTO run_leases (account_id, client_run_key, status, loadout, expires_at)
         VALUES ($1,$2,'active',$3, now() + ($4 || ' hours')::interval) RETURNING *`,
        [s.account.id, runKey, JSON.stringify({ schemaVersion: 1, equipped, items }), String(LEASE_HOURS)]);
      if (items.length) {
        await client.query(
          `UPDATE equipment SET leased_until = now() + ($1 || ' hours')::interval, updated_at=now()
            WHERE asset_id = ANY($2::uuid[])`,
          [String(LEASE_HOURS), items.map((i) => i.assetId)]);
      }
      await client.query("COMMIT"); client.release();
      return res.json(leaseView(rows[0]));
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "Your equipment could not be secured for this Hunt.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not secure equipment for this Hunt.");
    }
  });

  app.post("/api/v1/equipment/run-leases/:leaseId/release", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const leaseId = String(req.params.leaseId || "");
    if (!UUID_RE.test(leaseId)) return fail(res, 400, "invalid_input", "Lease id is invalid.");
    // The outcome is the only thing the player reports about the Hunt. There
    // are exactly three words; anything else counts as an abandoned Hunt rather
    // than being taken on trust.
    const outcome = ["complete", "defeat", "abandon"].includes(String(req.body?.outcome))
      ? String(req.body.outcome) : "abandon";
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT * FROM run_leases WHERE lease_id=$1 AND account_id=$2 FOR UPDATE", [leaseId, s.account.id]);
      const lease = rows[0];
      if (!lease) throw Object.assign(new Error("missing"), { http: 404, code: "run_lease_not_found" });
      // Releasing twice is not an error: the client sends it both when the Hunt
      // ends and when the results window is closed.
      if (lease.status !== "active") {
        await client.query("COMMIT"); client.release();
        return res.json(leaseView(lease));
      }
      const assetIds = (lease.loadout?.items || []).map((i) => i.assetId).filter(Boolean);
      if (assetIds.length) {
        await client.query(
          "UPDATE equipment SET leased_until=NULL, updated_at=now() WHERE asset_id = ANY($1::uuid[])", [assetIds]);
      }
      const { rows: closed } = await client.query(
        "UPDATE run_leases SET status=$1, released_at=now() WHERE lease_id=$2 RETURNING *", [outcome, leaseId]);
      await client.query(
        "UPDATE gacha_state SET ledger_revision = ledger_revision + 1, updated_at=now() WHERE account_id=$1",
        [s.account.id]);
      await client.query("COMMIT"); client.release();
      return res.json(leaseView(closed[0]));
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "That Hunt lease could not be released.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not release that Hunt lease.");
    }
  });

  // ---- reforging -----------------------------------------------------------
  //
  // WHAT THE PLAYER PAYS WITH. In the original Loothood reforging is a paid
  // service in $HB: the client prepares a quote through
  // /chain/equipment-services/quote, signs the token transfer and only then
  // gets an attempt. We have no chain, and until one appears the only honest
  // currency is SCRAP: it is already produced by salvaging, already spent on
  // crafting, and reforging joins the same loop. When a wallet arrives, a
  // second way to pay will be added here, and all the mechanics below —
  // commitment, candidate, acceptance — will stay as they are.
  //
  // WHY TWO STEPS AND NOT ONE. Reforging does not "change the item", it OFFERS
  // a replacement. The original stays untouched until the player presses
  // accept — otherwise the player pays for the right to lose what they had.
  // Hence the two endings: accept swaps the item's canonical form for the
  // candidate, keep-original simply closes the attempt. The money is not
  // refunded either way: what was bought is an attempt, not a result.
  //
  // PRICE. The dollar ladder of the products is 1 : 5 : 15 : 40. We keep the
  // same ladder in scrap and take the base from the rarity. Preserving stats
  // costs more than a full reroll, and not out of greed: rerolling everything
  // except the three good ones is directed improvement, whereas a full reroll
  // is honestly random.
  const REFORGE_BASE_COST = { common: 3, uncommon: 6, rare: 12, epic: 25, legendary: 60 };
  const REFORGE_PRODUCTS = {
    full_reroll:    { multiplier: 1,  preserve: 0 },
    preserve_one:   { multiplier: 5,  preserve: 1 },
    preserve_two:   { multiplier: 15, preserve: 2 },
    preserve_three: { multiplier: 40, preserve: 3 },
  };

  function reforgePrice(rarity, product) {
    const base = REFORGE_BASE_COST[rarity];
    const spec = REFORGE_PRODUCTS[product];
    if (!base || !spec) return null;
    return base * spec.multiplier;
  }

  /** The whole price list at once — it goes into the snapshot so the client
   *  never has to compute a price itself. */
  function reforgePriceTable() {
    const table = {};
    for (const rarity of RARITIES) {
      table[rarity] = {};
      for (const product of Object.keys(REFORGE_PRODUCTS)) {
        table[rarity][product] = reforgePrice(rarity, product);
      }
    }
    return table;
  }

  function revisionView(row) {
    return {
      attemptId: row.attempt_id,
      equipmentAssetId: row.equipment_asset_id,
      product: row.product,
      preservedStatIndexes: row.preserved_indexes || [],
      scrapSpent: row.scrap_spent,
      status: row.status,
      originalItem: row.original_item || null,
      candidateItem: row.candidate_item || null,
      randomness: {
        availableAt: row.available_at,
        commitment: row.commitment,
        // The secret is revealed TOGETHER with the candidate, not earlier:
        // until that moment the commitment is not yet fulfilled, and knowing
        // the secret would let the player see the candidate before the server
        // had named it.
        ...(row.candidate_item ? { secret: row.secret } : {}),
      },
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    };
  }

  async function pendingRevisions(accountId) {
    const { rows } = await query(
      `SELECT * FROM equipment_revisions
        WHERE account_id=$1 AND status IN ('quoted','candidate_ready')
        ORDER BY created_at`, [accountId]);
    return rows.map(revisionView);
  }

  // The candidate is computed when the attempt is created rather than on a
  // timer: we have no confirmation chain, there is nothing to wait for, and
  // stretching the wait would be theatre. The commitment is real all the same —
  // the secret and its fingerprint stay on the record, and the player can
  // recompute the candidate themselves.
  app.post("/api/v1/equipment/revisions", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const assetId = String(req.body?.equipmentAssetId || "");
    const product = String(req.body?.product || "full_reroll");
    const preserved = Array.isArray(req.body?.preservedStatIndexes)
      ? [...new Set(req.body.preservedStatIndexes.map((n) => Number(n)))].sort((a, b) => a - b)
      : [];
    const idempotencyKey = String(req.get("idempotency-key") || "").trim();
    if (!UUID_RE.test(assetId)) return fail(res, 400, "invalid_input", "Equipment asset id is invalid.");
    if (!REFORGE_PRODUCTS[product]) return fail(res, 400, "invalid_product", "Unknown Equipment Service product.");
    if (!idempotencyKey) return fail(res, 400, "invalid_input", "Idempotency key is required.");
    if (preserved.length !== REFORGE_PRODUCTS[product].preserve) {
      return fail(res, 400, "invalid_input", "The number of preserved stats does not match the product.");
    }
    if (preserved.some((n) => !Number.isInteger(n) || n < 0)) {
      return fail(res, 400, "invalid_input", "Preserved stat indexes are invalid.");
    }

    await loadCatalogue();
    await ensureLedger(s.account.id);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        "SELECT * FROM equipment_revisions WHERE attempt_id=$1 AND account_id=$2", [idempotencyKey, s.account.id]);
      if (existing.rows[0]) {
        await client.query("COMMIT"); client.release();
        return res.json(revisionView(existing.rows[0]));
      }
      const { rows: assetRows } = await client.query(
        "SELECT * FROM equipment WHERE asset_id=$1 AND account_id=$2 FOR UPDATE", [assetId, s.account.id]);
      const item = assetRows[0];
      if (!item) throw Object.assign(new Error("missing"), { http: 404, code: "equipment_not_found" });
      if (item.state === "salvaged") throw Object.assign(new Error("salvaged"), { http: 409, code: "equipment_salvaged" });
      if (item.state === "listed") throw Object.assign(new Error("listed"), { http: 409, code: "equipment_listed" });
      if (item.leased_until && new Date(item.leased_until).getTime() > Date.now()) {
        throw Object.assign(new Error("leased"), { http: 409, code: "equipment_leased" });
      }
      const canonical = item.canonical || {};
      if (!canonical.itemId || !Array.isArray(canonical.affixes)) {
        throw Object.assign(new Error("canonical"), { http: 409, code: "equipment_unverifiable" });
      }
      if (preserved.some((n) => n >= canonical.affixes.length)) {
        throw Object.assign(new Error("bad_index"), { http: 400, code: "invalid_input" });
      }
      if (preserved.length >= canonical.affixes.length) {
        throw Object.assign(new Error("nothing_to_reroll"), { http: 400, code: "invalid_product" });
      }
      const openRevision = await client.query(
        `SELECT 1 FROM equipment_revisions
          WHERE equipment_asset_id=$1 AND status IN ('quoted','candidate_ready')`, [assetId]);
      if (openRevision.rows[0]) throw Object.assign(new Error("already_open"), { http: 409, code: "revision_in_progress" });

      const price = reforgePrice(item.rarity, product);
      const ledgerRow = (await client.query(
        "SELECT * FROM gacha_state WHERE account_id=$1 FOR UPDATE", [s.account.id])).rows[0];
      if (Number(ledgerRow.scrap) < price) {
        throw Object.assign(new Error("scrap"), { http: 409, code: "insufficient_scrap" });
      }

      const secret = newSecret();
      const candidate = rerollAffixes({ item: canonical, preservedIndexes: preserved, secret });
      await client.query(
        `UPDATE gacha_state SET scrap = scrap - $1, ledger_revision = ledger_revision + 1,
                updated_at=now() WHERE account_id=$2`, [price, s.account.id]);
      const { rows } = await client.query(
        `INSERT INTO equipment_revisions
           (attempt_id, account_id, equipment_asset_id, product, preserved_indexes, scrap_spent,
            status, original_item, candidate_item, secret, commitment, available_at)
         VALUES ($1,$2,$3,$4,$5,$6,'candidate_ready',$7,$8,$9,$10, now())
         RETURNING *`,
        [idempotencyKey, s.account.id, assetId, product, JSON.stringify(preserved), price,
         JSON.stringify(canonical), JSON.stringify(candidate), secret, commitment(secret)]);
      await client.query("COMMIT"); client.release();
      return res.json(revisionView(rows[0]));
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "That Equipment Service could not be started.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not start that Equipment Service.");
    }
  });

  app.get("/api/v1/equipment/revisions/:attemptId", async (req, res) => {
    const s = await loadSession(req);
    if (!s) return fail(res, 401, "authentication_required", "Log in to continue.");
    try {
      const { rows } = await query(
        "SELECT * FROM equipment_revisions WHERE attempt_id=$1 AND account_id=$2",
        [String(req.params.attemptId || ""), s.account.id]);
      if (!rows[0]) return fail(res, 404, "revision_not_found", "That Equipment Service does not exist.");
      res.json(revisionView(rows[0]));
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not load that Equipment Service."); }
  });

  app.post("/api/v1/equipment/revisions/:attemptId/accept", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const attemptId = String(req.params.attemptId || "");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT * FROM equipment_revisions WHERE attempt_id=$1 AND account_id=$2 FOR UPDATE",
        [attemptId, s.account.id]);
      const attempt = rows[0];
      if (!attempt) throw Object.assign(new Error("missing"), { http: 404, code: "revision_not_found" });
      if (attempt.status === "accepted") {
        await client.query("COMMIT"); client.release();
        return res.json({ ...revisionView(attempt), canonicalItem: attempt.candidate_item });
      }
      if (attempt.status !== "candidate_ready" || !attempt.candidate_item) {
        throw Object.assign(new Error("too_early"), { http: 409, code: "revision_not_ready" });
      }
      const { rows: assetRows } = await client.query(
        "SELECT * FROM equipment WHERE asset_id=$1 AND account_id=$2 FOR UPDATE",
        [attempt.equipment_asset_id, s.account.id]);
      const item = assetRows[0];
      if (!item) throw Object.assign(new Error("missing_item"), { http: 404, code: "equipment_not_found" });
      if (item.leased_until && new Date(item.leased_until).getTime() > Date.now()) {
        throw Object.assign(new Error("leased"), { http: 409, code: "equipment_leased" });
      }
      const candidate = attempt.candidate_item;
      // asset_id does not change — this is the same item, not a new one. What
      // changes is the canonical form and item_id: reforging re-derives the
      // model identifier from the affixes. If asset_id changed, the item would
      // lose its history and fall out of the loadout, out of listings and out
      // of anyone else's references to it.
      await client.query(
        "UPDATE equipment SET item_id=$1, canonical=$2, updated_at=now() WHERE asset_id=$3",
        [candidate.itemId, JSON.stringify(candidate), item.asset_id]);
      const { rows: closed } = await client.query(
        "UPDATE equipment_revisions SET status='accepted', resolved_at=now() WHERE attempt_id=$1 RETURNING *",
        [attemptId]);
      await client.query(
        "UPDATE gacha_state SET ledger_revision = ledger_revision + 1, updated_at=now() WHERE account_id=$1",
        [s.account.id]);
      await client.query("COMMIT"); client.release();
      return res.json({ ...revisionView(closed[0]), canonicalItem: candidate });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "That candidate could not be accepted.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not accept that candidate.");
    }
  });

  app.post("/api/v1/equipment/revisions/:attemptId/keep-original", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const attemptId = String(req.params.attemptId || "");
    try {
      const { rows } = await query(
        `UPDATE equipment_revisions SET status='kept_original', resolved_at=now()
          WHERE attempt_id=$1 AND account_id=$2 AND status IN ('quoted','candidate_ready')
          RETURNING *`, [attemptId, s.account.id]);
      if (!rows[0]) {
        const { rows: existing } = await query(
          "SELECT * FROM equipment_revisions WHERE attempt_id=$1 AND account_id=$2", [attemptId, s.account.id]);
        if (!existing[0]) return fail(res, 404, "revision_not_found", "That Equipment Service does not exist.");
        return res.json(revisionView(existing[0]));
      }
      await bumpRevision(s.account.id);
      res.json(revisionView(rows[0]));
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not close that Equipment Service."); }
  });

  // ---- mail ----------------------------------------------------------------

  function mailView(row) {
    const reward = row.reward || {};
    const hasReward = Number(reward.standardTickets) > 0 || Number(reward.limitedTickets) > 0;
    return {
      messageId: row.id,
      subject: row.subject,
      body: row.body,
      hasReward,
      reward,
      deliveredAt: row.delivered_at,
      readAt: row.read_at,
      claimedAt: row.claimed_at,
      archivedAt: row.archived_at,
    };
  }

  async function unreadCount(accountId) {
    const { rows } = await query(
      "SELECT count(*)::int AS n FROM mailbox WHERE account_id=$1 AND read_at IS NULL AND archived_at IS NULL",
      [accountId]);
    return rows[0].n;
  }

  app.get("/api/v1/mailbox", async (req, res) => {
    const s = await loadSession(req);
    if (!s) return fail(res, 401, "authentication_required", "Log in to continue.");
    const includeArchived = String(req.query.includeArchived || "") === "true";
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
    try {
      const { rows } = await query(
        `SELECT * FROM mailbox
          WHERE account_id=$1 ${includeArchived ? "" : "AND archived_at IS NULL"}
          ORDER BY delivered_at DESC LIMIT $2`, [s.account.id, limit]);
      res.json({ messages: rows.map(mailView), unreadCount: await unreadCount(s.account.id) });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not open the mailbox."); }
  });

  // The client reads the unreadCount field, not count — the badge on the tab
  // depends on exactly that one.
  app.get("/api/v1/mailbox/unread-count", async (req, res) => {
    const s = await loadSession(req);
    if (!s) return res.json({ unreadCount: 0 });
    try { res.json({ unreadCount: await unreadCount(s.account.id) }); }
    catch (e) { console.error(e); fail(res, 500, "server_error", "Could not count unread messages."); }
  });

  function mailId(req, res) {
    const id = String(req.params.id || "");
    if (!UUID_RE.test(id)) { fail(res, 400, "invalid_input", "System message ID is invalid."); return null; }
    return id;
  }

  app.post("/api/v1/mailbox/:id/read", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const id = mailId(req, res);
    if (!id) return;
    try {
      const { rows } = await query(
        `UPDATE mailbox SET read_at = COALESCE(read_at, now())
          WHERE id=$1 AND account_id=$2 RETURNING *`, [id, s.account.id]);
      if (!rows.length) return fail(res, 404, "message_not_found", "That message is no longer available.");
      res.json({ message: mailView(rows[0]), unreadCount: await unreadCount(s.account.id) });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not mark that message read."); }
  });

  app.post("/api/v1/mailbox/:id/archive", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const id = mailId(req, res);
    if (!id) return;
    try {
      // A message with an unclaimed reward is not archived: the gift would
      // disappear with it, and the player would have no way to learn of it.
      const { rows } = await query("SELECT * FROM mailbox WHERE id=$1 AND account_id=$2", [id, s.account.id]);
      const row = rows[0];
      if (!row) return fail(res, 404, "message_not_found", "That message is no longer available.");
      const reward = row.reward || {};
      const pending = (Number(reward.standardTickets) > 0 || Number(reward.limitedTickets) > 0) && !row.claimed_at;
      if (pending) return fail(res, 409, "reward_unclaimed", "Claim the attached reward before archiving.");
      await query("UPDATE mailbox SET archived_at=now(), read_at=COALESCE(read_at, now()) WHERE id=$1", [id]);
      res.json({ ok: true, unreadCount: await unreadCount(s.account.id) });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not archive that message."); }
  });

  // Claiming an attachment. The claimed_at IS NULL condition sits inside the
  // UPDATE itself rather than in a check before it: two simultaneous presses
  // would otherwise hand out the tickets twice.
  app.post("/api/v1/mailbox/:id/claim", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const id = mailId(req, res);
    if (!id) return;
    const client = await pool.connect();
    try {
      await ensureLedger(s.account.id);
      await client.query("BEGIN");
      const { rows } = await client.query(
        `UPDATE mailbox SET claimed_at=now(), read_at=COALESCE(read_at, now())
          WHERE id=$1 AND account_id=$2 AND claimed_at IS NULL
          RETURNING *`, [id, s.account.id]);
      if (!rows.length) throw Object.assign(new Error("claimed"), { http: 409, code: "reward_unavailable" });
      const reward = rows[0].reward || {};
      const standard = Math.max(0, Number(reward.standardTickets) || 0);
      const limited = Math.max(0, Number(reward.limitedTickets) || 0);
      const scrap = Math.max(0, Number(reward.scrap) || 0);
      if (!standard && !limited && !scrap) {
        throw Object.assign(new Error("empty"), { http: 409, code: "reward_unavailable" });
      }
      const updated = await client.query(
        `UPDATE gacha_state
            SET standard_tickets = standard_tickets + $1,
                limited_tickets  = limited_tickets  + $2,
                scrap            = scrap            + $3,
                ledger_revision  = ledger_revision  + 1,
                updated_at = now()
          WHERE account_id=$4 RETURNING *`, [standard, limited, scrap, s.account.id]);
      await client.query("COMMIT");
      client.release();
      const ledger = updated.rows[0];
      return res.json({
        claimedAt: rows[0].claimed_at,
        balances: {
          standardTickets: ledger.standard_tickets,
          limitedTickets: ledger.limited_tickets,
          scrap: ledger.scrap,
        },
        unreadCount: await unreadCount(s.account.id),
      });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "That reward is no longer available.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not claim that reward.");
    }
  });

  // ---- marketplace ---------------------------------------------------------

  function listingView(row) {
    return {
      listingId: row.listing_id,
      equipmentAssetId: row.equipment_asset_id,
      slot: row.slot,
      rarity: row.rarity,
      fixedUsdMicros: row.fixed_usd_micros === null ? null : String(row.fixed_usd_micros),
      priceScrap: row.price_scrap === null ? null : Number(row.price_scrap),
      fee: {
        totalScrap: Number(row.fee_scrap) || 0,
        burnedScrap: Number(row.burned_scrap) || 0,
        treasuryScrap: Number(row.treasury_scrap) || 0,
        sellerReceivesScrap: Math.max(0, (Number(row.price_scrap) || 0) - (Number(row.fee_scrap) || 0)),
      },
      status: row.status,
      listedAt: row.listed_at,
      seller: { playerId: row.seller_profile_id, displayName: row.seller_display_name },
      item: row.canonical || {},
    };
  }

  // ---- marketplace trading -------------------------------------------------
  //
  // WHAT IS PAID WITH. The marketplace was designed around on-chain money —
  // hence the prices in micro-dollars. There is no chain, and the game needs
  // item trading now. Of everything we have, only SCRAP fits: it lives on the
  // server, the client cannot draw it out of thin air, and it is already
  // produced by salvaging. The side effect is a pleasant one — salvaging an
  // item or listing it is now a real choice.
  //
  // THE FEE AND HOW IT IS SPLIT. A tenth of the sale is withheld, and it is
  // split IN HALF: one half burns forever, the other goes to the treasury.
  //
  // Burning is a sink. Without it player-to-player trading only moves scrap
  // around in a circle while the total keeps growing from salvaging alone,
  // until prices stop meaning anything. The treasury is the source of the
  // season prize pool: the prize has to come from somewhere, and better out of
  // the game's own circulation than out of the developer's pocket or out of new
  // issuance.
  //
  // The 90 / 5 / 5 split was not made up here — the original Loothood stands on
  // it, and changing it without a reason would mean parting ways with the
  // players who have already read those rules.
  //
  // WHAT CANNOT BE LISTED. Crafted items: their origin carries
  // marketplaceEligible=false, and that is a catalogue rule, not ours.
  // Otherwise scrap turns into a printing press — craft it, sell it, buy the
  // scrap back.
  const FEE_DIVISOR = 10;                   // one tenth of the price
  const MAX_PRICE = 1_000_000;

  /** Splitting the price into three shares. Computed in one place so that the
   *  seller, the buyer and the treasury never see different numbers. */
  function saleShares(price) {
    const fee = Math.floor(price / FEE_DIVISOR);
    // An odd unit of the fee goes to the fire rather than the treasury: burning
    // the extra unit is safer than crediting it to ourselves.
    const toTreasury = Math.floor(fee / 2);
    return { fee, burned: fee - toTreasury, toTreasury, toSeller: price - fee };
  }

  function isTradable(canonical) {
    return canonical?.source?.marketplaceEligible !== false && canonical?.source?.accountBound !== true;
  }

  app.post("/api/v1/marketplace/listings", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const assetId = String(req.body?.equipmentAssetId || "");
    const price = Math.trunc(Number(req.body?.priceScrap));
    if (!UUID_RE.test(assetId)) return fail(res, 400, "invalid_input", "Equipment asset id is invalid.");
    if (!Number.isFinite(price) || price < 1 || price > MAX_PRICE) {
      return fail(res, 400, "invalid_price", `Price must be between 1 and ${MAX_PRICE} scrap.`);
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT * FROM equipment WHERE asset_id=$1 AND account_id=$2 FOR UPDATE", [assetId, s.account.id]);
      const item = rows[0];
      if (!item) throw Object.assign(new Error("missing"), { http: 404, code: "equipment_not_found" });
      if (item.state !== "inventory") {
        throw Object.assign(new Error("unavailable"), { http: 409, code: "equipment_unavailable" });
      }
      if (item.leased_until && new Date(item.leased_until).getTime() > Date.now()) {
        throw Object.assign(new Error("leased"), { http: 409, code: "equipment_leased" });
      }
      if (!isTradable(item.canonical)) {
        throw Object.assign(new Error("account_bound"), { http: 409, code: "equipment_account_bound" });
      }
      const openRevision = await client.query(
        `SELECT 1 FROM equipment_revisions
          WHERE equipment_asset_id=$1 AND status IN ('quoted','candidate_ready')`, [assetId]);
      if (openRevision.rows[0]) throw Object.assign(new Error("revision_open"), { http: 409, code: "revision_in_progress" });

      const shares = saleShares(price);
      const { rows: listing } = await client.query(
        `INSERT INTO marketplace_listings
           (seller_account_id, equipment_asset_id, slot, rarity, price_scrap,
            fee_scrap, burned_scrap, treasury_scrap, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active') RETURNING *`,
        [s.account.id, assetId, item.slot, item.rarity, price, shares.fee, shares.burned, shares.toTreasury]);
      await client.query("UPDATE equipment SET state='listed', updated_at=now() WHERE asset_id=$1", [assetId]);
      await client.query(
        "UPDATE gacha_state SET ledger_revision = ledger_revision + 1, updated_at=now() WHERE account_id=$1",
        [s.account.id]);
      await client.query("COMMIT"); client.release();
      return res.json({ listing: listingView({ ...listing[0], canonical: item.canonical,
        seller_profile_id: s.account.profile_id, seller_display_name: s.account.display_name }) });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "That item could not be listed.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not list that item.");
    }
  });

  app.post("/api/v1/marketplace/listings/:listingId/cancel", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const listingId = String(req.params.listingId || "");
    if (!UUID_RE.test(listingId)) return fail(res, 400, "invalid_input", "Listing id is invalid.");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT * FROM marketplace_listings WHERE listing_id=$1 AND seller_account_id=$2 FOR UPDATE",
        [listingId, s.account.id]);
      const listing = rows[0];
      if (!listing) throw Object.assign(new Error("missing"), { http: 404, code: "listing_not_found" });
      if (listing.status !== "active") {
        throw Object.assign(new Error("closed"), { http: 409, code: "listing_closed" });
      }
      await client.query(
        "UPDATE marketplace_listings SET status='cancelled', cancelled_at=now() WHERE listing_id=$1", [listingId]);
      await client.query(
        "UPDATE equipment SET state='inventory', updated_at=now() WHERE asset_id=$1 AND account_id=$2",
        [listing.equipment_asset_id, s.account.id]);
      await client.query(
        "UPDATE gacha_state SET ledger_revision = ledger_revision + 1, updated_at=now() WHERE account_id=$1",
        [s.account.id]);
      await client.query("COMMIT"); client.release();
      return res.json({ ok: true, listingId });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "That listing could not be cancelled.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not cancel that listing.");
    }
  });

  app.post("/api/v1/marketplace/listings/:listingId/purchase", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const listingId = String(req.params.listingId || "");
    const idempotencyKey = String(req.get("idempotency-key") || "").trim();
    if (!UUID_RE.test(listingId)) return fail(res, 400, "invalid_input", "Listing id is invalid.");
    if (!idempotencyKey) return fail(res, 400, "invalid_input", "Idempotency key is required.");
    await ensureLedger(s.account.id);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Replay by idempotency key: a purchase is the only operation where a
      // double submit costs the player a second item and a second price.
      const existing = await client.query(
        "SELECT result FROM idempotency WHERE key=$1 AND account_id=$2", [idempotencyKey, s.account.id]);
      if (existing.rows[0]) {
        await client.query("COMMIT"); client.release();
        return res.json(existing.rows[0].result);
      }

      const { rows } = await client.query(
        "SELECT * FROM marketplace_listings WHERE listing_id=$1 FOR UPDATE", [listingId]);
      const listing = rows[0];
      if (!listing) throw Object.assign(new Error("missing"), { http: 404, code: "listing_not_found" });
      if (listing.status !== "active") throw Object.assign(new Error("closed"), { http: 409, code: "listing_closed" });
      if (listing.seller_account_id === s.account.id) {
        throw Object.assign(new Error("own_listing"), { http: 409, code: "own_listing" });
      }

      const price = Number(listing.price_scrap);
      if (!Number.isFinite(price) || price < 1) {
        throw Object.assign(new Error("unpriced"), { http: 409, code: "listing_unpriced" });
      }
      // The shares are taken FROM THE LISTING rather than recomputed: the split
      // rule may have changed after the listing was created, while the buyer
      // saw the price under the old rule.
      const fee = Number(listing.fee_scrap) || saleShares(price).fee;
      const burned = Number(listing.burned_scrap) || (fee - Math.floor(fee / 2));
      const toTreasury = Number(listing.treasury_scrap) || Math.floor(fee / 2);

      const ledgerRow = (await client.query(
        "SELECT * FROM gacha_state WHERE account_id=$1 FOR UPDATE", [s.account.id])).rows[0];
      if (Number(ledgerRow.scrap) < price) {
        throw Object.assign(new Error("scrap"), { http: 409, code: "insufficient_scrap" });
      }
      const usedSlots = (await client.query(
        "SELECT count(*)::int AS n FROM equipment WHERE account_id=$1 AND state <> 'salvaged'",
        [s.account.id])).rows[0].n;
      if (usedSlots + 1 > Number(ledgerRow.inventory_capacity)) {
        throw Object.assign(new Error("no_space"), { http: 409, code: "inventory_full" });
      }

      // The item CHANGES OWNER, it is not copied: the same asset_id, a
      // different account_id. This is exactly why items live in their own table
      // instead of inside the save — the seller's save and the buyer's save are
      // two separate records, and an item cannot lie in both.
      await client.query(
        "UPDATE equipment SET account_id=$1, state='inventory', protected=false, updated_at=now() WHERE asset_id=$2",
        [s.account.id, listing.equipment_asset_id]);
      // The seller may have had it in a slot — we clear the slot, otherwise it
      // points at an item they no longer own.
      await client.query(
        "UPDATE loadout SET asset_id=NULL, updated_at=now() WHERE asset_id=$1", [listing.equipment_asset_id]);
      await client.query(
        `UPDATE gacha_state SET scrap = scrap - $1, ledger_revision = ledger_revision + 1,
                updated_at=now() WHERE account_id=$2`, [price, s.account.id]);
      await client.query(
        `INSERT INTO gacha_state(account_id) VALUES ($1)
         ON CONFLICT (account_id) DO UPDATE SET account_id = EXCLUDED.account_id`, [listing.seller_account_id]);
      await client.query(
        `UPDATE gacha_state SET scrap = scrap + $1, ledger_revision = ledger_revision + 1,
                updated_at=now() WHERE account_id=$2`, [price - fee, listing.seller_account_id]);
      await client.query(
        "UPDATE marketplace_listings SET status='sold', buyer_account_id=$1, sold_at=now() WHERE listing_id=$2",
        [s.account.id, listingId]);
      // A letter for the seller. They are not in the game at that moment, and
      // without the letter the money just appears on the balance unexplained.
      await client.query(
        `INSERT INTO mailbox(account_id, subject, body)
         VALUES ($1, 'Your Marketplace listing sold', $2)`,
        [listing.seller_account_id,
         `Your ${listing.rarity} ${listing.slot} sold for ${price} scrap. Marketplace fee ${fee} (${burned} burned, ${toTreasury} to the prize treasury). You received ${price - fee}.`]);

      // The treasury is credited in the same transaction as the item transfer.
      // Done "later" by a separate query it would drift out of sync on any
      // failure, and the prize pool would stop matching the trade history.
      await client.query(
        `UPDATE treasury SET scrap = scrap + $1, burned_total = burned_total + $2,
                updated_at = now() WHERE id = 1`, [toTreasury, burned]);
      const result = { ok: true, listingId, priceScrap: price, feeScrap: fee,
        burnedScrap: burned, treasuryScrap: toTreasury,
        equipmentAssetId: listing.equipment_asset_id };
      await client.query(
        "INSERT INTO idempotency(key, account_id, result) VALUES ($1,$2,$3)",
        [idempotencyKey, s.account.id, JSON.stringify(result)]);
      await client.query("COMMIT"); client.release();
      return res.json(result);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "That purchase could not be completed.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not complete that purchase.");
    }
  });

  app.get("/api/v1/marketplace/listings", async (req, res) => {
    const s = await loadSession(req);
    if (!s) return fail(res, 401, "authentication_required", "Log in to continue.");
    const slot = String(req.query.slot || "").toLowerCase();
    const rarity = String(req.query.rarity || "").toLowerCase();
    const splitStats = (value) => String(value || "").split(",").map((v) => v.trim()).filter(Boolean);
    const includeStats = splitStats(req.query.includeStats);
    const excludeStats = splitStats(req.query.excludeStats);
    try {
      const params = [];
      const where = ["l.status='active'"];
      if (SLOTS.includes(slot)) { params.push(slot); where.push(`l.slot=$${params.length}`); }
      if (RARITIES.includes(rarity)) { params.push(rarity); where.push(`l.rarity=$${params.length}`); }
      const { rows } = await query(
        `SELECT l.*, e.canonical, a.profile_id AS seller_profile_id, a.display_name AS seller_display_name
           FROM marketplace_listings l
           JOIN equipment e ON e.asset_id = l.equipment_asset_id
           JOIN accounts  a ON a.id = l.seller_account_id
          WHERE ${where.join(" AND ")}
          ORDER BY l.listed_at DESC LIMIT 200`, params);
      // The stat filter is applied here rather than in SQL: affixes live inside
      // the item's JSON, and there is a handful of listings at launch. When
      // there are thousands, this is the first thing to move into a jsonb index.
      const listings = rows.map(listingView).filter((entry) => {
        const stats = (entry.item?.affixes || []).map((affix) => affix.statId);
        if (includeStats.length && !includeStats.every((stat) => stats.includes(stat))) return false;
        if (excludeStats.length && excludeStats.some((stat) => stats.includes(stat))) return false;
        return true;
      });
      res.json({ listings, nextCursor: null });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not load Marketplace listings."); }
  });

  app.get("/api/v1/marketplace/recipients/:playerId", async (req, res) => {
    const s = await loadSession(req);
    if (!s) return fail(res, 401, "authentication_required", "Log in to continue.");
    const playerId = String(req.params.playerId || "").trim();
    try {
      const { rows } = await query(
        `SELECT profile_id, display_name FROM accounts
          WHERE profile_id=$1 OR lower(username)=lower($1) LIMIT 1`, [playerId]);
      if (!rows.length) return fail(res, 404, "recipient_not_found", "No account matches that player ID.");
      res.json({ recipient: { playerId: rows[0].profile_id, displayName: rows[0].display_name } });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not resolve that recipient."); }
  });

  // ---- seasons -------------------------------------------------------------

  // The client parses a season without a single check: it takes the BigInt out
  // of the prize and maxRarity out of the rules directly. An empty field here
  // is an exception while rendering the whole screen, so anything missing is
  // filled in right here.
  function seasonView(row) {
    if (!row) return null;
    const prize = row.prize || {};
    const entry = row.entry || {};
    return {
      seasonKey: row.season_key,
      title: row.title,
      state: row.state,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      effectiveEndAt: row.effective_end_at || row.ends_at,
      entry: {
        paymentAsset: entry.paymentAsset || "ETH",
        priceWei: String(entry.priceWei || "0"),
        ...entry,
      },
      prize: {
        publishedWethWei: String(prize.publishedWethWei || "0"),
        splitBps: Array.isArray(prize.splitBps) ? prize.splitBps : [4000, 2000, 1500, 1000, 500, 500, 500],
        ...prize,
      },
      equipmentRules: { maxRarity: "epic", ...(row.equipment_rules || {}) },
      manifestPayload: { equipmentMode: "capped", prestigeTier: 0, ...(row.manifest_payload || {}) },
    };
  }

  async function currentSeasonRow() {
    const { rows } = await query(
      `SELECT * FROM seasons WHERE state <> 'draft'
        ORDER BY (state IN ('open','live')) DESC, COALESCE(starts_at, created_at) DESC LIMIT 1`);
    return rows[0] || null;
  }

  app.get("/api/v1/seasons/current", async (_req, res) => {
    try { res.json({ season: seasonView(await currentSeasonRow()) }); }
    catch (e) { console.error(e); fail(res, 500, "server_error", "Could not load the current Season."); }
  });

  // ---- run verifier --------------------------------------------------------
  //
  // WHY. The season score is the only number in the game that is paid for with
  // a prize. It cannot be accepted on the client's word: the player's browser
  // is entirely under their control, and "I scored a million" is
  // indistinguishable from the truth if there is nothing to check it against.
  //
  // HOW IT WORKS. A Hunt is not sent as a result, it is sent as a RECORDING:
  // input segments per tick, in chunks, as it goes. At the end the server
  // replays that recording on its side — with the same competitive-run-core.js
  // the client played with — and takes ITS OWN score. The submitted one is
  // compared against it only to tell whether the client lied or erred.
  //
  // WHY THE RECEIPTS ARE CHAINED. Every receipt carries the fingerprint of the
  // previous one. Rewriting the middle of a Hunt without rewriting everything
  // after it is impossible, and everything after it is already held both by the
  // player and by the server. The client, for its part, checks the chain on
  // every chunk and aborts the Hunt if the server returned a receipt from a
  // different history — so tampering is caught from both sides.
  //
  // WHAT IS NOT HERE. There is no trust in "claimedStateHash" and
  // "claimedScore": they are written onto the attempt as claimed values, but
  // only the recomputed one goes to the leaderboard.

  const PROTOCOL_VERSION = 3;
  const EMPTY_RECEIPT_HASH = `sha256:${"0".repeat(64)}`;

  function messageHash(value) {
    return `sha256:${createHash("sha256").update(MANIFEST.canonicalJson(value)).digest("hex")}`;
  }

  /** Assembling the season in the shape the client-side verifier understands. */
  async function verifierSeasonBundle() {
    const row = await currentSeasonRow();
    if (!row) return null;
    const { CORE } = await MANIFEST.loadRunCore();
    const gameBuild = String(row.manifest_payload?.gameBuild || "loothood-1");
    const manifest = MANIFEST.buildSeasonManifest({ seasonKey: row.season_key, gameBuild });
    const manifestHash = MANIFEST.manifestHash(manifest);
    return {
      row, manifest, manifestHash, CORE,
      response: {
        protocolVersion: PROTOCOL_VERSION,
        seasonId: manifest.seasonId,
        gameBuild: manifest.gameBuild,
        coreVersion: manifest.coreVersion,
        rulesetId: manifest.rulesetId,
        active: ["open", "live"].includes(row.state),
        season: seasonView(row),
        manifestEnvelope: { protocolVersion: PROTOCOL_VERSION, manifestHash, manifest },
      },
    };
  }

  app.get("/api/v1/verifier/season", async (_req, res) => {
    try {
      const bundle = await verifierSeasonBundle();
      if (!bundle) return fail(res, 404, "season_unavailable", "No Season is published yet.");
      res.json(bundle.response);
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not load the verifier season."); }
  });

  // ---- public verification -------------------------------------------------
  //
  // The game's promise is "do not trust us, check for yourself", and it is
  // worth exactly as much as the ability to do so. These three endpoints are
  // open WITHOUT signing in: a visitor takes the evidence and recomputes the
  // result in their own browser with the same code the server counted with.
  //
  // What we hand out and what we do not. We hand out everything needed for the
  // recomputation: seeds, secrets of already revealed pulls, the Hunt
  // recording, the season manifest. We hand out nothing that ties a result to a
  // person: no wallet, no mail, no internal account identifiers. The name shown
  // is the same one already visible on the leaderboard.
  //
  // The player shares the verification link themselves — by attempt or pull id.
  // Without the id nothing can be found: brute-forcing UUIDs is pointless.

  app.get("/api/v1/verify/seasons/:seasonKey/manifest", async (req, res) => {
    try {
      const seasonKey = String(req.params.seasonKey || "");
      const { rows } = await query("SELECT * FROM seasons WHERE season_key=$1", [seasonKey]);
      if (!rows[0]) return fail(res, 404, "season_not_found", "No such Season.");
      await MANIFEST.loadRunCore();
      const gameBuild = String(rows[0].manifest_payload?.gameBuild || "loothood-1");
      const manifest = MANIFEST.buildSeasonManifest({ seasonKey, gameBuild });
      // BEFORE THE SEASON OPENS WE HAND OUT THE FINGERPRINT ONLY.
      //
      // The same trick as with pulls: the commitment is published in advance,
      // the contents are revealed later. The fingerprint can be announced a
      // month ahead — the layout cannot be swapped after that, because it is
      // derived from the season key deterministically. Showing the layout
      // itself before the start is not allowed, though: whoever reads the wave
      // composition in advance arrives with a plan ready.
      //
      // After it opens there is nothing left to hide: the manifest goes to
      // every player who starts a Hunt anyway. That is when it becomes public —
      // for everyone at the same time.
      const sealed = rows[0].state === "draft";
      res.json({
        seasonKey, gameBuild, state: rows[0].state,
        sealed,
        opensAt: rows[0].starts_at,
        manifestHash: MANIFEST.manifestHash(manifest),
        manifest: sealed ? null : manifest,
      });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not load that manifest."); }
  });

  app.get("/api/v1/verify/attempts/:attemptId", async (req, res) => {
    try {
      const attemptId = String(req.params.attemptId || "");
      const { rows } = await query(
        `SELECT a.*, acc.display_name
           FROM verifier_attempts a JOIN accounts acc ON acc.id = a.account_id
          WHERE a.attempt_id=$1`, [attemptId]);
      const attempt = rows[0];
      if (!attempt) return fail(res, 404, "attempt_not_found", "No such attempt.");
      if (attempt.status !== "finalized") {
        return fail(res, 409, "attempt_not_finalized", "That attempt is not finished yet.");
      }
      const packetRows = await query(
        "SELECT packet_index, packet, packet_hash, receipt_hash FROM verifier_packets WHERE attempt_id=$1 ORDER BY packet_index",
        [attemptId]);
      await MANIFEST.loadRunCore();
      const { rows: seasonRows } = await query(
        "SELECT * FROM seasons WHERE season_key=$1", [attempt.season_key]);
      const gameBuild = String(seasonRows[0]?.manifest_payload?.gameBuild || "loothood-1");
      const manifest = MANIFEST.buildSeasonManifest({ seasonKey: attempt.season_key, gameBuild });
      res.json({
        attemptId,
        seasonKey: attempt.season_key,
        player: { displayName: attempt.display_name },
        // What the server declared. The visitor recomputes it and compares.
        declared: {
          verifiedScore: Number(attempt.verified_score || 0),
          stageReached: Number(attempt.stage_reached || 0),
          cleared: Boolean(attempt.cleared),
          claimedScore: Number(attempt.claimed_score || 0),
          finalReceiptHash: attempt.last_receipt_hash,
          finalizedAt: attempt.finalized_at,
        },
        // The whole of the evidence: manifest, equipment and the full recording.
        manifestHash: MANIFEST.manifestHash(manifest),
        declaredManifestHash: attempt.manifest_hash,
        manifest,
        loadout: attempt.loadout,
        packets: packetRows.rows.map((r) => r.packet),
        receipts: packetRows.rows.map((r) => ({
          packetIndex: r.packet_index, packetHash: r.packet_hash, receiptHash: r.receipt_hash,
        })),
      });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not load that attempt."); }
  });

  app.get("/api/v1/verify/draws/:drawRequestId", async (req, res) => {
    try {
      const { rows } = await query(
        "SELECT * FROM gacha_draws WHERE draw_request_id=$1", [String(req.params.drawRequestId || "")]);
      const draw = rows[0];
      if (!draw) return fail(res, 404, "draw_not_found", "No such pull.");
      if (draw.status !== "settled") {
        // The secret is not handed to anyone before the reveal, under any
        // circumstances — otherwise the commitment stops being a commitment.
        return fail(res, 409, "draw_not_settled", "That pull is not revealed yet.");
      }
      res.json({
        drawRequestId: draw.draw_request_id,
        tier: draw.tier,
        drawCount: draw.draw_count,
        // Pity counters AS OF THE REQUEST. Without them the recomputation does
        // not add up: soft pity shifts the probabilities, and between the
        // request and the reveal the player may have pulled again.
        pityBefore: draw.pity_before || { epicCounter: 0, legendaryCounter: 0 },
        randomness: {
          commitment: draw.commitment,
          secret: draw.secret,
          availableAt: draw.available_at,
          committedAt: draw.created_at,
          revealedAt: draw.settled_at,
        },
        results: (draw.results || []).map((r) => ({
          rarity: r.rarity, slot: r.slot, item: r.item, salvageValue: r.salvageValue,
        })),
      });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not load that pull."); }
  });

  app.post("/api/v1/verifier/attempts", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const idempotencyKey = String(req.get("idempotency-key") || "").trim();
    if (!idempotencyKey) return fail(res, 400, "invalid_input", "Idempotency key is required.");
    try {
      const bundle = await verifierSeasonBundle();
      if (!bundle) return fail(res, 404, "season_unavailable", "No Season is published yet.");
      if (!bundle.response.active) return fail(res, 409, "season_closed", "This Season is not accepting attempts.");

      // The season's equipment is fixed by the season rules rather than by the
      // inventory: in competitive mode everyone goes out in the same gear,
      // otherwise the scores are not comparable. We validate what was sent with
      // the same validator the client uses.
      const loadout = req.body?.loadout;
      try { bundle.CORE.validateFixedLoadout(loadout, bundle.manifest.loadoutPolicy); }
      catch (err) { return fail(res, 400, "ineligible_loadout", `Season loadout is not eligible: ${err.message}`); }

      // The entry ticket. It is bought separately and exists before the Hunt —
      // without it an attempt cannot reach the leaderboard.
      const entryTicket = await query(
        `SELECT * FROM season_entries
          WHERE season_key=$1 AND account_id=$2 AND status IN ('purchased','active')`,
        [bundle.row.season_key, s.account.id]);
      if (!entryTicket.rows[0]) return fail(res, 409, "entry_ticket_required", "Buy a Season Entry Ticket first.");

      const existing = await query(
        "SELECT * FROM verifier_attempts WHERE attempt_id=$1 AND account_id=$2",
        [attemptIdFromKey(idempotencyKey), s.account.id]);
      const attemptId = attemptIdFromKey(idempotencyKey);
      if (existing.rows[0]) return res.json({ ticket: attemptTicket(existing.rows[0], bundle) });

      const { rows } = await query(
        `INSERT INTO verifier_attempts
           (attempt_id, account_id, season_key, manifest_hash, loadout, wallet, entry_ticket_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [attemptId, s.account.id, bundle.row.season_key, bundle.manifestHash,
         JSON.stringify(loadout), req.body?.wallet || null, req.body?.entryTicketId || null]);
      await query(
        "UPDATE season_entries SET status='active', activated_at=COALESCE(activated_at, now()) WHERE id=$1",
        [entryTicket.rows[0].id]);
      res.json({ ticket: attemptTicket(rows[0], bundle) });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not issue a Season attempt."); }
  });

  // The client requires the attempt identifier to have the form
  // attempt_<12..128 characters from [A-Za-z0-9_-]>. The idempotency key
  // arrives arbitrary, so we take its fingerprint — which also keeps the
  // player's key from leaking back into their own response.
  function attemptIdFromKey(key) {
    return `attempt_${createHash("sha256").update(String(key)).digest("base64url").slice(0, 43)}`;
  }

  function attemptTicket(row, bundle) {
    return {
      attemptId: row.attempt_id,
      protocolVersion: PROTOCOL_VERSION,
      seasonId: bundle.manifest.seasonId,
      manifestHash: bundle.manifestHash,
      coreVersion: bundle.manifest.coreVersion,
      rulesetId: bundle.manifest.rulesetId,
      loadout: row.loadout,
      issuedAt: row.issued_at,
    };
  }

  app.post("/api/v1/verifier/attempts/:attemptId/packets", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const attemptId = String(req.params.attemptId || "");
    const packet = req.body?.packet;
    if (!packet || typeof packet !== "object") {
      return fail(res, 400, "invalid_packet", "Evidence packet is missing.");
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT * FROM verifier_attempts WHERE attempt_id=$1 AND account_id=$2 FOR UPDATE",
        [attemptId, s.account.id]);
      const attempt = rows[0];
      if (!attempt) throw Object.assign(new Error("missing"), { http: 404, code: "attempt_not_found" });
      if (attempt.status !== "issued") {
        throw Object.assign(new Error("closed"), { http: 409, code: "attempt_closed" });
      }

      // Chunks are accepted strictly in order. A hole in the recording would
      // mean a hole in the simulation: a Hunt cannot be replayed without its
      // middle.
      const index = Number(packet.packetIndex);
      if (index === attempt.packet_count - 1) {
        // A repeat of the last chunk is a resend after a dropped connection,
        // not an error. We return the same receipt, otherwise the client aborts
        // the Hunt.
        const existing = await client.query(
          "SELECT * FROM verifier_packets WHERE attempt_id=$1 AND packet_index=$2", [attemptId, index]);
        if (existing.rows[0] && existing.rows[0].packet_hash === packet.packetHash) {
          const previousReceipt = index === 0 ? EMPTY_RECEIPT_HASH
            : (await client.query("SELECT receipt_hash FROM verifier_packets WHERE attempt_id=$1 AND packet_index=$2",
              [attemptId, index - 1])).rows[0]?.receipt_hash;
          await client.query("COMMIT"); client.release();
          return res.json({ receipt: buildReceipt(attemptId, index, packet.packetHash, previousReceipt) });
        }
      }
      if (index !== attempt.packet_count) {
        throw Object.assign(new Error("out_of_order"), { http: 409, code: "packet_out_of_order" });
      }

      // The chunk fingerprint is recomputed. The client sent its own, but there
      // is no reason to trust it: if it does not match the contents, the chunk
      // was tampered with on the way or the client was built against a
      // different protocol.
      const { packetHash, ...body } = packet;
      if (messageHash(body) !== packetHash) {
        throw Object.assign(new Error("hash_mismatch"), { http: 400, code: "packet_hash_mismatch" });
      }
      if (Number(body.protocolVersion) !== PROTOCOL_VERSION || body.attemptId !== attemptId) {
        throw Object.assign(new Error("protocol_mismatch"), { http: 400, code: "packet_identity_mismatch" });
      }

      const previousReceipt = index === 0 ? EMPTY_RECEIPT_HASH : attempt.last_receipt_hash;
      const receipt = buildReceipt(attemptId, index, packetHash, previousReceipt);
      const receiptHash = messageHash(receipt);
      await client.query(
        `INSERT INTO verifier_packets (attempt_id, packet_index, packet, packet_hash, receipt_hash)
         VALUES ($1,$2,$3,$4,$5)`,
        [attemptId, index, JSON.stringify(packet), packetHash, receiptHash]);
      await client.query(
        "UPDATE verifier_attempts SET packet_count=$1, last_receipt_hash=$2 WHERE attempt_id=$3",
        [index + 1, receiptHash, attemptId]);
      await client.query("COMMIT"); client.release();
      return res.json({ receipt });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "That evidence packet was not accepted.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not secure that evidence packet.");
    }
  });

  // The receipt is kept minimal on purpose: the client hashes it with its own
  // canonicalisation, and that one rejects anything which is not a string, an
  // integer, a boolean or a plain object. A date in the receipt would break the
  // chain for everyone at once.
  function buildReceipt(attemptId, packetIndex, packetHash, previousReceiptHash) {
    return { attemptId, packetIndex, packetHash, previousReceiptHash };
  }

  app.post("/api/v1/verifier/attempts/:attemptId/finalize", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const attemptId = String(req.params.attemptId || "");
    try {
      const { rows } = await query(
        "SELECT * FROM verifier_attempts WHERE attempt_id=$1 AND account_id=$2", [attemptId, s.account.id]);
      const attempt = rows[0];
      if (!attempt) return fail(res, 404, "attempt_not_found", "That Season attempt does not exist.");
      if (attempt.status === "finalized") return res.json(attemptAttestation(attempt));
      if (attempt.status !== "issued") return fail(res, 409, "attempt_closed", "That Season attempt is closed.");
      if (String(req.body?.finalReceiptHash || "") !== (attempt.last_receipt_hash || EMPTY_RECEIPT_HASH)) {
        return fail(res, 409, "receipt_chain_mismatch", "The evidence chain does not match the server's.");
      }

      const bundle = await verifierSeasonBundle();
      if (!bundle || bundle.manifestHash !== attempt.manifest_hash) {
        return fail(res, 409, "season_manifest_changed", "The Season manifest changed during this attempt.");
      }
      const packetRows = await query(
        "SELECT packet FROM verifier_packets WHERE attempt_id=$1 ORDER BY packet_index", [attemptId]);

      let replay = null;
      let rejection = null;
      try {
        replay = MANIFEST.replayAttempt({
          manifest: bundle.manifest,
          packets: packetRows.rows.map((r) => r.packet),
          loadout: attempt.loadout,
        }).outcome;
      } catch (err) {
        // A recording that does not replay is not a "server error" but a
        // rejected Hunt. We keep the reason: it shows what exactly did not add
        // up if the player comes to argue.
        rejection = String(err.message || "replay_failed").slice(0, 300);
      }

      if (rejection) {
        await query(
          "UPDATE verifier_attempts SET status='rejected', reject_reason=$1, finalized_at=now() WHERE attempt_id=$2",
          [rejection, attemptId]);
        return fail(res, 422, "attempt_rejected", `The recorded run could not be verified: ${rejection}`);
      }

      // All three values are computed by the core itself and returned in the
      // replay result. Here they are only carried across — deriving them again
      // would create a second truth about what "cleared" and "counts for the
      // leaderboard" mean.
      const score = Math.max(0, Math.trunc(Number(replay.totalScore) || 0));
      const stage = Number(replay.stagesCleared) || 0;
      const cleared = Boolean(replay.consumesEntryTicket);
      const leaderboardEligible = Boolean(replay.leaderboardEligible);
      const activeTimeMs = Math.round((Number(replay.totalActiveTicks) || 0) / bundle.CORE.TICK_RATE * 1000);
      const { rows: finalized } = await query(
        `UPDATE verifier_attempts
            SET status='finalized', verified_score=$1, claimed_score=$2, stage_reached=$3,
                cleared=$4, finalized_at=now()
          WHERE attempt_id=$5 RETURNING *`,
        [score, Math.trunc(Number(req.body?.claimedScore) || 0), stage, cleared, attemptId]);

      // The RECOMPUTED value goes to the leaderboard. Best result of the season
      // per account: a worse attempt must not overwrite the previous one.
      if (leaderboardEligible) {
        await query(
          `INSERT INTO season_scores (season_key, account_id, verified_score, active_time_ms, stage_reached)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (season_key, account_id) DO UPDATE
             SET verified_score = GREATEST(season_scores.verified_score, EXCLUDED.verified_score),
                 stage_reached  = GREATEST(season_scores.stage_reached,  EXCLUDED.stage_reached),
                 active_time_ms = CASE WHEN EXCLUDED.verified_score > season_scores.verified_score
                                       THEN EXCLUDED.active_time_ms ELSE season_scores.active_time_ms END,
                 locked_at = now()`,
          [attempt.season_key, s.account.id, score, activeTimeMs, stage]);
      }
      if (cleared) {
        await query(
          "UPDATE season_entries SET status='completed', completed_at=now() WHERE season_key=$1 AND account_id=$2",
          [attempt.season_key, s.account.id]);
      }
      res.json(attemptAttestation(finalized[0]));
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not finalize that Season attempt."); }
  });

  function attemptAttestation(row) {
    return {
      attestation: {
        attemptId: row.attempt_id,
        seasonId: row.season_key,
        cleared: Boolean(row.cleared),
        verifiedScore: Number(row.verified_score || 0),
        stageReached: Number(row.stage_reached || 0),
        packetCount: Number(row.packet_count || 0),
        finalReceiptHash: row.last_receipt_hash || EMPTY_RECEIPT_HASH,
        finalizedAt: row.finalized_at,
      },
      // What the client claimed is kept and shown next to the recomputed value.
      // A discrepancy is no reason to hide it: it is useful for the player to
      // see what the server counted itself, and useful for a disputed Hunt to
      // leave a trace.
      claimedScore: Number(row.claimed_score || 0),
      scoreMatchesClaim: Number(row.claimed_score || 0) === Number(row.verified_score || 0),
    };
  }

  app.get("/api/v1/seasons/me", async (req, res) => {
    const s = await loadSession(req);
    if (!s) return fail(res, 401, "authentication_required", "Log in to continue.");
    try {
      const tickets = await query(
        `SELECT season_key, status, controller_wallet, purchased_at, activated_at, completed_at
           FROM season_entries WHERE account_id=$1 ORDER BY purchased_at DESC`, [s.account.id]);
      const scores = await query(
        `SELECT season_key, verified_score, active_time_ms, stage_reached, locked_at
           FROM season_scores WHERE account_id=$1 ORDER BY locked_at DESC`, [s.account.id]);
      const mapped = {
        tickets: tickets.rows.map((r) => ({
          seasonKey: r.season_key,
          status: r.status,
          controllerWallet: r.controller_wallet,
          purchasedAt: r.purchased_at,
          activatedAt: r.activated_at,
          completedAt: r.completed_at,
        })),
        scores: scores.rows.map((r) => ({
          seasonKey: r.season_key,
          verifiedScore: Number(r.verified_score),
          activeTimeMs: Number(r.active_time_ms),
          stageReached: r.stage_reached,
          lockedAt: r.locked_at,
        })),
      };
      // entry and best stay here for older code that read them directly.
      res.json({ ...mapped, entry: mapped.tickets[0] || null, best: mapped.scores[0] || null });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not load your Season standing."); }
  });

  // Ranking: more points first, ties broken by whoever finished faster.
  app.get("/api/v1/seasons/:seasonKey/leaderboard", async (req, res) => {
    const seasonKey = String(req.params.seasonKey || "");
    try {
      const { rows } = await query(
        `SELECT s.verified_score, s.active_time_ms, s.stage_reached, s.locked_at,
                a.profile_id, a.display_name
           FROM season_scores s JOIN accounts a ON a.id = s.account_id
          WHERE s.season_key=$1
          ORDER BY s.verified_score DESC, s.active_time_ms ASC LIMIT 100`, [seasonKey]);
      res.json({
        seasonKey,
        entries: rows.map((r, index) => ({
          rank: index + 1,
          verifiedScore: Number(r.verified_score),
          activeTimeMs: Number(r.active_time_ms),
          stageReached: r.stage_reached,
          lockedAt: r.locked_at,
          player: { playerId: r.profile_id, displayName: r.display_name, wallet: "Protected" },
        })),
      });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not load the leaderboard."); }
  });

  // ---- bounties ------------------------------------------------------------

  app.get("/api/v1/bounties", async (req, res) => {
    const s = await loadSession(req);
    if (!s) return fail(res, 401, "authentication_required", "Log in to continue.");
    const periodKey = String(req.query.periodKey || "").trim();
    try {
      const params = [s.account.id];
      let filter = "";
      if (periodKey) { params.push(periodKey); filter = " AND period_key=$2"; }
      const { rows } = await query(
        `SELECT * FROM bounty_progress WHERE account_id=$1${filter}
          ORDER BY period_key DESC, bounty_id ASC LIMIT 200`, params);
      res.json({ bounties: rows.map((r) => ({
        bountyId: r.bounty_id,
        periodKey: r.period_key,
        progress: r.progress,
        target: r.target,
        completedAt: r.completed_at,
        claimedAt: r.claimed_at,
      })) });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not load bounty progress."); }
  });

  app.post("/api/v1/bounties/progress", async (req, res) => {
    const s = await requireCsrf(req, res);
    if (!s) return;
    const entries = Array.isArray(req.body?.bounties) ? req.body.bounties : null;
    const periodKey = String(req.body?.periodKey || "").trim();
    if (!entries || !periodKey) {
      return fail(res, 400, "invalid_input", "periodKey and a bounties array are required.");
    }
    try {
      await upsertBountyProgress(s.account.id, periodKey, entries);
      res.json({ ok: true, stored: entries.length });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not record bounty progress."); }
  });

  // Progress only grows. The client is the only one counting combat, but it can
  // also send a stale snapshot after a tab switch; GREATEST makes the record
  // insensitive to delivery order.
  async function upsertBountyProgress(accountId, periodKey, entries) {
    for (const entry of entries) {
      const bountyId = String(entry?.bountyId || entry?.id || "").trim();
      if (!bountyId) continue;
      const progress = Math.max(0, Math.trunc(Number(entry.progress) || 0));
      const target = Math.max(1, Math.trunc(Number(entry.target) || WEEKLY_BOUNTY_GOALS[bountyId] || 1));
      const completed = progress >= target;
      await query(
        `INSERT INTO bounty_progress(account_id, bounty_id, period_key, progress, target, completed_at)
         VALUES ($1,$2,$3,$4,$5, CASE WHEN $6 THEN now() ELSE NULL END)
         ON CONFLICT (account_id, bounty_id, period_key) DO UPDATE
           SET progress = GREATEST(bounty_progress.progress, EXCLUDED.progress),
               target = EXCLUDED.target,
               completed_at = COALESCE(bounty_progress.completed_at,
                 CASE WHEN GREATEST(bounty_progress.progress, EXCLUDED.progress) >= EXCLUDED.target
                      THEN now() ELSE NULL END),
               updated_at = now()`,
        [accountId, bountyId, periodKey, progress, target, completed]);
    }
  }

  // Mirror of the weekly bounties from the save. The client knows nothing about
  // this table and does not need changing for its sake: it already sends the
  // whole snapshot on every save, and the weekly board sits inside it ready.
  async function mirrorWeeklyBounties(accountId, save) {
    const weekly = save?.weeklyBounties;
    const cycleId = String(weekly?.cycleId || "").trim();
    if (!cycleId || !Array.isArray(weekly?.objectives)) return;
    await upsertBountyProgress(accountId, cycleId, weekly.objectives.map((objective) => ({
      bountyId: objective?.id,
      progress: objective?.progress,
      target: WEEKLY_BOUNTY_GOALS[objective?.id],
    })));
  }

  // ---- service operations --------------------------------------------------
  // Mail, gifts and publishing a season are not done by players. Until there is
  // a separate admin panel there is one way in: a header with a token from an
  // environment variable. If the variable is unset the branch is simply off —
  // an empty token must not mean "let everyone in".

  function admin(req, res) {
    const token = process.env.ADMIN_TOKEN;
    if (!token) { fail(res, 501, "admin_disabled", "Admin operations are disabled."); return false; }
    if (req.get("x-loothood-admin") !== token) {
      fail(res, 403, "admin_forbidden", "Admin token missing or invalid.");
      return false;
    }
    return true;
  }

  async function resolveAccount(target) {
    const value = String(target || "").trim();
    if (!value) return null;
    const { rows } = await query(
      "SELECT * FROM accounts WHERE profile_id=$1 OR lower(username)=lower($1) LIMIT 1", [value]);
    return rows[0] || null;
  }

  // Bug reports. Without this endpoint they fell into the database and stayed
  // there: the player can write to it, but nobody could read it.
  app.get("/api/v1/admin/bug-reports", async (req, res) => {
    if (!admin(req, res)) return;
    const status = String(req.query.status || "").trim();
    try {
      const { rows } = await query(
        `SELECT b.*, a.profile_id, a.display_name
           FROM bug_reports b LEFT JOIN accounts a ON a.id = b.account_id
          WHERE ($1 = '' OR b.status = $1)
          ORDER BY b.created_at DESC LIMIT 200`, [status]);
      res.json({
        reports: rows.map((r) => ({
          reportId: r.report_id,
          category: r.category,
          summary: r.summary,
          description: r.description,
          context: r.context,
          status: r.status,
          createdAt: r.created_at,
          player: r.profile_id ? { playerId: r.profile_id, displayName: r.display_name } : null,
        })),
      });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not load bug reports."); }
  });

  app.post("/api/v1/admin/bug-reports/:reportId/status", async (req, res) => {
    if (!admin(req, res)) return;
    const status = String(req.body?.status || "");
    if (!["new", "triaged", "fixed", "wontfix"].includes(status)) {
      return fail(res, 400, "invalid_input", "Unknown report status.");
    }
    try {
      const { rowCount } = await query(
        "UPDATE bug_reports SET status=$1 WHERE report_id=$2", [status, String(req.params.reportId || "")]);
      if (!rowCount) return fail(res, 404, "report_not_found", "No such report.");
      res.json({ ok: true, status });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not update that report."); }
  });

  app.post("/api/v1/admin/mail", async (req, res) => {
    if (!admin(req, res)) return;
    const { target, subject, body = "", reward = {}, broadcast = false } = req.body || {};
    if (!subject) return fail(res, 400, "invalid_input", "subject is required.");
    try {
      if (broadcast) {
        const { rowCount } = await query(
          `INSERT INTO mailbox(account_id, subject, body, reward)
           SELECT id, $1, $2, $3 FROM accounts`, [subject, body, reward]);
        return res.json({ ok: true, delivered: rowCount });
      }
      const account = await resolveAccount(target);
      if (!account) return fail(res, 404, "account_not_found", "No such account.");
      const { rows } = await query(
        `INSERT INTO mailbox(account_id, subject, body, reward) VALUES ($1,$2,$3,$4) RETURNING id`,
        [account.id, subject, body, reward]);
      res.json({ ok: true, messageId: rows[0].id, delivered: 1 });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not deliver that message."); }
  });

  app.post("/api/v1/admin/grant", async (req, res) => {
    if (!admin(req, res)) return;
    const { target, standardTickets = 0, limitedTickets = 0, scrap = 0 } = req.body || {};
    try {
      const account = await resolveAccount(target);
      if (!account) return fail(res, 404, "account_not_found", "No such account.");
      await ensureLedger(account.id);
      const { rows } = await query(
        `UPDATE gacha_state SET standard_tickets = GREATEST(0, standard_tickets + $1),
                                limited_tickets  = GREATEST(0, limited_tickets  + $2),
                                scrap            = GREATEST(0, scrap            + $3),
                                ledger_revision  = ledger_revision + 1, updated_at = now()
          WHERE account_id=$4 RETURNING *`,
        [Math.trunc(Number(standardTickets) || 0), Math.trunc(Number(limitedTickets) || 0),
          Math.trunc(Number(scrap) || 0), account.id]);
      res.json({ ok: true, balances: {
        standardTickets: rows[0].standard_tickets,
        limitedTickets: rows[0].limited_tickets,
        scrap: rows[0].scrap,
      } });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not grant that."); }
  });

  app.post("/api/v1/admin/equipment", async (req, res) => {
    if (!admin(req, res)) return;
    const { target, itemId, slot, rarity, origin = "grant", canonical = {} } = req.body || {};
    if (!itemId || !SLOTS.includes(String(slot)) || !RARITIES.includes(String(rarity))) {
      return fail(res, 400, "invalid_input", "itemId, a known slot and a known rarity are required.");
    }
    try {
      const account = await resolveAccount(target);
      if (!account) return fail(res, 404, "account_not_found", "No such account.");
      const { rows } = await query(
        `INSERT INTO equipment(account_id, item_id, slot, rarity, origin, canonical)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING asset_id`,
        [account.id, itemId, slot, rarity, origin, canonical]);
      await ensureLedger(account.id);
      await bumpRevision(account.id);
      res.json({ ok: true, equipmentAssetId: rows[0].asset_id });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not grant that item."); }
  });

  app.post("/api/v1/admin/seasons", async (req, res) => {
    if (!admin(req, res)) return;
    const {
      seasonKey, title = "Season", state = "open", startsAt = null, endsAt = null,
      effectiveEndAt = null, entry = {}, prize = {}, equipmentRules = {}, manifestPayload = {},
    } = req.body || {};
    if (!seasonKey) return fail(res, 400, "invalid_input", "seasonKey is required.");
    try {
      await query(
        `INSERT INTO seasons(season_key, title, state, starts_at, ends_at, effective_end_at,
                             entry, prize, equipment_rules, manifest_payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (season_key) DO UPDATE
           SET title=$2, state=$3, starts_at=$4, ends_at=$5, effective_end_at=$6,
               entry=$7, prize=$8, equipment_rules=$9, manifest_payload=$10`,
        [seasonKey, title, state, startsAt, endsAt, effectiveEndAt,
          entry, prize, equipmentRules, manifestPayload]);
      const { rows } = await query("SELECT * FROM seasons WHERE season_key=$1", [seasonKey]);
      res.json({ ok: true, season: seasonView(rows[0]) });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not publish that season."); }
  });

  // Season entry ticket. By design it is bought with on-chain money, which does
  // not exist yet — and without a ticket a season Hunt cannot be started at
  // all. So that a season can be run right now, the ticket is granted by hand.
  app.post("/api/v1/admin/seasons/:seasonKey/entry", async (req, res) => {
    if (!admin(req, res)) return;
    const seasonKey = String(req.params.seasonKey || "");
    try {
      const account = await resolveAccount(req.body?.target);
      if (!account) return fail(res, 404, "account_not_found", "No such account.");
      const { rows } = await query(
        `INSERT INTO season_entries (season_key, account_id, status, controller_wallet)
         VALUES ($1,$2,'purchased',$3)
         ON CONFLICT (season_key, account_id) DO UPDATE
           SET status = CASE WHEN season_entries.status='completed' THEN 'purchased' ELSE season_entries.status END
         RETURNING *`,
        [seasonKey, account.id, req.body?.wallet || null]);
      res.json({ ok: true, entry: { seasonKey, status: rows[0].status } });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not grant that entry."); }
  });

  app.post("/api/v1/admin/seasons/:seasonKey/score", async (req, res) => {
    if (!admin(req, res)) return;
    const seasonKey = String(req.params.seasonKey || "");
    const { target, verifiedScore = 0, activeTimeMs = 0, stageReached = 0 } = req.body || {};
    try {
      const account = await resolveAccount(target);
      if (!account) return fail(res, 404, "account_not_found", "No such account.");
      await query(
        `INSERT INTO season_scores(season_key, account_id, verified_score, active_time_ms, stage_reached)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (season_key, account_id) DO UPDATE
           SET verified_score=EXCLUDED.verified_score, active_time_ms=EXCLUDED.active_time_ms,
               stage_reached=EXCLUDED.stage_reached, locked_at=now()`,
        [seasonKey, account.id, Math.trunc(Number(verifiedScore) || 0),
          Math.trunc(Number(activeTimeMs) || 0), Math.trunc(Number(stageReached) || 0)]);
      res.json({ ok: true });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not record that score."); }
  });

  app.post("/api/v1/admin/marketplace/listings", async (req, res) => {
    if (!admin(req, res)) return;
    const { equipmentAssetId, fixedUsdMicros } = req.body || {};
    if (!UUID_RE.test(String(equipmentAssetId)) || !Number(fixedUsdMicros)) {
      return fail(res, 400, "invalid_input", "equipmentAssetId and a positive fixedUsdMicros are required.");
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT * FROM equipment WHERE asset_id=$1 FOR UPDATE", [equipmentAssetId]);
      const item = rows[0];
      if (!item) throw Object.assign(new Error("missing"), { http: 404, code: "equipment_not_found" });
      if (item.state !== "inventory") {
        throw Object.assign(new Error("busy"), { http: 409, code: "equipment_unavailable" });
      }
      const listing = await client.query(
        `INSERT INTO marketplace_listings(seller_account_id, equipment_asset_id, slot, rarity, fixed_usd_micros)
         VALUES ($1,$2,$3,$4,$5) RETURNING listing_id`,
        [item.account_id, item.asset_id, item.slot, item.rarity, Math.trunc(Number(fixedUsdMicros))]);
      await client.query("UPDATE equipment SET state='listed', updated_at=now() WHERE asset_id=$1", [item.asset_id]);
      await client.query("COMMIT");
      client.release();
      return res.json({ ok: true, listingId: listing.rows[0].listing_id });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "That item cannot be listed.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not create that listing.");
    }
  });

  // Take a listing down. Needed both for moderation and simply so that an item
  // listed by mistake can go back to its owner: it will not leave the listed
  // state on its own.
  app.post("/api/v1/admin/marketplace/listings/:listingId/cancel", async (req, res) => {
    if (!admin(req, res)) return;
    const listingId = String(req.params.listingId || "");
    if (!UUID_RE.test(listingId)) return fail(res, 400, "invalid_input", "listingId is invalid.");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `UPDATE marketplace_listings SET status='cancelled', cancelled_at=now()
          WHERE listing_id=$1 AND status='active' RETURNING equipment_asset_id`, [listingId]);
      if (!rows.length) throw Object.assign(new Error("gone"), { http: 404, code: "listing_not_found" });
      await client.query(
        "UPDATE equipment SET state='inventory', updated_at=now() WHERE asset_id=$1 AND state='listed'",
        [rows[0].equipment_asset_id]);
      await client.query("COMMIT");
      client.release();
      return res.json({ ok: true, equipmentAssetId: rows[0].equipment_asset_id });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      if (err.http) return fail(res, err.http, err.code, "That listing is not active.");
      console.error(err);
      return fail(res, 500, "server_error", "Could not cancel that listing.");
    }
  });

  // Deleting a guest account with everything attached to it: the foreign keys
  // are declared ON DELETE CASCADE, so one row is enough. The kind='guest'
  // restriction here is a matter of principle: an account with a login must not
  // disappear because of a service request, whatever the mistake in its
  // parameters.
  app.post("/api/v1/admin/accounts/purge", async (req, res) => {
    if (!admin(req, res)) return;
    try {
      const account = await resolveAccount(req.body?.target);
      if (!account) return fail(res, 404, "account_not_found", "No such account.");
      if (account.kind !== "guest" || account.username) {
        return fail(res, 409, "account_not_guest", "Only guest accounts can be purged.");
      }
      await query("DELETE FROM accounts WHERE id=$1", [account.id]);
      res.json({ ok: true, purged: account.profile_id });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not purge that account."); }
  });

  // Deleting an account WITH A LOGIN — a separate endpoint, with confirmation.
  //
  // There was no endpoint at all: purge only takes guests, and a registered
  // account could not be deleted by anyone, neither the player nor us. It
  // surfaced when I littered production with test accounts and could not remove
  // them. For live players this is not a convenience but an obligation: a
  // "delete me" request has to be executable, and spam has to be cleanable.
  //
  // Why I did not widen purge but added a second endpoint. The "guests only"
  // clause is not there out of laziness: it keeps a live account from being
  // wiped because of a typo in a parameter. Widen it with a flag and the
  // protection disappears for every call at once. A separate address plus an
  // explicit confirmation by account name mean you cannot end up here by
  // accident: you have to know the other path and to type the name.
  app.post("/api/v1/admin/accounts/delete", async (req, res) => {
    if (!admin(req, res)) return;
    const { target, confirm } = req.body || {};
    try {
      const account = await resolveAccount(target);
      if (!account) return fail(res, 404, "account_not_found", "No such account.");
      // The confirmation is the username or the profile_id of that same
      // account, typed into a separate field. A forwarded identifier belonging
      // to somebody else will not do.
      const confirmed = [account.username, account.profile_id]
        .filter(Boolean)
        .some((value) => String(confirm || "").trim().toLowerCase() === String(value).toLowerCase());
      if (!confirmed) {
        return fail(res, 400, "confirmation_required",
          "Send confirm with the account's own username or profileId.");
      }
      // Everything related goes with it through the foreign keys: saves,
      // history, equipment, pulls, mail, bounties, sessions and season records.
      await query("DELETE FROM accounts WHERE id=$1", [account.id]);
      res.json({ ok: true, deleted: account.profile_id, username: account.username || null });
    } catch (e) { console.error(e); fail(res, 500, "server_error", "Could not delete that account."); }
  });

  // One-off repair of crafts that were already issued.
  //
  // Until today craftItem put the source `{type:"scrap_craft"}` into the item
  // and nothing else, while the client's checker requires five origin fields on
  // a craft. Such items sit in inventories looking ordinary, but verifyEquipment
  // rejects them — and everything done with an item goes through it. The
  // generator is fixed; here the fields are filled in on what has already been
  // issued.
  //
  // Filling them in is safe: the source is not part of itemId (checked), so the
  // item stays exactly the same, it just passes verification now.
  async function repairCraftedItemOrigins() {
    const { rows } = await query(
      `SELECT asset_id, canonical FROM equipment
        WHERE origin='scrap_craft' AND canonical->'source'->>'issuanceId' IS NULL`);
    if (!rows.length) return 0;
    await loadCatalogue();
    for (const row of rows) {
      const canonical = row.canonical || {};
      if (!canonical.rarity) continue;
      // We rebuild the item the way it would be issued today and take ONLY the
      // source: the affixes are the item's own and must not be touched.
      const reference = craftItem({
        rarity: canonical.rarity, slot: canonical.slot, secret: "0".repeat(64), requestId: `repair:${row.asset_id}`,
      });
      canonical.source = { ...reference.source };
      await query("UPDATE equipment SET canonical=$1, updated_at=now() WHERE asset_id=$2",
        [JSON.stringify(canonical), row.asset_id]);
    }
    return rows.length;
  }

  return { mirrorWeeklyBounties, ensureLedger, ledgerSnapshot, repairCraftedItemOrigins };
}
