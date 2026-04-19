import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Constants from "expo-constants";
import { WebView } from "react-native-webview";
import { createInitialState, updateGame } from "@/game/engine";
import { renderFrame } from "@/game/renderer";
import type { GameState } from "@/game/types";
import { GameHUD } from "./GameHUD";

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
  const inputRef = useRef({ dx: 0, dy: 0, aimAngle: 0, shooting: false, dashing: false, autoAim: false, shootOverrideAngle: null as number | null });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const hudTickRef = useRef<number>(0);
  const [hudState, setHudState] = useState<HUDState>(DEFAULT_HUD);
  const [leftJoy, setLeftJoy] = useState<JoyState>(IDLE_JOY);
  const [rightJoy, setRightJoy] = useState<JoyState>(IDLE_JOY);
  const isMobileRef = useRef(false);

  // ── Game loop ────────────────────────────────────────────────────────────
  const gameLoop = useCallback((timestamp: number) => {
    const dt = Math.min(timestamp - (lastTimeRef.current || timestamp), 50);
    lastTimeRef.current = timestamp;

    const newState = updateGame(stateRef.current, dt, inputRef.current);
    stateRef.current = newState;
    inputRef.current.dashing = false;

    if (newState.phase === "dead") {
      onDeath(newState);
      return;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) renderFrame(ctx, newState, canvas.width, canvas.height);
    }

    hudTickRef.current += dt;
    if (hudTickRef.current > 100) {
      hudTickRef.current = 0;
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
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameLoop]);

  // ── Input: keyboard + mouse + touch (all wired directly, no synthetic events) ──
  useEffect(() => {
    if (Platform.OS !== "web") return;

    // Detect touch-capable device
    isMobileRef.current = "ontouchstart" in window || navigator.maxTouchPoints > 0;

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
    meta.content = "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no";

    // Global CSS: no text selection, no overflow
    const style = document.createElement("style");
    style.textContent = `
      * { -webkit-user-select: none !important; user-select: none !important; }
      html, body { overflow: hidden; touch-action: none; }
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
      inputRef.current.aimAngle = Math.atan2(my, mx) - Math.PI / 2;
      inputRef.current.autoAim = false; // mouse = manual aim
    };
    const onMouseDown = () => { inputRef.current.shooting = true; inputRef.current.autoAim = false; };
    const onMouseUp = () => { inputRef.current.shooting = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    // ── Touch ──────────────────────────────────────────────────────────────
    // Map from touchId → "left" | "right" — prevents identity confusion on quick swipes
    const touchRole = new Map<number, "left" | "right">();
    // Mutable floating bases for both joysticks (avoids React re-render lag)
    const leftBase = { x: 0, y: 0 };
    // Right joystick is FIXED — always centred at the idle-hint position (bottom-right)
    const RIGHT_JOY_CX = window.innerWidth  - 84;   // 44px margin + 40 (half of 80px hint ring)
    const RIGHT_JOY_CY = window.innerHeight - 150;  // 110px margin + 40
    const rightBase = { x: RIGHT_JOY_CX, y: RIGHT_JOY_CY };
    const JOY_CLAMP = 55;

    const resetLeft = () => {
      inputRef.current.dx = 0;
      inputRef.current.dy = 0;
      setLeftJoy(IDLE_JOY);
    };
    const resetRight = () => {
      inputRef.current.shooting = false;
      inputRef.current.autoAim = false;
      inputRef.current.shootOverrideAngle = null;
      setRightJoy(IDLE_JOY);
    };

    const hasRole = (role: "left" | "right") => {
      for (const r of touchRole.values()) if (r === role) return true;
      return false;
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      Array.from(e.changedTouches).forEach((t) => {
        const isLeft = t.clientX < window.innerWidth / 2;
        if (isLeft && !hasRole("left")) {
          touchRole.set(t.identifier, "left");
          leftBase.x = t.clientX;
          leftBase.y = t.clientY;
          setLeftJoy({ active: true, baseX: t.clientX, baseY: t.clientY, stickX: t.clientX, stickY: t.clientY });
        } else if (!isLeft && !hasRole("right")) {
          touchRole.set(t.identifier, "right");
          // Base stays at the pre-defined fixed centre — do NOT move it
          inputRef.current.shooting = true;
          inputRef.current.autoAim = true; // brief tap = auto-aim nearest
          setRightJoy({ active: true, baseX: rightBase.x, baseY: rightBase.y, stickX: rightBase.x, stickY: rightBase.y });
        }
      });
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      Array.from(e.changedTouches).forEach((t) => {
        const role = touchRole.get(t.identifier);
        if (!role) return;

        if (role === "left") {
          const dx = t.clientX - leftBase.x;
          const dy = t.clientY - leftBase.y;
          const len = Math.hypot(dx, dy);
          // Floating joystick: slide base when thumb drifts beyond clamp radius
          if (len > JOY_CLAMP) {
            leftBase.x = t.clientX - (dx / len) * JOY_CLAMP;
            leftBase.y = t.clientY - (dy / len) * JOY_CLAMP;
          }
          const ndx = t.clientX - leftBase.x;
          const ndy = t.clientY - leftBase.y;
          const nlen = Math.hypot(ndx, ndy);
          if (nlen > 5) {
            inputRef.current.dx = ndx / nlen;
            inputRef.current.dy = ndy / nlen;
            // ── Flashlight tracks movement direction ──────────────────────
            inputRef.current.aimAngle = Math.atan2(ndy, ndx) - Math.PI / 2;
          } else {
            inputRef.current.dx = 0;
            inputRef.current.dy = 0;
          }
          const cx = Math.max(-JOY_CLAMP, Math.min(JOY_CLAMP, ndx));
          const cy = Math.max(-JOY_CLAMP, Math.min(JOY_CLAMP, ndy));
          setLeftJoy({ active: true, baseX: leftBase.x, baseY: leftBase.y, stickX: leftBase.x + cx, stickY: leftBase.y + cy });
        }

        if (role === "right") {
          // ── Right stick: FIXED base, shoot direction only (does not affect flashlight) ──
          const nrdx = t.clientX - rightBase.x;
          const nrdy = t.clientY - rightBase.y;
          const nrlen = Math.hypot(nrdx, nrdy);
          if (nrlen > 10) {
            // Manual shoot direction from right stick drag
            inputRef.current.shootOverrideAngle = Math.atan2(nrdy, nrdx);
            inputRef.current.autoAim = false;
          } else {
            // Small nudge = auto-aim to nearest enemy
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
      e.preventDefault();
      Array.from(e.changedTouches).forEach((t) => {
        const role = touchRole.get(t.identifier);
        touchRole.delete(t.identifier);
        if (role === "left") resetLeft();
        if (role === "right") resetRight();
      });
      // Safety fallback: if no remaining touches at all, clear all input
      if (e.touches.length === 0) {
        touchRole.clear();
        resetLeft();
        resetRight();
      }
    };

    // Attach to document (not canvas) to catch all touches regardless of overlay
    document.addEventListener("touchstart", onTouchStart, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: false });
    document.addEventListener("touchcancel", onTouchEnd, { passive: false });

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
      document.removeEventListener("touchcancel", onTouchEnd);
      if (style.parentNode) style.parentNode.removeChild(style);
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

        {/* HUD overlay — pointer-events none so it never blocks input */}
        <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
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
            </View>
          )}
          {/* Right idle hint */}
          {!rightJoy.active && (
            <View style={[styles.joyIdle, { right: 44, bottom: 110 }]}>
              <View style={[styles.joyIdleRing, { borderColor: "rgba(255,100,0,0.45)" }]} />
              <View style={[styles.joyIdleDot, { backgroundColor: "rgba(255,100,0,0.35)" }]} />
              <Text style={[styles.joyIdleLabel, { color: "rgba(100,200,255,0.6)" }]}>AIM</Text>
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
          {/* Active right joystick */}
          {rightJoy.active && (
            <View style={[styles.joyBase, { left: rightJoy.baseX - 55, top: rightJoy.baseY - 55 }]}>
              <View style={[styles.joyBaseRing, { borderColor: "rgba(255,120,0,0.7)" }]} />
              <View style={[styles.joyStick, {
                backgroundColor: "rgba(255,120,0,0.75)",
                left: (rightJoy.stickX - rightJoy.baseX) + 55 - 20,
                top: (rightJoy.stickY - rightJoy.baseY) + 55 - 20,
              }]} />
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
});
