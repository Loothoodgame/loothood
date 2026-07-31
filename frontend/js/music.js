(function () {
  "use strict";

  const toggle = document.getElementById("musicToggle");
  const preview = document.getElementById("musicPreview");
  if (!toggle) return;
  if (window.LoothoodSampledMusic) return;

  let AudioContextClass = null;
  try {
    AudioContextClass = window.AudioContext || window.webkitAudioContext || null;
  } catch (error) {
    // Some embedded or privacy-restricted browsers block audio constructors.
  }
  const score = window.LoothoodScore;
  if (!score) {
    toggle.textContent = "Music score unavailable";
    toggle.disabled = true;
    return;
  }

  const BPM = score.bpm;
  const STEPS_PER_BEAT = score.stepsPerBeat;
  const STEP_SECONDS = 60 / BPM / STEPS_PER_BEAT;
  const STEPS_PER_BAR = score.stepsPerBar;
  const STEPS_PER_SECTION = score.stepsPerSection;
  const TOTAL_STEPS = score.totalSteps;
  const LOOKAHEAD_MS = 50;
  const SCHEDULE_AHEAD_SECONDS = 0.24;
  const themes = score.themes;

  let audio = null;
  let master = null;
  let dryBus = null;
  let reverbBus = null;
  let noiseBuffer = null;
  let timer = null;
  let nextStepTime = 0;
  let stepIndex = 0;
  let playing = false;
  let activeSoundtrack = { id: "village", stage: 0, lift: 0 };
  let activeThemeStartStep = 0;
  let previewStage = null;
  let masterVolumeScalar = 1;

  function setMasterVolume(value) {
    masterVolumeScalar = Math.max(0, Math.min(1, Number(value) || 0));
    if (!master || !audio) return;
    master.gain.cancelScheduledValues(audio.currentTime);
    master.gain.setValueAtTime(0.46 * masterVolumeScalar, audio.currentTime);
  }

  function midiToHz(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function createAudioGraph() {
    audio = new AudioContextClass();
    master = audio.createGain();
    master.gain.value = 0.46 * masterVolumeScalar;

    const compressor = audio.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.018;
    compressor.release.value = 0.22;

    dryBus = audio.createGain();
    reverbBus = audio.createGain();
    reverbBus.gain.value = 0.14;

    const reverb = audio.createConvolver();
    reverb.buffer = makeImpulse(1.35, 2.8);
    dryBus.connect(compressor);
    reverbBus.connect(reverb);
    reverb.connect(compressor);
    compressor.connect(master);
    master.connect(audio.destination);

    noiseBuffer = makeNoiseBuffer(0.24);
  }

  function makeImpulse(duration, decay) {
    const length = Math.floor(audio.sampleRate * duration);
    const buffer = audio.createBuffer(2, length, audio.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  function makeNoiseBuffer(duration) {
    const length = Math.floor(audio.sampleRate * duration);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function route(node, reverbAmount) {
    node.connect(dryBus);
    if (reverbAmount > 0) {
      const send = audio.createGain();
      send.gain.value = reverbAmount;
      node.connect(send);
      send.connect(reverbBus);
    }
  }

  function pluck(note, time, volume, duration, tone = "triangle") {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    oscillator.type = tone;
    oscillator.frequency.setValueAtTime(midiToHz(note), time);
    oscillator.detune.setValueAtTime(0, time);
    filter.type = "lowpass";
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(1900, time);
    filter.frequency.exponentialRampToValueAtTime(620, time + duration);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(filter);
    filter.connect(gain);
    route(gain, 0.16);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.04);
  }

  function bowed(note, time, volume, duration) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    oscillator.type = "triangle";
    oscillator.frequency.value = midiToHz(note);
    filter.type = "lowpass";
    filter.frequency.value = 920;
    filter.Q.value = 0.55;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.18);
    gain.gain.setValueAtTime(volume * 0.76, time + Math.max(0.2, duration - 0.18));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(filter);
    filter.connect(gain);
    route(gain, 0.34);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.05);
  }

  function drum(time, volume, high = false) {
    const gain = audio.createGain();
    if (high) {
      const source = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      source.buffer = noiseBuffer;
      filter.type = "highpass";
      filter.frequency.value = 5200;
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.038);
      source.connect(filter);
      filter.connect(gain);
      route(gain, 0.025);
      source.start(time);
      source.stop(time + 0.05);
      return;
    }

    const oscillator = audio.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(105, time);
    oscillator.frequency.exponentialRampToValueAtTime(58, time + 0.12);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    oscillator.connect(gain);
    route(gain, 0.06);
    oscillator.start(time);
    oscillator.stop(time + 0.18);
  }

  function bass(note, time, volume, duration = 0.28) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(midiToHz(note), time);
    filter.type = "lowpass";
    filter.frequency.value = 330;
    filter.Q.value = 0.6;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(filter);
    filter.connect(gain);
    route(gain, 0.04);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.03);
  }

  function lead(note, time, volume, duration = 0.42, tone = "sine") {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    oscillator.type = tone;
    oscillator.frequency.setValueAtTime(midiToHz(note), time);
    filter.type = "lowpass";
    filter.frequency.value = tone === "sine" ? 2100 : 1450;
    filter.Q.value = 0.45;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.028);
    gain.gain.setValueAtTime(volume * 0.82, time + Math.max(0.04, duration - 0.1));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(filter);
    filter.connect(gain);
    route(gain, 0.24);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.03);
  }

  function ironBell(note, time, volume, duration = 1.15) {
    const fundamental = audio.createOscillator();
    const overtone = audio.createOscillator();
    const fundamentalGain = audio.createGain();
    const overtoneGain = audio.createGain();
    fundamental.type = "sine";
    overtone.type = "sine";
    fundamental.frequency.setValueAtTime(midiToHz(note), time);
    overtone.frequency.setValueAtTime(midiToHz(note) * 2.76, time);
    fundamentalGain.gain.setValueAtTime(0.0001, time);
    fundamentalGain.gain.exponentialRampToValueAtTime(volume, time + 0.006);
    fundamentalGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    overtoneGain.gain.setValueAtTime(0.0001, time);
    overtoneGain.gain.exponentialRampToValueAtTime(volume * 0.26, time + 0.004);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.62);
    fundamental.connect(fundamentalGain);
    overtone.connect(overtoneGain);
    route(fundamentalGain, 0.48);
    route(overtoneGain, 0.36);
    fundamental.start(time);
    overtone.start(time);
    fundamental.stop(time + duration + 0.04);
    overtone.stop(time + duration * 0.62 + 0.04);
  }

  function currentStage() {
    if (previewStage !== null) return previewStage;
    if (document.body.dataset.view !== "run") return 0;
    const roomText = document.getElementById("roomText")?.textContent || "";
    const stage = Number.parseInt(roomText, 10);
    return Number.isFinite(stage) ? Math.max(0, Math.min(15, stage)) : 0;
  }

  function soundtrackForStage(stage = currentStage()) {
    return score.soundtrackForStage(stage);
  }

  function sectionHarmony(theme, sectionIndex) {
    const [root, chord] = theme.harmony[sectionIndex % theme.harmony.length];
    return { root, chord };
  }

  const FRAME_DRUM_SIGNATURE = score.frameDrumSignature;
  const FRAME_DRUM_LAYERS = score.frameDrumLayers;

  function scheduleFrameDrums(localStep, time, layer, featured = false) {
    const pattern = featured ? FRAME_DRUM_SIGNATURE : FRAME_DRUM_LAYERS[Math.max(0, Math.min(3, layer))];
    if (pattern.includes(localStep)) {
      const downbeat = localStep === 0 || localStep === 8;
      drum(time, featured ? (downbeat ? 0.13 : 0.09) : (downbeat ? 0.1 : 0.062));
    }
    if ((featured || layer >= 2) && [2, 6, 10, 14].includes(localStep)) {
      drum(time, featured ? 0.019 : 0.012, true);
    }
  }

  function scheduleJourney(theme, root, chord, melodyNote, localStep, lift, time, soundtrackId) {
    if (localStep % 2 === 0) {
      const chordTone = chord[[0, 2, 1, 2][Math.floor(localStep / 2) % 4]];
      const accent = localStep % 8 === 0;
      pluck(root + 12 + chordTone, time, accent ? 0.038 : 0.025, accent ? 0.3 : 0.24);
    }

    if (localStep % 8 === 0) bowed(root, time, 0.021, STEP_SECONDS * 7.45);
    if (melodyNote !== null) {
      lead(melodyNote, time, soundtrackId === "village" ? 0.026 : 0.034, localStep % 2 === 0 ? 0.44 : 0.3);
    }

    if (soundtrackId !== "village") {
      const percussionLayer = soundtrackId === "greenwood" ? lift : 3;
      scheduleFrameDrums(localStep, time, percussionLayer);
      const bassEveryBeat = theme.urgency >= 2 || lift >= 2;
      if (localStep % 8 === 0 || (bassEveryBeat && localStep % 4 === 0)) {
        bass(root - 12, time, localStep % 8 === 0 ? 0.05 : 0.032);
      }
    }

    const counterNote = theme.counter?.[localStep];
    const counterUnlocked = soundtrackId === "brambleRise" ? lift >= 1 : theme.urgency >= 2 || lift >= 2;
    if (counterUnlocked && counterNote !== null && counterNote !== undefined) {
      lead(counterNote, time, 0.017, 0.26, "triangle");
    }
    if (theme.urgency >= 2 && lift >= 1 && localStep % 4 === 0) {
      const pulseNote = root + 24 + chord[(localStep / 4) % chord.length];
      pluck(pulseNote, time + STEP_SECONDS, 0.012, 0.12, "triangle");
    }
  }

  function scheduleWardenBoss(theme, root, melodyNote, localStep, time) {
    // Stage 5 removes the journey layers and promotes the learned frame-drum
    // signature to the foreground. Notes answer the rhythm instead of leading it.
    scheduleFrameDrums(localStep, time, 3, true);
    if (localStep === 0 || localStep === 8) {
      bowed(root, time, 0.025, STEP_SECONDS * 7.3);
      bass(root - 12, time, 0.052, 0.42);
      pluck(root + 19, time, 0.022, 0.22);
    }
    if (melodyNote !== null) lead(melodyNote, time, 0.031, 0.24, "triangle");
  }

  function scheduleSheriffBoss(theme, root, melodyNote, localStep, time) {
    // Stage 10 moves into half-time: a low descending call, an iron-bell answer,
    // and a quiet D/C-sharp tension. Silence is part of the threat.
    if (localStep === 0 || localStep === 8) {
      bowed(root, time, 0.029, STEP_SECONDS * 7.45);
      bowed(49, time, 0.008, STEP_SECONDS * 7.2);
      bass(root - 12, time, 0.052, 0.5);
      drum(time, 0.085);
    }
    if (melodyNote !== null) bowed(melodyNote, time, 0.036, 0.82);
    const answerNote = theme.counter?.[localStep];
    if (answerNote !== null && answerNote !== undefined) {
      ironBell(answerNote, time, 0.032, 1.18);
    }
  }

  function scheduleFinalBoss(theme, root, melodyNote, localStep, time) {
    // The finale combines the Warden rhythm with the Sheriff call-and-response,
    // keeping both identities legible instead of restoring every journey layer.
    scheduleFrameDrums(localStep, time, 3, true);
    if (localStep === 0 || localStep === 8) {
      bowed(root, time, 0.03, STEP_SECONDS * 7.3);
      bass(root - 12, time, 0.052, 0.4);
    }
    if (melodyNote !== null) lead(melodyNote, time, 0.034, 0.25, "triangle");
    const sheriffCall = theme.sheriffCall?.[localStep];
    if (sheriffCall !== null && sheriffCall !== undefined) {
      bowed(sheriffCall, time, 0.027, 0.66);
    }
    const sheriffBell = theme.sheriffBell?.[localStep];
    if (sheriffBell !== null && sheriffBell !== undefined) {
      ironBell(sheriffBell, time, 0.021, 0.92);
    }
  }

  function scheduleStep(index, time) {
    if (index % STEPS_PER_BAR === 0) {
      const requested = soundtrackForStage();
      if (requested.id !== activeSoundtrack.id) activeThemeStartStep = index;
      activeSoundtrack = requested;
    }

    const themeElapsed = index - activeThemeStartStep;
    const sectionIndex = Math.floor(themeElapsed / STEPS_PER_SECTION);
    const localStep = themeElapsed % STEPS_PER_SECTION;
    const theme = themes[activeSoundtrack.id];
    const { root, chord } = sectionHarmony(theme, sectionIndex);
    const melodyNote = theme.melody[localStep];
    const lift = activeSoundtrack.lift;

    if (theme.identity === "percussion") {
      scheduleWardenBoss(theme, root, melodyNote, localStep, time);
    } else if (theme.identity === "counterpoint") {
      scheduleSheriffBoss(theme, root, melodyNote, localStep, time);
    } else if (theme.identity === "convergence") {
      scheduleFinalBoss(theme, root, melodyNote, localStep, time);
    } else {
      scheduleJourney(theme, root, chord, melodyNote, localStep, lift, time, activeSoundtrack.id);
    }
  }

  function scheduler() {
    while (nextStepTime < audio.currentTime + SCHEDULE_AHEAD_SECONDS) {
      scheduleStep(stepIndex, nextStepTime);
      nextStepTime += STEP_SECONDS;
      stepIndex += 1;
    }
  }

  async function start() {
    if (!AudioContextClass) {
      toggle.textContent = "Music unavailable";
      toggle.disabled = true;
      return;
    }
    if (!audio) createAudioGraph();
    await audio.resume();
    playing = true;
    stepIndex = 0;
    activeSoundtrack = soundtrackForStage();
    activeThemeStartStep = 0;
    nextStepTime = audio.currentTime + 0.08;
    master.gain.cancelScheduledValues(audio.currentTime);
    master.gain.setValueAtTime(0.0001, audio.currentTime);
    if (masterVolumeScalar > 0) master.gain.exponentialRampToValueAtTime(0.46 * masterVolumeScalar, audio.currentTime + 0.7);
    else master.gain.setValueAtTime(0, audio.currentTime);
    timer = window.setInterval(scheduler, LOOKAHEAD_MS);
    scheduler();
    renderToggle();
  }

  function stop() {
    if (!audio || !playing) return;
    playing = false;
    window.clearInterval(timer);
    timer = null;
    master.gain.cancelScheduledValues(audio.currentTime);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), audio.currentTime);
    master.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.35);
    window.setTimeout(() => {
      if (!playing && audio?.state === "running") audio.suspend();
    }, 420);
    renderToggle();
  }

  function renderToggle() {
    toggle.setAttribute("aria-pressed", String(playing));
    toggle.innerHTML = `<span aria-hidden="true">${playing ? "♫" : "♪"}</span> Music: ${playing ? "On" : "Off"}`;
    toggle.title = playing ? "Pause the original forest score" : "Play the original forest score";
  }

  toggle.addEventListener("click", () => {
    if (playing) stop();
    else start();
  });

  preview?.addEventListener("change", () => {
    previewStage = preview.value === "follow" ? null : Number(preview.value);
    preview.title = playing ? "Selection changes on the next musical bar" : "Choose a section, then turn music on";
  });

  window.addEventListener("pagehide", stop);
  window.LoothoodMusic = {
    get durationSeconds() { return TOTAL_STEPS * STEP_SECONDS; },
    get playing() { return playing; },
    get stageTheme() { return soundtrackForStage().id; },
    get masterVolume() { return masterVolumeScalar; },
    start,
    stop,
    setMasterVolume,
  };
})();
