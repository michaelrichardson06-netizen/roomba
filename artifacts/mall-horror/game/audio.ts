// ── Procedural Web Audio sound engine for Mall Horror ─────────────────────────
// All sounds are synthesized — no file loading required.
// Platform-safe: silently no-ops if Web Audio API is unavailable.

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
      masterGain.connect(ctx.destination);
    } catch { return null; }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function out(): GainNode | null {
  getCtx();
  return masterGain;
}

// ─── Shoot (sci-fi laser) ─────────────────────────────────────────────────────
let lastShootTime = 0;

export function playShoot(isBazooka = false, isBerserking = false) {
  const ac = getCtx();
  const dst = out();
  if (!ac || !dst) return;

  // Rate-limit repeated shoot calls to avoid audio glut
  const now = ac.currentTime;
  if (now - lastShootTime < 0.04) return;
  lastShootTime = now;

  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.connect(g);
  g.connect(dst);

  if (isBazooka) {
    // Deep thump + descending rumble
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.18);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.start(now);
    osc.stop(now + 0.22);
  } else {
    // Sci-fi laser: high sawtooth → descending sweep
    osc.type = "sawtooth";
    const baseFreq = isBerserking ? 1600 : 960;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.075);
    g.gain.setValueAtTime(0.13, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}

// ─── Electric zap (lightning / elite enemy) ───────────────────────────────────
let lastZapTime = 0;

export function playZap() {
  const ac = getCtx();
  const dst = out();
  if (!ac || !dst) return;

  const now = ac.currentTime;
  if (now - lastZapTime < 0.1) return;
  lastZapTime = now;

  // White noise through oscillating bandpass
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

  // Thin high sparkle oscillator on top
  const osc = ac.createOscillator();
  const og  = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(3200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.14);
  og.gain.setValueAtTime(0.06, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  osc.connect(og);
  og.connect(dst);
  osc.start(now);
  osc.stop(now + 0.15);

  const g = ac.createGain();
  g.gain.setValueAtTime(0.28, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

  noise.connect(bp);
  bp.connect(g);
  g.connect(dst);
  noise.start(now);
  noise.stop(now + 0.16);
}

// ─── Berserker start (horror arcade sting) ────────────────────────────────────
export function playBerserkerStart() {
  const ac = getCtx();
  const dst = out();
  if (!ac || !dst) return;

  const now = ac.currentTime;
  // Four-note minor arpeggio — aggressive, square wave
  const notes = [110, 138, 165, 220]; // A2, C#3-ish, E3, A3
  notes.forEach((freq, i) => {
    const t   = now + i * 0.055;
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.connect(g);
    g.connect(dst);
    osc.start(t);
    osc.stop(t + 0.14);
  });

  // Sub-bass slam underneath the arpeggio
  const sub = ac.createOscillator();
  const sg  = ac.createGain();
  sub.type = "sine";
  sub.frequency.setValueAtTime(55, now);
  sg.gain.setValueAtTime(0.25, now);
  sg.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  sub.connect(sg);
  sg.connect(dst);
  sub.start(now);
  sub.stop(now + 0.36);
}

// ─── Battery low warning beep ──────────────────────────────────────────────────
let lastBatteryBeep = 0;

export function playBatteryLow() {
  const ac = getCtx();
  const dst = out();
  if (!ac || !dst) return;

  const now = ac.currentTime;
  if (now - lastBatteryBeep < 2.5) return; // once every 2.5 s max
  lastBatteryBeep = now;

  // Double descending beep
  [0, 0.22].forEach((offset) => {
    const t   = now + offset;
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.setValueAtTime(440, t + 0.09);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g);
    g.connect(dst);
    osc.start(t);
    osc.stop(t + 0.19);
  });
}

// ─── Player hit (heavy thud) ───────────────────────────────────────────────────
let lastHitSnd = 0;

export function playHit() {
  const ac = getCtx();
  const dst = out();
  if (!ac || !dst) return;

  const now = ac.currentTime;
  if (now - lastHitSnd < 0.12) return;
  lastHitSnd = now;

  // Low thud
  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
  g.gain.setValueAtTime(0.28, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(g);
  g.connect(dst);
  osc.start(now);
  osc.stop(now + 0.16);
}

// ─── Background horror arcade music ───────────────────────────────────────────
let bgPlaying    = false;
let bgGain: GainNode | null = null;
let droneOsc: OscillatorNode | null = null;
let bgTimer: ReturnType<typeof setTimeout> | null = null;

// Eerie scale — low register A-minor flavour
const HORROR_FREQS = [27.5, 32.7, 36.7, 41.2, 43.7, 49.0, 55.0, 58.3];

function scheduleNote() {
  const ac = getCtx();
  if (!ac || !bgPlaying || !bgGain) return;

  const now  = ac.currentTime;
  const freq = HORROR_FREQS[Math.floor(Math.random() * HORROR_FREQS.length)];
  const dur  = 2.0 + Math.random() * 3.5;

  const osc  = ac.createOscillator();
  const g    = ac.createGain();
  osc.type   = Math.random() > 0.6 ? "triangle" : "sine";
  osc.frequency.setValueAtTime(freq, now);
  // Slight pitch drift for unease
  osc.frequency.linearRampToValueAtTime(freq * (0.98 + Math.random() * 0.04), now + dur);

  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.1 + Math.random() * 0.06, now + 0.4);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);

  osc.connect(g);
  g.connect(bgGain);
  osc.start(now);
  osc.stop(now + dur + 0.05);

  // Occasionally add a higher horror-stab overtone
  if (Math.random() < 0.35) {
    const stab = ac.createOscillator();
    const sg   = ac.createGain();
    const sf   = freq * (Math.random() > 0.5 ? 4 : 6);
    stab.type  = "sawtooth";
    stab.frequency.setValueAtTime(sf, now);
    stab.frequency.exponentialRampToValueAtTime(sf * 0.5, now + 0.6);
    sg.gain.setValueAtTime(0.04, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    stab.connect(sg);
    sg.connect(bgGain);
    stab.start(now);
    stab.stop(now + 0.66);
  }

  const nextMs = (1.2 + Math.random() * 3.0) * 1000;
  bgTimer = setTimeout(scheduleNote, nextMs);
}

export function startBgMusic() {
  if (bgPlaying) return;
  const ac = getCtx();
  if (!ac) return;

  bgPlaying = true;
  bgGain    = ac.createGain();
  bgGain.gain.setValueAtTime(0.55, ac.currentTime);
  bgGain.connect(ac.destination); // direct to destination (not master) for separate volume

  // Sub drone
  droneOsc           = ac.createOscillator();
  const dg           = ac.createGain();
  droneOsc.type      = "sine";
  droneOsc.frequency.setValueAtTime(27.5, ac.currentTime); // A0 — subwoofer rumble
  dg.gain.setValueAtTime(0.18, ac.currentTime);
  droneOsc.connect(dg);
  dg.connect(bgGain);
  droneOsc.start();

  scheduleNote();
}

export function stopBgMusic() {
  bgPlaying = false;
  if (bgTimer) { clearTimeout(bgTimer); bgTimer = null; }
  if (droneOsc) { try { droneOsc.stop(); } catch {} droneOsc = null; }
  if (bgGain)   { try { bgGain.disconnect(); } catch {} bgGain = null; }
}

// Call this on first user gesture to unlock AudioContext
export function unlockAudio() {
  getCtx();
}
