(function initAccountSettings(root, factory) {
  "use strict";

  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root?.document) root.LoothoodAccountSettings = api;
})(typeof window !== "undefined" ? window : globalThis, function accountSettingsFactory(root) {
  "use strict";

  const TABS = Object.freeze(["account", "settings", "mailbox", "feedback"]);
  const FOCUSABLE = [
    "button:not([disabled])",
    "a[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function rewardLabel(reward = {}) {
    const parts = [];
    if (Number(reward.standardTickets) > 0) {
      parts.push(`${Number(reward.standardTickets)} Standard Ticket${Number(reward.standardTickets) === 1 ? "" : "s"}`);
    }
    if (Number(reward.limitedTickets) > 0) {
      parts.push(`${Number(reward.limitedTickets)} Limited Ticket${Number(reward.limitedTickets) === 1 ? "" : "s"}`);
    }
    return parts.join(" · ");
  }

  function formattedDate(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function focusableWithin(node) {
    return [...node.querySelectorAll(FOCUSABLE)].filter((element) => (
      !element.hidden && element.getClientRects().length > 0
    ));
  }

  function uniqueId(prefix = "hb") {
    if (root.crypto?.randomUUID) return `${prefix}-${root.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function accountRuntime() {
    return root.LoothoodAccountRuntime || null;
  }

  function settingElements() {
    return Object.freeze({
      volume: root.document.getElementById("desktopMasterVolume"),
      mute: root.document.getElementById("desktopMuteAudio"),
      arenaFit: root.document.getElementById("mobileArenaFit"),
    });
  }

  class AccountSettingsController {
    constructor({ document = root.document } = {}) {
      this.document = document;
      this.runtime = accountRuntime();
      this.account = this.runtime?.account || null;
      this.api = this.runtime?.api && root.LoothoodAccountSettingsApi?.AccountSettingsApi
        ? new root.LoothoodAccountSettingsApi.AccountSettingsApi({ api: this.runtime.api })
        : null;
      this.walletRegistry = root.LoothoodAccountClient?.Eip6963Registry
        ? new root.LoothoodAccountClient.Eip6963Registry({ target: root })
        : null;
      this.activeTab = "account";
      this.messages = [];
      this.unreadCount = 0;
      this.selectedMessageId = null;
      this.mailLoaded = false;
      this.mailLoading = false;
      this.recovery = null;
      this.walletProviders = null;
      this.status = null;
      this.busy = false;
      this.invoker = null;
      this.app = document.getElementById("appBackground");
      this.element = this.createDialog();
      this.panel = this.element.querySelector(".hb-account-settings__panel");
      this.body = this.element.querySelector("[data-account-settings-body]");
      this.live = this.element.querySelector("[data-account-settings-live]");
      this.bind();
      this.render();
    }

    createDialog() {
      const element = this.document.createElement("div");
      element.id = "accountSettingsModal";
      element.className = "hb-account-settings";
      element.hidden = true;
      element.setAttribute("role", "dialog");
      element.setAttribute("aria-modal", "true");
      element.setAttribute("aria-labelledby", "accountSettingsTitle");
      element.innerHTML = `
        <section class="hb-account-settings__panel" tabindex="-1">
          <header class="hb-account-settings__header">
            <div>
              <h1 id="accountSettingsTitle">Account &amp; Settings</h1>
              <span class="hb-account-settings__rule" aria-hidden="true"></span>
            </div>
            <button class="hb-account-settings__close" type="button" data-account-settings-close aria-label="Close Account and Settings">×</button>
          </header>
          <nav class="hb-account-settings__tabs" role="tablist" aria-label="Account and Settings sections">
            <button type="button" role="tab" data-account-settings-tab="account">Account</button>
            <button type="button" role="tab" data-account-settings-tab="settings">Settings</button>
            <button type="button" role="tab" data-account-settings-tab="mailbox">Mailbox <span class="hb-account-settings__unread" data-mail-unread hidden></span></button>
            <button type="button" role="tab" data-account-settings-tab="feedback">Help &amp; Feedback</button>
          </nav>
          <div class="hb-account-settings__scroll" data-account-settings-scroll>
            <div class="hb-account-settings__body" data-account-settings-body></div>
            <span class="hb-account-settings__scroll-cue" aria-hidden="true">↓ More</span>
          </div>
          <footer class="hb-account-settings__footer">
            <p data-account-settings-live role="status" aria-live="polite"></p>
            <button type="button" class="hb-account-settings__back" data-account-settings-close>Back</button>
          </footer>
        </section>`;
      this.document.body.append(element);
      return element;
    }

    bind() {
      this.element.addEventListener("click", (event) => this.onClick(event));
      this.element.addEventListener("submit", (event) => this.onSubmit(event));
      this.element.addEventListener("input", (event) => this.onInput(event));
      this.element.addEventListener("change", (event) => this.onChange(event));
      this.element.addEventListener("keydown", (event) => this.onKeydown(event));
      this.element.querySelector("[data-account-settings-scroll]")
        .addEventListener("scroll", () => this.syncScrollCue());
      root.addEventListener("resize", () => this.syncScrollCue());
    }

    async open(invoker = this.document.activeElement) {
      this.runtime = accountRuntime();
      this.account = this.runtime?.account || this.account;
      if (this.runtime?.api && !this.api && root.LoothoodAccountSettingsApi?.AccountSettingsApi) {
        this.api = new root.LoothoodAccountSettingsApi.AccountSettingsApi({ api: this.runtime.api });
      }
      this.invoker = invoker instanceof root.HTMLElement ? invoker : null;
      this.element.hidden = false;
      this.document.body.classList.add("account-settings-open");
      if (this.app) {
        this.app.inert = true;
        this.app.setAttribute("aria-hidden", "true");
      }
      this.render();
      this.panel.focus({ preventScroll: true });
      await this.refreshSession();
      void this.refreshUnread();
    }

    close() {
      if (this.element.hidden) return;
      this.element.hidden = true;
      this.document.body.classList.remove("account-settings-open");
      if (this.app) {
        this.app.inert = false;
        this.app.removeAttribute("aria-hidden");
      }
      const target = this.invoker;
      this.invoker = null;
      if (target?.isConnected && !target.disabled) target.focus({ preventScroll: true });
    }

    async refreshSession() {
      if (!this.api) return;
      try {
        const result = await this.api.inspectSession();
        this.account = result?.authenticated ? result.account : null;
        this.render();
      } catch (error) {
        this.setStatus(error?.message || "Account details could not be refreshed.", true);
      }
    }

    async refreshUnread() {
      if (!this.api) return;
      try {
        const result = await this.api.loadUnreadCount();
        this.unreadCount = Math.max(0, Number(result.unreadCount) || 0);
        this.renderUnread();
      } catch {}
    }

    setStatus(message, error = false) {
      this.status = message ? { message, error } : null;
      this.live.textContent = message || "";
      this.live.classList.toggle("is-error", error);
    }

    setBusy(value) {
      this.busy = Boolean(value);
      this.element.setAttribute("aria-busy", String(this.busy));
      this.element.querySelectorAll("button, input, select, textarea").forEach((control) => {
        if (this.busy) {
          control.dataset.wasDisabled = String(control.disabled);
          control.disabled = true;
        } else if (Object.hasOwn(control.dataset, "wasDisabled")) {
          control.disabled = control.dataset.wasDisabled === "true";
          delete control.dataset.wasDisabled;
        }
      });
    }

    async perform(operation, {
      success = "",
      reload = false,
      rerender = true,
    } = {}) {
      if (this.busy) return null;
      this.setStatus("");
      this.setBusy(true);
      try {
        const result = await operation();
        if (success) this.setStatus(success);
        if (rerender) this.render();
        if (reload) root.setTimeout(() => root.location.reload(), 350);
        return result;
      } catch (error) {
        this.setStatus(error?.message || "The request could not be completed.", true);
        return null;
      } finally {
        this.setBusy(false);
      }
    }

    setTab(tab, { focus = false } = {}) {
      if (!TABS.includes(tab)) return;
      this.activeTab = tab;
      this.render();
      if (tab === "mailbox" && !this.mailLoaded) void this.loadMailbox();
      if (focus) {
        this.element.querySelector(`[data-account-settings-tab="${tab}"]`)
          ?.focus({ preventScroll: true });
      }
    }

    render() {
      this.element.querySelectorAll("[data-account-settings-tab]").forEach((button) => {
        const selected = button.dataset.accountSettingsTab === this.activeTab;
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
      this.renderUnread();
      if (this.activeTab === "account") this.renderAccount();
      else if (this.activeTab === "settings") this.renderSettings();
      else if (this.activeTab === "mailbox") this.renderMailbox();
      else this.renderFeedback();
      root.requestAnimationFrame?.(() => this.syncScrollCue());
    }

    renderUnread() {
      const badge = this.element.querySelector("[data-mail-unread]");
      if (!badge) return;
      badge.hidden = this.unreadCount < 1;
      badge.textContent = this.unreadCount > 99 ? "99+" : String(this.unreadCount);
      badge.setAttribute("aria-label", `${this.unreadCount} unread system messages`);
    }

    renderAccount() {
      const account = this.account;
      if (!account) {
        this.body.innerHTML = `
          <section class="hb-account-settings__empty">
            <h2>Account services unavailable</h2>
            <p>This local preview has no authenticated cloud account.</p>
          </section>`;
        return;
      }
      const guest = account.accountType === "guest";
      const wallets = Array.isArray(account.wallets) ? account.wallets : [];
      const hasWallet = wallets.length > 0;
      const protectedActions = account.capabilities?.canUseProtectedActions === true;
      const usernameLinked = account.authMethods?.includes("username");
      const walletRows = wallets.map((wallet) => `
        <li><span>Wallet</span><strong>${escapeHtml(wallet.maskedAddress || wallet.label)}</strong></li>`).join("");
      const providers = this.walletProviders === null ? "" : this.walletProviders.length
        ? `<div class="hb-account-settings__wallet-list" role="list" aria-label="Available browser wallets">${this.walletProviders.map((entry, index) => `
            <button type="button" data-wallet-provider="${index}">
              <span>${escapeHtml(entry.info.name)}</span><small>${escapeHtml(entry.info.rdns || "Browser extension")}</small>
            </button>`).join("")}</div>`
        : `<p class="hb-account-settings__notice">No EIP-6963 browser wallet was detected. Open or install a wallet extension, then try again.</p>`;
      const walletAction = !hasWallet
        ? `<button class="hb-account-settings__primary" type="button" data-account-action="discover-wallet">${guest ? "Connect Wallet" : "Link Wallet"}</button>${providers}`
        : `<p class="hb-account-settings__notice is-success">Your wallet is your secure login. No Recovery Key is required.</p>`;
      const usernameForm = guest ? `
        <details class="hb-account-settings__details">
          <summary>Use username &amp; password instead</summary>
          <form data-account-form="username" class="hb-account-settings__form">
            <label><span>Username</span><input name="username" minlength="3" maxlength="24" autocomplete="username" required></label>
            <label><span>Password</span><input name="password" type="password" minlength="12" autocomplete="new-password" required></label>
            <label><span>Confirm password</span><input name="passwordConfirmation" type="password" minlength="12" autocomplete="new-password" required></label>
            <button type="submit">Secure account</button>
          </form>
        </details>` : "";
      const recovery = !guest && usernameLinked && !hasWallet
        ? this.recovery
          ? this.renderRecoverySetup()
          : account.recoveryState === "secured"
            ? `<p class="hb-account-settings__notice is-success">Backup secured with a Recovery Key.</p>`
            : `<button type="button" data-account-action="setup-recovery">Back Up Account</button>
               <p class="hb-account-settings__hint">Write down one Recovery Key. It restores this Loothood account only.</p>`
        : "";
      this.body.innerHTML = `
        <section class="hb-account-settings__account">
          <div class="hb-account-settings__identity">
            <span class="hb-account-settings__crest" aria-hidden="true">${escapeHtml(account.displayName?.slice(0, 1) || "H")}</span>
            <div><h2>${escapeHtml(account.displayName)}</h2><p>${escapeHtml(account.playerId)}</p></div>
            <span class="hb-account-settings__status${protectedActions ? " is-secured" : ""}">${guest ? "Guest" : protectedActions ? "Secured" : "Backup needed"}</span>
          </div>
          <dl class="hb-account-settings__facts">
            <div><dt>Profile</dt><dd>${guest ? "Guest cloud profile" : "Full Loothood account"}</dd></div>
            <div><dt>Protected actions</dt><dd>${protectedActions ? "Available" : "Locked until secured"}</dd></div>
          </dl>
          ${walletRows ? `<ul class="hb-account-settings__methods">${walletRows}</ul>` : ""}
          <section class="hb-account-settings__section">
            <h3>${hasWallet ? "Wallet connected" : "Secure this profile"}</h3>
            ${walletAction}
            ${usernameForm}
            ${recovery}
          </section>
          <section class="hb-account-settings__section hb-account-settings__session-actions">
            <h3>Session</h3>
            <button type="button" data-account-action="logout">Sign out on this device</button>
            <button type="button" data-account-action="logout-all">Sign out everywhere</button>
          </section>
        </section>`;
    }

    renderRecoverySetup() {
      const recovery = this.recovery;
      const fields = recovery.confirmationPositions.map((position) => `
        <label><span>Block ${position}</span><input name="${position}" minlength="6" maxlength="6" autocomplete="off" spellcheck="false" required></label>`).join("");
      return `
        <section class="hb-account-settings__recovery">
          <p class="hb-account-settings__warning">${escapeHtml(recovery.warning)}</p>
          <output>${escapeHtml(recovery.recoveryKey)}</output>
          <button type="button" data-account-action="copy-recovery">Copy Recovery Key</button>
          <p>After writing it down, enter the requested six-character blocks.</p>
          <form data-account-form="recovery-confirm" class="hb-account-settings__form is-compact">
            ${fields}
            <button type="submit">Confirm backup</button>
          </form>
        </section>`;
    }

    renderSettings() {
      const controls = settingElements();
      const volume = Math.max(0, Math.min(100, Number(controls.volume?.value) || 0));
      const muted = controls.mute?.getAttribute("aria-pressed") === "true" || volume === 0;
      const arenaFit = controls.arenaFit?.value || "fill";
      const reducedMotion = root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const fullscreenAvailable = typeof this.document.documentElement.requestFullscreen === "function";
      this.body.innerHTML = `
        <section class="hb-account-settings__settings">
          <div class="hb-account-settings__setting">
            <div><h2>Audio</h2><p>One master control for music and game sound.</p></div>
            <label class="hb-account-settings__range"><span>Master volume</span><output data-volume-output>${muted ? 0 : volume}%</output><input type="range" min="0" max="100" step="1" value="${muted ? 0 : volume}" data-setting="volume"${controls.volume ? "" : " disabled"}></label>
            <button type="button" data-setting-action="mute"${controls.mute ? "" : " disabled"}>${muted ? "Unmute Audio" : "Mute Audio"}</button>
          </div>
          <div class="hb-account-settings__setting">
            <div><h2>Mobile combat</h2><p>The logical arena remains 3:2; only its screen mapping changes.</p></div>
            <label><span>Arena fit</span><select data-setting="arena-fit"${controls.arenaFit ? "" : " disabled"}><option value="fill"${arenaFit === "fill" ? " selected" : ""}>Fill Screen</option><option value="preserve"${arenaFit === "preserve" ? " selected" : ""}>Preserve 3:2</option></select></label>
          </div>
          <div class="hb-account-settings__setting">
            <div><h2>Motion</h2><p>Reduced motion follows your device preference.</p></div>
            <strong>${reducedMotion ? "Reduced motion active" : "Standard motion active"}</strong>
          </div>
          <div class="hb-account-settings__setting">
            <div><h2>Display</h2><p>Use the browser’s full-screen presentation.</p></div>
            <button type="button" data-setting-action="fullscreen"${fullscreenAvailable ? "" : " disabled"}>${this.document.fullscreenElement ? "Exit Full Screen" : "Enter Full Screen"}</button>
          </div>
        </section>`;
    }

    renderMailbox() {
      const account = this.account;
      const protectedActions = account?.capabilities?.canUseProtectedActions === true;
      if (this.mailLoading) {
        this.body.innerHTML = `<section class="hb-account-settings__empty"><h2>Opening mailbox</h2><p>Loading system messages…</p></section>`;
        return;
      }
      if (!this.mailLoaded) {
        this.body.innerHTML = `<section class="hb-account-settings__empty"><h2>Mailbox</h2><button type="button" data-mail-action="refresh">Load messages</button></section>`;
        return;
      }
      if (!this.messages.length) {
        this.body.innerHTML = `<section class="hb-account-settings__empty"><h2>No system messages</h2><p>Developer notices and ticket gifts will appear here.</p><button type="button" data-mail-action="refresh">Refresh</button></section>`;
        return;
      }
      const selected = this.messages.find((message) => message.messageId === this.selectedMessageId)
        || this.messages[0];
      this.selectedMessageId = selected.messageId;
      const rows = this.messages.map((message) => `
        <button type="button" class="hb-account-settings__mail-row${message.messageId === selected.messageId ? " is-selected" : ""}${message.readAt ? "" : " is-unread"}" data-mail-select="${escapeHtml(message.messageId)}">
          <span><strong>${escapeHtml(message.subject)}</strong><small>${escapeHtml(formattedDate(message.deliveredAt))}</small></span>
          ${message.hasReward && !message.claimedAt ? `<b>${escapeHtml(rewardLabel(message.reward))}</b>` : ""}
        </button>`).join("");
      const claimable = selected.hasReward && !selected.claimedAt;
      this.body.innerHTML = `
        <section class="hb-account-settings__mailbox">
          <aside class="hb-account-settings__mail-list" aria-label="System messages">${rows}</aside>
          <article class="hb-account-settings__mail-detail">
            <header><p>Loothood System</p><h2>${escapeHtml(selected.subject)}</h2><time>${escapeHtml(formattedDate(selected.deliveredAt))}</time></header>
            <p class="hb-account-settings__mail-copy">${escapeHtml(selected.body).replaceAll("\n", "<br>")}</p>
            ${selected.hasReward ? `<div class="hb-account-settings__reward"><span>Attached reward</span><strong>${escapeHtml(rewardLabel(selected.reward))}</strong>${selected.claimedAt ? `<small>Claimed ${escapeHtml(formattedDate(selected.claimedAt))}</small>` : ""}</div>` : ""}
            ${claimable && !protectedActions ? `<p class="hb-account-settings__warning">Secure this profile with a wallet or Recovery Key before claiming. The message will remain here.</p>` : ""}
            <footer>
              ${claimable ? `<button class="hb-account-settings__primary" type="button" data-mail-action="claim"${protectedActions ? "" : " disabled"}>Claim reward</button>` : ""}
              <button type="button" data-mail-action="archive">Archive</button>
              <button type="button" data-mail-action="refresh">Refresh</button>
            </footer>
          </article>
        </section>`;
      if (!selected.readAt) void this.markSelectedRead(selected);
    }

    renderFeedback() {
      this.body.innerHTML = `
        <section class="hb-account-settings__feedback">
          <header><h2>Report a Bug</h2><p>Send a text report directly to the Loothood developer. Screenshots and attachments are not collected.</p></header>
          <form data-account-form="bug-report" class="hb-account-settings__form">
            <label><span>Category</span><select name="category" required>
              <option value="gameplay">Gameplay</option>
              <option value="interface">Interface</option>
              <option value="audio">Audio</option>
              <option value="account">Account</option>
              <option value="crypto">Crypto</option>
              <option value="performance">Performance</option>
              <option value="other">Other</option>
            </select></label>
            <label><span>Short summary</span><input name="summary" minlength="5" maxlength="160" required></label>
            <label><span>What happened?</span><textarea name="description" minlength="10" maxlength="4000" rows="8" required></textarea></label>
            <p class="hb-account-settings__hint">Game version and basic browser diagnostics are attached automatically. Do not include passwords, Recovery Keys or wallet seed phrases.</p>
            <button class="hb-account-settings__primary" type="submit">Send report</button>
          </form>
        </section>`;
    }

    syncScrollCue() {
      const scroll = this.element.querySelector("[data-account-settings-scroll]");
      if (!scroll) return;
      const overflows = scroll.scrollHeight > scroll.clientHeight + 1;
      const atEnd = scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 2;
      scroll.dataset.canScroll = String(overflows);
      scroll.dataset.atEnd = String(!overflows || atEnd);
    }

    async loadMailbox() {
      if (!this.api || this.mailLoading) return;
      this.mailLoading = true;
      this.render();
      try {
        const result = await this.api.loadMailbox();
        this.messages = Array.isArray(result.messages) ? result.messages : [];
        this.unreadCount = Math.max(0, Number(result.unreadCount) || 0);
        this.mailLoaded = true;
        if (!this.messages.some((message) => message.messageId === this.selectedMessageId)) {
          this.selectedMessageId = this.messages[0]?.messageId || null;
        }
      } catch (error) {
        this.setStatus(error?.message || "Mailbox could not be loaded.", true);
      } finally {
        this.mailLoading = false;
        this.render();
      }
    }

    async markSelectedRead(message) {
      if (!this.api || message.readAt) return;
      try {
        const result = await this.api.markMailRead(message.messageId);
        message.readAt = result.readAt;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.renderUnread();
      } catch {}
    }

    async discoverWallets() {
      if (!this.walletRegistry) {
        this.setStatus("Browser wallet discovery is unavailable.", true);
        return;
      }
      await this.perform(async () => {
        this.walletProviders = await this.walletRegistry.discover();
        return this.walletProviders;
      });
    }

    async useWallet(index) {
      const provider = this.walletProviders?.[Number(index)];
      if (!provider || !this.api || !this.account) return;
      const guest = this.account.accountType === "guest";
      await this.perform(
        () => this.api.connectWallet(provider, { guest, link: !guest }),
        {
          success: guest
            ? "Wallet connected. Your existing guest progress is now secured."
            : "Wallet linked to this Loothood account.",
          reload: true,
        },
      );
    }

    async onClick(event) {
      const close = event.target.closest("[data-account-settings-close]");
      if (close) {
        this.close();
        return;
      }
      const tab = event.target.closest("[data-account-settings-tab]");
      if (tab) {
        this.setTab(tab.dataset.accountSettingsTab);
        return;
      }
      const provider = event.target.closest("[data-wallet-provider]");
      if (provider) {
        await this.useWallet(provider.dataset.walletProvider);
        return;
      }
      const mail = event.target.closest("[data-mail-select]");
      if (mail) {
        this.selectedMessageId = mail.dataset.mailSelect;
        this.renderMailbox();
        return;
      }
      const accountAction = event.target.closest("[data-account-action]")?.dataset.accountAction;
      if (accountAction === "discover-wallet") await this.discoverWallets();
      else if (accountAction === "setup-recovery") {
        const result = await this.perform(() => this.api.setupRecovery(), { rerender: false });
        if (result?.recovery) {
          this.recovery = result.recovery;
          this.renderAccount();
        }
      } else if (accountAction === "copy-recovery") {
        await this.perform(async () => {
          await root.navigator.clipboard.writeText(this.recovery.recoveryKey);
        }, { success: "Recovery Key copied.", rerender: false });
      } else if (accountAction === "logout" || accountAction === "logout-all") {
        await this.perform(
          () => accountAction === "logout" ? this.api.logout() : this.api.logoutAll(),
          { success: "Signed out.", reload: true },
        );
      }
      const mailAction = event.target.closest("[data-mail-action]")?.dataset.mailAction;
      if (mailAction === "refresh") await this.loadMailbox();
      else if (mailAction === "claim") await this.claimSelectedMail();
      else if (mailAction === "archive") await this.archiveSelectedMail();
      const settingAction = event.target.closest("[data-setting-action]")?.dataset.settingAction;
      if (settingAction === "mute") {
        settingElements().mute?.click();
        this.renderSettings();
      } else if (settingAction === "fullscreen") {
        await this.perform(async () => {
          if (this.document.fullscreenElement) await this.document.exitFullscreen();
          else await this.document.documentElement.requestFullscreen();
        }, { rerender: false });
        this.renderSettings();
      }
    }

    async claimSelectedMail() {
      const selected = this.messages.find((message) => message.messageId === this.selectedMessageId);
      if (!selected || !this.api) return;
      const result = await this.perform(() => this.api.claimMail(selected.messageId), {
        success: "Ticket reward claimed.",
        rerender: false,
      });
      if (!result) return;
      selected.claimedAt = result.claimedAt;
      selected.readAt = selected.readAt || result.claimedAt;
      this.runtime?.valueLedgerAuthority?.load?.().catch?.(() => {});
      this.renderMailbox();
      root.dispatchEvent(new CustomEvent("loothood:value-ledger-refresh-requested", {
        detail: { source: "mailbox", balances: result.balances },
      }));
    }

    async archiveSelectedMail() {
      const selected = this.messages.find((message) => message.messageId === this.selectedMessageId);
      if (!selected || !this.api) return;
      const result = await this.perform(() => this.api.archiveMail(selected.messageId), {
        success: "Message archived.",
        rerender: false,
      });
      if (!result) return;
      this.messages = this.messages.filter((message) => message.messageId !== selected.messageId);
      this.selectedMessageId = this.messages[0]?.messageId || null;
      this.renderMailbox();
    }

    async onSubmit(event) {
      const form = event.target.closest("[data-account-form]");
      if (!form) return;
      event.preventDefault();
      const data = new FormData(form);
      const kind = form.dataset.accountForm;
      if (kind === "username") {
        await this.perform(() => this.api.convertGuestWithUsername({
          username: data.get("username"),
          password: data.get("password"),
          passwordConfirmation: data.get("passwordConfirmation"),
        }), {
          success: "Account secured. Reloading your profile.",
          reload: true,
        });
      } else if (kind === "recovery-confirm") {
        const blocksByPosition = Object.fromEntries(
          this.recovery.confirmationPositions.map((position) => [
            position,
            String(data.get(String(position)) || "").trim().toUpperCase(),
          ]),
        );
        await this.perform(
          () => this.api.confirmRecovery(blocksByPosition),
          {
            success: "Account backup secured.",
            reload: true,
          },
        );
      } else if (kind === "bug-report") {
        const result = await this.perform(() => this.api.reportBug({
          category: data.get("category"),
          summary: data.get("summary"),
          description: data.get("description"),
          context: {
            gameVersion: String(root.LOOTHOOD_VERSION || "unknown"),
            browser: String(root.navigator.userAgent || "").slice(0, 240),
            platform: String(root.navigator.platform || "").slice(0, 240),
            viewport: `${root.innerWidth}x${root.innerHeight}`,
            currentScreen: String(this.document.querySelector(".hb-main[data-screen]")?.dataset.screen || "main-menu"),
          },
        }), {
          rerender: false,
        });
        if (result) {
          form.reset();
          this.setStatus(`Report sent. Reference ${result.reportId}.`);
        }
      }
    }

    onInput(event) {
      if (event.target.matches("[data-setting='volume']")) {
        const output = this.element.querySelector("[data-volume-output]");
        if (output) output.textContent = `${event.target.value}%`;
        const control = settingElements().volume;
        if (control) {
          control.value = event.target.value;
          control.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    }

    onChange(event) {
      if (event.target.matches("[data-setting='arena-fit']")) {
        const control = settingElements().arenaFit;
        if (control) {
          control.value = event.target.value;
          control.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    }

    onKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.close();
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        const active = event.target.closest("[data-account-settings-tab]");
        if (active) {
          event.preventDefault();
          const current = TABS.indexOf(active.dataset.accountSettingsTab);
          const direction = event.key === "ArrowRight" ? 1 : -1;
          this.setTab(TABS[(current + direction + TABS.length) % TABS.length], { focus: true });
          return;
        }
      }
      if (event.key !== "Tab") return;
      const controls = focusableWithin(this.element);
      if (!controls.length) {
        event.preventDefault();
        this.panel.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && this.document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && this.document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  let controller = null;

  function mount() {
    if (controller || !root.document?.body) return controller;
    controller = new AccountSettingsController();
    return controller;
  }

  root.addEventListener?.("loothood:open-account-settings", (event) => {
    void mount()?.open(event.detail?.invoker || root.document.activeElement);
  });
  root.addEventListener?.("loothood:account-ready", () => {
    mount();
  });
  if (root.document?.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", () => {
      if (accountRuntime()) mount();
    }, { once: true });
  } else if (accountRuntime()) {
    mount();
  }

  return Object.freeze({
    AccountSettingsController,
    escapeHtml,
    formattedDate,
    mount,
    rewardLabel,
  });
});
