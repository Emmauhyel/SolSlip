/**
 * SolSlip — js/effects.js
 * -----------------------------------------------------------------------
 * Sensory feedback for the "print" moment: a synthesized thermal-printer
 * chatter sound (Web Audio, no external audio file) plus a phone haptic
 * buzz pattern where supported. Mute preference persists in localStorage.
 *
 * Connects to:
 *   - js/app.js  calls playPrintSequence() right when a slip is printed,
 *                and wires the mute toggle button in the header.
 * -----------------------------------------------------------------------
 */

(function () {
  "use strict";

  const STORAGE_KEY = "solslip:muted";
  let audioCtx = null;
  let muted = localStorage.getItem(STORAGE_KEY) === "1";

  /** Lazily creates the AudioContext on first user gesture (autoplay policy). */
  function getAudioContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  /**
   * One short "stepper motor" tick: a filtered noise burst + a quick
   * square-wave click, mimicking a thermal printer head firing a line.
   */
  function playTick(ctx, time, gainValue = 0.05) {
    // Noise burst
    const bufferSize = ctx.sampleRate * 0.02;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2200 + Math.random() * 800;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(time);
    noise.stop(time + 0.03);

    // Low click underneath for body/weight
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 140 + Math.random() * 40;
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(gainValue * 0.6, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
    osc.connect(oscGain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.02);
  }

  /** A short rising "ready" chime once the slip finishes printing. */
  function playChime(ctx, time) {
    [660, 880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = time + i * 0.06;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.06, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }

  /**
   * Plays a ~600ms "printer feeding paper" sequence: a burst of ticks
   * followed by a soft chime, synced with the receipt-drop CSS animation.
   */
  function playPrintSound() {
    if (muted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const tickCount = 14;
    for (let i = 0; i < tickCount; i++) {
      playTick(ctx, now + i * 0.032, 0.045 + Math.random() * 0.02);
    }
    playChime(ctx, now + tickCount * 0.032 + 0.05);
  }

  /** Fires a short vibration pattern on devices that support it (mobile). */
  function triggerHaptic() {
    if (muted) return;
    if (navigator.vibrate) {
      navigator.vibrate([12, 18, 12, 18, 12, 18, 30]);
    }
  }

  /** Combined feedback called at the moment a slip is printed. */
  function playPrintSequence() {
    playPrintSound();
    triggerHaptic();
  }

  function isMuted() {
    return muted;
  }

  function setMuted(next) {
    muted = next;
    localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  }

  function toggleMuted() {
    setMuted(!muted);
    return muted;
  }

  window.SolSlipEffects = {
    playPrintSequence,
    isMuted,
    toggleMuted,
  };
})();
