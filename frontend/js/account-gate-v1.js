(function () {
  "use strict";

  const CLIENT = window.LoothoodAccountClient;
  const CLOUD = window.LoothoodCloudSaveClient;
  const VALUE = window.LoothoodValueLedgerClient;
  const SAFE_UPDATE = window.LoothoodSafeUpdate;
  const gameBoot = window.LoothoodGameBoot;
  const gate = document.getElementById("accountGate");
  const app = document.getElementById("appBackground");
  if (!CLIENT || !CLOUD || !VALUE || !SAFE_UPDATE || !gameBoot || !gate || !app) {
    throw new Error("Loothood account gate dependencies failed to load.");
  }

  const screens = [...gate.querySelectorAll("[data-account-screen]")];
  const panel = gate.querySelector(".hb-account-panel");
  const loadingCopy = gate.querySelector("[data-account-loading-copy]");
  const loadingValue = gate.querySelector("[data-account-loading-value]");
  const loadingBar = gate.querySelector(".hb-account-progress");
  const maintenanceMessage = document.getElementById("accountMaintenanceMessage");
  const walletChoices = document.getElementById("accountWalletChoices");
  const pendingWalletLabel = document.getElementById("accountPendingWallet");
  // The meta tag is now an OVERRIDE, not a mandatory address: without it we
  // fall back to the current origin, and the client works on any domain. It
  // only needs to be set for development, when the page is opened locally but
  // the API has to be the production one.
  const apiOrigin = document.querySelector('meta[name="loothood-api-origin"]')?.content?.trim();
  const api = new CLIENT.AccountApi({ baseUrl: apiOrigin || CLIENT.DEFAULT_API_ORIGIN });
  const walletRegistry = new CLIENT.Eip6963Registry({ target: window });
  const params = new URLSearchParams(window.location.search);
  const localDevelopment = window.location.protocol === "file:"
    || ["localhost", "127.0.0.1"].includes(window.location.hostname);
  let pendingWalletCreation = null;
  let bootInFlight = false;
  let activeCloudAuthority = null;
  let activeValueAuthority = null;
  let activeWalletProviderEntry = null;

  function setAppBlocked(blocked) {
    document.body.classList.toggle("account-pending", blocked);
    app.inert = blocked;
    if (blocked) app.setAttribute("aria-hidden", "true");
    else app.removeAttribute("aria-hidden");
    window.dispatchEvent(new CustomEvent("loothood:account-state", {
      detail: { blocked: Boolean(blocked) },
    }));
  }

  function activeScreen() {
    return screens.find((screen) => !screen.hidden) || null;
  }

  function syncScrollCue(screen = activeScreen()) {
    if (!screen) return;
    const overflows = screen.scrollHeight > screen.clientHeight + 1;
    const atBottom = screen.scrollTop + screen.clientHeight >= screen.scrollHeight - 2;
    panel.classList.toggle("has-scroll-cue", overflows && !atBottom);
  }

  function clearErrors(scope = gate) {
    scope.querySelectorAll("[data-account-form-error], [data-account-status]").forEach((node) => {
      node.hidden = true;
      node.textContent = "";
      node.classList.remove("is-error");
    });
  }

  function showError(scope, error) {
    const node = scope.querySelector("[data-account-form-error]")
      || scope.querySelector("[data-account-status]");
    if (!node) return;
    node.textContent = error?.message || "The request could not be completed.";
    node.classList.add("is-error");
    node.hidden = false;
    syncScrollCue(scope.closest("[data-account-screen]") || undefined);
  }

  function showScreen(name, { focus = true } = {}) {
    const target = screens.find((screen) => screen.dataset.accountScreen === name);
    if (!target) throw new Error(`Unknown account screen: ${name}`);
    screens.forEach((screen) => { screen.hidden = screen !== target; });
    gate.dataset.accountState = name;
    target.scrollTop = 0;
    clearErrors(target);
    if (focus) target.focus({ preventScroll: true });
    window.requestAnimationFrame(() => syncScrollCue(target));
  }

  function setBusy(scope, busy) {
    scope.querySelectorAll("button, input").forEach((control) => {
      if (busy) {
        control.dataset.accountWasDisabled = String(control.disabled);
        control.disabled = true;
      } else {
        control.disabled = control.dataset.accountWasDisabled === "true";
        delete control.dataset.accountWasDisabled;
      }
    });
    scope.setAttribute("aria-busy", String(busy));
  }

  async function withBusy(scope, operation) {
    clearErrors(scope);
    setBusy(scope, true);
    try {
      return await operation();
    } catch (error) {
      showError(scope, error);
      return null;
    } finally {
      setBusy(scope, false);
    }
  }

  function setLoading(percent, copy) {
    const value = Math.max(0, Math.min(100, Math.round(percent)));
    loadingCopy.textContent = copy;
    loadingValue.textContent = `${value}%`;
    loadingBar.setAttribute("aria-valuenow", String(value));
    loadingBar.style.setProperty("--account-progress", `${value}%`);
  }

  function playableAccount(result) {
    return result?.authenticated === true
      && result.account?.status === "active"
      && result.account?.capabilities?.canPlay === true;
  }

  function publishRuntime({ mode, session = null, serviceStatus = null, cloudSaveAuthority = null, valueLedgerAuthority = null }) {
    if (window.LoothoodAccountRuntime) {
      const existingProfileId = window.LoothoodAccountRuntime.account?.profileId || null;
      const requestedProfileId = session?.account?.profileId || null;
      if (window.LoothoodAccountRuntime.mode === mode && existingProfileId === requestedProfileId) {
        return window.LoothoodAccountRuntime;
      }
      throw new Error("A different account runtime is already active in this page session.");
    }
    const runtime = Object.freeze({
      mode,
      api,
      account: session?.account || null,
      authenticated: Boolean(session?.authenticated),
      localDevelopment: mode === "local-development-bypass",
      serviceCapabilities: Object.freeze({ ...(serviceStatus?.capabilities || {}) }),
      cloudSaveAuthority,
      valueLedgerAuthority,
      walletProviderEntry: activeWalletProviderEntry,
    });
    Object.defineProperty(window, "LoothoodAccountRuntime", {
      configurable: false,
      enumerable: true,
      writable: false,
      value: runtime,
    });
    return runtime;
  }

  async function enterGame(session, mode = "authenticated") {
    if (session && !playableAccount(session)) {
      showMaintenance("This account cannot currently enter Loothood.");
      return;
    }
    showScreen("loading");
    setLoading(58, session ? "Loading cloud profile" : "Starting local development preview");
    try {
      const serviceStatus = session ? await api.loadServiceStatus() : null;
      if (serviceStatus) {
        SAFE_UPDATE.observeStatus(serviceStatus);
        SAFE_UPDATE.startPolling({ baseUrl: api.baseUrl });
      }
      if (session) {
        activeCloudAuthority = activeCloudAuthority || new CLOUD.CloudSaveAuthority({
          api,
          idempotencyKey: CLIENT.secureIdempotencyKey,
          onFatal: (error) => showMaintenance(error?.message || "Cloud progress could not be saved."),
        });
        await activeCloudAuthority.load();
        if (
          session.account?.capabilities?.canUseProtectedActions === true
          && serviceStatus?.capabilities?.valueLedger === true
        ) {
          activeValueAuthority = activeValueAuthority || new VALUE.ValueLedgerAuthority({
            api,
            profileId: session.account.profileId,
            idempotencyKey: CLIENT.secureIdempotencyKey,
            onFatal: (error) => showMaintenance(error?.message || "Protected value could not be loaded."),
          });
          setLoading(70, "Loading protected equipment");
          await activeValueAuthority.load();
        } else {
          activeValueAuthority = null;
        }
      }
      setLoading(78, "Preparing authoritative progress");
      publishRuntime({
        mode,
        session,
        serviceStatus,
        cloudSaveAuthority: activeCloudAuthority,
        valueLedgerAuthority: activeValueAuthority,
      });
      const startedNow = gameBoot.start();
      if (!startedNow && !gameBoot.started) {
        throw new Error("The game did not enter an authorized started state.");
      }
      setLoading(100, "Forest ready");
      setAppBlocked(false);
      gate.hidden = true;
      window.dispatchEvent(new CustomEvent("loothood:account-ready", {
        detail: { mode, account: session?.account || null },
      }));
    } catch (error) {
      console.error("Loothood game boot failed", error);
      showMaintenance("The game could not safely finish loading.");
    }
  }

  function showMaintenance(message) {
    setAppBlocked(true);
    gate.hidden = false;
    maintenanceMessage.textContent = message || "Account and cloud services could not be reached.";
    showScreen("maintenance");
  }

  async function inspectBoot() {
    if (bootInFlight) return;
    bootInFlight = true;
    setAppBlocked(true);
    showScreen("loading");
    setLoading(30, "Checking secure session");
    try {
      const result = await api.inspectSession();
      if (playableAccount(result)) {
        await enterGame(result);
      } else if (result?.authenticated === true) {
        showMaintenance("This account is not currently permitted to play.");
      } else {
        setLoading(50, "Choose how to continue");
        showScreen("entry");
      }
    } catch (error) {
      console.error("Loothood account session inspection failed", error);
      showMaintenance(error?.message || "Account and cloud services could not be reached.");
    } finally {
      bootInFlight = false;
    }
  }

  async function submitUsernameLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const result = await withBusy(form, () => api.login({
      username: form.elements.username.value.trim(),
      password: form.elements.password.value,
    }));
    if (result) await enterGame(result);
  }

  async function submitRegistration(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = form.elements.password.value;
    const passwordConfirmation = form.elements.passwordConfirmation.value;
    if (password !== passwordConfirmation) {
      showError(form, new Error("Passwords do not match."));
      form.elements.passwordConfirmation.focus();
      return;
    }
    const result = await withBusy(form, () => api.register({
      username: form.elements.username.value.trim(),
      password,
      passwordConfirmation,
    }));
    if (result) await enterGame(result);
  }

  async function submitRecovery(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const newPassword = form.elements.newPassword.value;
    const newPasswordConfirmation = form.elements.newPasswordConfirmation.value;
    if (newPassword !== newPasswordConfirmation) {
      showError(form, new Error("Passwords do not match."));
      form.elements.newPasswordConfirmation.focus();
      return;
    }
    const result = await withBusy(form, () => api.recover({
      recoveryKey: form.elements.recoveryKey.value.trim().toUpperCase(),
      newPassword,
      newPasswordConfirmation,
    }));
    if (result) await enterGame(result);
  }

  async function continueAsGuest() {
    const screen = screens.find((node) => node.dataset.accountScreen === "guest");
    const result = await withBusy(screen, () => api.createGuest());
    if (result) await enterGame(result);
  }

  async function connectWallet(entry) {
    const screen = activeScreen() || gate;
    const signed = await withBusy(screen, () => CLIENT.connectAndSign(
      entry,
      (address) => api.walletChallenge(address),
    ));
    if (!signed) return;
    const verified = await withBusy(screen, () => api.verifyWallet({
      challengeId: signed.challenge.challengeId,
      message: signed.challenge.message,
      signature: signed.signature,
    }));
    if (!verified) return;
    activeWalletProviderEntry = entry;
    if (verified.accountCreationRequired === true) {
      pendingWalletCreation = Object.freeze({
        challengeId: verified.challengeId,
        creationToken: verified.creationToken,
        address: signed.address,
      });
      pendingWalletLabel.textContent = CLIENT.maskAddress(signed.address);
      showScreen("wallet-confirm");
      return;
    }
    await enterGame(verified);
  }

  async function beginWalletLogin() {
    const entryScreen = screens.find((node) => node.dataset.accountScreen === "entry");
    const providers = await withBusy(entryScreen, async () => {
      const config = await api.walletProviderConfig();
      if (config?.directBrowserProviders !== true || Number(config.chainId) !== 4663) {
        throw new CLIENT.AccountClientError(503, "wallet_provider_unavailable", "Wallet login is temporarily unavailable.");
      }
      return walletRegistry.discover();
    });
    if (!providers) return;
    if (providers.length < 1) {
      showError(entryScreen, new Error("No EIP-6963 browser wallet was found. Install or enable a supported wallet, then try again."));
      return;
    }
    if (providers.length === 1) {
      await connectWallet(providers[0]);
      return;
    }
    walletChoices.replaceChildren();
    providers.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hb-account-button";
      button.textContent = entry.info.name;
      button.addEventListener("click", () => connectWallet(entry));
      walletChoices.append(button);
    });
    showScreen("wallets");
  }

  async function confirmWalletCreation() {
    const screen = screens.find((node) => node.dataset.accountScreen === "wallet-confirm");
    if (!pendingWalletCreation) {
      showScreen("entry");
      return;
    }
    const result = await withBusy(screen, () => api.confirmWalletAccount(pendingWalletCreation));
    if (result) {
      pendingWalletCreation = null;
      await enterGame(result);
    }
  }

  gate.querySelectorAll("[data-account-go]").forEach((control) => {
    control.addEventListener("click", () => showScreen(control.dataset.accountGo));
  });
  gate.querySelectorAll("[data-account-password-toggle]").forEach((control) => {
    control.addEventListener("click", () => {
      const input = control.closest(".hb-account-password")?.querySelector("input");
      if (!input) return;
      const reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      control.textContent = reveal ? "Hide" : "Show";
      control.setAttribute("aria-pressed", String(reveal));
      input.focus({ preventScroll: true });
    });
  });
  screens.forEach((screen) => screen.addEventListener("scroll", () => syncScrollCue(screen)));
  window.addEventListener("resize", () => syncScrollCue());
  document.getElementById("accountUsernameForm").addEventListener("submit", submitUsernameLogin);
  document.getElementById("accountCreateForm").addEventListener("submit", submitRegistration);
  document.getElementById("accountRecoverForm").addEventListener("submit", submitRecovery);
  document.getElementById("accountContinueGuest").addEventListener("click", continueAsGuest);
  document.getElementById("accountWalletLogin").addEventListener("click", beginWalletLogin);
  document.getElementById("accountConfirmWalletCreation").addEventListener("click", confirmWalletCreation);
  document.getElementById("accountCancelWalletCreation").addEventListener("click", () => {
    pendingWalletCreation = null;
    showScreen("entry");
  });
  document.getElementById("accountRetryBoot").addEventListener("click", inspectBoot);

  const musicToggle = document.getElementById("accountLoginMusicToggle");
  function renderLoginMusicToggle() {
    const music = window.LoothoodMusic;
    const available = Boolean(music && typeof music.setEnabled === "function");
    const enabled = available && music.enabled === true;
    musicToggle.disabled = !available;
    musicToggle.setAttribute("aria-pressed", String(enabled));
    // We take the title from the player, not from the markup: the markup said
    // "Greenwood Suite", and it stayed there no matter which track was playing.
    const title = (available && music.trackTitle) || "";
    const credit = (available && music.trackCredit) || "";
    musicToggle.setAttribute("aria-label",
      title ? `${enabled ? "Mute" : "Play"} ${title}` : (enabled ? "Mute music" : "Play music"));
    musicToggle.querySelector("span[aria-hidden='true']").textContent = enabled ? "♫" : "♪";
    const creditEl = musicToggle.querySelector("small");
    const titleEl = musicToggle.querySelector("strong");
    if (creditEl) creditEl.textContent = credit;
    if (titleEl) titleEl.textContent = title;
    musicToggle.querySelector("b").textContent = available ? `Music ${enabled ? "on" : "off"}` : "Unavailable";
  }

  musicToggle.addEventListener("click", async () => {
    const music = window.LoothoodMusic;
    if (!music || typeof music.setEnabled !== "function") return;
    musicToggle.disabled = true;
    try {
      await music.setEnabled(!music.enabled);
    } finally {
      renderLoginMusicToggle();
    }
  });
  renderLoginMusicToggle();

  setAppBlocked(true);
  const localPreviewScreen = localDevelopment ? params.get("accountPreview") : null;
  if (localPreviewScreen && screens.some((screen) => screen.dataset.accountScreen === localPreviewScreen)) {
    showScreen(localPreviewScreen);
  } else if (localDevelopment && params.get("accountAuthority") !== "1") {
    enterGame(null, "local-development-bypass");
  } else {
    inspectBoot();
  }
})();
