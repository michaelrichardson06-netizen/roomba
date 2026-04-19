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
  if (bgGain && ctx) bgGain.gain.setValueAtTime(_musicVol * 0.55, ctx.currentTime);
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

// ─── Background horror arcade music ───────────────────────────────────────────
let bgPlaying = false;
let droneOsc: OscillatorNode | null = null;
let bgTimer: ReturnType<typeof setTimeout> | null = null;

const HORROR_FREQS = [27.5, 32.7, 36.7, 41.2, 43.7, 49.0, 55.0, 58.3];

function scheduleNote() {
  const ac = getCtx();
  if (!ac || !bgPlaying || !bgGain) return;

  const now  = ac.currentTime;
  const freq = HORROR_FREQS[Math.floor(Math.random() * HORROR_FREQS.length)];
  const dur  = 2.0 + Math.random() * 3.5;

  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.type  = Math.random() > 0.6 ? "triangle" : "sine";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.linearRampToValueAtTime(freq * (0.98 + Math.random() * 0.04), now + dur);

  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.1 + Math.random() * 0.06, now + 0.4);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);

  osc.connect(g); g.connect(bgGain);
  osc.start(now); osc.stop(now + dur + 0.05);

  if (Math.random() < 0.35) {
    const stab = ac.createOscillator();
    const sg   = ac.createGain();
    const sf   = freq * (Math.random() > 0.5 ? 4 : 6);
    stab.type  = "sawtooth";
    stab.frequency.setValueAtTime(sf, now);
    stab.frequency.exponentialRampToValueAtTime(sf * 0.5, now + 0.6);
    sg.gain.setValueAtTime(0.04, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    stab.connect(sg); sg.connect(bgGain);
    stab.start(now); stab.stop(now + 0.66);
  }

  bgTimer = setTimeout(scheduleNote, (1.2 + Math.random() * 3.0) * 1000);
}

export function startBgMusic() {
  if (bgPlaying) return;
  const ac = getCtx();
  if (!ac || !bgGain) return;

  bgPlaying = true;
  // bgGain is already connected to masterGain from getCtx()
  bgGain.gain.setValueAtTime(_musicVol * 0.55, ac.currentTime);

  droneOsc      = ac.createOscillator();
  const dg      = ac.createGain();
  droneOsc.type = "sine";
  droneOsc.frequency.setValueAtTime(27.5, ac.currentTime);
  dg.gain.setValueAtTime(0.18, ac.currentTime);
  droneOsc.connect(dg); dg.connect(bgGain);
  droneOsc.start();

  scheduleNote();
}

export function stopBgMusic() {
  bgPlaying = false;
  if (bgTimer) { clearTimeout(bgTimer); bgTimer = null; }
  if (droneOsc) { try { droneOsc.stop(); } catch {} droneOsc = null; }
}

// Call this on first user gesture to unlock AudioContext on iOS
export function unlockAudio() {
  getCtx();
}
