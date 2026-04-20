import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Constants from "expo-constants";
import { WebView } from "react-native-webview";
import { createInitialState, updateGame } from "@/game/engine";
import { renderFrame } from "@/game/renderer";
import type { GameState } from "@/game/types";
import { GameHUD } from "./GameHUD";
import { unlockAudio, startBgMusic, stopBgMusic, playShoot, playZap, playBerserkerStart, playHit, playBatteryLow, playBatteryRecharge, getMusicVolume, getSfxVolume, setMusicVolume, setSfxVolume } from "@/game/audio";

interface GameCanvasProps {
  onDeath: (state: GameState) => void;
}

interface HUDState {
  hp: number;
  maxHp: number;
  battery: number;
  maxBattery: number;
  berserkerTimer: number;
  score: number;
  wave: number;
  killCount: number;
  waveTotalKills: number;
  tripleShot: boolean;
  quadShot: boolean;
  rapidFireStacks: number;
  bazookaMode: boolean;
  lightningStrike: boolean;
  dashCooldown: number;
  spawnGrace: number;
}

interface JoyState {
  active: boolean;
  baseX: number;
  baseY: number;
  stickX: number;
  stickY: number;
}

const DEFAULT_HUD: HUDState = {
  hp: 200, maxHp: 200,
  battery: 100, maxBattery: 100, berserkerTimer: 0,
  score: 0, wave: 1,
  killCount: 0, waveTotalKills: 12,
  tripleShot: false, quadShot: false,
  rapidFireStacks: 0, bazookaMode: false, lightningStrike: false,
  dashCooldown: 0, spawnGrace: 3000,
};

const IDLE_JOY: JoyState = { active: false, baseX: 0, baseY: 0, stickX: 0, stickY: 0 };

export function GameCanvas({ onDeath }: GameCanvasProps) {
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef({ dx: 0, dy: 0, aimAngle: 0, targetAimAngle: 0, useSmoothedAim: false, rightJoyActive: false, shooting: false, dashing: false, autoAim: false, shootOverrideAngle: null as number | null });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const hudTickRef = useRef<number>(0);
  const lastHudHpRef = useRef<number>(200);
  const hpBarFillRef = useRef<HTMLElement | null>(null);
  const hpBarTextRef = useRef<HTMLElement | null>(null);
  const dashDomBtnRef = useRef<HTMLElement | null>(null);
  const [hudState, setHudState] = useState<HUDState>(DEFAULT_HUD);
  const [leftJoy, setLeftJoy] = useState<JoyState>(IDLE_JOY);
  const [rightJoy, setRightJoy] = useState<JoyState>(IDLE_JOY);
  const isMobileRef = useRef(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // ── Audio state tracking ──────────────────────────────────────────────────
  const prevBulletCount    = useRef(0);
  const prevBerserking     = useRef(false);
  const prevBatteryEmpty   = useRef(false);
  const prevBatteryLevel   = useRef(100);
  const prevLightningCount = useRef(0);
  const prevRedFlash       = useRef(0);

  // ── Game loop ────────────────────────────────────────────────────────────
  const gameLoop = useCallback((timestamp: number) => {
    const rawDt = timestamp - (lastTimeRef.current || timestamp);
    const dt = Math.min(rawDt, 50);
    lastTimeRef.current = timestamp;
    // Detect abnormally large frame gaps (iOS background / throttle spikes)
    if (rawDt > 80) {
      console.warn(`[FRAME SPIKE] rawDt=${rawDt.toFixed(0)}ms clamped to ${dt.toFixed(0)}ms`);
    }

    // ── Smooth aim angle toward target (touch only) ───────────────────────
    if (inputRef.current.useSmoothedAim) {
      const curr = inputRef.current.aimAngle;
      const target = inputRef.current.targetAimAngle;
      // Angular shortest-path lerp
      let diff = ((target - curr + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      const maxStep = dt * 0.022; // ~22 rad/s — snappy but still smooth on mobile
      inputRef.current.aimAngle = curr + (Math.abs(diff) < maxStep ? diff : Math.sign(diff) * maxStep);
    }

    const newState = updateGame(stateRef.current, dt, inputRef.current);
    stateRef.current = newState;
    inputRef.current.dashing = false;

    // ── Audio triggers (detect state changes) ─────────────────────────────────
    if (Platform.OS === "web") {
      // Shoot sound: new bullets appeared
      if (newState.bullets.length > prevBulletCount.current) {
        playShoot(newState.bazookaMode, newState.berserkerTimer > 0);
      }
      prevBulletCount.current = newState.bullets.length;

      // Berserker start
      const nowBerserking = newState.berserkerTimer > 0;
      if (nowBerserking && !prevBerserking.current) playBerserkerStart();
      prevBerserking.current = nowBerserking;

      // Battery empty warning
      const nowEmpty = newState.battery <= 0;
      if (nowEmpty) playBatteryLow();
      prevBatteryEmpty.current = nowEmpty;

      // Battery recharge pickup (battery jumped up significantly = collected a battery)
      if (newState.battery > prevBatteryLevel.current + 10) playBatteryRecharge();
      prevBatteryLevel.current = newState.battery;

      // Player hit sound (redFlash spiked up = new hit)
      if (newState.redFlash > prevRedFlash.current + 0.4) playHit();
      prevRedFlash.current = newState.redFlash;

      // Lightning zap: new arcs fired
      if (newState.lightningArcs.length > prevLightningCount.current) playZap();
      prevLightningCount.current = newState.lightningArcs.length;
    }

    if (newState.phase === "dead") {
      console.log(
        `[DEATH] hp=${Math.round(newState.hp)} hpAtDeath=${Math.round(newState.hpAtDeath)}` +
        ` cause="${newState.deathCause}" logEntries=${newState.damageLog.length}` +
        ` gameTime=${(newState.gameTime / 1000).toFixed(1)}s`
      );
      stopBgMusic();
      onDeath(newState);
      return;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) renderFrame(ctx, newState, canvas.width, canvas.height);
    }

    hudTickRef.current += dt;
    // Force-update HUD immediately on any HP drop ≥ 3 (e.g. an enemy hit) so
    // the bar never shows stale "full" data on iOS between throttle windows.
    const hpDrop = lastHudHpRef.current - newState.hp;
    const hudDue = hudTickRef.current > 100 || hpDrop >= 3;
    if (hudDue) {
      hudTickRef.current = 0;
      lastHudHpRef.current = newState.hp;
      // Update DOM dash button appearance (mobile only)
      if (dashDomBtnRef.current) {
        const cd = newState.dashCooldown;
        dashDomBtnRef.current.textContent = cd <= 0 ? "[ DASH ]" : "·····";
        (dashDomBtnRef.current as HTMLElement).style.opacity = cd > 0 ? "0.35" : "1";
      }
      setHudState({
        hp: newState.hp,
        maxHp: newState.maxHp,
        battery: newState.battery,
        maxBattery: newState.maxBattery,
        berserkerTimer: newState.berserkerTimer,
        score: newState.score,
        wave: newState.wave,
        killCount: newState.killCount,
        waveTotalKills: newState.waveTotalKills,
        tripleShot: newState.tripleShot,
        quadShot: newState.quadShot,
        rapidFireStacks: newState.rapidFireStacks,
        bazookaMode: newState.bazookaMode,
        lightningStrike: newState.lightningStrike,
        dashCooldown: newState.dashCooldown,
        spawnGrace: newState.spawnGrace,
      });
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [onDeath]);

  useEffect(() => {
    // On iOS/native the game runs inside a WebView — do NOT also run the engine
    // here in the React Native layer, or enemies will spawn and damage the player
    // invisibly (no canvas) and silently trigger death.
    if (Platform.OS !== "web") return;
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      stopBgMusic();
    };
  }, [gameLoop]);

  // ── Input: keyboard + mouse + touch (all wired directly, no synthetic events) ──
  useEffect(() => {
    if (Platform.OS !== "web") return;

    // Detect touch-capable device
    isMobileRef.current = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isMobileRef.current) setIsTouchDevice(true);

    // ── DOM Sound Settings UI ─────────────────────────────────────────────────
    // Injected as real DOM elements so iOS WebView tap works 100% reliably,
    // bypassing React Native's Responder / TouchableOpacity system entirely.
    const VOL_STEPS = [0.25, 0.5, 0.75, 1.0];

    const soundBtn = document.createElement("button");
    soundBtn.id = "mh-sound-btn";
    const updateSoundBtnIcon = () => {
      soundBtn.textContent = getMusicVolume() === 0 && getSfxVolume() === 0 ? "🔇" : getSfxVolume() === 0 ? "🎵" : "🔊";
    };
    updateSoundBtnIcon();
    soundBtn.style.cssText = [
      "position:fixed", "top:calc(env(safe-area-inset-top, 0px) + 10px)", "right:12px", "z-index:99999",
      "background:rgba(0,0,0,0.72)", "border:1px solid rgba(255,255,255,0.22)",
      "border-radius:8px", "width:38px", "height:38px", "font-size:18px",
      "cursor:pointer", "color:white", "touch-action:manipulation",
      "-webkit-tap-highlight-color:transparent", "line-height:1",
    ].join(";");

    const soundPanel = document.createElement("div");
    soundPanel.id = "mh-sound-panel";
    soundPanel.style.cssText = [
      "position:fixed", "top:calc(env(safe-area-inset-top, 0px) + 54px)", "right:12px", "z-index:99999",
      "background:rgba(10,8,14,0.95)", "border:1px solid rgba(255,255,255,0.15)",
      "border-radius:10px", "padding:12px 14px", "display:none",
      "color:white", "font-family:monospace", "touch-action:manipulation",
      "min-width:210px",
    ].join(";");

    const makeVolRow = (label: string, getVol: () => number, setVol: (v: number) => void) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:8px;";
      const lbl = document.createElement("span");
      lbl.textContent = label;
      lbl.style.cssText = "font-size:10px;font-weight:700;letter-spacing:1.5px;color:#ccc;min-width:42px;";
      row.appendChild(lbl);

      const muteBtn = document.createElement("button");
      muteBtn.style.cssText = [
        "width:24px", "height:24px", "border-radius:4px",
        "border:1px solid rgba(255,255,255,0.25)", "background:rgba(255,255,255,0.05)",
        "color:#aaa", "font-size:11px", "cursor:pointer",
        "touch-action:manipulation", "-webkit-tap-highlight-color:transparent",
      ].join(";");
      const dots: HTMLButtonElement[] = [];

      const refreshRow = () => {
        const v = getVol();
        muteBtn.textContent = v === 0 ? "✕" : "♪";
        (muteBtn.style as any).color = v === 0 ? "#ff4444" : "#aaa";
        (muteBtn.style as any).borderColor = v === 0 ? "#ff4444" : "rgba(255,255,255,0.25)";
        dots.forEach((d, i) => {
          const filled = v >= VOL_STEPS[i];
          (d.style as any).backgroundColor = filled ? "#00cfff" : "rgba(255,255,255,0.05)";
          (d.style as any).borderColor = filled ? "#00cfff" : "rgba(255,255,255,0.3)";
        });
        updateSoundBtnIcon();
      };

      muteBtn.addEventListener("click", () => { setVol(getVol() === 0 ? 0.75 : 0); refreshRow(); });
      row.appendChild(muteBtn);

      VOL_STEPS.forEach((step) => {
        const dot = document.createElement("button");
        dot.style.cssText = [
          "width:16px", "height:16px", "border-radius:3px",
          "border:1px solid rgba(255,255,255,0.3)", "background:rgba(255,255,255,0.05)",
          "cursor:pointer", "touch-action:manipulation",
          "-webkit-tap-highlight-color:transparent",
        ].join(";");
        dot.addEventListener("click", () => { setVol(step); refreshRow(); });
        dots.push(dot);
        row.appendChild(dot);
      });
      refreshRow();
      return row;
    };

    const panelHeader = document.createElement("div");
    panelHeader.style.cssText = "display:flex;justify-content:space-between;align-items:center;";
    const panelTitle = document.createElement("span");
    panelTitle.textContent = "SOUND";
    panelTitle.style.cssText = "font-size:10px;font-weight:700;letter-spacing:2px;color:#aaa;";
    const panelClose = document.createElement("button");
    panelClose.textContent = "✕";
    panelClose.style.cssText = "background:none;border:none;color:#888;font-size:14px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;padding:4px;";
    panelClose.addEventListener("click", () => { soundPanel.style.display = "none"; });
    panelHeader.appendChild(panelTitle);
    panelHeader.appendChild(panelClose);
    soundPanel.appendChild(panelHeader);
    soundPanel.appendChild(makeVolRow("MUSIC", getMusicVolume, setMusicVolume));
    soundPanel.appendChild(makeVolRow("SFX", getSfxVolume, setSfxVolume));

    soundBtn.addEventListener("click", () => {
      unlockAudio(); // tapping the sound button also unlocks audio on iOS
      soundPanel.style.display = soundPanel.style.display === "none" ? "block" : "none";
    });

    document.body.appendChild(soundBtn);
    document.body.appendChild(soundPanel);

    // ── DOM Dash Button (mobile only) ─────────────────────────────────────────
    // Injected as a real DOM element so touchstart stopPropagation() works —
    // prevents the document-level joystick handler from claiming this touch.
    let dashDomBtn: HTMLElement | null = null;
    if (isMobileRef.current) {
      dashDomBtn = document.createElement("button");
      dashDomBtn.id = "mh-dash-btn";
      dashDomBtn.textContent = "[ DASH ]";
      dashDomBtn.style.cssText = [
        "position:fixed", "bottom:calc(env(safe-area-inset-bottom, 0px) + 20px)",
        "left:50%", "transform:translateX(-50%)", "z-index:99998",
        "background:rgba(0,60,180,0.50)", "border:1.5px solid #4488ff",
        "border-radius:10px", "padding:14px 28px",
        "color:#88bbff", "font-size:15px", "font-weight:900",
        "letter-spacing:3px", "font-family:monospace",
        "cursor:pointer", "touch-action:manipulation",
        "-webkit-tap-highlight-color:transparent",
        "transition:opacity 0.1s",
      ].join(";");
      dashDomBtn.addEventListener("touchstart", (e) => {
        e.stopPropagation(); // prevent document touchstart → joystick handler
        e.preventDefault();
        inputRef.current.dashing = true;
      }, { passive: false });
      dashDomBtn.addEventListener("touchend", (e) => {
        e.stopPropagation();
      }, { passive: false });
      dashDomBtn.addEventListener("click", () => {
        inputRef.current.dashing = true;
      });
      document.body.appendChild(dashDomBtn);
      dashDomBtnRef.current = dashDomBtn;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Disable browser default gestures on the document
    const noDefault = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", noDefault, { passive: false });
    document.addEventListener("gesturechange", noDefault, { passive: false });
    document.addEventListener("contextmenu", noDefault);

    // Lock viewport zoom
    let meta = document.querySelector("meta[name=viewport]") as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }
    // viewport-fit=cover is essential — without it env(safe-area-inset-top) is
    // always 0px on iOS Safari, causing the HUD to sit behind the notch/status bar.
    meta.content = "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover";

    // Global CSS: no text selection, no overflow
    // NOTE: touch-action:none is applied to canvas only — NOT html/body.
    // Setting it on body would put iOS Safari into "slow path" for ALL touches
    // on the page, breaking React Native web's button tap recognition.
    const style = document.createElement("style");
    style.textContent = `
      * { -webkit-user-select: none !important; user-select: none !important; }
      html, body { overflow: hidden; }
      canvas { touch-action: none; }
    `;
    document.head.appendChild(style);

    // ── Keyboard ──────────────────────────────────────────────────────────
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase());
      if (e.key === " " || e.key === "Shift") {
        inputRef.current.dashing = true;
        e.preventDefault();
      }
      syncKeys();
    };
    const onKeyUp = (e: KeyboardEvent) => { keys.delete(e.key.toLowerCase()); syncKeys(); };
    const syncKeys = () => {
      let dx = 0, dy = 0;
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;
      inputRef.current.dx = dx;
      inputRef.current.dy = dy;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // ── Stuck-input safety: reset everything on focus loss ────────────────
    const onBlur = () => {
      keys.clear();
      syncKeys();
      inputRef.current.shooting = false;
      inputRef.current.dashing = false;
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", () => { if (document.hidden) onBlur(); });

    // ── Mouse ─────────────────────────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left - canvas.width / 2;
      const my = e.clientY - rect.top - canvas.height / 2;
      const angle = Math.atan2(my, mx) - Math.PI / 2;
      inputRef.current.aimAngle = angle;        // instant for mouse
      inputRef.current.targetAimAngle = angle;  // keep in sync
      inputRef.current.useSmoothedAim = false;  // no lerp for mouse
      inputRef.current.autoAim = false;
    };
    const onMouseDown = () => { unlockAudio(); inputRef.current.shooting = true; inputRef.current.autoAim = false; };
    const onMouseUp = () => { inputRef.current.shooting = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    // ── Touch ──────────────────────────────────────────────────────────────
    // Map from touchId → "left" | "right"
    const touchRole = new Map<number, "left" | "right">();
    // Both joysticks are FLOATING — base appears where thumb lands
    const leftBase  = { x: 0, y: 0 };
    const rightBase = { x: 0, y: 0 };
    const JOY_CLAMP    = 55;
    const R_DEAD_ZONE  = 20; // larger dead zone for right stick — prevents tiny-drag snaps

    const resetLeft = () => {
      inputRef.current.dx = 0;
      inputRef.current.dy = 0;
      setLeftJoy(IDLE_JOY);
    };
    const resetRight = () => {
      inputRef.current.shooting = false;
      inputRef.current.autoAim = false;
      inputRef.current.shootOverrideAngle = null;
      inputRef.current.rightJoyActive = false;
      setRightJoy(IDLE_JOY);
    };

    const hasRole = (role: "left" | "right") => {
      for (const r of touchRole.values()) if (r === role) return true;
      return false;
    };

    // Double-tap left stick → dash
    let lastLeftTapMs = 0;

    const onTouchStart = (e: TouchEvent) => {
      unlockAudio(); // always unblock AudioContext on any gesture (passive handler, no preventDefault)

      // ── Purge stale roles (iOS touchcancel may have been missed) ─────────────
      // If a touch ID in our role map is no longer in e.touches, that touch ended
      // without us seeing a touchend/touchcancel — clear it now so the slot is free.
      const activeIds = new Set(Array.from(e.touches).map(t => t.identifier));
      for (const [id, role] of touchRole.entries()) {
        if (!activeIds.has(id)) {
          console.warn(`[INPUT] stale ${role} touch id=${id} — purging`);
          touchRole.delete(id);
          if (role === "left") resetLeft();
          if (role === "right") resetRight();
        }
      }

      // Only claim touches in the bottom 40% as joystick input.
      // Touches in the top 60% (HUD buttons) are left completely alone — no role assigned,
      // so touchmove won't preventDefault for them either.
      const ZONE_TOP = window.innerHeight * 0.60;
      inputRef.current.useSmoothedAim = true;
      Array.from(e.changedTouches).forEach((t) => {
        if (t.clientY < ZONE_TOP) return; // HUD area — don't claim
        const isLeft = t.clientX < window.innerWidth / 2;
        if (isLeft && !hasRole("left")) {
          // Double-tap detection: two left-zone taps within 280ms triggers dash
          const now = Date.now();
          if (now - lastLeftTapMs < 280) {
            inputRef.current.dashing = true;
          }
          lastLeftTapMs = now;
          touchRole.set(t.identifier, "left");
          leftBase.x = t.clientX;
          leftBase.y = t.clientY;
          setLeftJoy({ active: true, baseX: t.clientX, baseY: t.clientY, stickX: t.clientX, stickY: t.clientY });
        } else if (!isLeft && !hasRole("right")) {
          touchRole.set(t.identifier, "right");
          rightBase.x = t.clientX;
          rightBase.y = t.clientY;
          inputRef.current.shooting = true;
          inputRef.current.autoAim = true;
          inputRef.current.rightJoyActive = true;
          setRightJoy({ active: true, baseX: t.clientX, baseY: t.clientY, stickX: t.clientX, stickY: t.clientY });
        }
      });
    };

    const onTouchMove = (e: TouchEvent) => {
      // Only suppress default when we actually own at least one of these touches
      const anyOwned = Array.from(e.changedTouches).some(t => touchRole.has(t.identifier));
      if (anyOwned) e.preventDefault();
      Array.from(e.changedTouches).forEach((t) => {
        const role = touchRole.get(t.identifier);
        if (!role) return;

        if (role === "left") {
          const dx = t.clientX - leftBase.x;
          const dy = t.clientY - leftBase.y;
          const len = Math.hypot(dx, dy);
          // Floating base slides when thumb drifts beyond clamp
          if (len > JOY_CLAMP) {
            leftBase.x = t.clientX - (dx / len) * JOY_CLAMP;
            leftBase.y = t.clientY - (dy / len) * JOY_CLAMP;
          }
          const ndx = t.clientX - leftBase.x;
          const ndy = t.clientY - leftBase.y;
          const nlen = Math.hypot(ndx, ndy);
          if (nlen > 6) {
            inputRef.current.dx = ndx / nlen;
            inputRef.current.dy = ndy / nlen;
            // Flashlight + Roomba rotation tracks left stick direction, UNLESS the
            // right stick is being dragged to manually aim (shootOverrideAngle set).
            // Holding right side still (auto-aim) does NOT block rotation — the
            // Roomba should still spin to face its movement direction.
            if (inputRef.current.shootOverrideAngle === null) {
              inputRef.current.targetAimAngle = Math.atan2(ndy, ndx) - Math.PI / 2;
            }
          } else {
            inputRef.current.dx = 0;
            inputRef.current.dy = 0;
          }
          const cx = Math.max(-JOY_CLAMP, Math.min(JOY_CLAMP, ndx));
          const cy = Math.max(-JOY_CLAMP, Math.min(JOY_CLAMP, ndy));
          setLeftJoy({ active: true, baseX: leftBase.x, baseY: leftBase.y, stickX: leftBase.x + cx, stickY: leftBase.y + cy });
        }

        if (role === "right") {
          // Right stick drifts base when thumb goes beyond clamp
          const rdx = t.clientX - rightBase.x;
          const rdy = t.clientY - rightBase.y;
          const rlen = Math.hypot(rdx, rdy);
          if (rlen > JOY_CLAMP) {
            rightBase.x = t.clientX - (rdx / rlen) * JOY_CLAMP;
            rightBase.y = t.clientY - (rdy / rlen) * JOY_CLAMP;
          }
          const nrdx = t.clientX - rightBase.x;
          const nrdy = t.clientY - rightBase.y;
          const nrlen = Math.hypot(nrdx, nrdy);
          if (nrlen > R_DEAD_ZONE) {
            // Drag → manual aim + shoot in stick direction
            const angle = Math.atan2(nrdy, nrdx);
            inputRef.current.targetAimAngle  = angle - Math.PI / 2;
            inputRef.current.shootOverrideAngle = angle;
            inputRef.current.autoAim = false;
          } else {
            // Tiny drag or hold still → auto-aim nearest enemy
            inputRef.current.shootOverrideAngle = null;
            inputRef.current.autoAim = true;
          }
          inputRef.current.shooting = true;
          const rcx = Math.max(-JOY_CLAMP, Math.min(JOY_CLAMP, nrdx));
          const rcy = Math.max(-JOY_CLAMP, Math.min(JOY_CLAMP, nrdy));
          setRightJoy({ active: true, baseX: rightBase.x, baseY: rightBase.y, stickX: rightBase.x + rcx, stickY: rightBase.y + rcy });
        }
      });
    };

    const onTouchEnd = (e: TouchEvent) => {
      // ONLY call preventDefault for touches that belong to the game joystick system.
      // Calling it unconditionally cancels the synthetic "click" event the browser
      // generates from touchstart→touchend, which breaks every DOM button on the page
      // (including the sound settings button). HUD-zone taps have no role assigned,
      // so anyOwned will be false for them and the click fires normally.
      const anyOwned = Array.from(e.changedTouches).some(t => touchRole.has(t.identifier));
      if (anyOwned) e.preventDefault();
      Array.from(e.changedTouches).forEach((t) => {
        const role = touchRole.get(t.identifier);
        touchRole.delete(t.identifier);
        if (role === "left") resetLeft();
        if (role === "right") resetRight();
      });
      // Safety fallback: clear everything if no touches remain
      if (e.touches.length === 0) {
        touchRole.clear();
        resetLeft();
        resetRight();
      }
    };

    // touchstart is NON-PASSIVE so iOS Safari grants full gesture context for
    // AudioContext.resume() + buffer.start() inside unlockAudio().
    // Scroll prevention is handled in touchmove (also non-passive).
    const onTouchCancel = (e: TouchEvent) => {
      // iOS fires touchcancel when the OS interrupts (notifications, app switcher,
      // context menus, long-press system gestures). Log it so it appears in death logs.
      const roles = Array.from(e.changedTouches).map(t => touchRole.get(t.identifier) ?? "unowned").join(",");
      console.warn(`[INPUT] touchcancel — roles=${roles} cancelled=${e.changedTouches.length} remaining=${e.touches.length}`);
      onTouchEnd(e);
    };

    // Re-unlock audio on touchend too — iOS WebView sometimes misses touchstart unlock
    const onTouchEndUnlock = () => { unlockAudio(); };
    document.addEventListener("touchstart", onTouchStart, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: false });
    document.addEventListener("touchend", onTouchEndUnlock, { passive: true });
    document.addEventListener("touchcancel", onTouchCancel, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", noDefault);
      document.removeEventListener("gesturechange", noDefault);
      document.removeEventListener("contextmenu", noDefault);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchend", onTouchEndUnlock);
      document.removeEventListener("touchcancel", onTouchCancel);
      if (style.parentNode) style.parentNode.removeChild(style);
      if (soundBtn.parentNode) soundBtn.parentNode.removeChild(soundBtn);
      if (soundPanel.parentNode) soundPanel.parentNode.removeChild(soundPanel);
      if (dashDomBtn?.parentNode) dashDomBtn.parentNode.removeChild(dashDomBtn);
      dashDomBtnRef.current = null;
    };
  }, []);

  // ── Web render ────────────────────────────────────────────────────────────
  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        {/* Game canvas — covers full screen */}
        <canvas
          ref={canvasRef}
          width={SCREEN_W}
          height={SCREEN_H}
          style={{ display: "block", cursor: "crosshair" } as React.CSSProperties}
        />

        {/* HUD overlay — fully interactive in the top zone; game input is already zone-locked to bottom 40% */}
        <View style={StyleSheet.absoluteFill} pointerEvents="auto">
          <GameHUD
            {...hudState}
            onDash={() => { inputRef.current.dashing = true; }}
          />
        </View>

        {/* Joystick overlay — pointer-events none; pure visual feedback */}
        <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
          {/* Left idle hint */}
          {!leftJoy.active && (
            <View style={[styles.joyIdle, { left: 44, bottom: 110 }]}>
              <View style={styles.joyIdleRing} />
              <View style={[styles.joyIdleDot]} />
              <Text style={styles.joyIdleLabel}>MOVE</Text>
              {isTouchDevice && (
                <Text style={[styles.joyIdleLabel, { fontSize: 8, opacity: 0.55, marginTop: 2 }]}>2×TAP=DASH</Text>
              )}
            </View>
          )}
          {/* Right idle hint */}
          {!rightJoy.active && (
            <View style={[styles.joyIdle, { right: 44, bottom: 110 }]}>
              <View style={[styles.joyIdleRing, { borderColor: "rgba(255,100,0,0.45)" }]} />
              <View style={[styles.joyIdleDot, { backgroundColor: "rgba(255,100,0,0.35)" }]} />
              <Text style={[styles.joyIdleLabel, { color: "rgba(100,200,255,0.6)" }]}>SHOOT</Text>
            </View>
          )}
          {/* Active left joystick */}
          {leftJoy.active && (
            <View style={[styles.joyBase, { left: leftJoy.baseX - 55, top: leftJoy.baseY - 55 }]}>
              <View style={styles.joyBaseRing} />
              <View style={[styles.joyStick, {
                left: (leftJoy.stickX - leftJoy.baseX) + 55 - 20,
                top: (leftJoy.stickY - leftJoy.baseY) + 55 - 20,
              }]} />
            </View>
          )}
          {/* Active right joystick — crosshair style */}
          {rightJoy.active && (
            <View style={[styles.joyBase, { left: rightJoy.baseX - 55, top: rightJoy.baseY - 55 }]}>
              {/* Outer ring */}
              <View style={[styles.joyBaseRing, { borderColor: "rgba(255,60,60,0.75)" }]} />
              {/* Crosshair at stick position */}
              <View style={[styles.crosshair, {
                left: (rightJoy.stickX - rightJoy.baseX) + 55 - 18,
                top:  (rightJoy.stickY - rightJoy.baseY) + 55 - 18,
              }]}>
                {/* Horizontal bar */}
                <View style={styles.crosshairH} />
                {/* Vertical bar */}
                <View style={styles.crosshairV} />
                {/* Center dot */}
                <View style={styles.crosshairDot} />
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ── Native: WebView loads the web game ────────────────────────────────────
  const webUrl = (Constants.expoConfig?.extra as any)?.webUrl;
  const gameUrl = webUrl ? `${webUrl}/game` : null;

  if (!gameUrl) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <GameHUD {...hudState} onDash={() => {}} />
      </View>
    );
  }

  return (
    <WebView
      source={{ uri: gameUrl }}
      style={styles.container}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      bounces={false}
      scrollEnabled={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#08060a" },

  // Idle joystick hint
  joyIdle: {
    position: "absolute",
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  joyIdleRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  joyIdleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  joyIdleLabel: {
    position: "absolute",
    bottom: -20,
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  // Active joystick
  joyBase: {
    position: "absolute",
    width: 110,
    height: 110,
  },
  joyBaseRing: {
    position: "absolute",
    top: 0, left: 0,
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  joyStick: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.65)",
  },

  // Right joystick crosshair
  crosshair: {
    position: "absolute",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  crosshairH: {
    position: "absolute",
    width: 36,
    height: 2,
    backgroundColor: "rgba(255,60,60,0.9)",
    borderRadius: 1,
  },
  crosshairV: {
    position: "absolute",
    width: 2,
    height: 36,
    backgroundColor: "rgba(255,60,60,0.9)",
    borderRadius: 1,
  },
  crosshairDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,60,60,1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
});
