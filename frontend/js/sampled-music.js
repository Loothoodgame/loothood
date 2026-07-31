(function () {
  "use strict";

  const toggle = document.getElementById("musicToggle");
  const roomText = document.getElementById("roomText");
  const manifest = window.LoothoodProductionAudio;
  const victoryTimeline = window.LoothoodBossVictoryTimeline;
  if (!toggle || !manifest?.tracks || !victoryTimeline || typeof window.Audio !== "function") return;

  const seedSystem = window.LoothoodBossSeeds;
  const tracks = manifest.tracks;
  const seedIds = ["ironOath", "deepRoot", "huntersKnot", "bloodHunt"];
  const bosses = new Set([5, 10, 15]);
  const DEFAULT_PAIR_KEY = seedSystem?.pairKey?.(["ironOath", "deepRoot"]) || "ironOath+deepRoot";
  const MASTER_VOLUME = 0.58;
  const FADE_MS = 900;
  /* Music arriving and music leaving.
     ------------------------------------------------------------------
     The crossfade between tracks was already there, but into and out of
     silence the music moved in a jerk: the first track came in at full volume
     straight away, and the "sound off" button yanked pause in the middle of a
     bar. An abrupt cut-off is heard far more sharply than an abrupt start,
     which is why the departure is shorter than the arrival — a long fade on
     switching off reads as "it did not switch off".

     The arrival is longer than the crossfade between tracks: there we pick up
     music that is already running, whereas here it comes out of nothing, and a
     second and a half of that is not perceived as a delay. */
  const RISE_MS = 1400;
  const FALL_MS = 650;
  const ORDINARY_CROSSFADE_MS = 140;
  const SAVE_KEY = "loothood:progress:v1";
  const localAudioDebug = location.hostname === "127.0.0.1" || location.hostname === "localhost";
  const probe = new Audio();
  const forcedDebugFormat = localAudioDebug && ["m4a", "mp3"].includes(window.__LOOTHOOD_AUDIO_TEST_FORMAT)
    ? window.__LOOTHOOD_AUDIO_TEST_FORMAT
    : "";
  const preferredExtension = forcedDebugFormat || (probe.canPlayType("audio/mp4; codecs=mp4a.40.2") ? "m4a" : "mp3");
  const ordinaryContinuity = new Set(["1>2", "2>3", "3>4", "6>7", "7>8", "8>9", "11>12", "12>13", "13>14"]);
  const bossLoopOverlapsMs = manifest.bossLoopOverlapsMs || Object.freeze({});

  let enabled = persistedEnabled();
  let playing = false;
  let autoplayArmed = false;
  let activeTrack = null;
  let activeAudio = null;
  let routeToken = 0;
  let bossDefeatToken = 0;
  let lastBossClearToken = "";
  let lastGameStage = 0;
  let preloaded = null;
  let bossLoopSession = null;
  const bossPhase = { 5: 1, 10: 1, 15: 1 };
  const bossTrackSlot = { 5: "ironOath", 10: "deepRoot" };
  let finalPairKey = DEFAULT_PAIR_KEY;
  const audioPool = new Set();
  const audioRecords = new WeakMap();
  const audioMixLevels = new WeakMap();
  const bossTimers = new Set();
  let masterVolumeScalar = 1;
  let unlockListenersInstalled = false;

  function persistedEnabled() {
    try {
      const saved = JSON.parse(window.localStorage?.getItem?.(SAVE_KEY) || "null");
      const settings = saved?.settings;
      if (!settings || typeof settings !== "object") return true;
      return settings.muted !== true && Number(settings.volume) !== 0;
    } catch (error) {
      return true;
    }
  }

  function clampVolume(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function setAudioMix(audio, level) {
    if (!audio) return;
    const normalized = clampVolume(level);
    audioMixLevels.set(audio, normalized);
    audio.volume = normalized * masterVolumeScalar;
  }

  function audioMix(audio) {
    return audio ? audioMixLevels.get(audio) ?? 0 : 0;
  }

  function setMasterVolume(value) {
    masterVolumeScalar = clampVolume(value);
    for (const audio of audioPool) setAudioMix(audio, audioMix(audio));
  }

  function gameStage() {
    const effectiveStage = roomText?.dataset?.soundtrackStage;
    const source = effectiveStage === undefined || effectiveStage === ""
      ? roomText?.textContent || "0"
      : effectiveStage;
    const room = Number.parseInt(source, 10);
    return Number.isFinite(room) && room >= 1 && room <= 15 ? room : 0;
  }

  function pairKeyForIds(ids) {
    return seedSystem?.pairKey?.(ids) || DEFAULT_PAIR_KEY;
  }

  function soundtrackSlotFor(value, seedId = "") {
    const slot = String(value || "");
    if (seedIds.includes(slot)) return slot;
    if (seedIds.includes(seedId)) return seedId;
    return "";
  }

  function trackForGame() {
    if (document.body?.classList?.contains("account-pending")) {
      return tracks["login:world1"] ? "login:world1" : "menu:village";
    }
    const stage = gameStage();
    if (stage === 0) return "menu:village";
    if (stage === 4) return `warning:${bossTrackSlot[5]}:4`;
    if (stage === 9) return `warning:${bossTrackSlot[10]}:9`;
    if (stage === 5 || stage === 10) {
      const fallback = stage === 5 ? "ironOath" : "deepRoot";
      const slot = seedIds.includes(bossTrackSlot[stage]) ? bossTrackSlot[stage] : fallback;
      return `seed:${slot}:p${Math.max(1, Math.min(2, bossPhase[stage]))}`;
    }
    if (stage === 15) return `pair:${finalPairKey}:p${Math.max(1, Math.min(3, bossPhase[15]))}`;
    return `stage:${stage}`;
  }

  function definitionFor(key) {
    return tracks[key] || tracks["menu:village"];
  }

  function formatOrder(definition) {
    const available = manifest.fallbackOrder.filter((extension) => definition.formats?.[extension]);
    if (preferredExtension === "m4a" && available.includes("m4a")) {
      return ["m4a", ...available.filter((extension) => extension !== "m4a")];
    }
    return available.includes("mp3")
      ? ["mp3", ...available.filter((extension) => extension !== "mp3")]
      : available;
  }

  function assetUrl(definition, extension) {
    const destination = definition.formats?.[extension]?.destination;
    const relative = String(destination || "").replace(/^game\//, "");
    return `./${relative}?v=${manifest.cacheToken}`;
  }

  function isBossLoopKey(key) {
    return Object.hasOwn(bossLoopOverlapsMs, key);
  }

  function selectedFormat(record) {
    return record.formats[record.formatIndex] || record.formats[0] || "";
  }

  function contentEnd(record) {
    const format = selectedFormat(record);
    return Number(record.definition.formats?.[format]?.duration) || Number(record.definition.duration) || 0;
  }

  function loopBodyRateFor(record) {
    if (!isBossLoopKey(record.key)) return 1;
    const length = contentEnd(record) - Number(record.definition.loopStart || 0);
    const barSeconds = 240 / Number(record.definition.bpm || 1);
    const authoredBars = Math.max(1, Math.round(length / barSeconds));
    const overlapSeconds = Number(bossLoopOverlapsMs[record.key] || 80) / 1000;
    return (length - overlapSeconds) / (authoredBars * barSeconds);
  }

  function recordFor(audio) {
    return audioRecords.get(audio) || null;
  }

  function cancelRecordWork(record) {
    for (const frame of record.frames) window.cancelAnimationFrame?.(frame);
    record.frames.clear();
    for (const timer of record.timers) window.clearTimeout(timer);
    record.timers.clear();
    for (const cancelWaiter of record.waiters) cancelWaiter();
    record.waiters.clear();
    for (const [type, listener] of record.listeners) record.audio.removeEventListener?.(type, listener);
    record.listeners.length = 0;
  }

  function discard(audio) {
    if (!audio || !audioPool.has(audio)) return;
    const record = recordFor(audio);
    if (record) {
      record.disposed = true;
      cancelRecordWork(record);
    }
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    audioPool.delete(audio);
    if (preloaded?.audio === audio) preloaded = null;
  }

  function addManagedListener(record, type, listener) {
    record.audio.addEventListener(type, listener);
    record.listeners.push([type, listener]);
  }

  function queueManagedFrame(record, callback) {
    if (record.disposed) return 0;
    const frame = window.requestAnimationFrame((timestamp) => {
      record.frames.delete(frame);
      if (!record.disposed) callback(timestamp);
    });
    record.frames.add(frame);
    return frame;
  }

  function queueManagedTimer(record, callback, delay) {
    if (record.disposed) return 0;
    const timer = window.setTimeout(() => {
      record.timers.delete(timer);
      if (!record.disposed) callback();
    }, Math.max(0, Number(delay) || 0));
    record.timers.add(timer);
    return timer;
  }

  function setRecordSource(record, formatIndex) {
    record.formatIndex = formatIndex;
    record.audio.src = assetUrl(record.definition, record.formats[formatIndex]);
    record.audio.load();
  }

  function makeAudio(key, { oneShot = false } = {}) {
    const definition = definitionFor(key);
    const audio = new Audio();
    const record = {
      audio,
      key,
      definition,
      formats: formatOrder(definition),
      formatIndex: 0,
      oneShot,
      disposed: false,
      frames: new Set(),
      timers: new Set(),
      waiters: new Set(),
      listeners: [],
      readyPromise: null,
    };
    audio.preload = "auto";
    audio.loop = definition.behavior === "full-loop" && !isBossLoopKey(key);
    audio.playbackRate = 1;
    audio.preservesPitch = true;
    audio.mozPreservesPitch = true;
    audioRecords.set(audio, record);
    audioPool.add(audio);
    setAudioMix(audio, 0);
    setRecordSource(record, 0);
    if (definition.behavior === "custom-loop" && !isBossLoopKey(key)) configureCustomLoop(record);
    if (oneShot) addManagedListener(record, "ended", () => discard(audio));
    return record;
  }

  function waitForMetadata(record) {
    const audio = record.audio;
    if (record.disposed) return Promise.resolve(false);
    if (audio.readyState >= 1 && Number.isFinite(audio.duration) && audio.duration > 0) return Promise.resolve(true);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        audio.removeEventListener?.("loadedmetadata", ready);
        audio.removeEventListener?.("error", failed);
        record.waiters.delete(cancel);
        resolve(value);
      };
      const ready = () => finish(true);
      const failed = () => finish(false);
      const cancel = () => finish(false);
      record.waiters.add(cancel);
      audio.addEventListener("loadedmetadata", ready, { once: true });
      audio.addEventListener("error", failed, { once: true });
    });
  }

  async function ensureMetadata(record) {
    if (record.readyPromise) return record.readyPromise;
    record.readyPromise = (async () => {
      while (!record.disposed && record.formatIndex < record.formats.length) {
        if (await waitForMetadata(record)) return true;
        if (record.disposed || record.formatIndex + 1 >= record.formats.length) return false;
        setRecordSource(record, record.formatIndex + 1);
      }
      return false;
    })();
    return record.readyPromise;
  }

  function seekTo(record, target) {
    const audio = record.audio;
    const duration = Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : record.definition.duration;
    const bounded = Math.max(0, Math.min(Math.max(0, duration - 0.001), Number(target) || 0));
    if (bounded <= 0.001) {
      audio.currentTime = 0;
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        audio.removeEventListener?.("seeked", ready);
        audio.removeEventListener?.("error", failed);
        record.waiters.delete(cancel);
        resolve(value);
      };
      const ready = () => finish(true);
      const failed = () => finish(false);
      const cancel = () => finish(false);
      record.waiters.add(cancel);
      audio.addEventListener("seeked", ready, { once: true });
      audio.addEventListener("error", failed, { once: true });
      audio.currentTime = bounded;
      Promise.resolve().then(() => {
        if (!audio.seeking && Math.abs(audio.currentTime - bounded) < 0.02) finish(true);
      });
    });
  }

  function applyBodyRate(record) {
    const rate = loopBodyRateFor(record);
    if (rate !== 1 && record.audio.currentTime >= record.definition.loopStart) {
      record.audio.playbackRate = rate;
      return true;
    }
    return rate === 1;
  }

  function watchLoopBodyRate(record) {
    if (record.disposed || applyBodyRate(record)) return;
    queueManagedFrame(record, () => watchLoopBodyRate(record));
  }

  function configureCustomLoop(record) {
    addManagedListener(record, "ended", () => {
      if (!enabled || activeAudio !== record.audio || record.disposed || !audioPool.has(record.audio)) return;
      record.audio.currentTime = record.definition.loopStart;
      record.audio.playbackRate = loopBodyRateFor(record);
      record.audio.play().catch(armAutoplay);
    });
  }

  function validBossSession(session) {
    return Boolean(
      session
      && bossLoopSession === session
      && session.token === routeToken
      && !session.active.disposed
      && activeTrack === session.key
    );
  }

  function cancelBossLoop({ keepActive = false, preferLoudest = false } = {}) {
    const session = bossLoopSession;
    bossLoopSession = null;
    if (!session) return;
    let keeper = keepActive ? session.active : null;
    if (
      keepActive
      && preferLoudest
      && session.standby
      && audioMix(session.standby.audio) > audioMix(session.active.audio)
    ) keeper = session.standby;
    for (const record of [session.active, session.standby]) {
      if (record && record !== keeper) discard(record.audio);
    }
    if (keeper) activeAudio = keeper.audio;
  }

  async function prepareBossStandby(session) {
    if (!validBossSession(session) || session.standby) return;
    const standby = makeAudio(session.key);
    const activeFormat = selectedFormat(session.active);
    const matchingIndex = standby.formats.indexOf(activeFormat);
    if (matchingIndex > 0) setRecordSource(standby, matchingIndex);
    session.standby = standby;
    if (!(await ensureMetadata(standby)) || !validBossSession(session) || session.standby !== standby) {
      discard(standby.audio);
      if (session.standby === standby) session.standby = null;
      return;
    }
    if (!(await seekTo(standby, standby.definition.loopStart)) || !validBossSession(session)) {
      discard(standby.audio);
      if (session.standby === standby) session.standby = null;
      return;
    }
    standby.audio.playbackRate = loopBodyRateFor(standby);
    setAudioMix(standby.audio, 0);
    scheduleBossBoundary(session);
  }

  function scheduleBossBoundary(session) {
    if (!enabled || !validBossSession(session) || session.crossing || !session.standby) return;
    const overlapSeconds = session.overlapMs / 1000;
    const boundary = contentEnd(session.active) - overlapSeconds;
    const remaining = boundary - session.active.audio.currentTime;
    if (remaining <= 0.012) {
      beginBossOverlap(session);
      return;
    }
    const delay = Math.min(250, Math.max(4, remaining / Math.max(0.01, session.active.audio.playbackRate) * 1000 - 8));
    queueManagedTimer(session.active, () => scheduleBossBoundary(session), delay);
  }

  function finishBossOverlap(session, outgoing, incoming) {
    if (!validBossSession(session) || session.standby !== incoming) return;
    setAudioMix(incoming.audio, MASTER_VOLUME);
    discard(outgoing.audio);
    session.active = incoming;
    session.standby = null;
    session.crossing = false;
    activeAudio = incoming.audio;
    void prepareBossStandby(session);
  }

  function beginBossOverlap(session) {
    if (!enabled || !validBossSession(session) || session.crossing || !session.standby) return;
    const outgoing = session.active;
    const incoming = session.standby;
    session.crossing = true;
    incoming.audio.playbackRate = loopBodyRateFor(incoming);
    setAudioMix(incoming.audio, 0);
    const startedAt = performance.now();
    const duration = session.overlapMs;
    const valid = () => validBossSession(session) && session.standby === incoming;
    const step = () => {
      if (!valid()) return;
      const progress = Math.min(1, (performance.now() - startedAt) / duration);
      setAudioMix(outgoing.audio, MASTER_VOLUME * Math.cos(progress * Math.PI / 2));
      setAudioMix(incoming.audio, MASTER_VOLUME * Math.sin(progress * Math.PI / 2));
      if (progress < 1) queueManagedFrame(incoming, step);
      else finishBossOverlap(session, outgoing, incoming);
    };
    incoming.audio.play().then(() => {
      if (!valid()) return;
      step();
    }).catch(() => {
      session.crossing = false;
      discard(incoming.audio);
      if (session.standby === incoming) session.standby = null;
      if (validBossSession(session)) void prepareBossStandby(session);
    });
  }

  function startBossLoop(record, token) {
    if (!isBossLoopKey(record.key) || token !== routeToken) return;
    const session = {
      key: record.key,
      token,
      overlapMs: Number(bossLoopOverlapsMs[record.key]),
      active: record,
      standby: null,
      crossing: false,
    };
    bossLoopSession = session;
    addManagedListener(record, "ended", () => {
      if (!enabled || !validBossSession(session) || session.crossing) return;
      if (session.standby) {
        beginBossOverlap(session);
        return;
      }
      record.audio.currentTime = record.definition.loopStart;
      record.audio.playbackRate = loopBodyRateFor(record);
      record.audio.play().catch(armAutoplay);
      void prepareBossStandby(session);
    });
    void prepareBossStandby(session);
  }

  function stageNumber(key) {
    const direct = String(key).match(/^stage:(\d+)$/);
    if (direct) return Number(direct[1]);
    const warning = String(key).match(/^warning:[^:]+:(4|9)$/);
    return warning ? Number(warning[1]) : 0;
  }

  function continuityFor(fromKey, toKey) {
    const from = stageNumber(fromKey);
    const to = stageNumber(toKey);
    if (!ordinaryContinuity.has(`${from}>${to}`)) return null;
    return {
      from,
      to,
      outgoingBpm: definitionFor(fromKey).bpm,
      incomingBpm: definitionFor(toKey).bpm,
    };
  }

  function fadeMix(audio, from, to, duration, valid, onDone) {
    const record = recordFor(audio);
    if (!record || record.disposed) return;
    const startedAt = performance.now();
    const step = () => {
      if (record.disposed || !valid()) return;
      const progress = Math.min(1, (performance.now() - startedAt) / duration);
      setAudioMix(audio, from + (to - from) * progress);
      if (progress < 1) queueManagedFrame(record, step);
      else onDone?.();
    };
    step();
  }

  function rampRate(record, from, to, duration, token) {
    const startedAt = performance.now();
    record.audio.playbackRate = from;
    const step = () => {
      if (record.disposed || token !== routeToken || activeAudio !== record.audio) return;
      const progress = Math.min(1, (performance.now() - startedAt) / duration);
      record.audio.playbackRate = from + (to - from) * progress;
      if (progress < 1) queueManagedFrame(record, step);
      else record.audio.playbackRate = to;
    };
    step();
  }

  function removeUnlockListeners() {
    if (!unlockListenersInstalled) return;
    unlockListenersInstalled = false;
    for (const type of ["pointerdown", "touchend", "keydown"]) {
      document.removeEventListener?.(type, unlockFromGesture, true);
    }
  }

  function installUnlockListeners() {
    if (unlockListenersInstalled || !enabled) return;
    unlockListenersInstalled = true;
    for (const type of ["pointerdown", "touchend", "keydown"]) {
      document.addEventListener?.(type, unlockFromGesture, { capture: true, passive: true });
    }
  }

  function armAutoplay() {
    if (!enabled) return;
    autoplayArmed = true;
    playing = Boolean(activeAudio && !activeAudio.paused);
    renderToggle();
    installUnlockListeners();
  }

  function unlockFromGesture() {
    if (!enabled || (playing && activeTrack === trackForGame())) return;
    void switchTo(trackForGame(), true);
  }

  function likelySuccessor(key) {
    const next = {
      "stage:1": "stage:2",
      "stage:2": "stage:3",
      "stage:3": `warning:${bossTrackSlot[5]}:4`,
      "stage:6": "stage:7",
      "stage:7": "stage:8",
      "stage:8": `warning:${bossTrackSlot[10]}:9`,
      "stage:11": "stage:12",
      "stage:12": "stage:13",
      "stage:13": "stage:14",
    }[key];
    return tracks[next] ? next : "";
  }

  function clearPreload() {
    if (preloaded) discard(preloaded.audio);
    preloaded = null;
  }

  function preloadSuccessor(key) {
    const successor = likelySuccessor(key);
    if (!successor) {
      clearPreload();
      return;
    }
    if (preloaded?.key === successor && !preloaded.disposed) return;
    clearPreload();
    preloaded = makeAudio(successor);
    void ensureMetadata(preloaded);
  }

  function takePreloaded(key) {
    if (preloaded?.key !== key || preloaded.disposed) return makeAudio(key);
    const record = preloaded;
    preloaded = null;
    return record;
  }

  async function switchTo(key, immediate = false, fadeDuration = FADE_MS) {
    if (!enabled || !tracks[key]) return false;
    if (key === activeTrack && activeAudio && !activeAudio.paused) return true;
    const token = ++routeToken;
    const previous = activeAudio;
    const previousKey = activeTrack;
    if (bossLoopSession) cancelBossLoop({ keepActive: true });
    const continuity = previous ? continuityFor(previousKey, key) : null;
    const nextRecord = takePreloaded(key);
    const next = nextRecord.audio;

    for (const stale of [...audioPool]) {
      const record = recordFor(stale);
      if (stale !== previous && stale !== next && !record?.oneShot) discard(stale);
    }

    if (!(await ensureMetadata(nextRecord)) || token !== routeToken || nextRecord.disposed) {
      discard(next);
      return false;
    }

    if (continuity) {
      const previousDuration = definitionFor(previousKey).duration;
      const nextDuration = definitionFor(key).duration;
      const normalized = ((previous.currentTime % previousDuration) + previousDuration) % previousDuration / previousDuration;
      if (!(await seekTo(nextRecord, normalized * nextDuration)) || token !== routeToken) {
        discard(next);
        return false;
      }
      next.playbackRate = continuity.outgoingBpm / continuity.incomingBpm;
    } else {
      next.playbackRate = next.currentTime >= nextRecord.definition.loopStart
        ? loopBodyRateFor(nextRecord)
        : 1;
    }

    try {
      await next.play();
    } catch (error) {
      if (token === routeToken) armAutoplay();
      discard(next);
      return false;
    }
    if (token !== routeToken) {
      discard(next);
      return false;
    }

    activeTrack = key;
    activeAudio = next;
    playing = true;
    autoplayArmed = false;
    removeUnlockListeners();
    renderToggle();
    watchLoopBodyRate(nextRecord);
    startBossLoop(nextRecord, token);

    if (immediate || !previous) {
      // Coming out of silence is always gradual, even when the caller asked
      // for immediate: immediate means "no crossfade with the previous track",
      // and there is no previous track here — nothing to fade down, and
      // instant full volume is not speed, it is a click.
      // enabled in the condition is mandatory. Without it, muting in the
      // middle of the rise started a second animation on top of the first: the
      // fade pulled the volume down, the rise pushed it straight back up, and
      // which one won depended on whose frame landed last. You hear that as a
      // jerk in volume at the moment of muting.
      const valid = () => token === routeToken && activeAudio === next && enabled;
      setAudioMix(next, 0);
      fadeMix(next, 0, MASTER_VOLUME, RISE_MS, valid);
      discard(previous);
    } else if (continuity) {
      const valid = () => token === routeToken && activeAudio === next;
      fadeMix(next, 0, MASTER_VOLUME, ORDINARY_CROSSFADE_MS, valid);
      fadeMix(previous, audioMix(previous), 0, ORDINARY_CROSSFADE_MS, valid, () => discard(previous));
      if (continuity.outgoingBpm !== continuity.incomingBpm) {
        rampRate(
          nextRecord,
          continuity.outgoingBpm / continuity.incomingBpm,
          1,
          4 * 60 * 1000 / continuity.outgoingBpm,
          token
        );
      }
    } else {
      const valid = () => token === routeToken && activeAudio === next;
      fadeMix(next, 0, MASTER_VOLUME, fadeDuration, valid);
      fadeMix(previous, audioMix(previous), 0, fadeDuration, valid, () => discard(previous));
    }
    preloadSuccessor(key);
    return true;
  }

  async function playOneShot(key, token) {
    if (!enabled || token !== bossDefeatToken || !tracks[key]) return false;
    const record = makeAudio(key, { oneShot: true });
    if (!(await ensureMetadata(record)) || token !== bossDefeatToken || record.disposed) {
      discard(record.audio);
      return false;
    }
    setAudioMix(record.audio, MASTER_VOLUME);
    try {
      await record.audio.play();
    } catch (error) {
      discard(record.audio);
      return false;
    }
    if (token !== bossDefeatToken) {
      discard(record.audio);
      return false;
    }
    return true;
  }

  function cancelBossDefeat() {
    bossDefeatToken += 1;
    for (const timer of bossTimers) window.clearTimeout(timer);
    bossTimers.clear();
    for (const audio of [...audioPool]) {
      if (recordFor(audio)?.oneShot) discard(audio);
    }
  }

  function playBossDefeat(event) {
    const clearToken = String(event?.detail?.clearToken ?? "");
    if (clearToken && clearToken === lastBossClearToken) return;
    if (clearToken) lastBossClearToken = clearToken;
    cancelBossDefeat();
    const token = bossDefeatToken;
    if (!enabled) return;

    cancelBossLoop({ keepActive: true, preferLoudest: true });
    const outgoing = activeAudio;
    if (outgoing) {
      const valid = () => token === bossDefeatToken && audioPool.has(outgoing);
      fadeMix(outgoing, audioMix(outgoing), 0, victoryTimeline.timings.bossFadeMs, valid);
    }
    void playOneShot("boss:defeat-impact", token);
    const timer = window.setTimeout(() => {
      bossTimers.delete(timer);
      void playOneShot("boss:victory", token);
    }, victoryTimeline.timings.victoryMs);
    bossTimers.add(timer);
  }

  function halt({ preserveEnabled = false } = {}) {
    if (!preserveEnabled) enabled = false;
    playing = false;
    autoplayArmed = false;
    removeUnlockListeners();
    routeToken += 1;
    cancelBossDefeat();
    cancelBossLoop();
    for (const audio of [...audioPool]) discard(audio);
    activeAudio = null;
    activeTrack = null;
    preloaded = null;
    renderToggle();
  }

  function pauseRecordTiming(record) {
    if (!record) return;
    for (const frame of record.frames) window.cancelAnimationFrame?.(frame);
    record.frames.clear();
    for (const timer of record.timers) window.clearTimeout(timer);
    record.timers.clear();
  }

  let fadeOutsTotal = 0;

  function suspendForMute() {
    enabled = false;
    playing = false;
    autoplayArmed = false;
    removeUnlockListeners();
    cancelBossDefeat();
    if (bossLoopSession?.crossing && bossLoopSession.standby) {
      const outgoing = bossLoopSession.active;
      const incoming = bossLoopSession.standby;
      pauseRecordTiming(outgoing);
      pauseRecordTiming(incoming);
      discard(outgoing.audio);
      bossLoopSession.active = incoming;
      bossLoopSession.standby = null;
      bossLoopSession.crossing = false;
      activeAudio = incoming.audio;
      setAudioMix(incoming.audio, MASTER_VOLUME);
    }
    // Every mute gets its own number. If the player changes their mind and
    // turns the sound back on while a fade-out is still running, the old
    // fade-out is obliged to die — otherwise it will drive the volume to zero
    // on top of the new music.
    const myFadeOut = ++fadeOutsTotal;
    const stillFadingOut = () => myFadeOut === fadeOutsTotal && !enabled;

    for (const audio of audioPool) {
      const record = recordFor(audio);
      if (record?.oneShot) { discard(audio); continue; }
      const stop = () => {
        if (!stillFadingOut()) return;
        pauseRecordTiming(record);
        audio.pause();
      };
      const currentMix = audioMix(audio);
      if (currentMix <= 0 || !record || record.disposed) { stop(); continue; }
      fadeMix(audio, currentMix, 0, FALL_MS, stillFadingOut, stop);
      // A safety net. fadeMix lives on requestAnimationFrame, and that does not
      // run in a hidden tab: minimise the window halfway through the fade and
      // the music kept playing with the sound switched off. The timer sees the
      // job through.
      setTimeout(stop, FALL_MS + 120);
    }
    renderToggle();
  }

  async function resumeFromMute() {
    const key = trackForGame();
    if (activeTrack !== key || !activeAudio || !audioPool.has(activeAudio)) return switchTo(key, true);
    const record = recordFor(activeAudio);
    if (!record || record.disposed || !(await ensureMetadata(record))) return switchTo(key, true);
    try {
      await activeAudio.play();
    } catch (error) {
      armAutoplay();
      return false;
    }
    // Carry on from whatever volume the unmute caught: if the player changed
    // their mind halfway through a fade-out, the music does not start from
    // zero a second time.
    const fromMix = audioMix(activeAudio);
    const returnToken = ++fadeOutsTotal;
    fadeMix(activeAudio, fromMix, MASTER_VOLUME, RISE_MS,
      () => returnToken === fadeOutsTotal && enabled);
    playing = true;
    autoplayArmed = false;
    removeUnlockListeners();
    watchLoopBodyRate(record);
    if (bossLoopSession && validBossSession(bossLoopSession)) {
      if (bossLoopSession.standby) scheduleBossBoundary(bossLoopSession);
      else void prepareBossStandby(bossLoopSession);
    }
    renderToggle();
    return true;
  }

  async function setEnabled(value) {
    const requested = Boolean(value);
    if (!requested) {
      suspendForMute();
      return false;
    }
    enabled = true;
    renderToggle();
    return resumeFromMute();
  }

  function renderToggle() {
    toggle.setAttribute("aria-pressed", String(enabled));
    toggle.innerHTML = `<span aria-hidden="true">${enabled ? "♫" : "♪"}</span> Music: ${enabled ? "On" : "Off"}`;
    toggle.title = !enabled
      ? "Turn on the Forest soundtrack"
      : autoplayArmed
        ? "Music is enabled and will start after your next interaction"
        : "Mute the Forest soundtrack";
  }

  function syncStage() {
    const stage = gameStage();
    if (stage !== lastGameStage) {
      lastGameStage = stage;
      if (bosses.has(stage)) bossPhase[stage] = 1;
    }
    if (enabled) void switchTo(trackForGame());
  }

  function bossLoopDebugSnapshot() {
    if (!localAudioDebug || !bossLoopSession) return null;
    const session = bossLoopSession;
    return {
      key: session.key,
      overlapMs: session.overlapMs,
      crossing: session.crossing,
      activeTime: session.active.audio.currentTime,
      activeEnd: contentEnd(session.active),
      activeRate: session.active.audio.playbackRate,
      activeMix: audioMix(session.active.audio),
      activeFormat: selectedFormat(session.active),
      standbyTime: session.standby?.audio.currentTime ?? null,
      standbyPaused: session.standby?.audio.paused ?? null,
      standbyMix: session.standby ? audioMix(session.standby.audio) : null,
      standbyFormat: session.standby ? selectedFormat(session.standby) : null,
      loopStart: session.active.definition.loopStart,
    };
  }

  async function debugSeekBossBoundary(leadSeconds = 0.06) {
    if (!localAudioDebug || !validBossSession(bossLoopSession) || !bossLoopSession.standby) return false;
    const session = bossLoopSession;
    const target = Math.max(
      session.active.definition.loopStart,
      contentEnd(session.active) - session.overlapMs / 1000 - Math.max(0.02, Number(leadSeconds) || 0.06)
    );
    if (!(await seekTo(session.active, target)) || !validBossSession(session)) return false;
    session.active.audio.playbackRate = loopBodyRateFor(session.active);
    scheduleBossBoundary(session);
    return true;
  }

  if (roomText) {
    new MutationObserver(syncStage).observe(roomText, {
      attributes: true,
      attributeFilter: ["data-soundtrack-stage"],
      childList: true,
      characterData: true,
      subtree: true,
    });
  }
  window.addEventListener("loothood:bossseedplan", (event) => {
    const encounterOrder = Array.isArray(event.detail?.encounterOrder) ? event.detail.encounterOrder : [];
    const slots = Array.isArray(event.detail?.soundtrackSlots) ? event.detail.soundtrackSlots : [];
    const first = soundtrackSlotFor(slots[0], encounterOrder[0]);
    const second = soundtrackSlotFor(slots[1], encounterOrder[1]);
    if (first) bossTrackSlot[5] = first;
    if (second) bossTrackSlot[10] = second;
    finalPairKey = pairKeyForIds(event.detail?.seedIds || encounterOrder);
    if (activeTrack) preloadSuccessor(activeTrack);
    syncStage();
  });
  window.addEventListener("loothood:bossphase", (event) => {
    const stage = Number(event.detail?.stage);
    const phase = Number(event.detail?.phase);
    if (!bosses.has(stage) || !Number.isFinite(phase)) return;
    if (stage === 5 || stage === 10) {
      const slot = soundtrackSlotFor(event.detail?.soundtrackSlot, event.detail?.seedId);
      if (slot) bossTrackSlot[stage] = slot;
    }
    if (stage === 15 && Array.isArray(event.detail?.seedIds)) finalPairKey = pairKeyForIds(event.detail.seedIds);
    bossPhase[stage] = Math.max(1, Math.min(stage === 15 ? 3 : 2, phase));
    syncStage();
  });
  window.addEventListener("loothood:bossdefeated", playBossDefeat);
  window.addEventListener("loothood:account-state", syncStage);
  window.addEventListener("pagehide", () => halt({ preserveEnabled: true }));
  window.addEventListener("pageshow", () => {
    if (enabled) void switchTo(trackForGame(), true);
  });

  renderToggle();
  window.LoothoodSampledMusic = true;
  window.LoothoodMusic = {
    get durationSeconds() { return definitionFor(trackForGame()).duration; },
    get playing() { return playing; },
    get enabled() { return enabled; },
    get autoplayArmed() { return autoplayArmed; },
    get stageTheme() { return trackForGame(); },
    // Credit line of the playing track — the button on the login screen shows
    // it. It used to be the hardcoded string "Greenwood Suite", which was
    // already lying whenever a different track was playing.
    get trackTitle() { return definitionFor(trackForGame()).title || ""; },
    get trackCredit() { return definitionFor(trackForGame()).credit || ""; },
    get finalPair() { return finalPairKey; },
    get format() { return preferredExtension; },
    get masterVolume() { return masterVolumeScalar; },
    get manifest() { return manifest; },
    start: () => setEnabled(true),
    stop: () => setEnabled(false),
    setEnabled,
    setMasterVolume,
    playBossDefeat,
  };
  if (localAudioDebug) {
    window.LoothoodMusic.debugBossLoop = bossLoopDebugSnapshot;
    window.LoothoodMusic.debugSeekBossBoundary = debugSeekBossBoundary;
    window.LoothoodMusic.debugSwitchBossRoute = (key) => (
      isBossLoopKey(key) ? switchTo(key, true) : Promise.resolve(false)
    );
  }
  if (enabled) void switchTo(trackForGame(), true);
})();
