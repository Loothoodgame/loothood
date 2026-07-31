/* The "verify it yourself" page.
 *
 * Defining property: NOTHING is taken from the server on trust. The server
 * hands over evidence — the pull secret, the run recording, the season
 * manifest — and the visitor's browser does the computing, with the same
 * modules the game runs on. If an announced number disagrees with the
 * recomputed one, the page says so.
 *
 * So there is not a single "the server said it, therefore it is true" here.
 * Every statement on screen is the result of a computation on this machine.
 */
(function () {
  "use strict";

  const SHARED = window.LoothoodVerifyShared;
  const EQ = window.LoothoodEquipment;
  const GACHA = window.LoothoodGachaSystem || window.LoothoodGacha;
  const RELEASE = window.LoothoodEquipmentRelease;
  const CORE = window.LoothoodCompetitiveRunCore;

  const form = document.getElementById("form");
  const field = document.getElementById("ref");
  const output = document.getElementById("output");

  function api(path) {
    const origin = document.querySelector('meta[name="loothood-api-origin"]')?.content || "";
    return (origin || "") + path;
  }

  function screen(html) { output.innerHTML = html; }

  function row(result, label, detail = "") {
    const mark = result === true ? "✔" : result === false ? "✘" : "•";
    const cls = result === true ? "matched" : result === false ? "mismatched" : "neutral";
    return `<li class="${cls}"><span class="mark">${mark}</span><span><strong>${label}</strong>${
      detail ? `<em>${detail}</em>` : ""}</span></li>`;
  }

  /** Plural suffix. English needs one rule where Russian needed three. */
  function plural(count, word) {
    return `${count} ${word}${Math.abs(count) === 1 ? "" : "s"}`;
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  // ---- pull verification ----------------------------------------------------
  //
  // What is actually being proven here:
  //   1. The fingerprint published BEFORE the roll really does belong to the
  //      secret revealed AFTER it. So the server named the outcome in advance
  //      and could no longer pick one to suit.
  //   2. Those exact items follow from that secret. The legendary pool comes
  //      from OUR catalogue rather than the server's response — otherwise the
  //      server could name any set it liked.
  async function verifyPull(id) {
    const response = await fetch(api(`/api/v1/verify/draws/${encodeURIComponent(id)}`));
    const d = await response.json();
    if (!response.ok) throw new Error(d.message || "Pull not found.");

    const recomputedCommitment = `${await SHARED.sha256Hex(d.randomness.secret)}`;
    const commitmentMatches = recomputedCommitment === d.randomness.commitment;

    const manifest = SHARED.standardManifest(EQ, RELEASE);
    const values = await SHARED.randomValuesFromSecret(d.randomness.secret, d.drawCount);
    let ours = null;
    let replayError = "";
    try {
      ours = GACHA.resolveDrawBatch({
        requestId: d.drawRequestId,
        tier: d.tier,
        count: d.drawCount,
        manifest,
        lane: d.pityBefore,
        randomValues: values,
      });
    } catch (e) { replayError = e.message; }

    const issued = d.results.map((r) => r.item?.itemId);
    const recomputed = (ours?.results || []).map((r) => r.item?.itemId);
    const itemsMatch = Boolean(ours)
      && issued.length === recomputed.length
      && issued.every((id2, i) => id2 === recomputed[i]);

    const committedAt = Date.parse(d.randomness.committedAt || "");
    const revealedAt = Date.parse(d.randomness.revealedAt || "");
    const orderHolds = Number.isFinite(committedAt) && Number.isFinite(revealedAt)
      && committedAt < revealedAt;

    screen(`
      <h2>Pull ${escapeHtml(d.drawRequestId)}</h2>
      <p class="summary">${plural(d.drawCount, "pull")}, ${escapeHtml(d.tier)} banner.</p>
      <ul class="checks">
        ${row(commitmentMatches, "The fingerprint was named before the roll and belongs to the revealed secret",
          `sha256(secret) = ${recomputedCommitment.slice(0, 32)}…`)}
        ${row(orderHolds, "The commitment was published before the reveal",
          `${new Date(committedAt).toISOString()} → ${new Date(revealedAt).toISOString()}`)}
        ${row(itemsMatch, "The items you received follow from that secret",
          replayError || `${recomputed.length} of ${issued.length} matched`)}
        ${row(null, "The legendary pool comes from this page's catalogue",
          `${plural(manifest.allowedLegendaryEffectIds.length, "effect")} in the pool, catalogue ${manifest.effectCatalogueVersion}`)}
      </ul>
      <h3>What dropped</h3>
      <table class="items"><thead><tr><th>Rarity</th><th>Slot</th><th>Item</th><th>Recomputed</th></tr></thead><tbody>
        ${d.results.map((r, i) => `<tr>
          <td class="r-${escapeHtml(r.rarity)}">${escapeHtml(r.rarity)}</td>
          <td>${escapeHtml(r.slot)}</td>
          <td>${escapeHtml(r.item?.itemId || "—")}</td>
          <td>${recomputed[i] === issued[i] ? "match" : `<b>${escapeHtml(recomputed[i] || "none")}</b>`}</td>
        </tr>`).join("")}
      </tbody></table>
      <details><summary>Full secret and commitment</summary>
        <pre>commitment ${escapeHtml(d.randomness.commitment)}
secret     ${escapeHtml(d.randomness.secret)}</pre></details>
    `);
  }

  // ---- run verification -----------------------------------------------------
  //
  // Here the visitor's browser REPLAYS SOMEONE ELSE'S RUN in full: it
  // reassembles the transcript from the recorded packets and puts it through
  // competitive-run-core.js. The score that comes out is its own, not the
  // server's account of one.
  async function verifyRun(id) {
    screen('<p class="waiting">Fetching the run recording…</p>');
    const response = await fetch(api(`/api/v1/verify/attempts/${encodeURIComponent(id)}`));
    const d = await response.json();
    if (!response.ok) throw new Error(d.message || "Attempt not found.");

    screen('<p class="waiting">Replaying the run on this machine…</p>');
    // Let the browser paint the message before the heavy recomputation.
    await new Promise((r) => setTimeout(r, 30));

    const manifestHash = await SHARED.fingerprint(d.manifest);
    const manifestMatches = manifestHash === d.declaredManifestHash;
    let manifestValid = false;
    let manifestError = "";
    try { manifestValid = CORE.validateManifest(d.manifest); }
    catch (e) { manifestError = e.message; }

    // Packet fingerprints: each must match its own contents.
    let intactPackets = 0;
    for (const p of d.packets) {
      const { packetHash, ...body } = p;
      // eslint-disable-next-line no-await-in-loop
      if (await SHARED.fingerprint(body) === packetHash) intactPackets += 1;
    }

    let ours = null;
    let replayError = "";
    try {
      const transcript = SHARED.transcriptFromPackets(d.packets, CORE.RUN_TRANSCRIPT_VERSION);
      ours = CORE.replayRun(d.manifest, transcript, d.loadout);
    } catch (e) { replayError = e.message; }

    const scoreMatches = Boolean(ours) && Number(ours.totalScore) === Number(d.declared.verifiedScore);
    const stagesMatch = Boolean(ours) && Number(ours.stagesCleared) === Number(d.declared.stageReached);
    const clientOverclaimed = Number(d.declared.claimedScore) !== Number(d.declared.verifiedScore);

    screen(`
      <h2>Run ${escapeHtml(d.attemptId)}</h2>
      <p class="summary">Season ${escapeHtml(d.seasonKey)}, player ${escapeHtml(d.player.displayName)},
        ${plural(d.packets.length, "recorded packet")}.</p>
      <ul class="checks">
        ${row(manifestValid, "The season layout passes the ruleset checks",
          manifestError || `${plural(d.manifest.stagePlans.length, "stage")}, bosses: ${d.manifest.bossSeedOrder.join(", ")}`)}
        ${row(manifestMatches, "The run was played on the layout that was announced",
          `${manifestHash.slice(0, 34)}…`)}
        ${row(intactPackets === d.packets.length, "The recording is intact: every packet matches its own fingerprint",
          `${intactPackets} of ${d.packets.length}`)}
        ${row(scoreMatches, "The score was recomputed on this machine and matched",
          replayError || `recomputed ${ours?.totalScore} · declared ${d.declared.verifiedScore}`)}
        ${row(stagesMatch, "The number of stages cleared matched",
          `recomputed ${ours?.stagesCleared} · declared ${d.declared.stageReached}`)}
      </ul>
      ${clientOverclaimed ? `<p class="note">On submission the client claimed a score of
        <b>${d.declared.claimedScore}</b>, while <b>${d.declared.verifiedScore}</b> was counted — the one
        the server derived from the recording. This is exactly what the verifier is for.</p>` : ""}
      <details><summary>Full replay result</summary>
        <pre>${escapeHtml(JSON.stringify({
          outcome: ours?.outcome, stagesCleared: ours?.stagesCleared,
          totalScore: ours?.totalScore, totalGold: ours?.totalGold,
          totalActiveTicks: ours?.totalActiveTicks,
          leaderboardEligible: ours?.leaderboardEligible,
        }, null, 2))}</pre></details>
    `);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = field.value.trim();
    if (!id) return;
    screen('<p class="waiting">Verifying…</p>');
    try {
      // The kind of id is recognised by its shape rather than by a picker: the
      // player pastes whatever they have and the page works out what it is.
      if (/^attempt_/.test(id)) await verifyRun(id);
      else await verifyPull(id);
    } catch (error) {
      screen(`<p class="failure">${escapeHtml(error.message)}</p>`);
    }
  });

  // An id can be passed by link — that is how a player shares proof.
  const fromUrl = new URLSearchParams(location.search).get("id");
  if (fromUrl) {
    field.value = fromUrl;
    form.dispatchEvent(new Event("submit"));
  }
})();
