(function initDesktopMainMenu(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root?.document) root.LoothoodDesktopMainMenu = api;
})(typeof window !== "undefined" ? window : globalThis, function desktopMainMenuFactory() {
  "use strict";

  const ASSET_ROOT = "./assets/ui/main-menu-foundation-v1/";
  const SCREENS = Object.freeze([
    "hunt",
    "settlement",
    "plots",
    "bounties",
    "guide",
    "docs",
    "standard-prep",
    "season-centre",
    "entry-ticket-review",
    "entry-ticket-secured",
    "entry-ticket-active",
    "seasonal-prep",
    "season-leaderboard",
    "equipment-pulls",
    "outfitter",
    "marketplace",
    "outfitter-reroll",
    "outfitter-scrap-forge",
    "outfitter-scrap-review",
  ]);

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatNumber(value) {
    return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("en-US");
  }

  function titleCase(value) {
    const text = String(value || "");
    return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "";
  }

  function asset(file) {
    return `${ASSET_ROOT}${file}`;
  }

  // Art for a named legendary, looked up by its name. The file name is built by
  // the same rule as in tools/sprites/build-manifest.py — otherwise half the
  // links drift away from what actually sits in images.
  function legendaryArt(itemName) {
    const slug = String(itemName || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) return "";
    // The path has to be absolute. The value goes into the --lh-item variable,
    // and url() inside a variable is resolved by the browser relative to the
    // stylesheet where the variable is used, not relative to the page: a
    // relative images/… turned into /css/images/… and gave a 404.
    // The version tag is mandatory. The image address did not change when the
    // art was redrawn, and the browser kept serving the old file out of cache:
    // the items had been regenerated and aligned to the bottom, yet the screen
    // still showed the previous ones. Stylesheets had such a tag from the very
    // beginning, item icons did not.
    // Bump it on every regeneration of the set.
    return new URL(`images/item-legendary-${slug}-v1.png?v=2`, document.baseURI).href;
  }

  function symbols() {
    return `
      <svg class="hb-symbols" aria-hidden="true">
        <defs>
          <symbol id="hb-icon-account-settings" viewBox="0 0 48 48"><circle cx="18" cy="15" r="6"/><path d="M7 36c1-8 5-12 11-12 5 0 9 3 11 8"/><circle cx="36" cy="34" r="5"/><path d="M36 24v4M36 40v4M26 34h5M41 34h5M29 27l3 3M40 38l3 3M43 27l-3 3M32 38l-3 3"/></symbol>
          <symbol id="hb-icon-volume" viewBox="0 0 15 15" shape-rendering="crispEdges"><rect x="7" y="1" width="2" height="1"/><rect x="6" y="2" width="3" height="1"/><rect x="13" y="2" width="2" height="1"/><rect x="5" y="3" width="4" height="1"/><rect x="13" y="3" width="2" height="1"/><rect x="4" y="4" width="5" height="1"/><rect x="10" y="4" width="2" height="1"/><rect x="13" y="4" width="2" height="1"/><rect x="1" y="5" width="8" height="1"/><rect x="10" y="5" width="2" height="1"/><rect x="13" y="5" width="2" height="1"/><rect x="1" y="6" width="8" height="1"/><rect x="10" y="6" width="2" height="1"/><rect x="13" y="6" width="2" height="1"/><rect x="1" y="7" width="8" height="1"/><rect x="10" y="7" width="2" height="1"/><rect x="13" y="7" width="2" height="1"/><rect x="1" y="8" width="8" height="1"/><rect x="10" y="8" width="2" height="1"/><rect x="13" y="8" width="2" height="1"/><rect x="4" y="9" width="5" height="1"/><rect x="10" y="9" width="2" height="1"/><rect x="13" y="9" width="2" height="1"/><rect x="5" y="10" width="4" height="1"/><rect x="13" y="10" width="2" height="1"/><rect x="6" y="11" width="3" height="1"/><rect x="13" y="11" width="2" height="1"/><rect x="7" y="12" width="2" height="1"/></symbol>
          <symbol id="hb-icon-muted" viewBox="0 0 15 15" shape-rendering="crispEdges"><rect x="7" y="1" width="2" height="1"/><rect x="6" y="2" width="3" height="1"/><rect x="5" y="3" width="4" height="1"/><rect x="4" y="4" width="5" height="1"/><rect x="1" y="5" width="8" height="1"/><rect x="1" y="6" width="8" height="1"/><rect x="1" y="7" width="8" height="1"/><rect x="1" y="8" width="8" height="1"/><rect x="4" y="9" width="5" height="1"/><rect x="5" y="10" width="4" height="1"/><rect x="6" y="11" width="3" height="1"/><rect x="7" y="12" width="2" height="1"/><path d="M9.5 3.5 L14 8" stroke="currentColor" stroke-width="2" fill="none" shape-rendering="auto"/><path d="M14 3.5 L9.5 8" stroke="currentColor" stroke-width="2" fill="none" shape-rendering="auto"/></symbol>
          <symbol id="hb-nav-hunt" viewBox="0 0 48 48"><path d="M12 7c10 8 10 26 0 34M36 7c-10 8-10 26 0 34M12 24h26M31 18l7 6-7 6"/></symbol>
          <symbol id="hb-nav-settlement" viewBox="0 0 48 48"><path d="M6 23 24 7l18 16M11 21v20h26V21M19 41V28h10v13M8 41h32"/></symbol>
          <symbol id="hb-nav-plots" viewBox="0 0 48 48"><path d="m8 10 10-4 12 4 10-4v32l-10 4-12-4-10 4zM18 6v32M30 10v32"/><path d="m12 30 7-8 6 4 9-10"/></symbol>
          <symbol id="hb-nav-gacha" viewBox="0 0 48 48"><path d="M8 8h32v32H8z"/><path d="m24 13 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z"/></symbol>
          <symbol id="hb-nav-outfitter" viewBox="0 0 48 48"><path d="m15 8 9 5 9-5 8 9-6 7v17H13V24l-6-7zM18 12l6 9 6-9M24 21v20"/></symbol>
          <symbol id="hb-nav-bounties" viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="9"/><path d="M24 2v12M24 34v12M2 24h12M34 24h12"/></symbol>
          <symbol id="hb-nav-guide" viewBox="0 0 48 48"><path d="M6 9c8-3 14-1 18 4v29c-4-5-10-7-18-4zM42 9c-8-3-14-1-18 4v29c4-5 10-7 18-4z"/><path d="M11 16h8M11 22h8M29 16h8M29 22h8"/></symbol>
        </defs>
      </svg>`;
  }

  function resource(label, value, file, className = "") {
    const display = formatNumber(value);
    const classes = ["hb-resource", className, Number(value) === 0 ? "is-zero" : ""].filter(Boolean).join(" ");
    return `<div class="${classes}" aria-label="${escapeHtml(label)} ${display}"><img class="hb-resource__icon" src="${asset(file)}" alt=""><span>${display}</span></div>`;
  }

  function weeklyProgressPercent(completed) {
    const earned = Math.min(7, Math.max(0, Math.floor(Number(completed) || 0)));
    return earned <= 1 ? 0 : ((earned - 1) / 6) * 100;
  }

  function topbar(model) {
    const resources = model.resources;
    return `
      <header class="hb-topbar">
        <div class="hb-brand-lockup">
          <img class="hb-wordmark" src="${asset("loothood-wordmark-primary.png")}" alt="LOOTHOOD">
          <span class="hb-brand-divider" aria-hidden="true"></span>
          <span class="hb-prestige-stack"><span class="hb-prestige">${escapeHtml(model.displayName || "LOOTHOOD Ranger")}</span><span class="hb-version-label">Forest P${escapeHtml(model.prestige)} · Alpha v${escapeHtml(model.version)}</span></span>
        </div>
        <div class="hb-resources" aria-label="Resources">
          ${resource("Gold", resources.gold, "resource-gold-v3.png", "hb-resource--gold")}
          ${resource("Wood", resources.wood, "resource-wood-v3.png", "hb-resource--wood")}
          ${resource("Ore", resources.ore, "resource-ore-v3.png", "hb-resource--ore")}
          ${resource("Boss Trophies", resources.bossTrophies, "resource-boss-trophy-v3.png")}
          ${resource("Sheriff's Crests", resources.sheriffsCrests, "resource-sheriff-crest-v3.png")}
          ${resource("Standard Tickets", resources.standardTickets, "resource-standard-ticket-v3.png", "hb-resource--ticket")}
          ${resource("Limited Tickets", resources.limitedTickets, "resource-limited-ticket-v3.png", "hb-resource--limited")}
          <button class="hb-add" type="button" aria-label="Open Account and Settings" title="Account &amp; Settings" data-shell-destination="account-settings" data-focus-key="account-settings"><svg><use href="#hb-icon-account-settings"/></svg></button>
          <button class="hb-audio-toggle" type="button" aria-label="${model.musicMuted ? "Unmute music" : "Mute music"}" aria-pressed="${String(!model.musicMuted)}" title="${model.musicMuted ? "Unmute Forest soundtrack" : "Mute Forest soundtrack"}" data-audio-action="toggle" data-focus-key="menu-audio"><svg aria-hidden="true"><use href="#${model.musicMuted ? "hb-icon-muted" : "hb-icon-volume"}"/></svg></button>
        </div>
      </header>`;
  }

  function navigation(screen = "hunt") {
    const activeDestination = screen === "settlement" || screen === "plots" || screen === "bounties" || screen === "guide"
      ? screen
      : screen === "equipment-pulls"
        ? "gacha"
        : screen === "marketplace"
          ? "marketplace"
        : screen.startsWith("outfitter")
          ? "outfitter"
          : "hunt";
    const marketSvg = '<svg viewBox="0 0 24 24"><path d="M3 4h3l2.2 12h10L21 7H7"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>';
    const groups = [
      ["Play", [
        ["hunt", "Hunt", "#b7f24a", "hb-nav-hunt", null],
      ]],
      ["Camp", [
        ["settlement", "Village", "#2be28a", "hb-nav-settlement", null],
        ["plots", "Plots", "#46d8e0", "hb-nav-plots", null],
        ["bounties", "Bounties", "#ff9d3d", "hb-nav-bounties", null],
      ]],
      // Market sits inside Gear rather than in a group of its own: what it
      // sells is exactly what lives in Loadout and drops from Loot Pulls. A
      // separate "Trade" group turned the market into a thing apart, when it is
      // really the third way to get the same item — buy it instead of pulling
      // or crafting it.
      ["Gear", [
        ["gacha", "Loot Pulls", "#b48cff", "hb-nav-gacha", null],
        ["outfitter", "Loadout", "#35d0ff", "hb-nav-outfitter", null],
        ["marketplace", "Market", "#6ea8ff", null, marketSvg],
      ]],
      ["More", [
        ["guide", "Guide", "#8ea89b", "hb-nav-guide", null],
        // The same book glyph, a different colour: Docs and Guide are kin, and
        // drawing them as different objects would pull apart things that stand
        // side by side. Colour tells the roles apart, shape shows the kinship.
        ["docs", "Docs", "#6ea8ff", "hb-nav-guide", null],
      ]],
    ];
    const body = groups.map(([groupName, items]) => {
      const links = items.map(([destination, label, color, symbol, inlineSvg]) => {
        const active = destination === activeDestination;
        const icon = symbol ? `<svg viewBox="0 0 48 48"><use href="#${symbol}"/></svg>` : (inlineSvg || "");
        return `<button class="hb-nav-item${active ? " is-active" : ""}" type="button" data-shell-destination="${destination}" data-focus-key="nav-${destination}" style="--c:${color}"${active ? ' aria-current="page"' : ""}><span class="hb-nav-ic">${icon}</span><span>${label}</span></button>`;
      }).join("");
      return `<div class="hb-nav-group">${groupName}</div>${links}`;
    }).join("");
    /* Sidebar footer: where to go outside the game.
       ------------------------------------------------------------------
       Below the groups there was empty space running the full height — not
       because it was meant that way, but because there are fewer items than
       there is column. The links and the system status fill it for a reason:
       both are looked for not during play but "in between", and there is no
       point burying them in a screen of their own.

       Status is a button, not a line with a dot: a dot that is always green
       stops being read after a week. The button shows the per-system
       breakdown, and only on request — a background poll for decoration's sake
       would mean a request to the server every few seconds from every open
       window. */
    const sideLinks = [
      ["https://github.com/Loothoodgame/loothood", "GitHub",
       '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>'],
      // The X address will appear once the account itself does. A placeholder
      // link that leads nowhere is worse than a missing one: the player clicks,
      // lands on an error, and we hear about it from them. So the button is
      // inactive and says honestly why.
      [null, "X",
       '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12.6 0h2.45l-5.35 6.12L16 16h-4.94l-3.87-5.06L2.76 16H.3l5.72-6.54L0 0h5.06l3.5 4.63L12.6 0zm-.86 14.54h1.36L4.32 1.38H2.87l8.87 13.16z"/></svg>'],
    ].map(([href, label, icon]) => (href
      ? `<a class="hb-side-link" href="${href}" target="_blank" rel="noopener noreferrer">${icon}<span>${label}</span></a>`
      : `<span class="hb-side-link is-soon" title="Coming soon">${icon}<span>${label}</span></span>`
    )).join("");

    const footer = `<div class="hb-sidebar-foot">
      <div class="hb-side-links">${sideLinks}</div>
      <button class="hb-side-status" type="button" data-status-open="1" data-focus-key="sidebar-status">
        <span class="hb-side-status__dot" data-state="unknown" aria-hidden="true"></span>
        <span>Status</span>
      </button>
    </div>`;
    return `<nav class="hb-sidebar" aria-label="Main navigation">${body}${footer}</nav>`;
  }

  // Screen header. Key art with no people in it: a generated hero would not
  // match the archer sprite in combat, and the main screen would be showing
  // somebody else's character.
  // The argument is needed because six screens draw this same header, and on
  // Village it hid the settlement's own background — the header covered it up.
  // Key arts are motionless PNGs, and the forest in them looks stopped dead.
  // What we bring to life is not the picture but the air above it: a layer of
  // fireflies over the still. Frames cannot be reproduced by generation (the
  // model draws a new forest every time), whereas a dozen dots drifting along
  // their own paths reads as life and costs nothing.
  function heroImage(src, alt) {
    const url = src || asset("loothood-forest-key-art-v2.png?v=2");
    const text = alt || "A moonlit forest road leading to the outlaw camp";
    // Sixteen, not nine. Nine spread out along a strip more than one thousand
    // three hundred pixels wide, and two or three dots were lit in frame at any
    // one moment: the motion was measurable, but the eye did not read it.
    const flies = Array.from({ length: 16 }, (_, i) =>
      `<i class="hb-firefly" style="--i:${i}"></i>`).join("");
    // No wrapper: .hb-promo-art is positioned absolutely against the scene
    // container, and any layer between the two becomes a new coordinate system
    // for the image — the village art slid 243 pixels up and off the screen.
    // The firefly layer goes in as a sibling and is absolute too, so it never
    // enters the parent's flow and does not change the layout.
    return `<img class="hb-promo-art" src="${url}" alt="${escapeHtml(text)}">` +
      `<span class="hb-fireflies" aria-hidden="true">${flies}</span>`;
  }

  function seasonTabs(active) {
    return `<div class="hb-season-tabs" role="tablist" aria-label="Season Centre sections">${[
      ["overview", "Overview"],
      ["ticket", "Entry Ticket"],
      ["leaderboard", "Leaderboard"],
    ].map(([id, label]) => `<button class="${active === id ? "is-selected" : ""}" type="button" role="tab" aria-selected="${active === id}" tabindex="${active === id ? "0" : "-1"}" data-season-tab="${id}" data-focus-key="season-tab-${id}">${label}</button>`).join("")}</div>`;
  }

  function screenHeading(id, title, focusTarget = true) {
    return `<header class="hb-screen-heading"><h1 id="${id}" tabindex="-1"${focusTarget ? " data-screen-heading" : ""}>${title}</h1>${diamondRule("screen")}</header>`;
  }

  function diamondRule(variant = "panel") {
    return `<span class="hb-diamond-rule hb-diamond-rule--${variant}" aria-hidden="true"></span>`;
  }

  function iconSlot(kind, state) {
    const attr = state ? ` data-bounty-state="${state}"` : "";
    return `<span class="hb-icon-slot hb-icon-slot--${kind}" data-icon-slot="${kind}"${attr} aria-hidden="true"></span>`;
  }

  // The model hands over bounty progress as a ready-made string like "0 / 4" or
  // "0 / 3,000"; there is no separate completion flag in it. We parse the string
  // so that the three states get different glyphs: the player must be able to
  // see what is done without reading into the counter.
  function bountyState(progress) {
    const parts = String(progress ?? "").replace(/[\s,]/g, "").match(/\d+(?:\.\d+)?/g);
    if (!parts || parts.length < 2) return "open";
    const done = Number(parts[0]);
    const target = Number(parts[1]);
    if (!Number.isFinite(done) || !Number.isFinite(target) || target <= 0) return "open";
    if (done >= target) return "done";
    return done > 0 ? "progress" : "open";
  }

  function renderHunt(model) {
    const weekly = model.weekly;
    const progress = Array.from({ length: 7 }, (_, index) => `<span${index < weekly.segments ? ' class="is-earned"' : ""}></span>`).join("");
    const rows = weekly.rows.map((row) => `<div>${iconSlot("bounty", bountyState(row.progress))}<dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.progress)} <b>›</b></dd></div>`).join("");
    return `<main class="hb-main" data-screen="hunt">
      <section class="hb-hunt-hero" aria-labelledby="hunt-title">${heroImage()}<div class="hb-hunt-panel">
        ${screenHeading("hunt-title", "Hunt")}
        <article class="hb-hunt-card is-selected"><div class="hb-hunt-card__copy"><h2>Standard Hunt</h2><p>15 Stages · Forest Prestige P${escapeHtml(model.prestige)}</p><p>Bosses: Stages 5, 10 and 15</p>${model.deepestStage > 15 ? `<p class="hb-hunt-record">Deepest: Stage ${escapeHtml(String(model.deepestStage))}</p>` : ""}</div><div class="hb-hunt-actions"><button type="button" class="hb-hunt-armoury" data-shell-destination="outfitter" data-focus-key="hunt-armoury"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/></svg><span>Armory</span></button><button type="button" class="hb-hunt-primary" data-hunt-action="standard" data-focus-key="prepare-standard"><svg class="hb-play" viewBox="0 0 24 24" aria-hidden="true"><rect class="hb-play__socket" width="24" height="24" rx="7"/><g class="hb-play__arrow"><rect x="14" y="4" width="2" height="2"/><rect x="14" y="6" width="4" height="2"/><rect x="14" y="8" width="6" height="2"/><rect x="2" y="10" width="20" height="2"/><rect x="2" y="12" width="20" height="2"/><rect x="14" y="14" width="6" height="2"/><rect x="14" y="16" width="4" height="2"/><rect x="14" y="18" width="2" height="2"/></g></svg><span class="hb-hunt-card__action-label">${model.builderPackActive ? "Continue Village Setup" : "Start Hunt"}</span></button></div></article>
        <article class="hb-hunt-card"><div class="hb-hunt-card__copy"><h2>Seasonal Hunt</h2><p>Entry Ticket required</p><p>Prize · Leaderboard</p></div><button type="button" data-hunt-action="seasonal" data-focus-key="season-centre"><span class="hb-hunt-card__action-label">Season Centre</span><span class="hb-hunt-card__action-arrow" aria-hidden="true">»</span></button></article>
      </div></section>
      <section class="hb-dashboard" aria-label="Hunt overview">
        <article class="hb-bounties"><header class="hb-panel-heading"><div><h2>Weekly Bounties</h2>${diamondRule("panel")}<p><strong class="hb-value">${weekly.completed} / 7</strong> Full Clears</p></div><span class="hb-reset">◷ Reset: ${escapeHtml(weekly.reset)}</span></header><div class="hb-progress" style="--hb-weekly-progress:${weeklyProgressPercent(weekly.completed)}%" aria-label="${weekly.completed} of seven full clears">${progress}</div><dl class="hb-bounty-list">${rows}</dl></article>
        <article class="hb-featured"><header class="hb-featured__heading"><div><span class="hb-featured__eyebrow">Featured Banner</span><h2>Featured Equipment</h2>${diamondRule("panel")}</div></header><div class="hb-featured__name" data-slot="bowstring" data-rarity="legendary"><h3>Outlaw’s Bowstring</h3><p>Legendary · Bowstring</p></div><div class="hb-featured__effect"><strong>Elemental Initiation</strong><p>Your first pick each run is an Uncommon elemental effect.</p></div><p class="hb-featured__rolls">${iconSlot("equipment-stat")}<span>4 high-weight stat rolls</span></p><footer class="hb-featured__footer"><div class="hb-pity"><div class="hb-pity-row hb-pity--epic"><span class="hb-pity-label">✣ Epic</span><span class="hb-pity-track"><i style="width:${Math.min(100,(Number(model.pity.epic)/10)*100)}%"></i></span><span class="hb-value">${formatNumber(model.pity.epic)}/10</span></div><div class="hb-pity-row hb-pity--legendary"><span class="hb-pity-label">✣ Legendary</span><span class="hb-pity-track"><i style="width:${Math.min(100,(Number(model.pity.legendary)/50)*100)}%"></i></span><span class="hb-value">${formatNumber(model.pity.legendary)}/50</span></div></div><button type="button" data-shell-destination="gacha" data-focus-key="featured-equipment"><span>Pull</span> <span aria-hidden="true">»</span></button></footer></article>
      </section></main>`;
  }

  function loadoutRows(model, seasonal) {
    return model.loadout.rows.map((row) => `<div${seasonal && row.overCap ? " data-loadout-offender" : ""}><dt>${escapeHtml(row.slot)}</dt><dd>${escapeHtml(row.rarity)}${seasonal ? row.overCap ? " · Over Cap" : " · Legal" : ""}</dd></div>`).join("");
  }

  function foundationControls(model, seasonal) {
    const role = model.foundations.limit === 1 ? "radio" : "checkbox";
    const stateAttribute = role === "radio" ? "aria-checked" : "aria-checked";
    return `${model.foundations.options.map((option) => `<button class="hb-prepare-foundation-option${option.selected ? " is-selected" : ""}" type="button" role="${role}" ${stateAttribute}="${option.selected}" data-menu-foundation="${escapeHtml(option.id)}" data-focus-key="foundation-${escapeHtml(option.id)}">${escapeHtml(option.name)} · ${escapeHtml(option.description)}</button>`).join("")}<p class="hb-prepare-foundation-note">${model.foundations.selectedCount} / ${model.foundations.limit} Foundation${model.foundations.limit === 1 ? "" : "s"} selected for this ${seasonal ? "attempt" : "run"}.</p>`;
  }

  function prestigeControl(model) {
    const prestige = model.prestigeState;
    const current = prestige.current;
    const options = prestige.options.map((option) => {
      const label = option.unlocked ? `P${option.tier}` : `P${option.tier} — ${option.unlockRequirement}`;
      return `<option value="${option.tier}"${option.selected ? " selected" : ""}${option.unlocked ? "" : " disabled"}>${escapeHtml(label)}</option>`;
    }).join("");
    const tierStatus = prestige.options.map((option) => {
      const stateClass = option.selected ? " is-selected" : option.unlocked ? " is-unlocked" : " is-locked";
      const status = option.unlocked ? option.name : `Locked. ${option.unlockRequirement}`;
      return `<span class="${stateClass}" title="${escapeHtml(status)}" aria-label="Prestige P${option.tier}. ${escapeHtml(status)}">P${option.tier}</span>`;
    }).join("");
    return `<div class="hb-prestige-control">
      <label class="hb-prestige-selector"><span aria-hidden="true">‹</span><select aria-label="Forest Prestige tier" data-menu-prestige-tier data-focus-key="prestige-selector">${options}</select><span aria-hidden="true">›</span></label>
      <strong>P${current.tier} · ${escapeHtml(current.name)}</strong>
      <p>${escapeHtml(current.modifier)}</p>
      <small class="hb-value">+${current.effects.hp}% HP · +${current.effects.damage}% Damage · +${current.effects.speed}% Speed · +${current.effects.gold}% Gold</small>
      <div class="hb-prestige-tier-status" aria-label="Forest Prestige unlock status">${tierStatus}</div>
    </div>`;
  }

  function renderPreparation(model, seasonal) {
    const invalidCount = seasonal ? model.loadout.invalidCount : 0;
    const verificationInvalid = (model.loadout.verificationErrors || 0) > 0;
    const invalid = invalidCount > 0 || verificationInvalid;
    const ready = seasonal ? model.seasonalReady : model.standardReady;
    const titleId = seasonal ? "prepare-hunt-title" : "standard-prepare-hunt-title";
    const context = seasonal
      ? `Season ${escapeHtml(model.season.number)} · Active Entry Ticket · ${escapeHtml(model.season.equipmentLabel)}`
      : `Standard Hunt · Forest Prestige P${escapeHtml(model.prestige)}`;
    return `<main class="hb-main ${seasonal ? "hb-seasonal-hunt-preparation" : "hb-standard-hunt-preparation"}" data-screen="${seasonal ? "seasonal-prep" : "standard-prep"}">
      <section class="hb-prepare-hero" aria-labelledby="${titleId}">${heroImage()}<div class="hb-prepare-overview">${screenHeading(titleId, "Start Hunt")}<p class="hb-prepare-season-line">${context}</p><article class="hb-prepare-state"><h2 data-prepare-state-title>${seasonal ? `Attempt 1 · ${ready ? "Ready" : "Not Ready"}` : ready ? "Ready" : "Not Ready"}</h2><ul><li>15-Stage Forest Selected</li><li class="hb-metadata-line" data-loadout-status>${iconSlot("status")}<span>${invalid ? "Loadout Requires Attention" : seasonal ? "Loadout Legal" : "Loadout Selected"}</span></li><li class="hb-metadata-line">${iconSlot("foundation")}<span>${model.foundations.selectedCount === model.foundations.limit ? "Foundation Selected" : `${model.foundations.selectedCount} / ${model.foundations.limit} Foundations Selected`}</span></li></ul></article></div></section>
      <section class="hb-prepare-dashboard" aria-label="Hunt preparation">
        <article class="hb-prepare-rules"><h2>Hunt Rules</h2>${diamondRule("panel")}<dl><div><dt>Route</dt><dd>15-Stage Forest</dd></div>${seasonal ? `<div><dt>Prestige</dt><dd>P${escapeHtml(model.season.prestigeTier)}</dd></div>` : `<div class="hb-prepare-prestige-row"><dt>Prestige</dt><dd>${prestigeControl(model)}</dd></div>`}<div><dt>Bosses</dt><dd>Stages 5, 10 and 15</dd></div><div><dt>Village</dt><dd>${seasonal ? escapeHtml(model.season.villageMode) : "Own Progression"}</dd></div><div><dt>Upgrades</dt><dd>Temporary This Run</dd></div></dl></article>
        <article class="hb-prepare-loadout"><h2>Loadout</h2>${diamondRule("panel")}<dl>${loadoutRows(model, seasonal)}</dl>${seasonal && invalid ? `<p class="hb-prepare-loadout-warning" role="alert">${invalidCount > 0 ? `${invalidCount} Equipped Item${invalidCount === 1 ? "" : "s"} Violates ${escapeHtml(model.season.equipmentLabel)}` : "Equipment Verification Failed"}</p>` : ""}<div class="hb-prepare-panel-action"><button class="hb-ledger-button" type="button" data-hunt-action="change-loadout" data-focus-key="change-loadout">${invalid ? "Review Loadout" : "Change Loadout"}</button></div></article>
        <article class="hb-prepare-foundation"><h2>Foundation</h2>${diamondRule("panel")}<div class="hb-prepare-foundation-list" role="${model.foundations.limit === 1 ? "radiogroup" : "group"}" aria-label="Choose a Foundation">${foundationControls(model, seasonal)}</div><div class="hb-prepare-final-actions"><button class="hb-ledger-button" type="button" data-hunt-action="${seasonal ? "entry-ticket" : "back"}" data-focus-key="prepare-back">${seasonal ? "Back to Entry Ticket" : "Back to Hunt"}</button><button class="hb-ledger-button is-primary" type="button" data-hunt-action="${seasonal ? "begin-seasonal-hunt" : "begin-standard-hunt"}" data-focus-key="begin-hunt"${ready ? "" : ' disabled aria-disabled="true"'}>${seasonal ? "Begin Seasonal Hunt" : "Begin Hunt"} <span aria-hidden="true">»</span></button></div></article>
      </section></main>`;
  }

  function renderSeasonCentre(model) {
    const season = model.season;
    const pendingLock = season.ticketState === "active" && Boolean(season.pendingCompletion);
    const ticketAction = pendingLock ? "lock-pending-score" : season.ticketState === "active" ? "begin-seasonal-hunt" : season.ticketState === "secured" ? "entry-ticket" : "review-ticket";
    const ticketLabel = pendingLock ? "Complete Score Lock" : season.ticketState === "active" ? "Begin Seasonal Hunt" : season.ticketState === "secured" ? "Open Entry Ticket" : "Review Entry Ticket";
    return `<main class="hb-main hb-season-centre" data-screen="season-centre"><section class="hb-season-hero" aria-labelledby="season-title">${heroImage()}<div class="hb-season-overview">${screenHeading("season-title", "Season Centre")}${seasonTabs("overview")}<article class="hb-season-summary"><h2>Season ${escapeHtml(season.number)}</h2><p class="hb-season-summary__eyebrow"><span>${escapeHtml(season.status)}</span> · Ends in ${escapeHtml(season.endsIn)}</p><dl><div><dt>Entry</dt><dd>Season Entry Ticket</dd></div><div><dt>Route</dt><dd>15-Stage Forest</dd></div><div><dt>Ranking</dt><dd>Best Verified Score</dd></div></dl></article></div></section><section class="hb-season-dashboard" aria-label="Season overview"><article class="hb-season-rules"><h2>Season Rules</h2><dl><div><dt>Route</dt><dd>Full 15-Stage Forest</dd></div><div><dt>Season</dt><dd>${escapeHtml(season.number)}</dd></div><div><dt>Prestige</dt><dd>P${escapeHtml(season.prestigeTier)}</dd></div><div><dt>Equipment</dt><dd>${escapeHtml(season.equipmentLabel)}</dd></div><div><dt>Village</dt><dd>${escapeHtml(season.villageMode)}</dd></div><div><dt>Ranking</dt><dd>Highest Verified Score</dd></div><div><dt>Tie-Break</dt><dd>Faster Active Time</dd></div></dl></article><article class="hb-season-ticket"><h2>Entry Ticket</h2><p class="hb-season-ticket__state">${pendingLock ? "Verified Score Lock Pending" : season.ticketState === "active" ? "Active Entry Ticket" : season.ticketState === "secured" ? "Entry Ticket Secured" : "No Active Entry Ticket"}</p><ol><li><span>1</span> Review</li><li><span>2</span> Activate</li><li><span>3</span> Run or Retry</li><li><span>4</span> Full Clear Auto-Locks</li></ol><div class="hb-season-ticket__notes"><p>One active ticket</p><p>Failed attempts do not consume</p><p>Full clear consumes ticket</p></div>${season.statusMessage ? `<p class="hb-season-ticket__status" role="status">${escapeHtml(season.statusMessage)}</p>` : ""}<button class="hb-ledger-button" type="button" data-season-action="${ticketAction}" data-focus-key="review-ticket">${ticketLabel} <span aria-hidden="true">»</span></button></article><article class="hb-season-leaderboard"><h2>Leaderboard</h2>${compactLeaderboard(season.leaderboard)}<p class="hb-season-leaderboard__note">Verified Scores</p><div class="hb-season-leaderboard__actions"><button class="hb-ledger-button" type="button" data-season-action="back-to-hunt" data-focus-key="season-back">Back to Hunt</button><button class="hb-ledger-button is-primary" type="button" data-season-action="full-leaderboard" data-focus-key="full-leaderboard">View Full Leaderboard <span aria-hidden="true">»</span></button></div></article></section></main>`;
  }

  function compactLeaderboard(rows) {
    const body = rows.slice(0, 3).map((row) => `<tr><td>${escapeHtml(row.rank)}</td><td>${escapeHtml(row.player)}</td><td class="hb-value">${escapeHtml(row.score)}</td><td class="hb-value">${escapeHtml(row.time)}</td></tr>`).join("");
    return `<table><thead><tr><th>Rank</th><th>Player</th><th>Score</th><th>Time</th></tr></thead><tbody>${body}</tbody></table>`;
  }

  function ticketHero(model, title, id, stateLabel, activeTab = "ticket") {
    const season = model.season;
    return `<section class="hb-ticket-hero" aria-labelledby="${id}">${heroImage()}<div class="hb-ticket-overview">${screenHeading("season-centre-heading", "Season Centre", false)}${seasonTabs(activeTab)}<article class="hb-ticket-secured-summary"><h2 id="${id}" tabindex="-1" data-screen-heading>${title}</h2><p>Season ${escapeHtml(season.number)}</p><strong class="hb-value">${escapeHtml(season.ticketId)}</strong><em>${stateLabel}</em><dl><div><dt>Expires</dt><dd>${escapeHtml(season.endsIn)}</dd></div><div><dt>Controller</dt><dd>${escapeHtml(season.wallet)}</dd></div></dl></article></div></section>`;
  }

  function renderTicketReview(model) {
    const season = model.season;
    const hbEntry = season.paymentAsset === "HB";
    const allocation = hbEntry
      ? "<div><dt>$HB Burn</dt><dd>100%</dd></div><div><dt>Prize Funding</dt><dd>Separately Pre-Funded WETH</dd></div>"
      : `<div><dt>Prize Reserve</dt><dd>${escapeHtml(season.prizeReserveBps / 100)}%</dd></div><div><dt>$HB Buy-and-Burn</dt><dd>${escapeHtml(season.buyBurnBps / 100)}%</dd></div>`;
    return `<main class="hb-main hb-ticket-review" data-screen="entry-ticket-review"><section class="hb-ticket-hero" aria-labelledby="ticket-review-title">${heroImage()}<div class="hb-ticket-overview">${screenHeading("season-centre-heading", "Season Centre", false)}${seasonTabs("ticket")}<article class="hb-ticket-review-summary"><h2 id="ticket-review-title" tabindex="-1" data-screen-heading>Review Entry Ticket</h2><p class="hb-ticket-review-summary__season">Season ${escapeHtml(season.number)}</p><strong class="hb-value">${escapeHtml(season.quoteAmount)}</strong><dl><div><dt>Settlement</dt><dd>Exact ${hbEntry ? "$HB" : "ETH"}</dd></div><div><dt>Season Terms</dt><dd>Locked when sales open</dd></div></dl></article></div></section><section class="hb-ticket-dashboard" aria-label="Entry Ticket review"><article class="hb-ticket-payment"><h2>Payment</h2><dl><div><dt>Exact ${hbEntry ? "$HB" : "ETH"} Price</dt><dd>${escapeHtml(season.quoteAmount)}</dd></div>${allocation}<div class="hb-ticket-payment__total"><dt>Total</dt><dd>${escapeHtml(season.quoteAmount)}</dd></div></dl></article><article class="hb-ticket-controller"><h2>Controller</h2><dl><div><dt>Purchasing Wallet</dt><dd>${escapeHtml(season.wallet)}</dd></div><div><dt>Ticket Controller</dt><dd>Same Wallet</dd></div><div><dt>Prize Recipient</dt><dd>Same Wallet</dd></div><div><dt>Active Tickets</dt><dd>${season.ticketState === "active" ? "1 / 1" : "0 / 1"}</dd></div><div><dt>Wallet Changes</dt><dd>Future Tickets Only</dd></div></dl></article><article class="hb-ticket-terms"><h2>Terms</h2><ul><li>Published payment terms are immutable for this Season</li><li>Ticket expires at season end</li><li>No refund or rollover</li><li data-ticket-reward="first-completion" data-reward-available="${season.firstCompletionRewardAvailable}"><span>First Verified Completion · 5 Limited Tickets</span></li><li data-ticket-reward="repeat-completion" data-reward-available="${season.repeatCompletionRewardAvailable}"><span>Later Verified Completion · 1 Standard Ticket</span></li></ul><p class="hb-ticket-terms__timer">Season Ends in ${escapeHtml(season.endsIn)}</p>${season.statusMessage ? `<p role="status">${escapeHtml(season.statusMessage)}</p>` : ""}<div class="hb-ticket-actions"><button class="hb-ledger-button" type="button" data-season-action="back" data-focus-key="ticket-back">Back</button><button class="hb-ledger-button is-primary" type="button" data-season-action="confirm-ticket" data-focus-key="confirm-ticket"${season.canPurchase ? "" : " disabled"}><span>${season.transactionPending ? "Submitting" : "Confirm"} ·</span> <strong class="hb-value">${escapeHtml(season.quoteAmount)}</strong> <span aria-hidden="true">»</span></button></div></article></section></main>`;
  }

  function renderTicketState(model, active) {
    const season = model.season;
    const screen = active ? "entry-ticket-active" : "entry-ticket-secured";
    const title = active ? "Entry Ticket Active" : "Entry Ticket Secured";
    const recordRows = active
      ? "<div><dt>Required Clear</dt><dd>Full Stage 15</dd></div><div><dt>Failed Attempt</dt><dd>Ticket Retained</dd></div><div><dt>Retry After Failure</dt><dd>Available</dd></div><div><dt>Full Clear</dt><dd>Score Auto-Locked</dd></div><div><dt>Completed Ticket</dt><dd>Consumed</dd></div>"
      : `<div><dt>${season.paymentAsset === "HB" ? "$HB" : "ETH"} Price</dt><dd>${escapeHtml(season.quoteAmount)}</dd></div><div><dt>Allocation</dt><dd>${season.paymentAsset === "HB" ? "100% $HB Burn" : "WETH Prize Reserve + $HB Buy-and-Burn"}</dd></div><div><dt>Ticket Controller</dt><dd>Same Wallet</dd></div><div><dt>Prize Recipient</dt><dd>Same Wallet</dd></div>`;
    const pendingLock = active && Boolean(season.pendingCompletion);
    return `<main class="hb-main ${active ? "hb-ticket-active" : "hb-ticket-secured"}" data-screen="${screen}">${ticketHero(model, title, active ? "ticket-active-title" : "ticket-secured-title", active ? pendingLock ? "Score Lock Pending" : "Ready for Hunt" : "Sealed")}<section class="hb-ticket-dashboard" aria-label="${active ? "Active" : "Secured"} Entry Ticket"><article class="hb-ticket-certificate"><h2>Entry Ticket</h2><div class="hb-ticket-certificate__body"><dl><div><dt>ID</dt><dd>${escapeHtml(season.ticketId)}</dd></div><div><dt>Season</dt><dd>${escapeHtml(season.number)}</dd></div><div><dt>State</dt><dd>${active ? pendingLock ? "Verified · Score Lock Pending" : "Active" : "Purchased &amp; Secured"}</dd></div><div><dt>Controller</dt><dd>${escapeHtml(season.wallet)}</dd></div><div><dt>Expires</dt><dd>${escapeHtml(season.endsIn)}</dd></div></dl></div><p class="hb-ticket-stamp">${active ? pendingLock ? "Verified" : "Active" : "Secured"}</p></article><article class="hb-ticket-record"><h2>${active ? "Run Contract" : "Ticket Record"}</h2><dl>${recordRows}</dl></article><article class="hb-ticket-next"><h2>${active ? pendingLock ? "Score Lock" : "Ready" : "Next"}</h2><ul><li>Purchase Recorded</li><li>Ticket Secured</li>${active ? pendingLock ? '<li>Ticket Activated</li><li class="is-current">Verified Completion Awaiting Lock</li>' : '<li>Ticket Activated</li><li class="is-current">Seasonal Hunt Ready</li>' : '<li class="is-current">Activation Ready</li><li>Active Tickets · 1 / 1</li>'}<li>Season · ${escapeHtml(season.number)}</li></ul>${season.statusMessage ? `<p role="status">${escapeHtml(season.statusMessage)}</p>` : ""}<div class="hb-ticket-actions"><button class="hb-ledger-button" type="button" data-season-action="${active ? "season-centre" : "review-again"}" data-focus-key="ticket-secondary">${active ? "Season Centre" : "Review Again"}</button><button class="hb-ledger-button is-primary" type="button" data-season-action="${pendingLock ? "lock-pending-score" : active ? "begin-seasonal-hunt" : "activate-ticket"}" data-focus-key="ticket-primary"${active || season.canActivate ? "" : " disabled"}>${pendingLock ? season.transactionPending ? "Submitting Score Lock" : "Complete Score Lock" : active ? "Begin Seasonal Hunt" : season.transactionPending ? "Submitting Activation" : "Activate Entry Ticket"} <span aria-hidden="true">»</span></button></div></article></section></main>`;
  }

  function renderLeaderboard(model) {
    const season = model.season;
    const rows = season.leaderboard.map((row) => `<tr${row.current ? ' class="is-player"' : ""}><td>${escapeHtml(row.rank)}</td><td>${escapeHtml(row.player)}</td><td class="hb-value">${escapeHtml(row.score)}</td><td class="hb-value">${escapeHtml(row.time)}</td><td>${escapeHtml(row.wallet)}</td></tr>`).join("");
    return `<main class="hb-main hb-season-leaderboard-screen" data-screen="season-leaderboard">${ticketHero(model, `Season ${escapeHtml(season.number)} Leaderboard`, "season-leaderboard-title", "Verified Scores", "leaderboard")}<section class="hb-leaderboard-dashboard" aria-label="Season ${escapeHtml(season.number)} verified leaderboard"><article class="hb-leaderboard-prize-card"><h2>Funded Prize</h2><p class="hb-leaderboard-prize-card__total hb-value">${escapeHtml(season.prizeTotal)}</p><dl><div><dt>1st Place</dt><dd>40% · ${escapeHtml(season.prizes.first)}</dd></div><div><dt>2nd Place</dt><dd>20% · ${escapeHtml(season.prizes.second)}</dd></div><div><dt>3rd Place</dt><dd>15% · ${escapeHtml(season.prizes.third)}</dd></div><div><dt>4th Place</dt><dd>10% · ${escapeHtml(season.prizes.fourth)}</dd></div><div><dt>5th–7th</dt><dd>5% · ${escapeHtml(season.prizes.fifth)} Each</dd></div></dl></article><article class="hb-full-leaderboard"><h2>Verified Rankings</h2><table><thead><tr><th>Rank</th><th>Player</th><th>Score</th><th>Time</th><th>Wallet</th></tr></thead><tbody>${rows}</tbody></table><p class="hb-full-leaderboard__note">A verified Stage 15 clear locks immediately. The latest unsuperseded verified Stage 10+ result may settle when the Season ends. Higher score ranks first; faster active time, then earlier acceptance, breaks ties.</p><div class="hb-full-leaderboard__actions"><button class="hb-ledger-button" type="button" data-season-action="entry-ticket" data-focus-key="leaderboard-ticket">Entry Ticket</button><button class="hb-ledger-button is-primary" type="button" data-season-action="begin-seasonal-hunt" data-focus-key="leaderboard-begin">Begin Seasonal Hunt <span aria-hidden="true">»</span></button></div></article></section></main>`;
  }

  function renderSettlement(model) {
    const settlement = model.settlement;
    const claimTotal = settlement.claimable.wood + settlement.claimable.ore;
    const bonusRows = settlement.bonuses.map((bonus) => `<div><dt>${escapeHtml(bonus.label)}</dt><dd class="hb-value">${escapeHtml(bonus.value)}</dd></div>`).join("");
    const operationRows = settlement.operations.map((operation) => `<section class="hb-operation-row"><div><strong>${escapeHtml(operation.name)}</strong><span>Rank ${operation.rank} · <strong class="hb-value">${escapeHtml(operation.output)}</strong></span></div><button type="button" data-settlement-action="upgrade-${escapeHtml(operation.id)}"><span>Upgrade ·</span> <strong class="hb-value">${escapeHtml(operation.requirements)}</strong></button></section>`).join("");
    return `<main class="hb-main hb-settlement-screen" data-screen="settlement" data-settlement-resources="${claimTotal ? "claimable" : "claimed"}">
      <section class="hb-settlement-hero" aria-labelledby="settlement-title">${heroImage("images/bg-settlement-v1.png?v=3", "The outlaw settlement: log cabins behind a timber palisade around a campfire")}<div class="hb-settlement-overview">
        ${screenHeading("settlement-title", "Overview")}
        <div class="hb-settlement-status" aria-label="Settlement overview details"><dl><div><dt>Land</dt><dd class="hb-value">${settlement.land.unlocked} / ${settlement.land.maximum} Plots</dd></div><div><dt>Buildings</dt><dd class="hb-value">${settlement.land.occupied} Placed</dd></div><div><dt>Operations</dt><dd class="hb-value">2 Active</dd></div></dl><button class="hb-ledger-button" type="button" data-shell-destination="plots" data-focus-key="settlement-open-plots">Open Plots <span aria-hidden="true">»</span></button></div>
      </div></section>
      <section class="hb-settlement-dashboard" aria-label="Settlement management">
        <article class="hb-settlement-bonuses"><header><h2>Accumulated Bonuses</h2>${diamondRule("panel")}</header><dl>${bonusRows}</dl></article>
        <article class="hb-settlement-passive"><header><h2>Passive Resources</h2>${diamondRule("panel")}<p>Available to Claim</p></header>
          <div class="hb-passive-resource" data-resource="wood"><img src="${asset("resource-wood-v3.png")}" alt=""><div><span>Wood</span><strong class="hb-value" data-claim-value>+${formatNumber(settlement.claimable.wood)}</strong><small><strong class="hb-value">${formatNumber(settlement.storage.wood.value)} / ${formatNumber(settlement.storage.wood.capacity)}</strong> Stored</small></div></div>
          <div class="hb-passive-resource" data-resource="ore"><img src="${asset("resource-ore-v3.png")}" alt=""><div><span>Ore</span><strong class="hb-value" data-claim-value>+${formatNumber(settlement.claimable.ore)}</strong><small><strong class="hb-value">${formatNumber(settlement.storage.ore.value)} / ${formatNumber(settlement.storage.ore.capacity)}</strong> Stored</small></div></div>
          <p class="hb-passive-note" data-claim-status>${claimTotal ? `<strong class="hb-value">${formatNumber(claimTotal)}</strong> Resources Ready` : "No Resources Waiting"}</p><div class="hb-settlement-panel-actions"><button class="hb-ledger-button" type="button" data-settlement-action="storehouse" data-focus-key="settlement-storehouse">Open Storehouse</button><button class="hb-ledger-button is-primary" type="button" data-settlement-action="claim" data-focus-key="settlement-claim"${claimTotal ? "" : ' disabled aria-disabled="true"'}>Claim Resources <span aria-hidden="true">»</span></button></div>
        </article>
        <article class="hb-settlement-operations"><header><h2>Operations &amp; Land</h2>${diamondRule("panel")}</header><div class="hb-operation-advancement"><div><span>Operation Advancements</span><strong><span class="hb-value">${formatNumber(settlement.advancements)}</span> Owned</strong></div><p>Earn 1 from every genuine Stage 10 clear · Rank 6+ upgrades spend 1</p></div>${operationRows}<section class="hb-land-progress"><div><strong>Ordinary Plots</strong><span><strong class="hb-value">${settlement.land.unlocked} / ${settlement.land.maximum}</strong> Unlocked</span></div><div class="hb-land-progress__track" aria-label="${settlement.land.unlocked} of ${settlement.land.maximum} plots unlocked"><span style="width:${settlement.land.percent}%"></span></div><p>${settlement.land.nextLabel}</p><button class="hb-ledger-button is-primary" type="button" data-settlement-action="buy-plot" data-focus-key="settlement-buy-plot"${settlement.land.complete ? " disabled" : ""}>${settlement.land.complete ? "All 25 Plots Unlocked" : "Buy Next Plot"} <span aria-hidden="true">»</span></button></section></article>
      </section></main>`;
  }

  // One task, one row. Bounties used to open as a modal dialog carried over
  // from a friend's client: it was not in the screen list at all. The
  // paragraphs were replaced by a "state · verb · bar · reward" row, so the eye
  // runs from top to bottom and catches on what is still open instead of
  // reading its way through.
  function bountyRow(row) {
    const dot = `<span class="hb-bounty-row__dot" data-bounty-state="${row.state}" aria-hidden="true"></span>`;
    const bar = row.empty ? "" : `<span class="hb-bounty-row__bar" aria-hidden="true"><i style="width:${row.percent.toFixed(1)}%"></i></span>`;
    const count = row.empty ? "" : `<b class="hb-value">${escapeHtml(row.progressText)}</b>`;
    const rewards = (row.rewards || []).map((r) =>
      `<span class="hb-bounty-chip"><strong class="hb-value">${escapeHtml(r.amount)}</strong>${escapeHtml(r.label)}</span>`).join("");
    return `<li class="hb-bounty-row" data-state="${row.state}"${row.tier ? ` data-tier="${escapeHtml(row.tier)}"` : ""}>
      ${dot}
      <span class="hb-bounty-row__label">${escapeHtml(row.label)}${row.note ? `<small>${escapeHtml(row.note)}</small>` : ""}</span>
      ${bar}${count}
      <span class="hb-bounty-row__rewards">${rewards}</span>
    </li>`;
  }

  function renderBounties(model) {
    const b = model.bounties;
    if (!b) return `<main class="hb-bounties-screen" data-screen="bounties"></main>`;
    const w = b.weekly;

    const ticketStrip = `<section class="hb-bounty-strip"${w.capReached ? ' data-cap="reached"' : ""}>
      <div class="hb-bounty-strip__head">
        <h2>Weekly Standard Tickets</h2>
        <span>Resets ${escapeHtml(w.reset)}</span>
      </div>
      <strong class="hb-value">${w.ticketsEarned} / ${w.ticketCap}</strong>
      <span class="hb-bounty-strip__bar" aria-hidden="true"><i style="width:${w.ticketPercent.toFixed(1)}%"></i></span>
      <p>${w.capReached ? "Weekly cap reached — more tickets after the reset." : "Every Weekly Bounty pays Standard Tickets."}</p>
    </section>`;

    if (!b.unlocked) {
      return `<main class="hb-bounties-screen" data-screen="bounties">
        <header class="hb-bounties-heading"><div><h1 id="bounties-title" tabindex="-1" data-screen-heading>Bounties</h1>${diamondRule("screen")}</div></header>
        ${ticketStrip}
        <section class="hb-bounty-locked"><strong>Bounty Board locked</strong><p>${escapeHtml(b.lockedReason)}</p></section>
        <section class="hb-bounty-group"><header><h2>Weekly</h2><span>${w.doneCount} / ${w.objectives.length} done</span></header>
          <ul class="hb-bounty-list">${w.objectives.map(bountyRow).join("")}</ul></section>
      </main>`;
    }

    return `<main class="hb-bounties-screen" data-screen="bounties">
      <header class="hb-bounties-heading">
        <div><h1 id="bounties-title" tabindex="-1" data-screen-heading>Bounties</h1>${diamondRule("screen")}</div>
        <dl aria-label="Bounty totals">
          <div><dt>Board</dt><dd>${b.board.activeCount} / ${b.board.slotCount}</dd></div>
          <div><dt>Weekly</dt><dd>${w.doneCount} / ${w.objectives.length}</dd></div>
          <div><dt>Next roll</dt><dd>${escapeHtml(b.board.nextRoll)}</dd></div>
        </dl>
      </header>
      ${ticketStrip}
      <section class="hb-bounty-group">
        <header><h2>Bounty Board</h2><span>Next roll ${escapeHtml(b.board.nextRoll)}</span></header>
        <ul class="hb-bounty-list">${b.board.slots.map(bountyRow).join("")}</ul>
      </section>
      <section class="hb-bounty-group">
        <header><h2>Weekly</h2><span>Resets ${escapeHtml(w.reset)}</span></header>
        <ul class="hb-bounty-list">${w.objectives.map(bountyRow).join("")}</ul>
      </section>
    </main>`;
  }

  function renderPlots(model) {
    const plots = model.plots;
    const plotButtons = plots.items.map((plot) => {
      if (plot.empty) return `<button class="hb-plot hb-plot--empty" type="button" data-plot-action="${plot.index}" data-select-plot="${plot.index}" data-focus-key="plot-${plot.index}" aria-label="Build on empty Plot ${plot.number}"><span class="hb-plot__empty"><strong>Empty Plot</strong><small>Plot ${plot.number} · Build</small></span></button>`;
      const pips = Array.from({ length: plot.maximumLevel }, () => "<b></b>").join("");
      const art = plot.art ? `style="--plot-building-art:url('${escapeHtml(plot.art)}')"` : `data-art-pending="true"`;
      return `<button class="hb-plot" type="button" data-plot-action="${plot.index}" data-select-plot="${plot.index}" data-focus-key="plot-${plot.index}" data-level="${plot.level}"${plot.atMaximum ? ' data-building-form="max"' : ""} aria-label="Inspect ${escapeHtml(plot.name)}, Plot ${plot.number}, ${plot.levelLabel}, provides ${escapeHtml(plot.effect)}"><span class="hb-plot__art" ${art} aria-hidden="true">${plot.art ? "" : escapeHtml(plot.initials)}</span><span class="hb-plot__label"><strong>${escapeHtml(plot.name)}</strong><em class="hb-value">${escapeHtml(plot.effect)}</em><small>Plot ${plot.number} · ${escapeHtml(plot.levelLabel)}</small><i>${pips}</i></span></button>`;
    }).join("");
    return `<main class="hb-plots-screen" data-screen="plots"><header class="hb-plots-heading"><div><h1 id="plots-title" tabindex="-1" data-screen-heading>Plots</h1>${diamondRule("screen")}</div><dl aria-label="Plot totals"><div><dt>Unlocked</dt><dd>${plots.unlocked} / ${plots.maximum}</dd></div><div><dt>Occupied</dt><dd>${plots.occupied}</dd></div><div><dt>Empty</dt><dd>${plots.empty}</dd></div></dl><p class="hb-plots-heading__note">Purchase additional land from Settlement</p></header><section class="hb-plot-board" aria-labelledby="plots-title"><div class="hb-plot-grid" data-columns="${plots.columns}" style="--plot-columns:${plots.columns};--plot-rows:${plots.rows}" aria-label="${plots.unlocked} unlocked building plots">${plotButtons}</div></section></main>`;
  }

  function equipmentAffixes(item) {
    return `<ul class="hb-equipment-affixes">${item.affixes.map((affix) => `<li><strong class="hb-value">${escapeHtml(affix.value)}</strong><span>${escapeHtml(affix.label)}</span></li>`).join("")}</ul>`;
  }

  function statMappingRows(rows, options = {}) {
    return (rows || []).map((row) => {
      const before = row.before?.value === undefined ? row.before : `${row.before.value} ${row.before.label}`;
      const after = row.after?.value === undefined ? row.after : `${row.after.value} ${row.after.label}`;
      const state = row.state || "change";
      const label = row.label ? `<span class="hb-stat-mapping-row__label">${escapeHtml(row.label)}</span>` : "";
      const delta = row.deltaLabel === undefined ? "" : `<strong class="hb-stat-delta" data-delta-state="${escapeHtml(state)}">${escapeHtml(row.deltaLabel)}</strong>`;
      const attributes = options.reroll
        ? " data-reroll-change"
        : ` data-comparison-state="${escapeHtml(state)}" data-comparison-stat="${escapeHtml(row.statId || "")}"`;
      return `<div class="hb-stat-mapping-row${options.reroll ? " hb-reroll-change" : " hb-equipment-comparison-row"}" data-stat-mapping-row${attributes}>${label}<span class="hb-stat-mapping-row__before">${escapeHtml(before)}</span><b aria-hidden="true">→</b><strong class="hb-stat-mapping-row__after">${escapeHtml(after)}</strong>${delta}</div>`;
    }).join("");
  }

  function equipmentItem(item, options = {}) {
    const actions = [];
    const displayedState = options.scrap && !item.eligible
      ? item.ineligibleReason
      : item.equipped
        ? "Equipped"
        : item.protected
          ? "Protected"
          : "";
    if (options.manage) {
      actions.push(`<button type="button" data-equipment-action="select:${escapeHtml(item.itemId)}" data-focus-key="equipment-${escapeHtml(item.itemId)}">View</button>`);
    }
    if (options.manage || options.protect) {
      actions.push(`<button type="button" data-equipment-action="protect:${escapeHtml(item.itemId)}" data-focus-key="protect-${escapeHtml(item.itemId)}" aria-pressed="${item.protected}">${item.protected ? "Unprotect" : "Protect"}</button>`);
    }
    if (options.scrap) {
      actions.push(`<label class="hb-equipment-check" data-blocking-class="${escapeHtml(item.blockingClass || "eligible")}"><input type="checkbox" data-equipment-control="scrap-item:${escapeHtml(item.itemId)}" data-focus-key="scrap-${escapeHtml(item.itemId)}"${item.selected ? " checked" : ""}${item.eligible ? "" : " disabled"}><span>${item.eligible ? `${item.scrapValue} Scrap` : escapeHtml(item.ineligibleReason)}</span></label>`);
    }
    return `<article class="hb-equipment-item" data-rarity="${escapeHtml(item.rarity)}" data-slot="${escapeHtml(item.slot)}" data-equipped="${item.equipped}" data-protected="${item.protected}" data-blocking-class="${escapeHtml(item.blockingClass || "eligible")}" data-blocking-classes="${escapeHtml((item.blockingClasses || []).join(" "))}"><header><div><span>${escapeHtml(item.slot)} · ${escapeHtml(item.rarityLabel)}</span><h3>${escapeHtml(item.name)}</h3></div>${displayedState ? `<strong data-equipment-state>${escapeHtml(displayedState)}</strong>` : ""}</header>${item.effect ? `<section class="hb-equipment-effect"><strong>${escapeHtml(item.effect.name)}</strong><p>${escapeHtml(item.effect.description)}</p></section>` : ""}${equipmentAffixes(item)}${actions.length ? `<footer>${actions.join("")}</footer>` : ""}</article>`;
  }

  function outfitterInventoryCard(item, selected) {
    const verdicts = {
      upgrade: { glyph: "▲", label: "Strict upgrade" },
      downgrade: { glyph: "▼", label: "Strict downgrade" },
      mixed: { glyph: "◆", label: "Mixed comparison" },
    };
    const verdict = verdicts[item.comparison?.verdict];
    const marker = item.equipped
      ? '<span class="hb-outfitter-card__equipped">Equipped</span>'
      : verdict
        ? `<span class="hb-outfitter-card__verdict" data-verdict="${escapeHtml(item.comparison.verdict)}" aria-label="${escapeHtml(verdict.label)}" title="${escapeHtml(verdict.label)}">${verdict.glyph}</span>`
        : "";
    return `<button class="hb-outfitter-card${selected ? " is-selected" : ""}" type="button" aria-pressed="${selected}" data-rarity="${escapeHtml(item.rarity)}" data-slot="${escapeHtml(item.slot)}" data-equipped="${item.equipped}" data-protected="${item.protected}" data-equipment-action="select:${escapeHtml(item.itemId)}" data-focus-key="equipment-${escapeHtml(item.itemId)}">${marker}<span class="hb-outfitter-card__caption">${escapeHtml(item.slot)} · ${escapeHtml(item.rarityLabel)}</span><strong class="hb-outfitter-card__name" data-item-name>${escapeHtml(item.name)}</strong>${equipmentAffixes(item)}<span class="hb-outfitter-card__provenance">${escapeHtml(item.provenanceLabel)}</span></button>`;
  }

  function outfitterSelectedDetail(item) {
    const disabled = item.available ? "" : " disabled";
    const actions = `<div class="hb-equipment-actions"><button class="hb-ledger-button is-primary" type="button" data-equipment-action="equip:${escapeHtml(item.itemId)}" data-focus-key="equip-selected"${disabled}>${item.equipped ? "Unequip" : "Equip"}</button><button class="hb-ledger-button" type="button" data-equipment-action="reroll:${escapeHtml(item.itemId)}" data-focus-key="reroll-selected"${disabled}>Reroll a Stat</button></div>`;
    if (item.comparison?.mode === "comparison") {
      const comparison = item.comparison;
      return `<aside class="hb-equipment-panel hb-equipment-detail hb-equipment-comparison" data-verdict="${escapeHtml(comparison.verdict)}" data-overlay-scroll-owner data-scroll-affordance="scrollbar"><h2>Gear Comparison</h2>${diamondRule("panel")}<div class="hb-equipment-comparison__items"><div><span>Equipped</span><strong>${escapeHtml(comparison.equippedName)}</strong></div><div><span>Selected</span><strong>${escapeHtml(comparison.selectedName)}</strong></div></div><div class="hb-equipment-comparison-list" data-stat-union-size="${comparison.rows.length}" aria-label="Equipped and selected stat comparison">${statMappingRows(comparison.rows)}</div>${item.effect ? `<section class="hb-equipment-effect"><strong>${escapeHtml(item.effect.name)}</strong><p>${escapeHtml(item.effect.description)}</p></section>` : ""}${actions}</aside>`;
    }
    const emptyCaption = item.comparison?.mode === "empty" ? '<p class="hb-equipment-comparison-caption">Empty slot — no comparison</p>' : "";
    return `<aside class="hb-equipment-panel hb-equipment-detail" data-overlay-scroll-owner data-scroll-affordance="scrollbar"><h2>Selected Equipment</h2>${diamondRule("panel")}${emptyCaption}${equipmentItem(item)}${actions}</aside>`;
  }

  function equipmentShell(title, screen, body) {
    return `<main class="hb-equipment-screen" data-screen="${screen}">${screenHeading(`${screen}-title`, title)}${body}</main>`;
  }

  function equipmentFilterPanel({ scope, filters, slots, rarities, stats, activeCount, scrollable = false }) {
    const slotChips = [{ id: "all", label: "All Slots" }, ...slots].map((slot) => `<button type="button" aria-pressed="${filters.slot === slot.id}" data-equipment-action="filter-slot:${scope}:${escapeHtml(slot.id)}" data-focus-key="${scope}-filter-slot-${escapeHtml(slot.id)}">${escapeHtml(slot.label)}</button>`).join("");
    const rarityChips = ["all", ...rarities].map((rarity) => `<button type="button" aria-pressed="${filters.rarity === rarity}" data-equipment-action="filter-rarity:${scope}:${escapeHtml(rarity)}" data-focus-key="${scope}-filter-rarity-${escapeHtml(rarity)}">${rarity === "all" ? "All Rarities" : escapeHtml(titleCase(rarity))}</button>`).join("");
    const selectedStats = new Set(filters.stats || []);
    const statGrid = stats.map((stat) => `<button type="button" aria-pressed="${selectedStats.has(stat.id)}" data-equipment-action="filter-stat:${scope}:${escapeHtml(stat.id)}" data-focus-key="${scope}-filter-stat-${escapeHtml(stat.id)}">${escapeHtml(stat.label)}</button>`).join("");
    return `<section class="hb-equipment-filter-panel${scrollable ? " hb-equipment-filter-panel--rail" : ""}" data-equipment-filter-scope="${scope}"${scrollable ? ' data-overlay-scroll-owner data-scroll-affordance="scrollbar"' : ""} aria-label="Equipment filters"><header><strong>Filters</strong>${activeCount ? `<span class="hb-value">${activeCount} active</span>` : ""}<button type="button" data-equipment-action="filter-clear:${scope}" data-focus-key="${scope}-filter-clear"${activeCount ? "" : " disabled"}>Clear</button></header><div class="hb-equipment-filter-groups"><fieldset><legend>Slot</legend><div class="hb-equipment-filter-chips">${slotChips}</div></fieldset><fieldset><legend>Rarity</legend><div class="hb-equipment-filter-chips">${rarityChips}</div></fieldset><fieldset class="hb-equipment-filter-stats"><legend>Stats · all selected required</legend><div class="hb-equipment-stat-grid">${statGrid}</div></fieldset></div></section>`;
  }

  function gachaPityBar(entry, label, { guarantee = false } = {}) {
    const isComplete = entry.value >= entry.maximum;
    const notchInterval = guarantee ? 5 : Math.max(1, entry.maximum / 10);
    const notches = [];
    for (let value = notchInterval; value < entry.maximum; value += notchInterval) {
      notches.push(`<i class="hb-gacha-pity__notch" style="--hb-pity-notch:${(value / entry.maximum) * 100}%" aria-hidden="true"></i>`);
    }
    const guaranteeLabel = isComplete ? "Guaranteed next draw" : "Guaranteed";
    const guaranteeLine = isComplete
      ? `<p class="hb-gacha-guarantee is-emphasized"><strong>Guaranteed next draw</strong></p>`
      : `<p class="hb-gacha-guarantee">${escapeHtml(label)} guaranteed within <strong class="hb-value">${entry.remaining}</strong> more draw${entry.remaining === 1 ? "" : "s"}</p>`;
    return `<div class="hb-gacha-pity${isComplete ? " is-complete" : ""}" data-pity-key="${escapeHtml(label)}" data-pity-value="${entry.value}" data-pity-heat="${escapeHtml(entry.heat)}" style="--hb-pity-progress:${entry.percent}%"><header class="hb-gacha-pity__header"><span>${escapeHtml(label)}</span><strong class="hb-gacha-pity__counter hb-value">${entry.value}/${entry.maximum}</strong></header><div class="hb-gacha-pity__route"><div class="hb-gacha-pity__track" role="progressbar" aria-label="${escapeHtml(label)} ${entry.value} of ${entry.maximum}" aria-valuemin="0" aria-valuemax="${entry.maximum}" aria-valuenow="${entry.value}"><span class="hb-gacha-pity__cord" aria-hidden="true"></span><span class="hb-gacha-pity__trail" aria-hidden="true"></span><span class="hb-gacha-pity__notches" data-notch-count="${notches.length}" aria-hidden="true">${notches.join("")}</span><span class="hb-gacha-pity__arrow" aria-hidden="true"></span><span class="hb-gacha-pity__endpoint" aria-hidden="true"></span></div><small class="hb-gacha-pity__point-label">${guaranteeLabel}</small></div>${guaranteeLine}</div>`;
  }

  function gachaDrawRow(gacha) {
    const tierLabel = gacha.tier === "premium" ? "Limited" : "Standard";
    const balance = gacha.tier === "premium" ? gacha.premiumTickets : gacha.standardTickets;
    const purchases = gacha.tier === "premium"
      ? `<div class="hb-gacha-ticket-purchases" aria-label="Buy Limited Tickets"><button class="hb-ledger-button" type="button" data-gacha-action="buy-limited:1" data-focus-key="gacha-buy-1"${gacha.canBuyLimited ? "" : " disabled"}>Buy 1 · $5 in HB</button><button class="hb-ledger-button" type="button" data-gacha-action="buy-limited:10" data-focus-key="gacha-buy-10"${gacha.canBuyLimited ? "" : " disabled"}>Buy 10 · $50 in HB</button></div>`
      : "";
    return `<section class="hb-gacha-draw-row" aria-label="${tierLabel} draw actions"><p><strong class="hb-value">${balance}</strong> ${tierLabel} Ticket${balance === 1 ? "" : "s"} available</p>${purchases}<div class="hb-gacha-draw-actions"><button class="hb-ledger-button" type="button" data-gacha-action="draw:1" data-focus-key="gacha-draw-1"${gacha.canDrawOne ? "" : " disabled"}>Draw 1</button><button class="hb-ledger-button is-primary hb-gacha-draw-ten" type="button" data-gacha-action="draw:10" data-focus-key="gacha-draw-10"${gacha.canDrawTen ? "" : " disabled"}><span>Draw 10</span>${gacha.drawTenGuarantee ? `<small>${escapeHtml(gacha.drawTenGuarantee)}</small>` : ""}</button><button class="hb-gacha-rates-link" type="button" data-gacha-action="rates" data-focus-key="gacha-rates">Draw rates <span aria-hidden="true">›</span></button>${gacha.pending ? '<button class="hb-ledger-button" type="button" data-gacha-action="recover" data-focus-key="gacha-recover">Resume Draw</button>' : ""}</div></section>`;
  }

  function distinctEffectHeading(item) {
    const name = String(item?.name || "").trim().toLocaleLowerCase();
    const effectName = String(item?.effectName || "").trim();
    if (!effectName || effectName.toLocaleLowerCase() === name) return "";
    return `<strong>${escapeHtml(effectName)}</strong>`;
  }

  function limitedGachaSurface(gacha) {
    const banner = gacha.banner;
    const timing = banner.timing?.visible
      ? `<p class="hb-gacha-banner__timer${banner.timing.danger ? " is-danger" : ""}"><span aria-hidden="true">◷</span> <strong>${escapeHtml(banner.timing.text)}</strong>${banner.timing.lastDay ? '<span class="hb-gacha-last-day">Last day</span>' : ""}</p>`
      : "";
    return `<section class="hb-gacha-banner"><header><div><h2>${escapeHtml(banner.name)}</h2><p>${escapeHtml(banner.caption)}</p></div>${timing}</header><div class="hb-gacha-banner__effect">${distinctEffectHeading(banner)}<p>${escapeHtml(banner.description)}</p></div><p class="hb-gacha-banner__rolls">${escapeHtml(banner.rolls)}</p><p class="hb-gacha-banner__rate"><strong>Rate Up</strong><span>${escapeHtml(banner.guarantee)}</span></p>${banner.departure ? `<p class="hb-gacha-banner__departure">${escapeHtml(banner.departure)}</p>` : ""}</section>`;
  }

  function standardGachaSurface(gacha) {
    // The slot is baked into the id prefix and yields a shared rarity icon,
    // which is why every legendary chest piece looked the same. Its own art is
    // laid over the top inline: you cannot write a rule for each of the 51
    // items in CSS.
    const cards = gacha.spotlights.map((item) => {
      const art = legendaryArt(item.name);
      const style = art ? ` style="--lh-item:url('${escapeHtml(art)}')"` : "";
      return `<article class="hb-gacha-spotlight" data-legendary-effect-id="${escapeHtml(item.id)}"${style}><span>${escapeHtml(item.caption)}</span><h3>${escapeHtml(item.name)}</h3>${distinctEffectHeading(item)}<p>${escapeHtml(item.description)}</p></article>`;
    }).join("");
    return `<section class="hb-gacha-standard"><header><div><p>Evergreen Equipment</p><h2>Legendary Spotlight</h2></div><button class="hb-gacha-pool-chip" type="button" data-gacha-action="pool" data-focus-key="gacha-pool">+${gacha.standardPoolMore} more in the pool</button></header><div class="hb-gacha-spotlights">${cards}</div></section>`;
  }

  function renderEquipmentPulls(model) {
    const gacha = model.gacha;
    const history = gacha.history.length ? gacha.history.map((entry) => `<li><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(entry.detail)}</span></li>`).join("") : "<li><span>No equipment pulls yet.</span></li>";
    const content = gacha.tier === "premium" ? limitedGachaSurface(gacha) : standardGachaSurface(gacha);
    return equipmentShell("Equipment Pulls", "equipment-pulls", `<section class="hb-equipment-layout hb-equipment-layout--pulls"><article class="hb-equipment-panel hb-equipment-pull"><header><div class="hb-equipment-tabs" role="tablist" aria-label="Equipment pull type"><button type="button" role="tab" aria-selected="${gacha.tier === "standard"}" data-gacha-action="tier:standard" data-focus-key="gacha-standard">Standard</button><button type="button" role="tab" aria-selected="${gacha.tier === "premium"}" data-gacha-action="tier:premium" data-focus-key="gacha-premium">Limited</button></div><h2>${escapeHtml(gacha.title)}</h2>${diamondRule("panel")}</header>${content}<div class="hb-gacha-pity-stack">${gachaPityBar(gacha.pity.epic, "Epic or Better")}${gachaPityBar(gacha.pity.legendary, "Legendary", { guarantee: true })}</div>${gacha.status ? `<p class="hb-gacha-status" role="status">${escapeHtml(gacha.status)}</p>` : ""}${gachaDrawRow(gacha)}</article><aside class="hb-equipment-panel hb-equipment-ledger"><h2>Balances</h2>${diamondRule("panel")}<dl><div><dt>Standard Tickets</dt><dd class="hb-value">${gacha.standardTickets}</dd></div><div><dt>Limited Tickets</dt><dd class="hb-value">${gacha.premiumTickets}</dd></div><div><dt>Scrap</dt><dd class="hb-value">${gacha.scrap}</dd></div></dl><h2>Recent Activity</h2><ul>${history}</ul></aside></section>`);
  }

  function renderOutfitter(model) {
    const data = model.outfitter;
    const slots = data.slots.map((slot) => {
      const itemName = slot.itemName || "Empty";
      return `<article data-slot-id="${escapeHtml(slot.id)}" data-selection-match="${slot.selectedMatch}" title="${escapeHtml(slot.label)} · ${escapeHtml(itemName)}"><strong>${escapeHtml(slot.label)}</strong><span aria-hidden="true">·</span><span>${escapeHtml(itemName)}</span></article>`;
    }).join("");
    const items = data.items.length
      ? data.items.map((item) => outfitterInventoryCard(item, data.selected?.itemId === item.itemId)).join("")
      : data.activeFilterCount
        ? `<div class="hb-equipment-empty"><p>No equipment matches these filters.</p><button type="button" data-equipment-action="filter-clear:outfitter" data-focus-key="outfitter-empty-clear">Clear Filters</button></div>`
        : `<div class="hb-equipment-empty"><p>No owned equipment.</p></div>`;
    const selected = data.selected ? outfitterSelectedDetail(data.selected) : `<aside class="hb-equipment-panel hb-equipment-detail" data-overlay-scroll-owner data-scroll-affordance="scrollbar"><h2>Equipment Management</h2>${diamondRule("panel")}<p>Select an owned item to inspect its complete rolls.</p></aside>`;
    const filters = equipmentFilterPanel({ scope: "outfitter", filters: data.filters, slots: data.slotOptions, rarities: data.rarityOptions, stats: data.statOptions, activeCount: data.activeFilterCount, scrollable: true });
    const inventoryHeader = `<header class="hb-outfitter-inventory-header"><div><h2>Owned Equipment</h2>${diamondRule("panel")}</div><div class="hb-outfitter-inventory-header__tools"><p class="hb-outfitter-inventory-status" aria-label="Scrap ${data.scrap}; ${data.ownedCount} of ${data.capacity} equipment owned">Scrap <strong class="hb-value">${data.scrap}</strong> · <strong class="hb-value">${data.ownedCount}/${data.capacity}</strong> Owned</p><nav aria-label="Outfitter tools"><button type="button" data-equipment-action="screen:outfitter-scrap-forge" data-focus-key="open-scrap-forge">Scrap Forge</button><button type="button" data-equipment-action="screen:outfitter-scrap-review" data-focus-key="open-scrap-review">Scrap Equipment</button></nav></div></header>`;
    return equipmentShell("Outfitter", "outfitter", `<section class="hb-equipped-strip" aria-label="Equipped loadout">${slots}</section><section class="hb-outfitter-layout">${filters}<article class="hb-equipment-panel hb-equipment-inventory">${inventoryHeader}<div class="hb-outfitter-grid" data-overlay-scroll-owner data-scroll-affordance="scrollbar">${items}</div></article>${selected}</section>`);
  }

  // Price caption for a listing. The currency depends on what the server
  // declared: with no chain in place yet, listings sell for scrap, and a dollar
  // sign in the caption would be a lie.
  function marketplacePrice(item) {
    if (item?.priceScrap != null) return `${Number(item.priceScrap)} scrap`;
    return `$${Number(item?.fixedUsd || 0).toFixed(2)}`;
  }

  function marketplaceRarity(value) {
    return `hb-market-rarity hb-market-rarity--${escapeHtml(value)}`;
  }

  function marketplacePrice(value) {
    return Math.max(0, Number(value) || 0).toLocaleString("en-US");
  }

  function marketplaceEstimate(value) {
    return Number(value) > 0 ? `≈ ${marketplacePrice(value)} $HB` : "Quoted at checkout";
  }

  function marketplaceTabs(active) {
    return `<div class="hb-market-tabs" role="tablist" aria-label="Marketplace sections">${[
      ["browse", "Browse"],
      ["sell", "Sell Equipment"],
      ["listings", "My Listings"],
    ].map(([id, label]) => `<button type="button" role="tab" aria-selected="${active === id}" tabindex="${active === id ? "0" : "-1"}" data-marketplace-tab="${id}" data-marketplace-action="tab:${id}" data-focus-key="marketplace-tab-${id}">${label}</button>`).join("")}</div>`;
  }

  function marketplaceAffixes(item) {
    return `<dl class="hb-market-affixes">${item.affixes.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd class="hb-value">${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
  }

  function marketplaceListingCard(item, selected) {
    return `<button class="hb-market-listing${selected ? " is-selected" : ""}" type="button" aria-pressed="${selected}" data-marketplace-action="select-listing:${escapeHtml(item.id)}" data-focus-key="market-listing-${escapeHtml(item.id)}"><span class="hb-market-listing__identity"><span class="hb-market-listing__rarity ${marketplaceRarity(item.rarity)}">${escapeHtml(titleCase(item.rarity))}</span><strong class="hb-market-listing__name" data-item-name>${escapeHtml(item.name)}</strong><span class="hb-market-listing__caption">${escapeHtml(titleCase(item.slot))} · ${escapeHtml(item.provenanceLabel)}</span></span><span class="hb-market-listing__prices"><strong class="hb-market-listing__price">${marketplacePrice(item)}</strong><strong class="hb-market-listing__estimate">${marketplaceEstimate(item.quoteHb)}</strong></span></button>`;
  }

  function marketplaceFilterRail(marketplace) {
    const { filters, filterOptions } = marketplace;
    const slotLabels = { all: "All Slots", helmet: "Helmet", chest: "Chest", boots: "Boots", legs: "Legs", bowstring: "Bowstring" };
    const rarityLabels = { all: "All Rarities", rare: "Rare", epic: "Epic", legendary: "Legendary" };
    const chips = (kind, values, labels, active) => values.map((value) => `<button type="button" aria-pressed="${active === value}" data-marketplace-action="filter-${kind}:${value}" data-focus-key="market-filter-${kind}-${value}">${escapeHtml(labels[value])}</button>`).join("");
    const statRows = filterOptions.stats.map((stat) => {
      const state = filters.stats[stat.id];
      return `<div class="hb-market-stat-filter" data-stat-state="${state}"><span>${escapeHtml(stat.label)}</span><button type="button" aria-label="Require ${escapeHtml(stat.label)}" aria-pressed="${state === "include"}" data-marketplace-action="filter-stat:${escapeHtml(stat.id)}:include" data-focus-key="market-filter-${escapeHtml(stat.id)}-include">+</button><button type="button" aria-label="Exclude ${escapeHtml(stat.label)}" aria-pressed="${state === "exclude"}" data-marketplace-action="filter-stat:${escapeHtml(stat.id)}:exclude" data-focus-key="market-filter-${escapeHtml(stat.id)}-exclude">−</button></div>`;
    }).join("");
    return `<aside class="hb-market-panel hb-market-filters"><h2>Filters</h2>${diamondRule("panel")}<fieldset><legend>Slot</legend><div class="hb-market-filter-chips">${chips("slot", filterOptions.slots, slotLabels, filters.slot)}</div></fieldset><fieldset><legend>Rarity</legend><div class="hb-market-filter-chips">${chips("rarity", filterOptions.rarities, rarityLabels, filters.rarity)}</div></fieldset><fieldset><legend>Stats</legend><p><strong>+</strong> Require · <strong>−</strong> Exclude</p><div class="hb-market-stat-filters">${statRows}</div><button type="button" data-marketplace-action="clear-stat-filters" data-focus-key="market-clear-stats">Clear Stat Filters</button></fieldset></aside>`;
  }

  function renderMarketplaceBrowse(marketplace) {
    const selected = marketplace.selectedListing;
    const cards = marketplace.listings.map((item) => marketplaceListingCard(item, selected?.id === item.id)).join("");
    const detail = selected ? `<aside class="hb-market-panel hb-market-detail" aria-label="Selected listing" data-overlay-scroll-owner data-scroll-affordance="scrollbar"><header><span>${escapeHtml(selected.provenanceLabel)} · Verified</span><h2 data-item-name>${escapeHtml(selected.name)}</h2><p><span class="${marketplaceRarity(selected.rarity)}">${escapeHtml(titleCase(selected.rarity))}</span> · ${escapeHtml(titleCase(selected.slot))}</p></header>${selected.effect ? `<section class="hb-market-effect"><strong>${escapeHtml(selected.effect.name)}</strong><p>${escapeHtml(selected.effect.description)}</p></section>` : ""}${marketplaceAffixes(selected)}<dl class="hb-market-price"><div><dt>Fixed price</dt><dd class="hb-value">${marketplacePrice(selected)}</dd></div><div><dt>Current estimate</dt><dd class="hb-value">${marketplaceEstimate(selected.quoteHb)}</dd></div><div><dt>Seller</dt><dd>${escapeHtml(selected.seller)}</dd></div></dl><button class="hb-ledger-button is-primary" type="button" data-marketplace-action="checkout:${escapeHtml(selected.id)}" data-focus-key="market-buy-${escapeHtml(selected.id)}">Buy Now <span aria-hidden="true">»</span></button></aside>` : "";
    const empty = marketplace.listings.length ? "" : `<div class="hb-market-empty" role="status"><h3>No equipment matches these filters.</h3><p>Clear one or more filters to see available listings.</p><button type="button" data-marketplace-action="clear-all-filters" data-focus-key="market-empty-clear">Clear Filters</button></div>`;
    return `<section class="hb-market-browse" data-marketplace-view="browse">${marketplaceFilterRail(marketplace)}<section class="hb-market-panel hb-market-results"><header><div><h2>Verified Listings</h2>${diamondRule("panel")}</div><label>Sort<select data-marketplace-control="sort" data-focus-key="market-sort"><option value="newest"${marketplace.filters.sort === "newest" ? " selected" : ""}>Newest</option><option value="low"${marketplace.filters.sort === "low" ? " selected" : ""}>Price: Low</option><option value="high"${marketplace.filters.sort === "high" ? " selected" : ""}>Price: High</option></select></label></header><p class="hb-market-result-count" role="status"><strong class="hb-value">${marketplace.listings.length}</strong> verified result${marketplace.listings.length === 1 ? "" : "s"}</p><div class="hb-market-listing-scroll" data-overlay-scroll-owner data-scroll-affordance="scrollbar">${cards || empty}</div></section>${detail}</section>`;
  }

  function renderMarketplaceSell(marketplace) {
    const selected = marketplace.selectedSellItem;
    const cards = marketplace.sellItems.map((item) => `<button class="hb-market-sell-item${selected?.id === item.id ? " is-selected" : ""}" type="button" aria-pressed="${selected?.id === item.id}" data-marketplace-action="select-sell:${escapeHtml(item.id)}" data-focus-key="market-sell-${escapeHtml(item.id)}"><span class="${marketplaceRarity(item.rarity)}">${escapeHtml(titleCase(item.rarity))}</span><strong data-item-name>${escapeHtml(item.name)}</strong><span>${escapeHtml(titleCase(item.slot))} · ${escapeHtml(item.provenanceLabel)}</span><small data-eligibility="${escapeHtml(item.eligibility.code)}">${escapeHtml(item.eligibility.reason)}</small></button>`).join("");
    const quote = marketplace.sellQuote;
    const review = selected ? `<aside class="hb-market-panel hb-market-sell-review"><h2>Listing Review</h2>${diamondRule("panel")}<p class="${marketplaceRarity(selected.rarity)}">${escapeHtml(titleCase(selected.rarity))} · ${escapeHtml(titleCase(selected.slot))}</p><h3 data-item-name>${escapeHtml(selected.name)}</h3><p>${escapeHtml(selected.eligibility.reason)}</p><label>Fixed dollar price<input type="number" min="1" step="1" value="${escapeHtml(marketplace.sellPriceUsd)}" data-marketplace-control="sell-price" data-focus-key="market-sell-price"></label>${quote ? `<dl class="hb-market-split"><div><dt>Current estimate</dt><dd class="hb-value">≈ ${marketplacePrice(quote.hbAmount)} $HB</dd></div><div><dt>Seller · 90%</dt><dd class="hb-value">${marketplacePrice(quote.split.seller)} $HB</dd></div><div><dt>Burn · 5%</dt><dd class="hb-value">${marketplacePrice(quote.split.burn)} $HB</dd></div><div><dt>Development treasury · 5%</dt><dd class="hb-value">${marketplacePrice(quote.split.treasury)} $HB</dd></div></dl>` : ""}<button class="hb-ledger-button is-primary" type="button" data-marketplace-action="review-listing" data-focus-key="market-review-listing"${selected.eligibility.eligible && marketplace.authorityAvailable ? "" : " disabled"}>Review Listing</button><small>${marketplace.authorityAvailable ? "Your wallet confirms the on-chain listing. No fee is charged." : "Marketplace authority must be available before a listing can be created."}</small></aside>` : "";
    return `<section class="hb-market-sell" data-marketplace-view="sell"><article class="hb-market-panel hb-market-sell-inventory"><h2>Eligible Equipment</h2>${diamondRule("panel")}<p>Only verified Standard and Limited Pull equipment may be traded. Equipped items must be unequipped first.</p><div class="hb-market-sell-scroll" data-overlay-scroll-owner data-scroll-affordance="scrollbar">${cards}</div></article>${review}</section>`;
  }

  function renderMarketplaceListings(marketplace) {
    const active = marketplace.activeListings.map((listing) => `<article class="hb-market-active-listing"><header><div><span class="${marketplaceRarity(listing.rarity)}">${escapeHtml(titleCase(listing.rarity))}</span><h3 data-item-name>${escapeHtml(listing.name)}</h3></div><strong>Active</strong></header><dl><div><dt>Fixed price</dt><dd class="hb-value">${marketplacePrice(listing)}</dd></div><div><dt>Current estimate</dt><dd class="hb-value">${marketplaceEstimate(listing.quoteHb)}</dd></div><div><dt>Frozen payout wallet</dt><dd title="${escapeHtml(listing.frozenWallet)}">${escapeHtml(listing.frozenWallet)}</dd></div></dl><button type="button" data-marketplace-action="cancel:${escapeHtml(listing.id)}" data-focus-key="market-cancel-${escapeHtml(listing.id)}">Cancel Listing</button></article>`).join("");
    const activity = marketplace.activity.map((entry) => `<li><strong>${escapeHtml(entry.label)}</strong><span>${escapeHtml(entry.detail)}</span></li>`).join("");
    return `<section class="hb-market-my-listings" data-marketplace-view="listings"><article class="hb-market-panel"><h2>Active Listing</h2>${diamondRule("panel")}<div class="hb-market-active-scroll" data-overlay-scroll-owner data-scroll-affordance="scrollbar">${active}</div></article><article class="hb-market-panel"><h2>Marketplace Activity</h2>${diamondRule("panel")}<ul class="hb-market-activity">${activity}</ul><dl class="hb-market-totals"><div><dt>Completed sales</dt><dd class="hb-value">${marketplace.saleTotals.completed}</dd></div><div><dt>Sale volume</dt><dd class="hb-value">${marketplacePrice(marketplace.saleTotals.volumeHb)} $HB</dd></div><div><dt>Seller payout</dt><dd class="hb-value">${marketplacePrice(marketplace.saleTotals.sellerHb)} $HB</dd></div><div><dt>Burned</dt><dd class="hb-value">${marketplacePrice(marketplace.saleTotals.burnHb)} $HB</dd></div><div><dt>Development treasury</dt><dd class="hb-value">${marketplacePrice(marketplace.saleTotals.treasuryHb)} $HB</dd></div></dl><p>Cancelled listings are recorded in activity and excluded from completed-sale totals.</p></article></section>`;
  }

  function renderMarketplace(model) {
    const marketplace = model.marketplace;
    const view = marketplace.tab === "sell" ? renderMarketplaceSell(marketplace) : marketplace.tab === "listings" ? renderMarketplaceListings(marketplace) : renderMarketplaceBrowse(marketplace);
    return `<main class="hb-main hb-marketplace" data-screen="marketplace">${screenHeading("marketplace-title", "Marketplace")}<div class="hb-market-preview-status" role="status"><strong>${marketplace.live ? "Live Marketplace" : "Developer Preview"}</strong><span>${escapeHtml(marketplace.status)}</span><span>${escapeHtml(marketplace.wallet.address)}${marketplace.wallet.fixture ? ` · ${marketplacePrice(marketplace.wallet.balanceHb)} $HB` : ""}</span></div>${marketplaceTabs(marketplace.tab)}<div class="hb-market-view" data-overlay-scroll-owner data-scroll-affordance="scrollbar">${view}</div></main>`;
  }

  function renderOutfitterReroll(model) {
    const reroll = model.outfitter.reroll;
    if (!reroll.item) return equipmentShell("Reroll Equipment", "outfitter-reroll", `<section class="hb-equipment-panel hb-equipment-centre"><p>Select an owned item before opening Reroll.</p><button class="hb-ledger-button" type="button" data-equipment-action="screen:outfitter" data-focus-key="reroll-back">Back to Outfitter</button></section>`);
    const lockable = reroll.preserveCount > 0 && reroll.product !== "legendary_effect_reforge";
    const products = reroll.products.map((product) => `<button type="button" class="hb-ledger-button${product.key === reroll.product ? " is-primary" : ""}" data-equipment-action="service:${escapeHtml(product.key)}" aria-pressed="${product.key === reroll.product}" data-focus-key="reroll-service-${escapeHtml(product.key)}"${reroll.candidate || reroll.awaitingCandidate ? " disabled" : ""}><strong>${escapeHtml(product.label)}</strong><span>${product.scrapCost != null ? `${product.scrapCost} scrap` : `$${product.fixedUsd} in $HB`}</span></button>`).join("");
    const rolls = reroll.item.affixes.map((affix, index) => {
      const preserved = reroll.preservedStatIndexes.includes(index);
      return `<button type="button" data-equipment-action="preserve:${index}" data-focus-key="reroll-stat-${index}" aria-pressed="${preserved}"${lockable && !reroll.candidate && !reroll.awaitingCandidate ? "" : " disabled"}><strong>${escapeHtml(affix.value)}</strong><span>${escapeHtml(affix.label)}${preserved ? " · Preserved" : ""}</span></button>`;
    }).join("");
    const payment = reroll.payment || { costLabel: "—", canPay: false, status: "declined", message: "Reroll payment integration pending." };
    const paidDisabled = !payment.canPay || payment.pending;
    const paymentNotice = payment.status === "insufficient_funds"
      ? `Insufficient funds · Shortfall ${payment.shortfallLabel || "—"}`
      : payment.status === "declined"
        ? payment.message || "Reroll payment integration pending."
        : payment.message || "Each Equipment Service requires payment.";
    const changes = statMappingRows(reroll.changes, { reroll: true });
    const candidateEffect = reroll.candidateItem?.effect
      ? `<p><strong>${escapeHtml(reroll.candidateItem.effect.name)}</strong> — ${escapeHtml(reroll.candidateItem.effect.description)}</p>`
      : "";
    const candidate = reroll.candidate
      ? `<article class="hb-equipment-panel hb-reroll-candidate"><h2>Verified Candidate</h2>${diamondRule("panel")}<div class="hb-reroll-change-list">${changes}</div>${candidateEffect}<p>Your owned item is unchanged until you accept.</p><p><strong>Keep Original does not refund this paid service.</strong></p><p class="hb-reroll-payment-state" role="status">${escapeHtml(paymentNotice)}</p><footer><button class="hb-ledger-button is-paid" type="button" data-equipment-action="reroll-again" data-focus-key="reroll-again"${paidDisabled ? " disabled" : ""}>Reroll Again · ${escapeHtml(payment.costLabel)}</button><button class="hb-ledger-button" type="button" data-equipment-action="keep-original" data-focus-key="keep-original">Keep Original</button><button class="hb-ledger-button is-primary" type="button" data-equipment-action="accept-candidate" data-focus-key="accept-candidate">Accept Candidate</button></footer></article>`
      : reroll.awaitingCandidate
        ? `<article class="hb-equipment-panel hb-reroll-candidate"><h2>Creating Candidate</h2>${diamondRule("panel")}<p>Payment was submitted. LOOTHOOD is waiting for confirmation and verified randomness.</p><p class="hb-reroll-payment-state" role="status">${escapeHtml(paymentNotice)}</p></article>`
        : `<article class="hb-equipment-panel hb-reroll-candidate"><h2>Equipment Service</h2>${diamondRule("panel")}<p>Choose a service and any stat rolls to preserve. Unlocked rolls are rerolled together.</p><p><strong>You are charged once the wallet transaction confirms, even if you later keep the original.</strong></p><p class="hb-reroll-payment-state" role="status">${escapeHtml(paymentNotice)}</p><button class="hb-ledger-button is-paid" type="button" data-equipment-action="reroll-now" data-focus-key="reroll-now"${paidDisabled ? " disabled" : ""}>Purchase Service · ${escapeHtml(payment.costLabel)}</button></article>`;
    return equipmentShell("Reroll Equipment", "outfitter-reroll", `<section class="hb-equipment-layout hb-equipment-layout--reroll"><article class="hb-equipment-panel"><h2>${escapeHtml(reroll.item.name)}</h2>${diamondRule("panel")}<div class="hb-reroll-services" role="group" aria-label="Choose an Equipment Service">${products}</div><h3>${reroll.preserveCount ? `Choose ${reroll.preserveCount} stat${reroll.preserveCount === 1 ? "" : "s"} to preserve` : reroll.product === "legendary_effect_reforge" ? "All four stat rolls are preserved" : "All stat rolls will change"}</h3><div class="hb-reroll-rolls" role="group" aria-label="Choose stat rolls to preserve">${rolls}</div><button class="hb-ledger-button" type="button" data-equipment-action="screen:outfitter" data-focus-key="reroll-back">Back to Outfitter</button></article>${candidate}</section>`);
  }

  function renderScrapForge(model) {
    const forge = model.outfitter.forge;
    return equipmentShell("Scrap Forge", "outfitter-scrap-forge", `<section class="hb-equipment-layout hb-equipment-layout--forge"><article class="hb-equipment-panel"><h2>Create Equipment</h2>${diamondRule("panel")}<p>Spend Scrap to create one verified account-bound item.</p>${model.outfitter.status ? `<p role="status">${escapeHtml(model.outfitter.status)}</p>` : ""}<div class="hb-equipment-form"><label>Rarity<select data-equipment-control="forge-rarity" data-focus-key="forge-rarity">${forge.rarities.map((rarity) => `<option value="${rarity}"${rarity === forge.rarity ? " selected" : ""}>${escapeHtml(rarity)}</option>`).join("")}</select></label><label>Slot Rule<select data-equipment-control="forge-mode" data-focus-key="forge-mode"><option value="random"${forge.mode === "random" ? " selected" : ""}>Random slot</option><option value="exact"${forge.mode === "exact" ? " selected" : ""}>Exact slot</option></select></label><label>Exact Slot<select data-equipment-control="forge-slot" data-focus-key="forge-slot"${forge.mode === "exact" ? "" : " disabled"}>${forge.slots.map((slot) => `<option value="${escapeHtml(slot.id)}"${slot.id === forge.slot ? " selected" : ""}>${escapeHtml(slot.label)}</option>`).join("")}</select></label></div><dl class="hb-equipment-summary"><div><dt>Affixes</dt><dd class="hb-value">${forge.affixCount}</dd></div><div><dt>Cost</dt><dd class="hb-value">${forge.cost} Scrap</dd></div><div><dt>Balance</dt><dd class="hb-value">${forge.balance} Scrap</dd></div></dl><footer><button class="hb-ledger-button" type="button" data-equipment-action="screen:outfitter" data-focus-key="forge-back">Back to Outfitter</button><button class="hb-ledger-button is-primary" type="button" data-equipment-action="forge" data-focus-key="forge-review"${forge.canCraft ? "" : " disabled"}>${forge.pending ? "Resume Craft" : "Review Craft"}</button></footer></article><aside class="hb-equipment-panel"><h2>Craft Rules</h2>${diamondRule("panel")}<p>Crafted gear can be equipped, rerolled, protected, or recycled for its Standard rarity Scrap value. It remains account-bound and cannot be traded.</p></aside></section>`);
  }

  function renderScrapReview(model) {
    const scrap = model.outfitter.scrapReview;
    const items = scrap.items.length
      ? scrap.items.map((item) => equipmentItem(item, { scrap: true, protect: true })).join("")
      : scrap.activeFilterCount
        ? `<div class="hb-equipment-empty"><p>No equipment matches these filters.</p><button type="button" data-equipment-action="filter-clear:scrap" data-focus-key="scrap-empty-clear">Clear Filters</button></div>`
        : `<div class="hb-equipment-empty"><p>No equipment available for review.</p></div>`;
    const filters = equipmentFilterPanel({ scope: "scrap", filters: scrap.filters, slots: scrap.slots, rarities: scrap.rarities, stats: scrap.statOptions, activeCount: scrap.activeFilterCount });
    return equipmentShell("Scrap Equipment", "outfitter-scrap-review", `<section class="hb-equipment-panel hb-scrap-toolbar">${filters}<div class="hb-scrap-bulk"><label>Bulk Select<select data-equipment-control="scrap-below" data-focus-key="scrap-below">${scrap.rarities.slice(1).map((rarity) => `<option value="${rarity}"${rarity === scrap.bulkBelow ? " selected" : ""}>Below ${escapeHtml(rarity)}</option>`).join("")}</select></label><button type="button" data-equipment-action="select-below" data-focus-key="select-below">Select Visible Below Rarity</button><button type="button" data-equipment-action="clear-scrap" data-focus-key="clear-scrap">Clear Selection</button><p role="status"><strong class="hb-value">${scrap.selectedCount}</strong> selected · <strong class="hb-value">${scrap.projectedScrap}</strong> Scrap projected${model.outfitter.status ? ` · ${escapeHtml(model.outfitter.status)}` : ""}</p></div></section><section class="hb-equipment-layout hb-equipment-layout--scrap"><article class="hb-equipment-panel hb-equipment-inventory"><div class="hb-equipment-scroll" data-overlay-scroll-owner>${items}</div></article><aside class="hb-equipment-panel hb-scrap-summary"><h2>Final Review</h2>${diamondRule("panel")}<p>Scrapping permanently destroys the selected equipment. Standard, Limited, Scrap-crafted, and Tutorial equipment are eligible. Equipped, protected, first-clear reward, Test, and invalid items cannot be selected.</p><footer><button class="hb-ledger-button" type="button" data-equipment-action="screen:outfitter" data-focus-key="scrap-back">Back to Outfitter</button><button class="hb-ledger-button is-danger-hint" type="button" data-equipment-action="confirm-scrap" data-focus-key="confirm-scrap"${scrap.selectedCount ? "" : " disabled"}>Scrap ${scrap.selectedCount} Item${scrap.selectedCount === 1 ? "" : "s"}</button></footer></aside></section>`);
  }

  // The guide used to be a modal window on top of the game: it dimmed the
  // screen and arrived with its own old-style buttons and a round close cross.
  // A screen settles all of that at once — shared frame, shared navigation,
  // shared button style.
  /* The currently open documentation page.
     ------------------------------------------------------------------
     It lives here rather than in the game model: this is static text, and
     giving every page its own screen in the state machine would mean
     describing a move between paragraphs as a move between game modes.

     We tried it the other way — Docs were tabs inside the guide. It did not
     work out in terms of meaning: the guide explains how to play, the
     documentation why the game can be trusted. A tab inside somebody else's
     section made the second an appendix to the first, even though they are
     read at different moments and by different people. */
  let docsPage = "overview";

  function guideSection(section) {
    const entries = section.entries.map((entry) => `
      <article class="hb-guide-entry${entry.key ? " is-key" : ""}">
        <h3>${escapeHtml(entry.name)}</h3>
        <p>${escapeHtml(entry.text)}</p>
      </article>`).join("");
    // The icon is taken from the same sprites that live in the interface.
    // Drawing a separate set for the guide would mean keeping a second system
    // of signs, which sooner or later drifts away from the first.
    // The path has to be absolute. The value goes into the --mark variable, and
    // url() inside a variable is resolved by the browser relative to the
    // stylesheet where the variable is used, not relative to the page: a
    // relative images/… turns into /css/images/… and gives a 404.
    // This is exactly what the legendary icons in Loot Pulls already tripped on.
    const iconUrl = section.icon
      ? new URL("images/" + section.icon, document.baseURI).href
      : "";
    const icon = iconUrl
      ? `<span class="hb-guide-mark" style="--mark:url('${escapeHtml(iconUrl)}')" aria-hidden="true"></span>`
      : "";
    return `
      <section class="hb-guide-section" aria-labelledby="guide-${escapeHtml(section.id)}">
        <header>
          ${icon}
          <div>
            <h2 id="guide-${escapeHtml(section.id)}">${escapeHtml(section.title)}</h2>
            <p>${escapeHtml(section.lede)}</p>
          </div>
        </header>
        <div class="hb-guide-entries">${entries}</div>
      </section>`;
  }

  function renderGuide(model) {
    const content = (typeof window !== "undefined" && window.LOOTHOOD_GUIDE) || null;
    if (!content) {
      return `<main class="hb-guide-screen" data-screen="guide">
        <p role="status">Guide content failed to load.</p>
      </main>`;
    }
    const sections = content.sections.map(guideSection).join("");
    const tours = (model.guide && model.guide.tours ? model.guide.tours : [])
      .map((tour) => `<button class="hb-ledger-button" type="button" data-replay-guidance="${escapeHtml(tour.id)}">${escapeHtml(tour.label)}</button>`)
      .join("");
    const replay = model.guide && model.guide.canReplayTutorial
      ? `<button class="hb-ledger-button is-primary" type="button" data-guide-action="replay-tutorial">Replay Tutorial</button>`
      : "";
    return `<main class="hb-guide-screen" data-screen="guide">
      ${screenHeading("guide-title", "Guide")}
      <p class="hb-guide-lede">How the Hunt actually works. Numbers here match the game, not the marketing.</p>
      <div class="hb-guide-body">${sections}</div>
      <section class="hb-guide-section hb-guide-section--tours" aria-labelledby="guide-tours">
        <header>
          <h2 id="guide-tours">Replay the tips</h2>
          <p>Walk any screen again, or the whole tutorial from the start.</p>
        </header>
        <div class="hb-guide-tours">${replay}${tours}</div>
      </section>
    </main>`;
  }

  /* The documentation screen.
     ------------------------------------------------------------------
     The layout is taken from ordinary technical documentation: a narrow column
     of pages on the left, the text on the right, "next" at the bottom. The
     table of contents on the side is not there for looks — it shows that the
     document is finite: a list of seven items reads as "this can be read
     through", an endless feed does not.

     The "next" button matters more than the contents. Documentation has a
     reading order, and someone who has finished "Verification" should be
     carried on to "Seasons" rather than sent back to the list to choose. */
  function docsBlock(block) {
    if (block.type === "h3") return `<h3>${escapeHtml(block.text)}</h3>`;
    if (block.type === "note") return `<p class="hb-docs-note">${escapeHtml(block.text)}</p>`;
    if (block.type === "code") return `<pre class="hb-docs-code"><code>${escapeHtml(block.text)}</code></pre>`;
    if (block.type === "list") {
      return `<ul class="hb-docs-list">${block.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
    }
    if (block.type === "table") {
      const head = `<tr>${block.head.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;
      const rows = block.rows
        .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("");
      return `<div class="hb-docs-tablewrap"><table class="hb-docs-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
    }
    return `<p>${escapeHtml(block.text)}</p>`;
  }

  function renderDocs(model) {
    const content = (typeof window !== "undefined" && window.LOOTHOOD_DOCS) || null;
    if (!content) {
      return `<main class="hb-docs-screen" data-screen="docs"><p role="status">Documentation failed to load.</p></main>`;
    }
    const pages = content.pages;
    const at = Math.max(0, pages.findIndex((p) => p.id === docsPage));
    const page = pages[at] || pages[0];
    const next = pages[at + 1] || null;

    const nav = pages.map((p) => `<button class="${p.id === page.id ? "is-current" : ""}" type="button" data-docs-page="${p.id}" data-focus-key="docs-${p.id}"${p.id === page.id ? ' aria-current="page"' : ""}>${escapeHtml(p.title)}</button>`).join("");

    const body = page.blocks.map(docsBlock).join("");
    const onward = next
      ? `<button class="hb-docs-next" type="button" data-docs-page="${next.id}" data-focus-key="docs-next"><span>Next</span><strong>${escapeHtml(next.title)}</strong><span aria-hidden="true">»</span></button>`
      : `<a class="hb-docs-next" href="verify.html"><span>Check it yourself</span><strong>Verification page</strong><span aria-hidden="true">»</span></a>`;

    return `<main class="hb-docs-screen" data-screen="docs">
      <aside class="hb-docs-nav" aria-label="Documentation pages">
        <p class="hb-docs-nav__title">Docs</p>
        ${nav}
      </aside>
      <article class="hb-docs-body">
        ${screenHeading("docs-title", page.title)}
        <p class="hb-docs-lede">${escapeHtml(page.lede)}</p>
        ${body}
        <footer class="hb-docs-foot">${onward}</footer>
      </article>
    </main>`;
  }

  function renderScreen(model) {
    if (model.screen === "docs") return renderDocs(model);
    if (model.screen === "settlement") return renderSettlement(model);
    if (model.screen === "plots") return renderPlots(model);
    if (model.screen === "bounties") return renderBounties(model);
    if (model.screen === "guide") return renderGuide(model);
    if (model.screen === "standard-prep") return renderPreparation(model, false);
    if (model.screen === "season-centre") return renderSeasonCentre(model);
    if (model.screen === "entry-ticket-review") return renderTicketReview(model);
    if (model.screen === "entry-ticket-secured") return renderTicketState(model, false);
    if (model.screen === "entry-ticket-active") return renderTicketState(model, true);
    if (model.screen === "seasonal-prep") return renderPreparation(model, true);
    if (model.screen === "season-leaderboard") return renderLeaderboard(model);
    if (model.screen === "equipment-pulls") return renderEquipmentPulls(model);
    if (model.screen === "outfitter") return renderOutfitter(model);
    if (model.screen === "marketplace") return renderMarketplace(model);
    if (model.screen === "outfitter-reroll") return renderOutfitterReroll(model);
    if (model.screen === "outfitter-scrap-forge") return renderScrapForge(model);
    if (model.screen === "outfitter-scrap-review") return renderScrapReview(model);
    return renderHunt(model);
  }

  function renderApp(model) {
    const loadoutValid = model.screen === "standard-prep"
      ? (model.loadout.verificationErrors || 0) === 0
      : model.loadout.invalidCount === 0 && (model.loadout.verificationErrors || 0) === 0;
    return `<div class="hb-app" data-hb-menu-root data-screen="${escapeHtml(model.screen)}" data-loadout-valid="${loadoutValid}" data-panel-texture="${model.panelTexture ? "on" : "off"}">${symbols()}${topbar(model)}<div class="hb-shell-body">${navigation(model.screen)}${renderScreen(model)}</div></div>`;
  }

  function closestWithDataset(target, root, attribute) {
    let node = target;
    while (node && node !== root) {
      if (node.dataset && Object.prototype.hasOwnProperty.call(node.dataset, attribute)) return node;
      node = node.parentElement;
    }
    return null;
  }

  function createController({ root, getModel, onIntent }) {
    if (!root || typeof getModel !== "function" || typeof onIntent !== "function") throw new TypeError("Desktop menu controller requires root, getModel and onIntent.");
    let screen = "hunt";
    let signature = "";
    let active = true;
    let renderCount = 0;

    function focusHeading() {
      root.querySelector?.("[data-screen-heading]")?.focus?.();
    }

    function render({ moveFocus = false } = {}) {
      if (!active) return false;
      const model = { ...getModel(), screen };
      const nextSignature = JSON.stringify(model);
      if (signature === nextSignature) return false;
      const activeElement = root.ownerDocument?.activeElement;
      const focusKey = activeElement && root.contains?.(activeElement) ? activeElement.dataset?.focusKey : "";
      root.innerHTML = renderApp(model);
      signature = nextSignature;
      renderCount += 1;
      if (moveFocus) focusHeading();
      else if (focusKey) root.querySelector?.(`[data-focus-key="${focusKey}"]`)?.focus?.();
      return true;
    }

    function navigate(nextScreen, options = {}) {
      screen = SCREENS.includes(nextScreen) ? nextScreen : "hunt";
      signature = "";
      render({ moveFocus: options.moveFocus !== false });
    }

    async function dispatchIntent(kind, action, source, event) {
      const result = await onIntent({ kind, action, screen, source, event });
      if (result?.screen) navigate(result.screen);
      else if (result?.refresh !== false) {
        signature = "";
        render({ moveFocus: Boolean(result?.moveFocus) });
      }
    }

    root.addEventListener("click", (event) => {
      // Documentation pages are switched here, ahead of the general intent
      // dispatch: they change nothing in the game except the text on display.
      const docsButton = closestWithDataset(event.target, root, "docsPage");
      if (docsButton && !docsButton.disabled) {
        const next = docsButton.dataset.docsPage;
        if (next && next !== docsPage) {
          docsPage = next;
          signature = "";
          render({ moveFocus: true });
        }
        return;
      }
      const bindings = [
        ["shellDestination", "shell"],
        ["huntAction", "hunt"],
        ["seasonTab", "season-tab"],
        ["seasonAction", "season"],
        ["menuFoundation", "foundation"],
        ["menuElemental", "elemental"],
        ["settlementAction", "settlement"],
        ["plotAction", "plot"],
        ["audioAction", "audio"],
        ["equipmentAction", "equipment"],
        ["gachaAction", "gacha"],
        // The guide is a screen now, not a window. The old handler for the
        // "show the tips" buttons hung on the window itself and does not reach
        // a screen, so they go through the general intent dispatch.
        ["replayGuidance", "guidance"],
        ["guideAction", "guide-action"],
        ["marketplaceAction", "marketplace"],
      ];
      for (const [datasetKey, kind] of bindings) {
        const target = closestWithDataset(event.target, root, datasetKey);
        if (!target || target.disabled) continue;
        void dispatchIntent(kind, target.dataset[datasetKey], target, event);
        return;
      }
    });

    root.addEventListener("change", (event) => {
      const prestige = closestWithDataset(event.target, root, "menuPrestigeTier");
      if (prestige && !prestige.disabled) {
        void dispatchIntent("prestige", prestige.value, prestige, event);
        return;
      }
      const equipment = closestWithDataset(event.target, root, "equipmentControl");
      if (equipment && !equipment.disabled) void dispatchIntent("equipment-control", `${equipment.dataset.equipmentControl}:${equipment.value ?? (equipment.checked ? "1" : "0")}`, equipment, event);
      const marketplace = closestWithDataset(event.target, root, "marketplaceControl");
      if (marketplace && !marketplace.disabled) void dispatchIntent("marketplace-control", `${marketplace.dataset.marketplaceControl}:${marketplace.value ?? (marketplace.checked ? "1" : "0")}`, marketplace, event);
    });

    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && screen.startsWith("outfitter") && screen !== "outfitter") {
        event.preventDefault();
        void dispatchIntent("equipment", "escape", event.target, event);
        return;
      }
      const tab = closestWithDataset(event.target, root, "seasonTab") || closestWithDataset(event.target, root, "marketplaceTab");
      if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const tabs = Array.from(tab.closest?.('[role="tablist"]')?.querySelectorAll?.('[role="tab"]') || []);
      const index = tabs.indexOf(tab);
      if (index < 0) return;
      event.preventDefault();
      const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[nextIndex]?.focus?.();
    });

    return Object.freeze({
      refresh: render,
      navigate,
      getScreen: () => screen,
      getRenderCount: () => renderCount,
      setActive(value) {
        active = Boolean(value);
        root.hidden = !active;
        if (active) render();
      },
    });
  }

  return Object.freeze({ ASSET_ROOT, SCREENS, createController, escapeHtml, renderApp, legendaryArt });
});
