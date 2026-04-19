// ── Procedural Web Audio sound engine for Mall Horror ─────────────────────────
// All sounds synthesized — no file loading required.
// Two independent gain chains: SFX and Music.

const STORAGE_KEY_SFX   = "mh_sfx_vol";
const STORAGE_KEY_MUSIC = "mh_music_vol";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null; // headroom limiter (fixed)
let sfxGain:    GainNode | null = null; // user-controlled SFX volume
let bgGain:     GainNode | null = null; // user-controlled Music volume

// Module-level volume state (0-1)
let _sfxVol   = 1.0;
let _musicVol = 1.0;

function loadPrefs() {
  if (typeof localStorage === "undefined") return;
  const sv = localStorage.getItem(STORAGE_KEY_SFX);
  const mv = localStorage.getItem(STORAGE_KEY_MUSIC);
  if (sv !== null) _sfxVol   = parseFloat(sv);
  if (mv !== null) _musicVol = parseFloat(mv);
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      loadPrefs();
      ctx        = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.7, ctx.currentTime); // fixed headroom
      masterGain.connect(ctx.destination);

      sfxGain = ctx.createGain();
      sfxGain.gain.setValueAtTime(_sfxVol, ctx.currentTime);
      sfxGain.connect(masterGain);

      bgGain = ctx.createGain();
      bgGain.gain.setValueAtTime(_musicVol * 0.55, ctx.currentTime);
      bgGain.connect(masterGain);
    } catch { return null; }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function sfx(): GainNode | null { getCtx(); return sfxGain; }

// ─── Volume control API ───────────────────────────────────────────────────────

export function getMusicVolume(): number { return _musicVol; }
export function getSfxVolume():   number { return _sfxVol; }

export function setMusicVolume(vol: number) {
  _musicVol = Math.max(0, Math.min(1, vol));
  if (bgGain && ctx) bgGain.gain.setValueAtTime(_musicVol * 0.18, ctx.currentTime);
  try { localStorage.setItem(STORAGE_KEY_MUSIC, String(_musicVol)); } catch {}
}

export function setSfxVolume(vol: number) {
  _sfxVol = Math.max(0, Math.min(1, vol));
  if (sfxGain && ctx) sfxGain.gain.setValueAtTime(_sfxVol, ctx.currentTime);
  try { localStorage.setItem(STORAGE_KEY_SFX, String(_sfxVol)); } catch {}
}

// ─── Shoot (sci-fi laser) ─────────────────────────────────────────────────────
let lastShootTime = 0;

export function playShoot(isBazooka = false, isBerserking = false) {
  const ac  = getCtx();
  const dst = sfx();
  if (!ac || !dst) return;

  const now = ac.currentTime;
  if (now - lastShootTime < 0.04) return;
  lastShootTime = now;

  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.connect(g);
  g.connect(dst);

  if (isBazooka) {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.18);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.start(now); osc.stop(now + 0.22);
  } else {
    osc.type = "sawtooth";
    const baseFreq = isBerserking ? 1600 : 960;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.075);
    g.gain.setValueAtTime(0.13, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.start(now); osc.stop(now + 0.1);
  }
}

// ─── Electric zap (lightning / elite enemy) ───────────────────────────────────
let lastZapTime = 0;

export function playZap() {
  const ac  = getCtx();
  const dst = sfx();
  if (!ac || !dst) return;

  const now = ac.currentTime;
  if (now - lastZapTime < 0.1) return;
  lastZapTime = now;

  const bufLen = Math.floor(ac.sampleRate * 0.16);
  const buf    = ac.createBuffer(1, bufLen, ac.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const noise = ac.createBufferSource();
  noise.buffer = buf;

  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1800, now);
  bp.frequency.exponentialRampToValueAtTime(300, now + 0.06);
  bp.frequency.exponentialRampToValueAtTime(2200, now + 0.12);
  bp.Q.value = 4;

  const osc = ac.createOscillator();
  const og  = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(3200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.14);
  og.gain.setValueAtTime(0.06, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  osc.connect(og); og.connect(dst);
  osc.start(now); osc.stop(now + 0.15);

  const g = ac.createGain();
  g.gain.setValueAtTime(0.28, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  noise.connect(bp); bp.connect(g); g.connect(dst);
  noise.start(now); noise.stop(now + 0.16);
}

// ─── Berserker start (horror arcade sting) ────────────────────────────────────
export function playBerserkerStart() {
  const ac  = getCtx();
  const dst = sfx();
  if (!ac || !dst) return;

  const now = ac.currentTime;
  const notes = [110, 138, 165, 220];
  notes.forEach((freq, i) => {
    const t   = now + i * 0.055;
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.connect(g); g.connect(dst);
    osc.start(t); osc.stop(t + 0.14);
  });

  const sub = ac.createOscillator();
  const sg  = ac.createGain();
  sub.type = "sine";
  sub.frequency.setValueAtTime(55, now);
  sg.gain.setValueAtTime(0.25, now);
  sg.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  sub.connect(sg); sg.connect(dst);
  sub.start(now); sub.stop(now + 0.36);
}

// ─── Battery low warning ──────────────────────────────────────────────────────
let lastBatteryBeep = 0;

export function playBatteryLow() {
  const ac  = getCtx();
  const dst = sfx();
  if (!ac || !dst) return;

  const now = ac.currentTime;
  if (now - lastBatteryBeep < 2.5) return;
  lastBatteryBeep = now;

  [0, 0.22].forEach((offset) => {
    const t   = now + offset;
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.setValueAtTime(440, t + 0.09);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g); g.connect(dst);
    osc.start(t); osc.stop(t + 0.19);
  });
}

// ─── Player hit (heavy thud) ──────────────────────────────────────────────────
let lastHitSnd = 0;

export function playHit() {
  const ac  = getCtx();
  const dst = sfx();
  if (!ac || !dst) return;

  const now = ac.currentTime;
  if (now - lastHitSnd < 0.12) return;
  lastHitSnd = now;

  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
  g.gain.setValueAtTime(0.28, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(g); g.connect(dst);
  osc.start(now); osc.stop(now + 0.16);
}

// ─── Background: "Corrupted Mall-Gaze" synthesizer ────────────────────────────
// OSC1 (sawtooth) + OSC2 (square, +7¢ sharp) → HPF 400Hz → LPF 3.5kHz →
// 10-bit bitcrusher → 5-second convolution reverb (100% wet) → bgGain
// Continuous pitch-warp LFO at 1.2Hz ±40¢ (cassette-tape flutter)

let bgPlaying      = false;
let droneOsc:     OscillatorNode | null = null;
let bgPitchLFO:   OscillatorNode | null = null;
let bgPitchLFOGain: GainNode    | null = null;
let bgReverb:     ConvolverNode | null = null;
let bgBitcrush:   WaveShaperNode | null = null;
let bgTimer:      ReturnType<typeof setTimeout> | null = null;

// A-minor flavour, above HPF cutoff so fundamentals + harmonics pass through
const LEAD_FREQS = [110, 123, 138, 147, 165, 185, 220, 247];

// ── Synthetic impulse response: exponential noise decay (empty concrete hall) ─
function buildReverbIR(ac: AudioContext, decayS: number): ConvolverNode {
  const conv   = ac.createConvolver();
  const length = Math.floor(ac.sampleRate * decayS);
  const ir     = ac.createBuffer(2, length, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      // Early reflections (first 80ms) are slightly louder
      const t    = i / ac.sampleRate;
      const early = t < 0.08 ? 1.4 : 1.0;
      d[i] = (Math.random() * 2 - 1) * early * Math.exp(-t * (1.0 / decayS) * 3.5);
    }
  }
  conv.buffer = ir;
  return conv;
}

// ── 10-bit waveshaper bitcrusher curve (quantizes to 2^bits levels) ──────────
function buildBitcrusherCurve(bits: number): Float32Array {
  const size  = 65536;
  const curve = new Float32Array(size);
  const step  = Math.pow(2, bits - 1); // levels per side
  for (let i = 0; i < size; i++) {
    const x   = (i - size / 2) / (size / 2); // -1..+1
    curve[i]  = Math.round(x * step) / step;
  }
  return curve;
}

// ── Per-note "Corrupted Mall-Gaze" voice ─────────────────────────────────────
function scheduleNote() {
  const ac = getCtx();
  if (!ac || !bgPlaying || !bgGain || !bgReverb || !bgBitcrush) return;

  const now  = ac.currentTime;
  const freq = LEAD_FREQS[Math.floor(Math.random() * LEAD_FREQS.length)];

  // OSC 1 — Sawtooth (PWM simulated via tiny detune + LFO)
  const osc1 = ac.createOscillator();
  osc1.type  = "sawtooth";
  osc1.frequency.setValueAtTime(freq, now);

  // OSC 2 — Square, +7 cents sharp → "sickly" phasing against OSC 1
  const osc2 = ac.createOscillator();
  osc2.type  = "square";
  osc2.frequency.setValueAtTime(freq, now);
  osc2.detune.setValueAtTime(7, now);

  // Connect continuous pitch LFO (1.2Hz ±40¢) to both oscillator detune params
  if (bgPitchLFOGain) {
    bgPitchLFOGain.connect(osc1.detune);
    bgPitchLFOGain.connect(osc2.detune);
  }

  // Mix both oscillators (equal weight)
  const mix = ac.createGain();
  mix.gain.setValueAtTime(0.45, now);
  osc1.connect(mix);
  osc2.connect(mix);

  // HPF @ 400Hz — thins the sound, removes fundamental warmth
  const hpf     = ac.createBiquadFilter();
  hpf.type      = "highpass";
  hpf.frequency.setValueAtTime(400, now);
  hpf.Q.value   = 0.8;

  // LPF @ 3500Hz — soft hi-roll-off (removes harsh digital edge)
  const lpf     = ac.createBiquadFilter();
  lpf.type      = "lowpass";
  lpf.frequency.setValueAtTime(3500, now);
  lpf.Q.value   = 0.5;

  // ADSR envelope (per note)
  // Attack 100ms → Decay 2s → Sustain 50% → Release 1.5s
  const peak    = 0.08;
  const sustain = peak * 0.5;
  const env     = ac.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(peak, now + 0.1);                        // Attack
  env.gain.setTargetAtTime(sustain, now + 0.1, 2.0 / 3.0);                 // Decay (tau ≈ 2/3s)

  const noteDur     = 5.5 + Math.random() * 3;
  const releaseStart = now + noteDur;
  env.gain.setTargetAtTime(0.0001, releaseStart, 1.5 / 3.0);               // Release (tau ≈ 0.5s)

  // Signal chain: mix → HPF → LPF → env → bitcrusher (shared) → reverb (shared) → bgGain
  mix.connect(hpf);
  hpf.connect(lpf);
  lpf.connect(env);
  env.connect(bgBitcrush);   // shared bitcrusher input

  const totalDur = noteDur + 4.0;  // note + release tail + reverb decay
  osc1.start(now); osc1.stop(now + totalDur);
  osc2.start(now); osc2.stop(now + totalDur);

  // Next note spacing: 3.5–6.5s — overlapping ADSR tails blur into reverb fog
  bgTimer = setTimeout(scheduleNote, (3.5 + Math.random() * 3.0) * 1000);
}

export function startBgMusic() {
  if (bgPlaying) return;
  const ac = getCtx();
  if (!ac || !bgGain) return;

  bgPlaying = true;
  bgGain.gain.setValueAtTime(_musicVol * 0.18, ac.currentTime);

  // ── Build shared effects chain (created once per session) ──────────────────

  // 10-bit bitcrusher (lofi pixel aesthetic, simulates 22kHz/10-bit recording)
  bgBitcrush = ac.createWaveShaper();
  bgBitcrush.curve       = buildBitcrusherCurve(10);
  bgBitcrush.oversample  = "4x"; // anti-alias before quantization

  // 5-second reverb (100% wet — massive empty concrete hall)
  bgReverb = buildReverbIR(ac, 5.0);

  // Dry path: none — 100% wet
  bgBitcrush.connect(bgReverb);
  bgReverb.connect(bgGain);

  // ── Continuous pitch warp LFO: 1.2Hz ±40¢ (warping cassette tape) ──────────
  bgPitchLFO     = ac.createOscillator();
  bgPitchLFOGain = ac.createGain();
  bgPitchLFO.type = "sine";
  // Slightly irregular rate: start at 1.2Hz, drift gently
  bgPitchLFO.frequency.setValueAtTime(1.2, ac.currentTime);
  bgPitchLFO.frequency.linearRampToValueAtTime(0.9, ac.currentTime + 8);
  bgPitchLFO.frequency.linearRampToValueAtTime(1.4, ac.currentTime + 18);
  bgPitchLFOGain.gain.setValueAtTime(40, ac.currentTime); // ±40 cents
  bgPitchLFO.connect(bgPitchLFOGain);
  // bgPitchLFOGain is connected to each note's osc.detune inside scheduleNote
  bgPitchLFO.start();

  // ── Sub-bass drone: A0 sine rumble beneath the lead ────────────────────────
  droneOsc      = ac.createOscillator();
  const dg      = ac.createGain();
  droneOsc.type = "sine";
  droneOsc.frequency.setValueAtTime(27.5, ac.currentTime);
  dg.gain.setValueAtTime(0.10, ac.currentTime);
  droneOsc.connect(dg);
  dg.connect(bgGain); // drone bypasses bitcrusher/reverb for clean sub
  droneOsc.start();

  scheduleNote();
}

export function stopBgMusic() {
  bgPlaying = false;
  if (bgTimer)        { clearTimeout(bgTimer); bgTimer = null; }
  if (droneOsc)       { try { droneOsc.stop(); }    catch {} droneOsc     = null; }
  if (bgPitchLFO)     { try { bgPitchLFO.stop(); }  catch {} bgPitchLFO   = null; }
  if (bgPitchLFOGain) { try { bgPitchLFOGain.disconnect(); } catch {} bgPitchLFOGain = null; }
  bgReverb   = null;
  bgBitcrush = null;
}

// Call this on first user gesture to unlock AudioContext on iOS
export function unlockAudio() {
  getCtx();
}
