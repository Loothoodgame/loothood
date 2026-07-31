/* LOOTHOOD documentation.
   ------------------------------------------------------------------
   Kept apart from the guide on purpose. The guide explains HOW TO PLAY: why
   the bow only fires while standing still and what the boss's armour does.
   The documentation answers a different question — WHY THIS CAN BE TRUSTED:
   how the randomness works, what exactly the server recomputes, where the fee
   goes. That is a different audience at a different moment: the first is
   reached for mid-fight, the second before paying.

   Built as pages rather than one long sheet: the documentation has a reading
   order, and "next" at the bottom of a page matters more than the table of
   contents. Someone who lands on "Verification" should move on to "Seasons"
   rather than go back to the list.

   RULE FOR NUMBERS. There is not a single figure here that cannot be checked
   in the code or on-chain. The ticket price and the size of the prize pool
   are not named even approximately: they depend on the exchange rate on the
   day of launch, and a number named in advance and changed later is no longer
   an estimate, it is a broken promise.

   Blocks are marked up by type rather than as HTML: the text can be edited
   without risking the layout, and the layout changes in one place. */

window.LOOTHOOD_DOCS = Object.freeze({
  version: "docs-v1",

  pages: Object.freeze([
    Object.freeze({
      id: "overview",
      title: "Overview",
      lede: "What LOOTHOOD is, and what it refuses to be.",
      blocks: Object.freeze([
        { type: "p", text: "LOOTHOOD is a browser roguelite looter. You run a forest of fifteen stages, fire only while standing still, and choose upgrades between waves. That part is free and needs no wallet, no email, no signup." },
        { type: "p", text: "On top of that sits a competitive season with a paid entry and a prize pool, and a marketplace where equipment changes hands. Everything that involves money is built so that you do not have to take our word for anything." },
        { type: "h3", text: "The one rule that shapes everything" },
        { type: "p", text: "Playing does not mint tokens. Not from clearing stages, not from winning seasons, not from crafting. This is the rule most play-to-earn economies break, and breaking it is why they die: when a game prints its own currency faster than it burns it, the price falls until the reward stops meaning anything, and the players who arrive last pay for the ones who arrived first." },
        { type: "p", text: "Here the token only enters the game by purchase, and leaves it by burning. The game is a reason to want it, not a machine that produces it." },
        { type: "h3", text: "What you can check yourself" },
        { type: "list", items: Object.freeze([
          "Every gacha pull — the server commits to the outcome before it rolls, and hands you the secret afterwards.",
          "Every season score — the server replays your recorded input with the same engine your browser ran.",
          "Every season layout — waves and bosses follow from one seed whose fingerprint is published before the season opens.",
          "Every marketplace fee — the split is fixed in code and the treasury is on chain.",
        ]) },
        { type: "note", text: "The verification page at /verify.html recomputes all of this in your browser. It does not ask the server whether the result was fair — it checks." },
      ]),
    }),

    Object.freeze({
      id: "getting-started",
      title: "Getting started",
      lede: "From nothing to your first run, and where a wallet actually matters.",
      blocks: Object.freeze([
        { type: "h3", text: "Just play" },
        { type: "p", text: "Open the site and press Start Hunt. A guest account is created locally and your progress is saved server-side against it. No wallet is involved, and nothing is for sale on that path." },
        { type: "h3", text: "Keeping your progress" },
        { type: "p", text: "A guest account lives in one browser. Register a username or link a wallet and it follows you: both upgrade the same account rather than creating a second one, so nothing is lost in the process." },
        { type: "h3", text: "What a wallet is for" },
        { type: "p", text: "Linking a wallet means signing a message. Signing costs nothing, moves no funds, and grants no permissions — it only proves the address is yours. That proof is what lets a payment sent from that address be matched to your account." },
        { type: "table", head: Object.freeze(["Feature", "Needs a wallet"]), rows: Object.freeze([
          Object.freeze(["Forest runs, village, crafting", "No"]),
          Object.freeze(["Gacha pulls with earned tickets", "No"]),
          Object.freeze(["Season entry", "Yes"]),
          Object.freeze(["Buying and selling on the marketplace", "Yes"]),
          Object.freeze(["Receiving a prize", "Yes"]),
        ]) },
        { type: "note", text: "We never ask for a seed phrase or a private key, and no part of the game has a place to type one. Anything that does is not us." },
      ]),
    }),

    Object.freeze({
      id: "verification",
      title: "Verification",
      lede: "How a claim of fairness is made checkable instead of promised.",
      blocks: Object.freeze([
        { type: "h3", text: "Pulls: commit before, reveal after" },
        { type: "p", text: "When you request a pull, the server generates a secret, stores it, and returns only its SHA-256 fingerprint plus the earliest moment it may be revealed. Only then does it roll your items from that secret." },
        { type: "p", text: "After the reveal you get the secret itself. Run it through the same derivation the game uses and you get the same items. The point is not that the numbers look random — it is that the fingerprint was published before the outcome existed, and no other secret produces that fingerprint." },
        { type: "code", text: "fingerprint = sha256(secret)\nitems      = derive(secret, bannerState, pityCounters)" },
        { type: "h3", text: "Runs: replayed, not trusted" },
        { type: "p", text: "A competitive run is submitted as a recording of your input, tick by tick — not as a score. The server replays that recording with the same competitive-run-core.js your browser executed and computes its own result." },
        { type: "p", text: "What the client claimed is stored next to what the server computed, but only the server's number counts. A modified client can send whatever it likes; it cannot make the replay produce it." },
        { type: "h3", text: "Receipts chain" },
        { type: "p", text: "Each receipt carries the hash of the previous one. Removing or editing a past receipt breaks every receipt issued after it, so the history cannot be quietly rewritten — including by us." },
        { type: "h3", text: "Check it yourself" },
        { type: "p", text: "Open the verification page, paste a pull id or an attempt id, and it fetches the evidence and recomputes everything locally using the same shared module the game and the server both use." },
        { type: "note", text: "The code that runs these checks is the code running in production, published in the public repository — not a description of it." },
      ]),
    }),

    Object.freeze({
      id: "seasons",
      title: "Seasons",
      lede: "Paid entry, a sealed layout, and a record that can be compared.",
      blocks: Object.freeze([
        { type: "h3", text: "Fifteen stages, then no ceiling" },
        { type: "p", text: "The ordinary game ends with a victory on stage fifteen. Going deeper happens only in a season, and that is the main thing an entry buys: past stage fifteen the waves continue without an end, and the question becomes how far you get within the hour." },
        { type: "p", text: "The run is capped at one hour. Not for load — replaying an hour costs the server under a second — but for meaning: without a cap the season is won by whoever can sit longest, and “how deep in an hour” is a record that can actually be compared." },
        { type: "h3", text: "The layout is sealed in advance" },
        { type: "p", text: "Waves, boss order and seeds are all derived from one season key. Its fingerprint is published before entries open, so what stage forty-two contains is fixed before anyone has played a single tick. “Bad luck with the layout” is not an excuse, and neither is favouritism: we cannot change it either." },
        { type: "h3", text: "Entry and prizes" },
        { type: "p", text: "Entry is paid by sending the token to the treasury address. A watcher reads incoming transfers on chain and credits the ticket to the account whose wallet signed the link. There is no contract of ours in the path, and the server holds no key — it only reads public history." },
        { type: "p", text: "Prizes are funded in WETH, not in our own token. A prize paid in the project's token is circular: winners sell it immediately, and the announced pool is worth whatever the token happens to be worth that day." },
        { type: "note", text: "Entry price and the opening prize pool are announced on launch day, because both depend on what the token is worth then. Publishing an estimate now and a different number later would be worse than publishing nothing." },
      ]),
    }),

    Object.freeze({
      id: "economy",
      title: "Economy",
      lede: "Where the token enters, where it leaves, and why crafted gear is bound.",
      blocks: Object.freeze([
        { type: "h3", text: "The token has one job" },
        { type: "p", text: "It pays for things that cross between players: season entry and marketplace trades. Nothing in the game produces it." },
        { type: "h3", text: "Marketplace split" },
        { type: "table", head: Object.freeze(["Share", "Goes to", "Why"]), rows: Object.freeze([
          Object.freeze(["90%", "Seller", "The trade is between players; we are not the counterparty."]),
          Object.freeze(["5%", "Burned", "A sink. Without one, currency only accumulates."]),
          Object.freeze(["5%", "Prize treasury", "Funds later seasons from activity rather than from new buyers."]),
        ]) },
        { type: "h3", text: "Crafted gear cannot be sold" },
        { type: "p", text: "Items forged from scrap are account-bound. Otherwise scrap becomes a printing press: craft, sell, buy more scrap, repeat — and the marketplace fills with manufactured supply until nothing dropped in a run is worth anything." },
        { type: "h3", text: "What the treasury is" },
        { type: "p", text: "An address that accumulates the prize share of marketplace fees and the entry payments. The first prize pool is funded from outside, and we say so rather than implying it appeared from activity that has not happened yet." },
      ]),
    }),

    Object.freeze({
      id: "architecture",
      title: "Architecture",
      lede: "What runs where, and which parts are deliberately boring.",
      blocks: Object.freeze([
        { type: "table", head: Object.freeze(["Part", "Runs on", "Holds"]), rows: Object.freeze([
          Object.freeze(["Client", "Static hosting", "Nothing of value"]),
          Object.freeze(["API", "Node + Express", "Sessions, items, receipts"]),
          Object.freeze(["Database", "Postgres", "Accounts, equipment, seasons"]),
          Object.freeze(["Payments watcher", "Same API process", "Read-only chain cursor"]),
        ]) },
        { type: "h3", text: "The server has no keys" },
        { type: "p", text: "Payments are read, never received: the watcher polls transfer logs for the treasury address and matches them to linked wallets. There is no private key anywhere in the deployment, so there is nothing on the server worth stealing to move funds." },
        { type: "h3", text: "One engine, two places" },
        { type: "p", text: "The run engine and the verification maths are single modules loaded both by the browser and by the server. Two implementations would drift, and the first sign of drift would be an honest run rejected as invalid." },
        { type: "h3", text: "Status" },
        { type: "p", text: "The Status button in the sidebar measures rather than asserts: it queries the database, reads the age of the payment watcher's cursor, and reports the current season state. A status page that repeats constants from the code is decoration." },
      ]),
    }),

    Object.freeze({
      id: "faq",
      title: "FAQ",
      lede: "The questions worth answering plainly.",
      blocks: Object.freeze([
        { type: "h3", text: "Is the game free?" },
        { type: "p", text: "Yes. The forest, the village, crafting and earned pulls cost nothing. Seasons and the marketplace are the paid parts." },
        { type: "h3", text: "Are items NFTs?" },
        { type: "p", text: "No. Equipment is recorded server-side. It survives trading, and the marketplace moves it between accounts without minting anything. Making each sword a token would add gas to every drop and solve nothing that the receipt chain does not already solve." },
        { type: "h3", text: "Can you change my score?" },
        { type: "p", text: "We can refuse to accept a run, and you would see that. We cannot quietly change one: the score comes from replaying your own recorded input, and every receipt is chained to the previous one." },
        { type: "h3", text: "What happens if I lose my wallet?" },
        { type: "p", text: "If a username is also linked, that still works. If not, the account is gone — we cannot restore access to an account whose only proof of ownership is a key we never had." },
        { type: "h3", text: "Why should I believe any of this?" },
        { type: "p", text: "You should not have to. Every claim on this page corresponds to something you can recompute from the published code and the evidence the server hands you. Start with the verification page and a pull id." },
      ]),
    }),
  ]),
});
