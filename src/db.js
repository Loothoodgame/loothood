import pg from "pg";

const connectionString = process.env.DATABASE_URL;

// Decide SSL: Railway's *internal* network (`*.railway.internal`) and localhost
// speak plain TCP — forcing SSL there fails. Public hosts (proxy.rlwy.net etc.)
// need SSL, and Railway's cert isn't in the default CA bundle, so relax verify.
function sslFor(url) {
  if (!url) return false;
  if (url.includes("localhost") || url.includes("127.0.0.1") || url.includes(".railway.internal")) return false;
  return { rejectUnauthorized: false };
}

export function describeConnection() {
  if (!connectionString) return "DATABASE_URL is NOT set";
  try {
    const u = new URL(connectionString);
    const ssl = sslFor(connectionString) ? "on" : "off";
    return `host=${u.hostname} port=${u.port || "5432"} db=${u.pathname.slice(1)} ssl=${ssl}`;
  } catch { return "DATABASE_URL is set but could not be parsed"; }
}

export const pool = new pg.Pool({
  connectionString,
  ssl: sslFor(connectionString),
  max: 5,
  connectionTimeoutMillis: 10000,
});

export async function query(text, params) {
  return pool.query(text, params);
}

// Create the schema. Idempotent — safe to run on every boot.
export async function initSchema() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS accounts (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id    TEXT UNIQUE NOT NULL,
      kind          TEXT NOT NULL DEFAULT 'guest',
      username      TEXT UNIQUE,
      password_hash TEXT,
      display_name  TEXT NOT NULL DEFAULT 'LOOTHOOD Ranger',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      csrf_token  TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at  TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS saves (
      account_id        UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
      revision          INTEGER NOT NULL DEFAULT 0,
      catalogue_version TEXT NOT NULL,
      state             JSONB NOT NULL,
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS idempotency (
      key        TEXT PRIMARY KEY,
      account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      result     JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- The account's wallet. Stored lower-cased: wallets render the address in
    -- different letter cases, and string comparison would drift apart otherwise.
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS wallet_address TEXT;
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS wallet_linked_at TIMESTAMPTZ;
    -- One wallet, one account. Otherwise two people sign in with the same
    -- address and a ticket transfer cannot be attributed to either of them.
    CREATE UNIQUE INDEX IF NOT EXISTS accounts_wallet_idx
      ON accounts(wallet_address) WHERE wallet_address IS NOT NULL;

    -- Signing challenges.
    --
    -- They live apart from the account because a challenge is issued BEFORE it
    -- is known whose wallet this is: the address may belong to nobody, in which
    -- case the challenge ends up creating a new account.
    --
    -- The nonce inside the message text is the entire defence against replaying
    -- an old signature. That is why a challenge burns on first use: used_at is
    -- set in the same transaction that accepts the signature.
    CREATE TABLE IF NOT EXISTS wallet_challenges (
      challenge_id   TEXT PRIMARY KEY,
      address        TEXT NOT NULL,
      nonce          TEXT NOT NULL,
      purpose        TEXT NOT NULL DEFAULT 'login',
      message        TEXT NOT NULL,
      -- whose challenge it is, when it was issued to a signed-in player
      account_id     UUID REFERENCES accounts(id) ON DELETE CASCADE,
      -- one-shot pass for creating an account: issued after an unknown wallet
      -- signs successfully, and lives until the player confirms
      creation_token TEXT,
      used_at        TIMESTAMPTZ,
      expires_at     TIMESTAMPTZ NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS wallet_challenges_expiry ON wallet_challenges(expires_at);

    -- Incoming token transfers to the treasury address.
    --
    -- The primary key is the pair (transaction hash, log index). It is unique
    -- by construction, and it is the ONLY defence against double crediting: no
    -- matter how many times the watcher re-reads a block, it cannot insert the
    -- same row twice.
    --
    -- Transfers from an unlinked wallet are recorded too, with a NULL
    -- account_id. Money arrived, and that has to be visible even when it is not
    -- yet clear whose it is.
    CREATE TABLE IF NOT EXISTS chain_payments (
      tx_hash      TEXT NOT NULL,
      log_index    INTEGER NOT NULL,
      block_number BIGINT NOT NULL,
      from_address TEXT NOT NULL,
      -- amount in the token's smallest units, as text: with 18 decimals an
      -- ordinary amount does not fit in a number without losing precision
      amount_wei   TEXT NOT NULL,
      account_id   UUID REFERENCES accounts(id) ON DELETE SET NULL,
      season_key   TEXT,
      credited_at  TIMESTAMPTZ,
      seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (tx_hash, log_index)
    );
    CREATE INDEX IF NOT EXISTS chain_payments_account ON chain_payments(account_id, seen_at DESC);

    -- How far the watcher has read. One row for the whole game.
    CREATE TABLE IF NOT EXISTS chain_cursor (
      id         INTEGER PRIMARY KEY DEFAULT 1,
      last_block BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT chain_cursor_one_row CHECK (id = 1)
    );

    -- Bug reports from players.
    --
    -- The "report a bug" button in settings was always there, but no server
    -- stood behind it — the form posted into a 404. At launch this is the first
    -- thing that will be needed: bugs will pour in, and there would be no
    -- channel for them to arrive through.
    --
    -- context is an environment snapshot the client assembles itself: game
    -- version, browser, window size, current screen. Without it half the
    -- reports are useless, because "it doesn't work for me" is not
    -- reproducible.
    CREATE TABLE IF NOT EXISTS bug_reports (
      report_id   TEXT PRIMARY KEY,
      account_id  UUID REFERENCES accounts(id) ON DELETE SET NULL,
      category    TEXT NOT NULL DEFAULT 'other',
      summary     TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      context     JSONB NOT NULL DEFAULT '{}'::jsonb,
      -- new | triaged | fixed | wontfix
      status      TEXT NOT NULL DEFAULT 'new',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS bug_reports_recent ON bug_reports(created_at DESC);
    CREATE INDEX IF NOT EXISTS bug_reports_account ON bug_reports(account_id, created_at DESC);

    -- Recovery Key. Only the hash is kept: the key itself is shown to the
    -- player once, at issue time, and never stays on the server.
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS recovery_hash TEXT;
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS recovery_issued_at TIMESTAMPTZ;
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS recovery_confirmed_at TIMESTAMPTZ;
    -- The key's blocks are held in the clear ONLY between issue and
    -- confirmation: the form asks for two blocks out of six, and a hash of the
    -- whole key is no use for that. The field is cleared right after
    -- confirmation.
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS recovery_pending JSONB;
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

    -- Save history. The saves table holds only the latest revision, so any
    -- corruption of that row would be irreversible. Past states live here so
    -- that progress can be rolled back.
    CREATE TABLE IF NOT EXISTS save_history (
      id                BIGSERIAL PRIMARY KEY,
      account_id        UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      revision          INTEGER NOT NULL,
      catalogue_version TEXT NOT NULL,
      state             JSONB NOT NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS save_history_account_idx  ON save_history(account_id, revision DESC);
    CREATE INDEX IF NOT EXISTS sessions_account_idx      ON sessions(account_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_idx      ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idempotency_created_idx   ON idempotency(created_at);
    CREATE INDEX IF NOT EXISTS accounts_username_lower_idx ON accounts(lower(username));

    -- ================= GAME TABLES =================
    -- Up to this point the whole game lived as a single JSON blob in
    -- saves.state. That is enough for storing progress, but things players
    -- trade between each other cannot be kept in a blob: seller and buyer are
    -- two different rows, and a listing has to exist independently of both of
    -- them. So everything that crosses an account boundary or needs the server
    -- to have the final say (item ownership, pity counters, mail, listings,
    -- seasons) moves into tables of its own.

    -- An item as a unit of record. asset_id is what the client calls
    -- equipmentAssetId: it survives handing the item to another player, whereas
    -- item_id only describes the item's model from the catalogue.
    CREATE TABLE IF NOT EXISTS equipment (
      asset_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      item_id     TEXT NOT NULL,
      slot        TEXT NOT NULL,
      rarity      TEXT NOT NULL,
      origin      TEXT NOT NULL DEFAULT 'standard_gacha',
      -- inventory | equipped | listed | salvaged
      state       TEXT NOT NULL DEFAULT 'inventory',
      protected   BOOLEAN NOT NULL DEFAULT false,
      -- the full item with its affixes: the catalogue is versioned, but an item
      -- already handed out must not change from patch to patch
      canonical   JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- An item taken into a run is locked until the run ends. We keep a deadline
    -- rather than a flag: a flag stays raised forever if the player closes the
    -- tab mid-fight, and the inventory freezes with no way at all to release
    -- it.
    ALTER TABLE equipment ADD COLUMN IF NOT EXISTS leased_until TIMESTAMPTZ;

    -- What is worn. There is exactly one slot per account, so the key is
    -- composite rather than a flag on equipment: a flag would allow two helmets
    -- at once.
    CREATE TABLE IF NOT EXISTS loadout (
      account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      slot       TEXT NOT NULL,
      asset_id   UUID REFERENCES equipment(asset_id) ON DELETE SET NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (account_id, slot)
    );

    -- The draw wallet and pity counters. Kept on the server, because this is
    -- exactly the place where lying from the client would pay off.
    CREATE TABLE IF NOT EXISTS gacha_state (
      account_id         UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
      ledger_revision    INTEGER NOT NULL DEFAULT 1,
      standard_tickets   INTEGER NOT NULL DEFAULT 0,
      limited_tickets    INTEGER NOT NULL DEFAULT 0,
      scrap              INTEGER NOT NULL DEFAULT 0,
      inventory_capacity INTEGER NOT NULL DEFAULT 240,
      pity_standard_epic      INTEGER NOT NULL DEFAULT 0,
      pity_standard_legendary INTEGER NOT NULL DEFAULT 0,
      pity_limited_epic       INTEGER NOT NULL DEFAULT 0,
      pity_limited_legendary  INTEGER NOT NULL DEFAULT 0,
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Draw history. Not decoration: the argument "I didn't get what the banner
    -- promised" can only be settled by a record of what actually dropped.
    CREATE TABLE IF NOT EXISTS gacha_draws (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      draw_request_id  TEXT UNIQUE NOT NULL,
      tier             TEXT NOT NULL,
      draw_count       INTEGER NOT NULL DEFAULT 1,
      -- pending | settled | failed
      status           TEXT NOT NULL DEFAULT 'pending',
      results          JSONB NOT NULL DEFAULT '[]'::jsonb,
      pity_before      JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      settled_at       TIMESTAMPTZ
    );

    -- Commit-then-reveal scheme.
    --
    -- The secret is born together with the request and never leaves before the
    -- reveal — only its digest does. Every random value is derived from the
    -- secret, so the server cannot pick a result after the fact: the digest has
    -- already been named. And after the reveal the player can run the same
    -- secret through the same function and check that this is exactly what
    -- dropped.
    --
    -- available_at is the moment before which revealing is not allowed. Without
    -- it the commitment is empty: the reveal could happen immediately, and
    -- there would be no difference from a plain Math.random.
    ALTER TABLE gacha_draws ADD COLUMN IF NOT EXISTS secret       TEXT;
    ALTER TABLE gacha_draws ADD COLUMN IF NOT EXISTS commitment   TEXT;
    ALTER TABLE gacha_draws ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ;

    -- Crafting from scrap. A separate table rather than a row in gacha_draws: a
    -- craft has neither a tier nor pity counters, but it does have a requested
    -- rarity and slot, and merging them into one table would mean half the
    -- columns sitting empty in every row.
    CREATE TABLE IF NOT EXISTS equipment_crafts (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      craft_request_id TEXT UNIQUE NOT NULL,
      rarity           TEXT NOT NULL,
      slot             TEXT,
      scrap_spent      INTEGER NOT NULL DEFAULT 0,
      -- pending | settled | failed
      status           TEXT NOT NULL DEFAULT 'pending',
      result           JSONB NOT NULL DEFAULT '{}'::jsonb,
      secret           TEXT,
      commitment       TEXT,
      available_at     TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      settled_at       TIMESTAMPTZ
    );

    -- Leasing gear for a run.
    --
    -- A run lasts minutes, and during that time items stay sellable, salvageable
    -- and rerollable. Without a lease this is what happens: a player goes into
    -- battle with a legendary bow, sells it on the marketplace from another tab,
    -- and finishes the run with an item they no longer own. The run's result
    -- only looks honest.
    --
    -- So at the start of a run a SNAPSHOT of the loadout is taken — that is what
    -- goes into battle — and the items themselves are locked until the run ends.
    -- The snapshot is stored in full: if an item is rerolled afterwards, the
    -- run's result must still read against the gear the run was actually made
    -- with.
    CREATE TABLE IF NOT EXISTS run_leases (
      lease_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id     UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      -- the client's key for the run: a repeated request with the same key
      -- returns the same lease instead of opening a second one
      client_run_key TEXT NOT NULL,
      -- active | complete | defeat | abandon | expired
      status         TEXT NOT NULL DEFAULT 'active',
      loadout        JSONB NOT NULL DEFAULT '{}'::jsonb,
      acquired_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at     TIMESTAMPTZ NOT NULL,
      released_at    TIMESTAMPTZ,
      UNIQUE (account_id, client_run_key)
    );
    -- One active run per account. Two would mean two loadouts drawn from the
    -- same inventory at the same time.
    CREATE UNIQUE INDEX IF NOT EXISTS run_leases_one_active
      ON run_leases(account_id) WHERE status = 'active';

    -- Rerolling. A separate table because an attempt has something neither a
    -- draw nor a craft has: the source item, which stays unchanged for the
    -- duration of the attempt. The player pays, sees the candidate, and only
    -- then decides whether to take it or keep their own. Until they decide,
    -- both versions must exist at the same time — otherwise there is nothing to
    -- fulfil "keep the original" with.
    CREATE TABLE IF NOT EXISTS equipment_revisions (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      attempt_id         TEXT UNIQUE NOT NULL,
      account_id         UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      equipment_asset_id UUID NOT NULL REFERENCES equipment(asset_id) ON DELETE CASCADE,
      product            TEXT NOT NULL DEFAULT 'full_reroll',
      preserved_indexes  JSONB NOT NULL DEFAULT '[]'::jsonb,
      scrap_spent        INTEGER NOT NULL DEFAULT 0,
      -- quoted | candidate_ready | accepted | kept_original | failed
      status             TEXT NOT NULL DEFAULT 'quoted',
      original_item      JSONB NOT NULL DEFAULT '{}'::jsonb,
      candidate_item     JSONB,
      secret             TEXT,
      commitment         TEXT,
      available_at       TIMESTAMPTZ,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      resolved_at        TIMESTAMPTZ
    );
    -- One open attempt per item. Two would mean two candidates for a single
    -- original, and accepting the second would silently erase the first.
    CREATE UNIQUE INDEX IF NOT EXISTS revisions_one_open_per_asset
      ON equipment_revisions(equipment_asset_id)
      WHERE status IN ('quoted', 'candidate_ready');

    -- Mailbox: the only channel through which the developer can reach a player
    -- with compensation or news.
    CREATE TABLE IF NOT EXISTS mailbox (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      subject      TEXT NOT NULL,
      body         TEXT NOT NULL DEFAULT '',
      -- {"standardTickets":n,"limitedTickets":n} — an empty object means a
      -- letter with no attachment
      reward       JSONB NOT NULL DEFAULT '{}'::jsonb,
      delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      read_at      TIMESTAMPTZ,
      claimed_at   TIMESTAMPTZ,
      archived_at  TIMESTAMPTZ
    );

    -- Listings. They live apart from equipment because a listing outlives the
    -- sale: the item moves to the buyer, but the record of the deal must stay.
    CREATE TABLE IF NOT EXISTS marketplace_listings (
      listing_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      seller_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      equipment_asset_id UUID NOT NULL REFERENCES equipment(asset_id) ON DELETE CASCADE,
      slot              TEXT NOT NULL,
      rarity            TEXT NOT NULL,
      -- price in micro-dollars: the client computes fixedUsdMicros/1e6, and
      -- there must be no fractional cents in money
      fixed_usd_micros  BIGINT NOT NULL,
      -- active | sold | cancelled
      status            TEXT NOT NULL DEFAULT 'active',
      buyer_account_id  UUID REFERENCES accounts(id) ON DELETE SET NULL,
      listed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      sold_at           TIMESTAMPTZ,
      cancelled_at      TIMESTAMPTZ
    );
    -- Price in scrap. The marketplace was originally meant to run on on-chain
    -- money, hence the micro-dollars. There is no chain, but the game needs item
    -- trading right now, so listings sell for scrap: it is server-side, it
    -- cannot be conjured up by the client, and it is already produced by
    -- salvaging. Selling an item versus salvaging it is now a real choice, not
    -- a rhetorical one.
    ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS price_scrap BIGINT;
    ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS fee_scrap BIGINT NOT NULL DEFAULT 0;
    -- The fee is split in half: one half is burned, the other accumulates
    -- towards the prize. Both shares are stored separately rather than computed
    -- on the fly: the split rule will change over time, and past deals must stay
    -- described by the numbers they actually went through with.
    ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS burned_scrap   BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS treasury_scrap BIGINT NOT NULL DEFAULT 0;

    -- The treasury. One row for the whole game: half of the marketplace fee
    -- drips in here, and the season's prize pool is drawn from it. A separate
    -- table rather than a counter in code, because a prize pool cannot be
    -- tracked from memory — it has to be visible.
    CREATE TABLE IF NOT EXISTS treasury (
      id            INTEGER PRIMARY KEY DEFAULT 1,
      scrap         BIGINT NOT NULL DEFAULT 0,
      burned_total  BIGINT NOT NULL DEFAULT 0,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT treasury_one_row CHECK (id = 1)
    );
    INSERT INTO treasury(id) VALUES (1) ON CONFLICT (id) DO NOTHING;
    -- Micro-dollars were NOT NULL back when the chain was assumed. Without it
    -- there is nowhere to get a dollar price from, so the column becomes
    -- optional rather than being filled with an invented number.
    ALTER TABLE marketplace_listings ALTER COLUMN fixed_usd_micros DROP NOT NULL;

    -- One item, one active listing. The partial unique index allows any number
    -- of closed listings for the same item and exactly one open listing.
    CREATE UNIQUE INDEX IF NOT EXISTS marketplace_one_active_per_asset
      ON marketplace_listings(equipment_asset_id) WHERE status = 'active';

    -- Seasons and participation in them.
    CREATE TABLE IF NOT EXISTS seasons (
      season_key       TEXT PRIMARY KEY,
      title            TEXT NOT NULL DEFAULT 'Season',
      -- draft | open | live | settling | closed
      state            TEXT NOT NULL DEFAULT 'draft',
      starts_at        TIMESTAMPTZ,
      ends_at          TIMESTAMPTZ,
      effective_end_at TIMESTAMPTZ,
      entry            JSONB NOT NULL DEFAULT '{}'::jsonb,
      prize            JSONB NOT NULL DEFAULT '{}'::jsonb,
      equipment_rules  JSONB NOT NULL DEFAULT '{}'::jsonb,
      manifest_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS season_entries (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      season_key        TEXT NOT NULL REFERENCES seasons(season_key) ON DELETE CASCADE,
      account_id        UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      -- purchased | active | completed | expired
      status            TEXT NOT NULL DEFAULT 'purchased',
      controller_wallet TEXT,
      purchased_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      activated_at      TIMESTAMPTZ,
      completed_at      TIMESTAMPTZ,
      UNIQUE (season_key, account_id)
    );
    -- The locked-in result. Kept apart from season_entries because a ticket is
    -- the right to play while a score is an outcome, and the two need to be
    -- rewritten under different rules.
    CREATE TABLE IF NOT EXISTS season_scores (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      season_key     TEXT NOT NULL REFERENCES seasons(season_key) ON DELETE CASCADE,
      account_id     UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      verified_score BIGINT NOT NULL DEFAULT 0,
      active_time_ms BIGINT NOT NULL DEFAULT 0,
      stage_reached  INTEGER NOT NULL DEFAULT 0,
      locked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (season_key, account_id)
    );

    -- A season run attempt and the evidence for it.
    --
    -- A season score cannot be taken on the client's word: this is exactly the
    -- place where lying pays off most. So the run is submitted in pieces as it
    -- goes — input segments keyed to ticks — and at the end the server replays
    -- them locally with the same core the client uses, and takes ITS OWN score
    -- rather than the submitted one.
    --
    -- The receipt for each packet is chained to the previous one: the next
    -- receipt contains the digest of the last. The middle of a run cannot be
    -- rewritten after the fact without rewriting everything that came after —
    -- and everything that came after is already in the player's hands.
    CREATE TABLE IF NOT EXISTS verifier_attempts (
      attempt_id       TEXT PRIMARY KEY,
      account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      season_key       TEXT NOT NULL,
      manifest_hash    TEXT NOT NULL,
      loadout          JSONB NOT NULL DEFAULT '{}'::jsonb,
      wallet           TEXT,
      entry_ticket_id  TEXT,
      -- issued | finalized | rejected
      status           TEXT NOT NULL DEFAULT 'issued',
      packet_count     INTEGER NOT NULL DEFAULT 0,
      last_receipt_hash TEXT NOT NULL DEFAULT '',
      verified_score   BIGINT,
      claimed_score    BIGINT,
      stage_reached    INTEGER,
      cleared          BOOLEAN NOT NULL DEFAULT false,
      reject_reason    TEXT,
      issued_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      finalized_at     TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS verifier_packets (
      attempt_id   TEXT NOT NULL REFERENCES verifier_attempts(attempt_id) ON DELETE CASCADE,
      packet_index INTEGER NOT NULL,
      packet       JSONB NOT NULL,
      packet_hash  TEXT NOT NULL,
      receipt_hash TEXT NOT NULL,
      received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (attempt_id, packet_index)
    );

    -- Bounty progress. period_key separates weeks from one another: without it
    -- resetting a bounty would wipe the history, whereas this way last week
    -- simply stops being the current one.
    CREATE TABLE IF NOT EXISTS bounty_progress (
      id           BIGSERIAL PRIMARY KEY,
      account_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      bounty_id    TEXT NOT NULL,
      period_key   TEXT NOT NULL,
      progress     INTEGER NOT NULL DEFAULT 0,
      target       INTEGER NOT NULL DEFAULT 1,
      completed_at TIMESTAMPTZ,
      claimed_at   TIMESTAMPTZ,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (account_id, bounty_id, period_key)
    );

    CREATE INDEX IF NOT EXISTS equipment_account_idx     ON equipment(account_id, state);
    CREATE INDEX IF NOT EXISTS gacha_draws_account_idx   ON gacha_draws(account_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS mailbox_account_idx       ON mailbox(account_id, delivered_at DESC);
    CREATE INDEX IF NOT EXISTS mailbox_unread_idx        ON mailbox(account_id) WHERE read_at IS NULL AND archived_at IS NULL;
    CREATE INDEX IF NOT EXISTS listings_active_idx       ON marketplace_listings(status, listed_at DESC);
    CREATE INDEX IF NOT EXISTS listings_seller_idx       ON marketplace_listings(seller_account_id, status);
    CREATE INDEX IF NOT EXISTS season_scores_board_idx   ON season_scores(season_key, verified_score DESC, active_time_ms ASC);
    CREATE INDEX IF NOT EXISTS bounty_progress_acc_idx   ON bounty_progress(account_id, period_key);
    CREATE INDEX IF NOT EXISTS run_leases_account_idx     ON run_leases(account_id, acquired_at DESC);
    CREATE INDEX IF NOT EXISTS revisions_account_idx      ON equipment_revisions(account_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS attempts_account_idx       ON verifier_attempts(account_id, issued_at DESC);
    CREATE INDEX IF NOT EXISTS attempts_season_idx        ON verifier_attempts(season_key, status);
  `);
}

// Periodic housekeeping. Expired sessions and stale idempotency keys would
// otherwise pile up forever: sessions live for 30 days, and the keys are only
// needed for as long as a request might be retried.
export async function sweepExpired() {
  const s = await pool.query("DELETE FROM sessions WHERE expires_at < now()");
  // Abandoned runs. A player who closed the tab mid-fight would otherwise be
  // left with a locked inventory forever: there is nobody else to release the
  // lease.
  const l = await pool.query(
    "UPDATE run_leases SET status='expired', released_at=now() WHERE status='active' AND expires_at < now()");
  await pool.query("UPDATE equipment SET leased_until=NULL WHERE leased_until IS NOT NULL AND leased_until < now()");
  const i = await pool.query("DELETE FROM idempotency WHERE created_at < now() - interval '24 hours'");
  // Expired signing challenges. They are single-use and live for minutes, so
  // they accumulate faster than anything else.
  await pool.query("DELETE FROM wallet_challenges WHERE expires_at < now() - interval '1 hour'");
  // Keep the last 20 revisions per account — enough for a rollback, and the
  // table does not grow without bound for active players.
  const h = await pool.query(`
    DELETE FROM save_history sh
     WHERE sh.id NOT IN (
       SELECT id FROM (
         SELECT id, row_number() OVER (PARTITION BY account_id ORDER BY revision DESC) AS rn
           FROM save_history
       ) ranked WHERE rn <= 20
     )`);
  return { sessions: s.rowCount, idempotency: i.rowCount, saveHistory: h.rowCount, runLeases: l.rowCount };
}
