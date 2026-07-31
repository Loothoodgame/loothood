(function initGachaReveal(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodGachaReveal = api;
})(typeof window !== "undefined" ? window : globalThis, function gachaRevealFactory() {
  "use strict";

  const ASSET_ROOT = "./assets/gacha/sheriffs_notice_a1";
  const TICK_MS = 125;
  const HERO_FRAME_COUNTS = Object.freeze({ common: 4, uncommon: 4, rare: 4, epic: 13, legendary: 13 });
  const COMPACT_FRAMES = Object.freeze({
    common: Object.freeze({ open: 0 }),
    uncommon: Object.freeze({ open: 0 }),
    rare: Object.freeze({ open: 0 }),
    epic: Object.freeze({ closed: 1, alternate: 2, focus: 3, pressed: 4, open: 5 }),
    legendary: Object.freeze({ closed: 6, alternate: 7, focus: 8, pressed: 9, open: 10 }),
  });
  const SINGLE_RARE_SEQUENCE = Object.freeze([
    Object.freeze({ poster: 0, arrow: 0 }),
    Object.freeze({ poster: 0, arrow: 0 }),
    Object.freeze({ poster: 1, arrow: 1, impact: 0 }),
    Object.freeze({ poster: 2, arrow: 2, impact: 1 }),
    Object.freeze({ poster: 3, arrow: 2, impact: 2 }),
    Object.freeze({ poster: 2, arrow: 3, impact: 3 }),
    Object.freeze({ poster: 4, arrow: 3 }),
    Object.freeze({ poster: 5, arrow: 3 }),
    Object.freeze({ poster: 6, arrow: 3 }),
    Object.freeze({ poster: 7, arrow: 3 }),
    Object.freeze({ poster: 8, arrow: 3 }),
    Object.freeze({ poster: 9, arrow: 3 }),
    Object.freeze({ poster: 10, arrow: 3, open: true }),
    Object.freeze({ poster: 10, arrow: 3, open: true }),
    Object.freeze({ poster: 10, arrow: 3, open: true }),
    Object.freeze({ poster: 10, arrow: 3, open: true }),
  ]);
  const SINGLE_SCRAP_SEQUENCE = Object.freeze([
    Object.freeze({ poster: 0, arrow: 0 }),
    Object.freeze({ poster: 0, arrow: 0 }),
    Object.freeze({ poster: 1, arrow: 1, impact: 0 }),
    Object.freeze({ poster: 1, arrow: 2, impact: 1 }),
    Object.freeze({ poster: 2, arrow: 3, impact: 2, open: true }),
    Object.freeze({ poster: 2, arrow: 3, impact: 3, open: true }),
    Object.freeze({ poster: 2, arrow: 3, open: true }),
    Object.freeze({ poster: 2, arrow: 3, open: true }),
  ]);
  const TEN_LEGENDARY_SEQUENCE = Object.freeze([5, 6, 7, 8, 9, 10]);
  const TEN_LEGENDARY_IMPACT_MS = 1600;
  const TEN_LEGENDARY_FRAME_MS = 88;

  function normalizeRarity(value) {
    const rarity = String(value || "").toLowerCase();
    return ["common", "uncommon", "rare", "epic", "legendary"].includes(rarity) ? rarity : "common";
  }

  function revealArtKey(result) {
    return result.rarity === "epic" || result.rarity === "legendary" ? result.rarity : "scrap";
  }

  function requiresFocusedReveal(result) {
    return result.rarity === "epic" || result.rarity === "legendary";
  }

  function requiresTenLegendaryCinematic(result) {
    return result.rarity === "legendary";
  }

  function normalizeResults(results) {
    return Object.freeze((Array.isArray(results) ? results : []).slice(0, 10).map((result, index) => Object.freeze({
      index,
      itemId: String(result?.itemId || `result-${index}`),
      rarity: normalizeRarity(result?.rarity),
      label: String(result?.label || "Reward"),
      detail: String(result?.detail || ""),
      slotLabel: String(result?.slotLabel || ""),
      rarityLabel: String(result?.rarityLabel || result?.rarity || ""),
      sourceLabel: String(result?.sourceLabel || ""),
      tradeState: String(result?.tradeState || ""),
      dispositionLabel: String(result?.dispositionLabel || ""),
      statRolls: Object.freeze(Array.isArray(result?.statRolls) ? result.statRolls.map((entry) => String(entry || "")).filter(Boolean) : []),
      effectName: String(result?.effectName || ""),
      effectDescription: String(result?.effectDescription || ""),
    })));
  }

  function equipmentNoticeLabel(result) {
    const rarity = result.rarityLabel || result.rarity;
    const slot = result.slotLabel || "Equipment";
    return `${rarity} ${slot}`;
  }

  function spritePosition(index, count) {
    if (count <= 1) return "0%";
    return `${(Math.max(0, Math.min(count - 1, index)) * 100) / (count - 1)}%`;
  }

  function setSprite(element, file, frameIndex, frameCount) {
    element.style.backgroundImage = `url("${ASSET_ROOT}/${file}")`;
    element.style.backgroundSize = `${frameCount * 100}% 100%`;
    element.style.backgroundPositionX = spritePosition(frameIndex, frameCount);
  }

  function createPresenter(options = {}) {
    const documentRoot = options.documentRoot || globalThis.document;
    const revealRoot = options.root;
    if (!documentRoot || !revealRoot) throw new Error("Gacha reveal requires a document and root element.");

    const stage = revealRoot.querySelector("[data-gacha-reveal-stage]");
    const title = revealRoot.querySelector("[data-gacha-reveal-title]");
    const summary = revealRoot.querySelector("[data-gacha-reveal-summary]");
    const single = revealRoot.querySelector("[data-gacha-reveal-single]");
    const singlePoster = revealRoot.querySelector("[data-gacha-reveal-single-poster]");
    const singleArrow = revealRoot.querySelector("[data-gacha-reveal-arrow]");
    const singleImpact = revealRoot.querySelector("[data-gacha-reveal-impact]");
    const singleResult = revealRoot.querySelector("[data-gacha-reveal-single-result]");
    const grid = revealRoot.querySelector("[data-gacha-reveal-grid]");
    const revealAllButton = revealRoot.querySelector("[data-gacha-reveal-all]");
    const tenContinueButton = revealRoot.querySelector("[data-gacha-reveal-ten-continue]");
    const focusOverlay = revealRoot.querySelector("[data-gacha-reveal-focus]");
    const focusPoster = revealRoot.querySelector("[data-gacha-reveal-focus-poster]");
    const focusArrow = revealRoot.querySelector("[data-gacha-reveal-focus-arrow]");
    const focusImpact = revealRoot.querySelector("[data-gacha-reveal-focus-impact]");
    const focusLeaves = revealRoot.querySelector("[data-gacha-reveal-cinematic-leaves]");
    const focusResult = revealRoot.querySelector("[data-gacha-reveal-focus-result]");
    const detailOverlay = revealRoot.querySelector("[data-gacha-reveal-detail]");
    const detailArt = revealRoot.querySelector("[data-gacha-reveal-detail-art]");
    const detailRarity = revealRoot.querySelector("[data-gacha-reveal-detail-rarity]");
    const detailTitle = revealRoot.querySelector("[data-gacha-reveal-detail-title]");
    const detailMeta = revealRoot.querySelector("[data-gacha-reveal-detail-meta]");
    const detailStats = revealRoot.querySelector("[data-gacha-reveal-detail-stats]");
    const detailEffect = revealRoot.querySelector("[data-gacha-reveal-detail-effect]");
    const detailClose = revealRoot.querySelector("[data-gacha-reveal-detail-close]");
    const status = revealRoot.querySelector("[data-gacha-reveal-status]");
    const instruction = revealRoot.querySelector("[data-gacha-reveal-instruction]");
    const continueButton = revealRoot.querySelector("[data-gacha-reveal-continue]");
    if ([
      stage, title, summary, single, singlePoster, singleArrow, singleImpact, singleResult,
      grid, revealAllButton, tenContinueButton, focusOverlay, focusPoster, focusArrow,
      focusImpact, focusLeaves, focusResult, detailOverlay, detailArt, detailRarity,
      detailTitle, detailMeta, detailStats, detailEffect, detailClose, status,
      instruction, continueButton,
    ].some((entry) => !entry)) {
      throw new Error("Gacha reveal markup is incomplete.");
    }

    let session = null;
    let timers = [];
    const schedule = options.schedule || ((callback, delay) => globalThis.setTimeout(callback, delay));
    const cancel = options.cancel || ((timer) => globalThis.clearTimeout(timer));
    const onComplete = typeof options.onComplete === "function" ? options.onComplete : () => {};

    function clearTimers() {
      for (const timer of timers) cancel(timer);
      timers = [];
    }

    function later(callback, delay = TICK_MS) {
      const timer = schedule(callback, delay);
      timers.push(timer);
      return timer;
    }

    function resultSummary(result) {
      const summary = [
        result.slotLabel || result.rarityLabel || result.rarity,
        result.sourceLabel,
        result.tradeState,
        result.dispositionLabel,
      ].filter(Boolean);
      return summary.join(" · ") || result.detail || result.rarity;
    }

    function resultText(result) {
      const summary = resultSummary(result);
      return summary ? `${result.label} · ${summary}` : result.label;
    }

    function setResultCopy(container, result, open) {
      container.replaceChildren();
      container.dataset.rarity = result.rarity;
      const heading = documentRoot.createElement("strong");
      heading.className = "gacha-reveal-result__heading";
      heading.textContent = open ? result.label : `${result.rarity === "legendary" ? "Legendary" : "Epic"} notice`;
      container.appendChild(heading);
      if (!open) {
        const detail = documentRoot.createElement("span");
        detail.className = "gacha-reveal-result__muted";
        detail.textContent = "Open to reveal";
        container.appendChild(detail);
        container.hidden = false;
        return;
      }

      const meta = documentRoot.createElement("dl");
      meta.className = "gacha-reveal-result__meta";
      for (const [term, value] of [
        ["Slot", result.slotLabel],
        ["Rarity", result.rarityLabel || result.rarity],
        ["Source", result.sourceLabel],
        ["State", result.tradeState],
        ["Outcome", result.dispositionLabel],
      ]) {
        if (!value) continue;
        const dt = documentRoot.createElement("dt");
        const dd = documentRoot.createElement("dd");
        dt.textContent = term;
        dd.textContent = value;
        meta.append(dt, dd);
      }
      if (meta.children.length) container.appendChild(meta);

      if (result.statRolls.length) {
        const section = documentRoot.createElement("section");
        const title = documentRoot.createElement("span");
        const list = documentRoot.createElement("ul");
        section.className = "gacha-reveal-result__section";
        title.className = "gacha-reveal-result__section-title";
        title.textContent = "Stat rolls";
        for (const roll of result.statRolls) {
          const item = documentRoot.createElement("li");
          item.textContent = roll;
          list.appendChild(item);
        }
        section.append(title, list);
        container.appendChild(section);
      } else if (result.detail) {
        const detail = documentRoot.createElement("span");
        detail.className = "gacha-reveal-result__muted";
        detail.textContent = result.detail;
        container.appendChild(detail);
      }

      if (result.effectName || result.effectDescription) {
        const section = documentRoot.createElement("section");
        const title = documentRoot.createElement("span");
        section.className = "gacha-reveal-result__section gacha-reveal-result__effect";
        title.className = "gacha-reveal-result__section-title";
        title.textContent = result.effectName || "Named Legendary effect";
        section.appendChild(title);
        if (result.effectDescription) {
          const body = documentRoot.createElement("p");
          body.textContent = result.effectDescription;
          section.appendChild(body);
        }
        container.appendChild(section);
      }
      container.hidden = false;
    }

    function setSingleFrame(result, frame) {
      const frameCount = HERO_FRAME_COUNTS[result.rarity];
      const artKey = revealArtKey(result);
      setSprite(singlePoster, `hero_${artKey}_poster_sheet.png`, frame.poster, frameCount);
      setSprite(singleArrow, "arrow_sheet.png", frame.arrow ?? 3, 4);
      singleArrow.hidden = frame.arrow === undefined;
      if (frame.impact === undefined) {
        singleImpact.hidden = true;
      } else {
        setSprite(singleImpact, `${artKey}_impact_particles_sheet.png`, frame.impact, 4);
        singleImpact.hidden = false;
      }
      singleResult.hidden = !frame.open;
      if (frame.open) setResultCopy(singleResult, result, true);
    }

    function finishSingle(result) {
      session.revealed.add(result.index);
      status.textContent = `${resultText(result)} received.`;
      continueButton.hidden = false;
      continueButton.disabled = false;
      continueButton.focus({ preventScroll: true });
    }

    function playSingle(result) {
      const sequence = requiresFocusedReveal(result) ? SINGLE_RARE_SEQUENCE : SINGLE_SCRAP_SEQUENCE;
      let index = 0;
      const advance = () => {
        if (!session) return;
        setSingleFrame(result, sequence[index]);
        index += 1;
        if (index < sequence.length) later(advance);
        else finishSingle(result);
      };
      advance();
    }

    function renderReducedSingle(result) {
      singleArrow.hidden = true;
      singleImpact.hidden = true;
      if (!requiresFocusedReveal(result)) {
        setSprite(singlePoster, "hero_scrap_poster_sheet.png", 3, 4);
        singlePoster.disabled = true;
        singleResult.hidden = false;
        setResultCopy(singleResult, result, true);
        finishSingle(result);
        return;
      }
      setSprite(singlePoster, `hero_${result.rarity}_poster_sheet.png`, 11, 13);
      singlePoster.disabled = false;
      singlePoster.setAttribute("aria-label", `Open ${result.rarity} Sheriff's Notice`);
      singlePoster.onclick = () => {
        if (!session || singlePoster.disabled) return;
        singlePoster.disabled = true;
        setSprite(singlePoster, `hero_${result.rarity}_poster_sheet.png`, 12, 13);
        singleResult.hidden = false;
        setResultCopy(singleResult, result, true);
        finishSingle(result);
      };
      status.textContent = `Open the ${result.rarity} Sheriff's Notice.`;
    }

    function renderSingle() {
      const result = session.results[0];
      single.hidden = false;
      grid.hidden = true;
      focusOverlay.hidden = true;
      continueButton.hidden = true;
      singlePoster.onclick = null;
      singlePoster.disabled = true;
      singlePoster.setAttribute("aria-label", `Revealing ${result.rarity} Sheriff's Notice`);
      singleResult.hidden = true;
      status.textContent = "The Sheriff's Notice is being opened.";
      if (session.reducedMotion) renderReducedSingle(result);
      else playSingle(result);
    }

    function setCompactFrame(art, result, state) {
      const frames = COMPACT_FRAMES[result.rarity];
      setSprite(art, "compact_poster_sheet.png", frames[state], 12);
    }
    function setTenControlsLocked(locked) {
      session.controlsLocked = Boolean(locked);
      for (const button of grid.querySelectorAll("button[data-result-index]")) button.disabled = Boolean(locked);
      revealAllButton.disabled = Boolean(locked);
      tenContinueButton.disabled = Boolean(locked) || session.revealed.size !== session.results.length;
    }

    function unopenedResults() {
      return session.results.filter((result) => !session.revealed.has(result.index));
    }

    function updateTenCompletion(focusContinue = false) {
      const unopened = unopenedResults();
      const complete = unopened.length === 0;
      revealAllButton.disabled = session.controlsLocked || complete;
      tenContinueButton.hidden = !complete;
      tenContinueButton.disabled = session.controlsLocked || !complete;
      if (complete) {
        status.textContent = "All ten notices revealed. Continue when ready.";
        if (focusContinue) tenContinueButton.focus({ preventScroll: true });
      } else if (!session.controlsLocked) {
        status.textContent = `${unopened.length} sealed ${unopened.length === 1 ? "notice remains" : "notices remain"}.`;
      }
    }

    function cardRefs(index) {
      return session.cards.get(index) || null;
    }

    function markCardRevealed(result) {
      const refs = cardRefs(result.index);
      if (!refs || session.revealed.has(result.index)) return;
      session.revealed.add(result.index);
      session.acknowledged.add(result.index);
      refs.button.dataset.state = "revealed";
      refs.card.dataset.state = "revealed";
      setCompactFrame(refs.art, result, "open");
      refs.label.textContent = equipmentNoticeLabel(result);
      refs.button.setAttribute("aria-label", `${equipmentNoticeLabel(result)} revealed. View full equipment details.`);
    }

    function revealOrdinaryResult(result, focusContinue = false) {
      if (!session || session.controlsLocked || session.revealed.has(result.index)) return;
      markCardRevealed(result);
      status.textContent = `${equipmentNoticeLabel(result)} revealed. Activate it again for full stats.`;
      updateTenCompletion(focusContinue);
    }

    function appendMetaRow(container, term, value) {
      if (!value) return;
      const dt = documentRoot.createElement("dt");
      const dd = documentRoot.createElement("dd");
      dt.textContent = term;
      dd.textContent = value;
      container.append(dt, dd);
    }

    function showEquipmentDetail(result, invoker) {
      if (!session || session.controlsLocked || !session.revealed.has(result.index)) return;
      session.gridScrollTop = grid.scrollTop || 0;
      session.detail = { index: result.index, invoker };
      setTenControlsLocked(true);
      setCompactFrame(detailArt, result, "open");
      detailOverlay.dataset.rarity = result.rarity;
      detailRarity.textContent = `${result.rarityLabel || result.rarity} · ${result.slotLabel || "Equipment"}`;
      detailTitle.textContent = result.label || equipmentNoticeLabel(result);
      detailMeta.replaceChildren();
      appendMetaRow(detailMeta, "Source", result.sourceLabel);
      appendMetaRow(detailMeta, "State", result.tradeState);
      appendMetaRow(detailMeta, "Outcome", result.dispositionLabel);
      detailStats.replaceChildren();
      for (const roll of result.statRolls) {
        const row = documentRoot.createElement("li");
        row.textContent = roll;
        detailStats.appendChild(row);
      }
      detailEffect.replaceChildren();
      detailEffect.hidden = !(result.effectName || result.effectDescription);
      if (!detailEffect.hidden) {
        const name = documentRoot.createElement("strong");
        name.textContent = result.effectName || "Legendary effect";
        detailEffect.appendChild(name);
        if (result.effectDescription) {
          const description = documentRoot.createElement("p");
          description.textContent = result.effectDescription;
          detailEffect.appendChild(description);
        }
      }
      detailOverlay.hidden = false;
      status.textContent = `Viewing ${result.label || equipmentNoticeLabel(result)}.`;
      detailClose.focus({ preventScroll: true });
    }

    function closeEquipmentDetail() {
      if (!session?.detail || detailOverlay.hidden) return false;
      const detail = session.detail;
      session.detail = null;
      detailOverlay.hidden = true;
      grid.scrollTop = session.gridScrollTop || 0;
      setTenControlsLocked(false);
      updateTenCompletion();
      detail.invoker?.focus?.({ preventScroll: true });
      status.textContent = "Equipment details closed. Revealed notices remain open.";
      return true;
    }

    function makeLegendaryLeaves() {
      focusLeaves.replaceChildren();
      for (let index = 0; index < 20; index += 1) {
        const leaf = documentRoot.createElement("span");
        const angle = (Math.PI * 2 * index) / 20;
        const spread = 1 + (index % 3) * 0.1;
        leaf.style.setProperty("--leaf-start-x", `${Math.cos(angle) * 182 * spread}px`);
        leaf.style.setProperty("--leaf-start-y", `${Math.sin(angle) * 112 * spread}px`);
        leaf.style.setProperty("--leaf-end-x", `${Math.cos(angle + 0.3) * 88}px`);
        leaf.style.setProperty("--leaf-end-y", `${Math.sin(angle + 0.3) * 105}px`);
        leaf.style.setProperty("--leaf-turn", `${index * 37}deg`);
        leaf.style.setProperty("--leaf-size", `${5 + (index % 4) * 2}px`);
        leaf.style.setProperty("--leaf-delay", `${90 + (index % 8) * 54}ms`);
        focusLeaves.appendChild(leaf);
      }
    }

    function showLegendaryHold(result) {
      if (!session?.focused || session.focused.index !== result.index) return;
      session.focused.phase = "revealed";
      focusOverlay.dataset.phase = "revealed";
      focusArrow.hidden = true;
      focusImpact.hidden = true;
      focusResult.replaceChildren();
      const rarity = documentRoot.createElement("span");
      const name = documentRoot.createElement("strong");
      const action = documentRoot.createElement("button");
      rarity.className = "gacha-reveal__legendary-rarity";
      rarity.textContent = `${result.rarityLabel || "Legendary"} · ${result.slotLabel || "Equipment"}`;
      name.className = "gacha-reveal__legendary-name";
      name.textContent = result.label || equipmentNoticeLabel(result);
      action.type = "button";
      action.className = "gacha-reveal__legendary-continue";
      action.textContent = "Continue";
      action.addEventListener("click", dismissLegendaryResult);
      focusResult.append(rarity, name, action);
      focusResult.hidden = false;
      revealRoot.removeAttribute("aria-busy");
      status.textContent = `${result.label || equipmentNoticeLabel(result)} revealed. Continue when ready.`;
      action.focus({ preventScroll: true });
    }

    function advanceLegendaryPoster(result, sequenceIndex = 0) {
      if (!session?.focused || session.focused.index !== result.index) return;
      const frame = TEN_LEGENDARY_SEQUENCE[sequenceIndex];
      setSprite(focusPoster, "hero_legendary_poster_sheet.png", frame, 13);
      if (sequenceIndex + 1 < TEN_LEGENDARY_SEQUENCE.length) {
        later(() => advanceLegendaryPoster(result, sequenceIndex + 1), TEN_LEGENDARY_FRAME_MS);
      } else {
        later(() => showLegendaryHold(result), TEN_LEGENDARY_FRAME_MS);
      }
    }

    function beginLegendaryCinematic(result) {
      session.gridScrollTop = grid.scrollTop || 0;
      session.focused = { index: result.index, phase: "animating" };
      setTenControlsLocked(true);
      revealRoot.setAttribute("aria-busy", "true");
      focusOverlay.hidden = false;
      focusOverlay.dataset.phase = session.reducedMotion ? "reduced" : "gathering";
      focusResult.hidden = true;
      focusResult.replaceChildren();
      focusImpact.hidden = true;
      setSprite(focusPoster, "hero_legendary_poster_sheet.png", 4, 13);
      focusPoster.setAttribute("aria-label", "Sealed Legendary Sheriff's Notice");
      setSprite(focusArrow, "arrow_sheet.png", 3, 4);
      focusArrow.hidden = session.reducedMotion;
      makeLegendaryLeaves();
      status.textContent = "The Legendary notice is gathering forest light.";
      if (session.reducedMotion) {
        later(() => {
          setSprite(focusPoster, "hero_legendary_poster_sheet.png", 10, 13);
          showLegendaryHold(result);
        }, 40);
        return;
      }
      later(() => {
        if (!session?.focused || session.focused.index !== result.index) return;
        focusOverlay.dataset.phase = "impact";
        setSprite(focusImpact, "legendary_impact_particles_sheet.png", 2, 4);
        focusImpact.hidden = false;
        status.textContent = "The Golden Arrow breaks the Legendary seal.";
        advanceLegendaryPoster(result);
      }, TEN_LEGENDARY_IMPACT_MS);
    }

    function startNextLegendary() {
      if (!session || !session.legendaryQueue.length) return;
      const index = session.legendaryQueue.shift();
      const result = session.results[index];
      beginLegendaryCinematic(result);
    }

    function queueLegendaryReveals(indices, revealAllPending) {
      if (!session || session.controlsLocked || !indices.length) return;
      session.legendaryQueue = [...indices];
      session.revealAllPending = Boolean(revealAllPending);
      session.queueActive = true;
      startNextLegendary();
    }

    function revealAllRemainingOrdinary() {
      for (const result of unopenedResults()) markCardRevealed(result);
      session.revealAllPending = false;
      session.queueActive = false;
      status.textContent = "All ten notices revealed.";
      updateTenCompletion(true);
    }

    function dismissLegendaryResult() {
      if (!session?.focused || session.focused.phase !== "revealed") return false;
      const result = session.results[session.focused.index];
      markCardRevealed(result);
      focusOverlay.hidden = true;
      focusOverlay.dataset.phase = "idle";
      focusResult.hidden = true;
      focusResult.replaceChildren();
      focusLeaves.replaceChildren();
      session.focused = null;
      grid.scrollTop = session.gridScrollTop || 0;
      if (session.legendaryQueue.length) {
        revealRoot.setAttribute("aria-busy", "true");
        later(startNextLegendary, 80);
        return true;
      }
      revealRoot.removeAttribute("aria-busy");
      setTenControlsLocked(false);
      if (session.revealAllPending) revealAllRemainingOrdinary();
      else {
        session.queueActive = false;
        updateTenCompletion();
        cardRefs(result.index)?.button.focus({ preventScroll: true });
        status.textContent = `${equipmentNoticeLabel(result)} revealed. Activate it for full stats.`;
      }
      return true;
    }

    function revealAllTen() {
      if (!session || session.controlsLocked) return;
      const unopened = unopenedResults();
      if (!unopened.length) return;
      const legendaryIndices = unopened
        .filter(requiresTenLegendaryCinematic)
        .map((result) => result.index);
      if (legendaryIndices.length) {
        queueLegendaryReveals(legendaryIndices, true);
        return;
      }
      revealAllRemainingOrdinary();
    }

    function renderTen() {
      single.hidden = true;
      grid.hidden = false;
      focusOverlay.hidden = true;
      detailOverlay.hidden = true;
      revealAllButton.hidden = false;
      tenContinueButton.hidden = true;
      continueButton.hidden = true;
      instruction.hidden = false;
      grid.replaceChildren();
      session.cards.clear();
      session.results.forEach((result) => {
        const card = documentRoot.createElement("article");
        const button = documentRoot.createElement("button");
        const art = documentRoot.createElement("span");
        const label = documentRoot.createElement("strong");
        card.className = `gacha-reveal-card gacha-reveal-card--${result.rarity}`;
        card.dataset.rarity = result.rarity;
        card.dataset.state = "sealed";
        button.type = "button";
        button.dataset.resultIndex = String(result.index);
        button.dataset.rarity = result.rarity;
        button.dataset.state = "sealed";
        button.className = "gacha-reveal-card__button";
        button.setAttribute("aria-label", `Sealed Sheriff's Notice ${result.index + 1} of 10. ${result.rarityLabel || result.rarity} rarity preview. Activate to reveal.`);
        art.className = "gacha-reveal-card__art";
        label.className = "gacha-reveal-card__label";
        label.textContent = "Sealed notice";
        button.append(art, label);
        card.appendChild(button);
        grid.appendChild(card);
        session.cards.set(result.index, { card, button, art, label });
        button.addEventListener("click", () => {
          if (!session || session.controlsLocked) return;
          if (session.revealed.has(result.index)) {
            showEquipmentDetail(result, button);
          } else if (requiresTenLegendaryCinematic(result)) {
            queueLegendaryReveals([result.index], false);
          } else {
            revealOrdinaryResult(result);
          }
        });
      });
      grid.scrollTop = session.gridScrollTop || 0;
      setTenControlsLocked(false);
      updateTenCompletion();
    }

    function present(payload = {}) {
      clearTimers();
      const results = normalizeResults(payload.results);
      if (![1, 10].includes(results.length)) throw new Error("Gacha reveal supports exactly one or ten results.");
      session = {
        results,
        tier: payload.tier === "premium" ? "premium" : "standard",
        reducedMotion: Boolean(payload.reducedMotion),
        revealed: new Set(),
        acknowledged: new Set(),
        focused: null,
        detail: null,
        cards: new Map(),
        legendaryQueue: [],
        revealAllPending: false,
        queueActive: false,
        controlsLocked: false,
        gridScrollTop: 0,
        completed: false,
      };
      revealRoot.dataset.mode = results.length === 1 ? "single" : "ten";
      revealRoot.dataset.reducedMotion = String(session.reducedMotion);
      stage.style.backgroundImage = `url("${ASSET_ROOT}/board_640x360.png")`;
      title.textContent = "Sheriff's Notice";
      summary.textContent = `${session.tier === "premium" ? "Limited" : "Standard"} Draw · ${results.length} ${results.length === 1 ? "result" : "results"}`;
      if (results.length === 1) {
        revealAllButton.hidden = true;
        tenContinueButton.hidden = true;
        instruction.hidden = true;
        detailOverlay.hidden = true;
        renderSingle();
      } else renderTen();
      return Object.freeze({ mode: revealRoot.dataset.mode, results });
    }

    function initialFocus() {
      if (!session) return revealRoot;
      if (session.results.length === 10) {
        return grid.querySelector("button:not(:disabled)") || revealAllButton;
      }
      if (session.reducedMotion && requiresFocusedReveal(session.results[0]) && !singlePoster.disabled) return singlePoster;
      return revealRoot;
    }

    function reset() {
      clearTimers();
      session = null;
      singlePoster.onclick = null;
      focusPoster.onclick = null;
      revealRoot.removeAttribute("aria-busy");
      focusOverlay.hidden = true;
      focusOverlay.dataset.phase = "idle";
      focusResult.hidden = true;
      focusResult.replaceChildren();
      focusLeaves.replaceChildren();
      detailOverlay.hidden = true;
      grid.replaceChildren();
      status.textContent = "";
      instruction.hidden = true;
      revealAllButton.hidden = true;
      revealAllButton.disabled = true;
      tenContinueButton.hidden = true;
      tenContinueButton.disabled = true;
      continueButton.hidden = true;
      continueButton.disabled = true;
    }

    function handleEscape(event) {
      if (!session || session.results.length !== 10) return false;
      if (!detailOverlay.hidden && session.detail) {
        event?.preventDefault?.();
        return closeEquipmentDetail();
      }
      if (focusOverlay.hidden || session.focused?.phase !== "revealed") return false;
      event?.preventDefault?.();
      return dismissLegendaryResult();
    }

    continueButton.addEventListener("click", () => {
      if (!session || session.completed) return;
      if (session.results.length === 1 && !session.revealed.has(session.results[0].index)) return;
      session.completed = true;
      onComplete();
    });

    tenContinueButton.addEventListener("click", () => {
      if (!session || session.completed || session.results.length !== 10) return;
      if (session.revealed.size !== session.results.length || session.controlsLocked) return;
      session.completed = true;
      onComplete();
    });

    revealAllButton.addEventListener("click", revealAllTen);
    detailClose.addEventListener("click", closeEquipmentDetail);
    focusOverlay.addEventListener("click", (event) => {
      if (session?.focused?.phase !== "revealed") return;
      if (event.target === focusOverlay || event.target?.hasAttribute?.("data-gacha-reveal-cinematic-dim")) {
        dismissLegendaryResult();
      }
    });

    function sessionSnapshot() {
      if (!session) return null;
      return Object.freeze({
        itemIds: Object.freeze(session.results.map((result) => result.itemId)),
        revealed: Object.freeze([...session.revealed]),
        acknowledged: Object.freeze([...session.acknowledged]),
        focusedIndex: session.focused?.index ?? null,
        focusedPhase: session.focused?.phase || null,
        detailIndex: session.detail?.index ?? null,
        legendaryQueue: Object.freeze([...session.legendaryQueue]),
        revealAllPending: session.revealAllPending,
        completed: session.completed,
      });
    }

    return Object.freeze({
      present,
      initialFocus,
      reset,
      isActive: () => Boolean(session),
      handleEscape,
      sessionSnapshot,
    });
  }

  return Object.freeze({
    ASSET_ROOT,
    TICK_MS,
    HERO_FRAME_COUNTS,
    COMPACT_FRAMES,
    SINGLE_RARE_SEQUENCE,
    SINGLE_SCRAP_SEQUENCE,
    TEN_LEGENDARY_SEQUENCE,
    TEN_LEGENDARY_IMPACT_MS,
    TEN_LEGENDARY_FRAME_MS,
    normalizeResults,
    equipmentNoticeLabel,
    revealArtKey,
    requiresFocusedReveal,
    requiresTenLegendaryCinematic,
    spritePosition,
    createPresenter,
  });
});
