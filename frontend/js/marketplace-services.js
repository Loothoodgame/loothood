(function initMarketplaceServices(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodMarketplaceServices = api;
})(typeof window !== "undefined" ? window : globalThis, function marketplaceServicesFactory() {
  "use strict";

  const MAX_ITEM_NAME_LENGTH = 24;
  const QUOTE_VALIDITY_MS = 60_000;
  const DRIFT_THRESHOLD = 0.25;
  const AUTHORITY_AVAILABLE = false;
  const MARKETPLACE_SPLIT = Object.freeze({ seller: 0.90, burn: 0.05, treasury: 0.05 });
  const TRADEABLE_PROVENANCE = Object.freeze(new Set(["gacha_standard", "gacha_premium"]));
  const SLOT_OPTIONS = Object.freeze(["all", "helmet", "chest", "boots", "legs", "bowstring"]);
  const RARITY_OPTIONS = Object.freeze(["all", "rare", "epic", "legendary"]);
  const STAT_OPTIONS = Object.freeze([
    ["damage", "Damage"],
    ["aps", "Arrows per second"],
    ["critChance", "Critical chance"],
    ["critDamage", "Critical damage"],
    ["maxHp", "Maximum HP"],
    ["regen", "HP regeneration"],
    ["moveSpeed", "Move speed"],
    ["damageReduction", "Damage reduction"],
  ].map(([id, label]) => Object.freeze({ id, label })));

  function freezeListing(value) {
    return Object.freeze({
      ...value,
      stats: Object.freeze([...value.stats]),
      affixes: Object.freeze(value.affixes.map((entry) => Object.freeze([...entry]))),
    });
  }

  const FIXTURE_LISTINGS = Object.freeze([
    freezeListing({
      id: "near-fang", name: "Nearfang Cowl", rarity: "legendary", slot: "helmet",
      provenance: "gacha_premium", provenanceLabel: "Limited Pull", seller: "NottinghamFox",
      fixedUsd: 120, quoteHb: 86240, listedAt: 6,
      effect: { name: "Nearfang Cowl", description: "When an Autoshot begins within 150 units, it can Pierce one additional enemy but deals 10% less damage." },
      stats: ["damage", "critChance", "aps", "moveSpeed"],
      affixes: [["Damage", "+9.5%"], ["Critical chance", "+8 points"], ["Arrows per second", "+8.5%"], ["Move speed", "+7.5%"]],
    }),
    freezeListing({
      id: "briar-blood", name: "Briarblood Hunter's Coat", rarity: "legendary", slot: "chest",
      provenance: "gacha_standard", provenanceLabel: "Standard Pull", seller: "GreenwoodHart",
      fixedUsd: 95, quoteHb: 68273, listedAt: 5,
      effect: { name: "Briarblood Hunter's Coat", description: "Hostile slows grant 100% movement speed instead. All incoming damage is increased to 110% of normal." },
      stats: ["maxHp", "damageReduction", "regen", "damage"],
      affixes: [["Maximum HP", "+19"], ["Damage reduction", "+7 points"], ["HP regeneration", "+0.18/sec"], ["Damage", "+8.5%"]],
    }),
    freezeListing({
      id: "thorn-boots", name: "Thornstep Boots", rarity: "epic", slot: "boots",
      provenance: "gacha_standard", provenanceLabel: "Standard Pull", seller: "OakWatch",
      fixedUsd: 34, quoteHb: 24435, listedAt: 4, effect: null,
      stats: ["moveSpeed", "damage", "critChance", "maxHp"],
      affixes: [["Move speed", "+7.5%"], ["Damage", "+8%"], ["Critical chance", "+6.5 points"], ["Maximum HP", "+18"]],
    }),
    freezeListing({
      id: "royal-cord", name: "Royal Bow Cord", rarity: "rare", slot: "bowstring",
      provenance: "gacha_premium", provenanceLabel: "Limited Pull", seller: "SherwoodYew",
      fixedUsd: 18, quoteHb: 12936, listedAt: 3, effect: null,
      stats: ["damage", "aps", "critDamage"],
      affixes: [["Damage", "+9%"], ["Arrows per second", "+7.5%"], ["Critical damage", "+18%"]],
    }),
    freezeListing({
      id: "warden-legs", name: "Warden Legwraps", rarity: "epic", slot: "legs",
      provenance: "gacha_standard", provenanceLabel: "Standard Pull", seller: "BrambleRoad",
      fixedUsd: 42, quoteHb: 30183, listedAt: 2, effect: null,
      stats: ["maxHp", "damageReduction", "moveSpeed", "critDamage"],
      affixes: [["Maximum HP", "+20"], ["Damage reduction", "+7.5 points"], ["Move speed", "+7%"], ["Critical damage", "+19%"]],
    }),
    freezeListing({
      id: "hunter-hood", name: "Hunter's Hood", rarity: "rare", slot: "helmet",
      provenance: "gacha_standard", provenanceLabel: "Standard Pull", seller: "RedDeer",
      fixedUsd: 22, quoteHb: 15812, listedAt: 1, effect: null,
      stats: ["damage", "moveSpeed", "critChance"],
      affixes: [["Damage", "+10%"], ["Move speed", "+6%"], ["Critical chance", "+7 points"]],
    }),
  ]);

  const FIXTURE_SELL_ITEMS = Object.freeze([
    Object.freeze({ id: "sell-standard", name: "Greenwood Cowl", rarity: "epic", slot: "helmet", provenance: "gacha_standard", provenanceLabel: "Standard Pull", verified: true, owned: true, equipped: false, listed: false }),
    Object.freeze({ id: "sell-equipped", name: "Sherwood Treads", rarity: "legendary", slot: "boots", provenance: "gacha_premium", provenanceLabel: "Limited Pull", verified: true, owned: true, equipped: true, listed: false }),
    Object.freeze({ id: "sell-crafted", name: "Forged Bramblecoat", rarity: "epic", slot: "chest", provenance: "scrap_craft", provenanceLabel: "Scrap-crafted · Account-bound", verified: true, owned: true, equipped: false, listed: false }),
    Object.freeze({ id: "sell-reward", name: "Outlaw's Bowstring", rarity: "legendary", slot: "bowstring", provenance: "p0_first_clear", provenanceLabel: "First-clear reward · Account-bound", verified: true, owned: true, equipped: false, listed: false }),
  ]);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function assertItemName(name) {
    const normalized = String(name || "").trim();
    if ([...normalized].length > MAX_ITEM_NAME_LENGTH) throw new RangeError(`Equipment name exceeds ${MAX_ITEM_NAME_LENGTH} characters: ${normalized}`);
    return normalized;
  }

  function normalizedStatState(value) {
    return value === "include" || value === "exclude" ? value : "ignore";
  }

  function normalizeFilters(filters = {}) {
    const slot = SLOT_OPTIONS.includes(filters.slot) ? filters.slot : "all";
    const rarity = RARITY_OPTIONS.includes(filters.rarity) ? filters.rarity : "all";
    const stats = {};
    for (const option of STAT_OPTIONS) stats[option.id] = normalizedStatState(filters.stats?.[option.id]);
    const sort = ["newest", "low", "high"].includes(filters.sort) ? filters.sort : "newest";
    return { slot, rarity, stats, sort };
  }

  function initialState() {
    return {
      live: false,
      authorityAvailable: false,
      listings: null,
      sellItems: null,
      activeListings: null,
      activity: [],
      saleTotals: null,
      wallet: null,
      tab: "browse",
      filters: normalizeFilters(),
      selectedListingId: FIXTURE_LISTINGS[0].id,
      selectedSellItemId: FIXTURE_SELL_ITEMS[0].id,
      sellPriceUsd: "95",
      activeAttempt: false,
      status: "",
      checkoutListingId: "",
      checkoutTermsAccepted: false,
      checkoutRecipientMode: "self",
      checkoutRecipientQuery: "",
      checkoutRecipient: null,
      checkoutQuote: null,
      checkoutViewedAmount: 0,
      checkoutDrifted: false,
      cancelListingId: "",
    };
  }

  function filterListings(listings = FIXTURE_LISTINGS, filters = {}) {
    const normalized = normalizeFilters(filters);
    const required = Object.entries(normalized.stats).filter(([, state]) => state === "include").map(([id]) => id);
    const excluded = Object.entries(normalized.stats).filter(([, state]) => state === "exclude").map(([id]) => id);
    const filtered = listings.filter((listing) => (
      (normalized.slot === "all" || listing.slot === normalized.slot)
      && (normalized.rarity === "all" || listing.rarity === normalized.rarity)
      && required.every((id) => listing.stats.includes(id))
      && excluded.every((id) => !listing.stats.includes(id))
    ));
    return [...filtered].sort((left, right) => {
      if (normalized.sort === "low") return left.fixedUsd - right.fixedUsd;
      if (normalized.sort === "high") return right.fixedUsd - left.fixedUsd;
      return right.listedAt - left.listedAt;
    });
  }

  function toggleStatFilter(filters, statId, requestedState) {
    if (!STAT_OPTIONS.some((option) => option.id === statId)) return normalizeFilters(filters);
    const normalized = normalizeFilters(filters);
    const state = normalizedStatState(requestedState);
    normalized.stats[statId] = normalized.stats[statId] === state ? "ignore" : state;
    return normalized;
  }

  function clearStatFilters(filters) {
    const normalized = normalizeFilters(filters);
    for (const option of STAT_OPTIONS) normalized.stats[option.id] = "ignore";
    return normalized;
  }

  function splitAmount(amount) {
    const normalized = Math.max(0, Math.round(Number(amount) || 0));
    const seller = Math.round(normalized * MARKETPLACE_SPLIT.seller);
    const burn = Math.round(normalized * MARKETPLACE_SPLIT.burn);
    return { total: normalized, seller, burn, treasury: normalized - seller - burn };
  }

  function isQuoteDrifted(previousAmount, nextAmount) {
    const previous = Number(previousAmount);
    const next = Number(nextAmount);
    if (!(previous > 0) || !(next >= 0)) return false;
    return Math.abs(next - previous) / previous >= DRIFT_THRESHOLD;
  }

  function createFixtureQuote(listing, now = Date.now(), amount = listing?.quoteHb) {
    if (!listing) return null;
    const quotedAt = Math.floor(Number(now) || 0);
    const hbAmount = Math.max(0, Math.round(Number(amount) || 0));
    return Object.freeze({ listingId: listing.id, fixedUsd: listing.fixedUsd, hbAmount, quotedAt, expiresAt: quotedAt + QUOTE_VALIDITY_MS, split: splitAmount(hbAmount), sourceLabel: "5-minute TWAP · Preview fixture" });
  }

  function isQuoteExpired(quote, now = Date.now()) {
    return !quote || Number(now) >= Number(quote.expiresAt || 0);
  }

  function listingEligibility(item, context = {}) {
    if (!item?.owned) return { eligible: false, code: "not-owned", reason: "Ownership could not be verified." };
    if (!item.verified) return { eligible: false, code: "invalid", reason: "Equipment verification failed." };
    if (!TRADEABLE_PROVENANCE.has(item.provenance)) return { eligible: false, code: "account-bound", reason: "Only Standard and Limited Pull equipment can be listed." };
    if (item.listed || context.listedItemIds?.includes?.(item.id)) return { eligible: false, code: "already-listed", reason: "This item is already listed." };
    if (item.equipped || context.equippedItemIds?.includes?.(item.id)) return { eligible: false, code: "equipped", reason: "Unequip this item before listing it." };
    if (context.activeAttempt) return { eligible: false, code: "active-attempt", reason: "Finish or abandon the active attempt before listing equipment." };
    return { eligible: true, code: "eligible", reason: "Eligible Gacha equipment." };
  }

  function disabledResult(operation) {
    return Object.freeze({ ok: false, code: "authority-unavailable", operation, message: "Marketplace authority is unavailable in this developer preview." });
  }

  function createDisabledAdapter() {
    return Object.freeze({
      authorityAvailable: false,
      cryptoEnabled: false,
      async queryListings() { return { ok: true, fixture: true, listings: clone(FIXTURE_LISTINGS) }; },
      async queryItemState(itemId) { return disabledResult(`query-item:${itemId}`); },
      async createListing() { return disabledResult("create-listing"); },
      async cancelListing() { return disabledResult("cancel-listing"); },
      async generateQuote() { return disabledResult("generate-quote"); },
      async queryWalletBinding() { return disabledResult("wallet-binding"); },
      async resolveRecipient() { return disabledResult("resolve-recipient"); },
      async preparePurchase() { return disabledResult("prepare-purchase"); },
      async settlePurchase() { return disabledResult("settle-purchase"); },
      async querySaleHistory() { return { ok: true, fixture: true, history: [] }; },
    });
  }

  function buildPreviewModel(state = initialState(), now = Date.now()) {
    const filters = normalizeFilters(state.filters);
    const live = Boolean(state.live);
    const listingSource = Array.isArray(state.listings) ? state.listings : live ? [] : FIXTURE_LISTINGS;
    const sellSource = Array.isArray(state.sellItems) ? state.sellItems : live ? [] : FIXTURE_SELL_ITEMS;
    const listings = filterListings(listingSource, filters);
    const selectedListing = listings.find((listing) => listing.id === state.selectedListingId) || listings[0] || null;
    const sellItems = sellSource.map((item) => ({ ...item, eligibility: listingEligibility(item, { activeAttempt: state.activeAttempt }) }));
    const selectedSellItem = sellItems.find((item) => item.id === state.selectedSellItemId) || sellItems[0] || null;
    const sellQuote = selectedSellItem && !state.live ? createFixtureQuote({ id: selectedSellItem.id, fixedUsd: Number(state.sellPriceUsd) || 0, quoteHb: Math.round((Number(state.sellPriceUsd) || 0) * 718.6667) }, now) : null;
    const checkoutListing = listingSource.find((listing) => listing.id === state.checkoutListingId) || null;
    const quote = state.checkoutQuote ? { ...state.checkoutQuote, split: splitAmount(state.checkoutQuote.hbAmount) } : null;
    const remainingMs = quote ? Math.max(0, quote.expiresAt - now) : 0;
    return {
      authorityAvailable: Boolean(state.authorityAvailable),
      live,
      status: state.status || (live ? "Marketplace authority is not available yet." : "Developer preview · Transactions unavailable."),
      tab: ["browse", "sell", "listings"].includes(state.tab) ? state.tab : "browse",
      filters,
      filterOptions: { slots: SLOT_OPTIONS, rarities: RARITY_OPTIONS, stats: STAT_OPTIONS },
      listings,
      selectedListing,
      sellItems,
      selectedSellItem,
      sellPriceUsd: state.sellPriceUsd,
      sellQuote,
      activeAttempt: Boolean(state.activeAttempt),
      wallet: state.wallet || (live
        ? { account: "Current account", address: "Connect a wallet when Marketplace opens.", fixture: false }
        : { account: "GreenArrow_7", address: "0x71A4…92BD", balanceHb: 100000, fixture: true }),
      checkout: checkoutListing ? {
        listing: checkoutListing,
        quote,
        termsAccepted: Boolean(state.checkoutTermsAccepted),
        recipientMode: state.checkoutRecipientMode === "other" ? "other" : "self",
        recipientQuery: state.checkoutRecipientQuery || "",
        recipient: state.checkoutRecipient,
        drifted: Boolean(state.checkoutDrifted),
        expired: isQuoteExpired(quote, now),
        remainingSeconds: Math.ceil(remainingMs / 1000),
        shortfall: state.live ? 0 : quote ? Math.max(0, quote.hbAmount - 100000) : 0,
      } : null,
      cancellation: state.cancelListingId ? { listing: listingSource.find((entry) => entry.id === state.cancelListingId) || listingSource[0] } : null,
      activeListings: Array.isArray(state.activeListings)
        ? state.activeListings
        : live
          ? []
          : [{ ...FIXTURE_LISTINGS[1], frozenWallet: "0x71A4…92BD" }],
      activity: live ? (Array.isArray(state.activity) ? state.activity : []) : [
        { type: "sale", label: "Thornstep Boots sold", detail: "Seller 21,992 · Burn 1,222 · Treasury 1,221 $HB" },
        { type: "cancel", label: "Royal Bow Cord cancelled", detail: "Returned to Outfitter · Excluded from sale totals" },
      ],
      saleTotals: state.saleTotals || (live
        ? { completed: 0, volumeHb: 0, sellerHb: 0, burnHb: 0, treasuryHb: 0 }
        : { completed: 1, volumeHb: 24435, sellerHb: 21992, burnHb: 1222, treasuryHb: 1221 }),
    };
  }

  FIXTURE_LISTINGS.forEach((listing) => assertItemName(listing.name));
  FIXTURE_SELL_ITEMS.forEach((item) => assertItemName(item.name));

  return Object.freeze({
    AUTHORITY_AVAILABLE,
    DRIFT_THRESHOLD,
    FIXTURE_LISTINGS,
    FIXTURE_SELL_ITEMS,
    MARKETPLACE_SPLIT,
    MAX_ITEM_NAME_LENGTH,
    QUOTE_VALIDITY_MS,
    RARITY_OPTIONS,
    SLOT_OPTIONS,
    STAT_OPTIONS,
    assertItemName,
    buildPreviewModel,
    clearStatFilters,
    clone,
    createDisabledAdapter,
    createFixtureQuote,
    filterListings,
    initialState,
    isQuoteDrifted,
    isQuoteExpired,
    listingEligibility,
    normalizeFilters,
    splitAmount,
    toggleStatFilter,
  });
});
