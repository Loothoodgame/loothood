# LOOTHOOD

A browser roguelite looter where every random outcome can be recomputed by the
player. Fifteen stages of forest, a village to build, gear to hunt for — and a
competitive season on top, with a paid entry and a prize pool.

**Play:** [loothood.xyz](https://loothood.xyz) · **Verify:**
[loothood.xyz/verify.html](https://loothood.xyz/verify.html)

---

## Why this repository exists

Any game that asks for money eventually gets asked whether its odds are real.
The usual answer is a promise. This repository is the other kind of answer: the
code that produces every drop and every score is here, and the evidence the
server hands out is enough to recompute both without trusting us.

## How it works

### Pulls are committed before they roll

The server generates a secret, publishes only its SHA-256 fingerprint, and rolls
the items from that secret. After the reveal it hands the secret over. Run it
through the same derivation and you get the same items — and no other secret
produces that fingerprint.

```
fingerprint = sha256(secret)          # published before the roll
items       = derive(secret, banner, pity)
```

### Runs are replayed, not trusted

A competitive run is submitted as a recording of player input, tick by tick. The
server replays it with the same engine the browser executed and computes its own
score. What the client claims is stored beside it and never counted.

### Seasons are sealed in advance

Waves, boss order and seeds all derive from one season key whose fingerprint is
published before entries open. Stage forty-two is decided before anyone plays a
tick — including by us.

### Receipts are chained

Every receipt carries the hash of the previous one, so removing or editing a past
receipt invalidates everything issued after it.

## Verify it yourself

1. Open [the verification page](https://loothood.xyz/verify.html)
2. Paste a pull id or a season attempt id
3. The page fetches the evidence and recomputes the result **in your browser**,
   using the same shared module the server uses

No step in that flow asks the server whether the result was fair.

| Endpoint | Returns |
| --- | --- |
| `GET /api/v1/gacha/draws/:id/proof` | commitment, revealed secret, derived items |
| `GET /api/v1/seasons/:key/manifest` | season manifest and its fingerprint |
| `GET /api/v1/verify/attempts/:id` | recorded input, replayed score, receipt chain |
| `GET /api/v1/health/systems` | live state of API, database, watcher, season |

## Economy

Playing never mints tokens. The token enters only by purchase and leaves by
burning — the rule most play-to-earn economies break, and the reason they end
with the last arrivals paying for the first.

| Marketplace sale | Share |
| --- | --- |
| Seller | 90% |
| Burned | 5% |
| Prize treasury | 5% |

Season prizes are funded in WETH rather than the project token: a prize paid in
your own token is circular, and its announced size is worth whatever the token
happens to be worth that day. Crafted gear is account-bound, otherwise crafting
becomes a printing press.

## Repository layout

```
src/
  index.js              accounts, sessions, wallet linking, health checks
  game-routes.js        gacha, equipment, marketplace, seasons, verification
  catalogue.js          item generation and affix rolls
  chain.js              payment watcher — reads chain history, holds no keys
  wallet.js             EIP-191 signature recovery for wallet linking
  season-manifest.js    deterministic season layout + server-side replay
  db.js                 schema and migrations

frontend/
  js/competitive-run-core.js   run engine — the one the server replays with
  js/verify-shared.js          shared verification maths, browser and server
  js/verify-page.js            the verification page
  verify.html                  check a pull or a run yourself
  index.html                   the game
```

## Running locally

```bash
npm install
DATABASE_URL=postgres://localhost/loothood ADMIN_TOKEN=dev PORT=3999 npm start
```

The client is static: serve `frontend/` with any file server and point the
`loothood-api-origin` meta tag at the API.

## Stack

Node.js · Express · PostgreSQL · vanilla JS client · Robinhood Chain (4663)

## Notes

Comments in the source explain *why* rather than *what*, including the mistakes
that shaped the current design.

Art and audio are not part of this repository; the game serves them from the
deployed site.
