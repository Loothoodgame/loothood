/* System status panel.
   ------------------------------------------------------------------
   The Status button in the sidebar footer opens a per-system breakdown: API,
   database, season, payment watcher. The data comes from
   /api/v1/health/systems, which MEASURES it rather than reciting constants.

   Why we only poll on click. A live dot that refreshes itself every few
   seconds looks more impressive — and costs one request to the server from
   every open window, around the clock. A person looks at the status when
   something is broken for them, which is to say almost never; paying for that
   with constant traffic is pointless. The dot on the button stays grey until
   the panel has been opened, and that is honest: we really do not know.

   Why this is a separate module. The menu is eight hundred lines as it is, and
   the panel wants nothing from it except somewhere to stand. */
(function () {
  "use strict";

  const DOT_COLOR = {
    up: "#7ee27e",
    degraded: "#f0c04a",
    down: "#ff6b5e",
    idle: "#8ea89b",
    unknown: "#4a5a52",
  };
  const STATE_LABEL = {
    up: "Operational",
    degraded: "Degraded",
    down: "Down",
    idle: "Not active",
    unknown: "Unknown",
  };

  function apiBase() {
    const meta = document.querySelector('meta[name="loothood-api-origin"]');
    const declared = String(meta?.content || "").trim();
    return declared || window.location.origin;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
    ));
  }

  let panel = null;

  function closePanel() {
    panel?.remove();
    panel = null;
    document.removeEventListener("keydown", onEscape, true);
  }

  function onEscape(event) {
    if (event.key === "Escape") closePanel();
  }

  function renderRow(system) {
    const state = DOT_COLOR[system.state] ? system.state : "unknown";
    return `<li>
      <span class="hb-status-dot" style="--c:${DOT_COLOR[state]}"></span>
      <span class="hb-status-name">${escapeHtml(system.name)}</span>
      <span class="hb-status-detail">${escapeHtml(system.detail || STATE_LABEL[state])}</span>
      <span class="hb-status-ms">${Number.isFinite(system.ms) ? `${system.ms} ms` : ""}</span>
    </li>`;
  }

  async function openPanel(button) {
    if (panel) { closePanel(); return; }
    panel = document.createElement("div");
    panel.className = "hb-status-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "System status");
    panel.innerHTML = `<header><h2>System status</h2><button type="button" data-status-close="1" aria-label="Close">×</button></header>
      <p class="hb-status-lede">Checked just now, live from the server.</p>
      <ul class="hb-status-list"><li class="hb-status-wait">Checking…</li></ul>`;
    document.body.appendChild(panel);
    document.addEventListener("keydown", onEscape, true);

    // The page opened, which means the frontend works, and there is no point
    // asking the server about it. The row is still needed: without it the list
    // answers a different question from the one it gets opened with ("what
    // exactly is broken").
    const frontend = { name: "Frontend", state: "up", detail: "this page" };

    let payload = null;
    try {
      const r = await fetch(`${apiBase()}/api/v1/health/systems`, {
        credentials: "include",
        headers: { accept: "application/json" },
      });
      payload = r.ok ? await r.json() : null;
      if (!payload) throw new Error(`HTTP ${r.status}`);
    } catch (error) {
      payload = {
        state: "down",
        systems: [{ name: "API", state: "down", detail: String(error?.message || error).slice(0, 80) }],
      };
    }

    const systems = [frontend, ...(payload.systems || [])];
    panel.querySelector(".hb-status-list").innerHTML = systems.map(renderRow).join("");
    panel.querySelector(".hb-status-lede").textContent = payload.state === "up"
      ? "All systems operational."
      : payload.state === "down"
        ? "Something is down. This is on our side, not yours."
        : "Running, with something degraded.";

    const dot = button?.querySelector(".hb-side-status__dot");
    if (dot) dot.dataset.state = payload.state || "unknown";
  }

  document.addEventListener("click", (event) => {
    const closer = event.target.closest?.("[data-status-close]");
    if (closer) { closePanel(); return; }
    const button = event.target.closest?.("[data-status-open]");
    if (button) { void openPanel(button); return; }
    // A click outside the panel closes it. We check contains rather than the
    // target: the panel has nested nodes inside it, and a click on the text
    // must not collapse it.
    if (panel && !panel.contains(event.target)) closePanel();
  });

  window.LoothoodStatusPanel = { open: openPanel, close: closePanel };
})();
