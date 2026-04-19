import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
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
  score: number;
  wave: number;
  killCount: number;
  waveTotalKills: number;
  tripleShot: boolean;
  quadShot: boolean;
  rapidFireStacks: number;
  bazookaMode: boolean;
  dashCooldown: number;
  spawnGrace: number;
}

interface JoystickState {
  active: boolean;
  baseX: number;
  baseY: number;
  stickX: number;
  stickY: number;
}

const DEFAULT_HUD: HUDState = {
  hp: 200, maxHp: 200, score: 0, wave: 1,
  killCount: 0, waveTotalKills: 12,
  tripleShot: false, quadShot: false,
  rapidFireStacks: 0, bazookaMode: false,
  dashCooldown: 0, spawnGrace: 3000,
};

export function GameCanvas({ onDeath }: GameCanvasProps) {
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef({
    dx: 0, dy: 0,
    aimAngle: 0,
    shooting: false,
    dashing: false,
  });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const hudTickRef = useRef<number>(0);
  const [hudState, setHudState] = useState<HUDState>(DEFAULT_HUD);

  // Joystick visual state (web mobile)
  const [leftJoy, setLeftJoy] = useState<JoystickState>({ active: false, baseX: 0, baseY: 0, stickX: 0, stickY: 0 });
  const [rightJoy, setRightJoy] = useState<JoystickState>({ active: false, baseX: 0, baseY: 0, stickX: 0, stickY: 0 });

  const gameLoop = useCallback((timestamp: number) => {
    const dt = Math.min(timestamp - (lastTimeRef.current || timestamp), 50);
    lastTimeRef.current = timestamp;

    const newState = updateGame(stateRef.current, inputRef.current, dt);
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
    if (hudTickRef.current > 80) {
      hudTickRef.current = 0;
      setHudState({
        hp: newState.hp,
        maxHp: newState.maxHp,
        score: newState.score,
        wave: newState.wave,
        killCount: newState.killCount,
        waveTotalKills: newState.waveTotalKills,
        tripleShot: newState.tripleShot,
        quadShot: newState.quadShot,
        rapidFireStacks: newState.rapidFireStacks,
        bazookaMode: newState.bazookaMode,
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

  // Touch controls for web canvas
  const leftTouchRef = useRef<{ id: number; sx: number; sy: number } | null>(null);
  const rightTouchRef = useRef<{ id: number; sx: number; sy: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touches = Array.from(e.changedTouches);
    for (const touch of touches) {
      const isLeft = touch.clientX < SCREEN_W / 2;
      if (isLeft && !leftTouchRef.current) {
        leftTouchRef.current = { id: touch.identifier, sx: touch.clientX, sy: touch.clientY };
        setLeftJoy({ active: true, baseX: touch.clientX, baseY: touch.clientY, stickX: touch.clientX, stickY: touch.clientY });
      } else if (!isLeft && !rightTouchRef.current) {
        rightTouchRef.current = { id: touch.identifier, sx: touch.clientX, sy: touch.clientY };
        inputRef.current.shooting = true;
        setRightJoy({ active: true, baseX: touch.clientX, baseY: touch.clientY, stickX: touch.clientX, stickY: touch.clientY });
      }
    }
  }, [SCREEN_W]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touches = Array.from(e.changedTouches);
    for (const touch of touches) {
      if (leftTouchRef.current && touch.identifier === leftTouchRef.current.id) {
        const dx = touch.clientX - leftTouchRef.current.sx;
        const dy = touch.clientY - leftTouchRef.current.sy;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 5) {
          inputRef.current.dx = dx / len;
          inputRef.current.dy = dy / len;
        } else {
          inputRef.current.dx = 0;
          inputRef.current.dy = 0;
        }
        const clamp = 50;
        const cx = Math.max(-clamp, Math.min(clamp, dx));
        const cy = Math.max(-clamp, Math.min(clamp, dy));
        setLeftJoy(j => ({ ...j, stickX: j.baseX + cx, stickY: j.baseY + cy }));
      }
      if (rightTouchRef.current && touch.identifier === rightTouchRef.current.id) {
        const dx = touch.clientX - rightTouchRef.current.sx;
        const dy = touch.clientY - rightTouchRef.current.sy;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 10) {
          inputRef.current.aimAngle = Math.atan2(dy, dx) - Math.PI / 2;
          inputRef.current.shooting = true;
        }
        const clamp = 50;
        const cx = Math.max(-clamp, Math.min(clamp, dx));
        const cy = Math.max(-clamp, Math.min(clamp, dy));
        setRightJoy(j => ({ ...j, stickX: j.baseX + cx, stickY: j.baseY + cy }));
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touches = Array.from(e.changedTouches);
    for (const touch of touches) {
      if (leftTouchRef.current && touch.identifier === leftTouchRef.current.id) {
        leftTouchRef.current = null;
        inputRef.current.dx = 0;
        inputRef.current.dy = 0;
        setLeftJoy({ active: false, baseX: 0, baseY: 0, stickX: 0, stickY: 0 });
      }
      if (rightTouchRef.current && touch.identifier === rightTouchRef.current.id) {
        rightTouchRef.current = null;
        inputRef.current.shooting = false;
        setRightJoy({ active: false, baseX: 0, baseY: 0, stickX: 0, stickY: 0 });
      }
    }
  }, []);

  // Keyboard + mouse + global anti-zoom (web)
  useEffect(() => {
    if (Platform.OS !== "web") return;

    // Prevent text selection, zoom, scroll
    document.documentElement.style.userSelect = "none";
    (document.documentElement.style as any).webkitUserSelect = "none";
    document.documentElement.style.touchAction = "none";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    // Viewport meta: disable zoom
    let meta = document.querySelector("meta[name=viewport]") as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }
    meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";

    const preventZoom = (e: Event) => e.preventDefault();
    const preventContext = (e: MouseEvent) => e.preventDefault();

    document.addEventListener("gesturestart", preventZoom, { passive: false });
    document.addEventListener("gesturechange", preventZoom, { passive: false });
    document.addEventListener("gestureend", preventZoom, { passive: false });
    document.addEventListener("contextmenu", preventContext);

    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase());
      if (e.key === " " || e.key === "Shift") {
        inputRef.current.dashing = true;
        e.preventDefault();
      }
      updateMovement();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
      updateMovement();
    };
    const updateMovement = () => {
      let dx = 0, dy = 0;
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;
      inputRef.current.dx = dx;
      inputRef.current.dy = dy;
    };
    const onMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left - canvas.width / 2;
      const my = e.clientY - rect.top - canvas.height / 2;
      inputRef.current.aimAngle = Math.atan2(my, mx) - Math.PI / 2;
    };
    const onMouseDown = () => { inputRef.current.shooting = true; };
    const onMouseUp = () => { inputRef.current.shooting = false; };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      document.removeEventListener("gesturestart", preventZoom);
      document.removeEventListener("gesturechange", preventZoom);
      document.removeEventListener("gestureend", preventZoom);
      document.removeEventListener("contextmenu", preventContext);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  if (Platform.OS === "web") {
    const isTouchDevice = typeof window !== "undefined" && "ontouchstart" in window;
    return (
      <View style={styles.container}>
        <canvas
          ref={canvasRef}
          width={SCREEN_W}
          height={SCREEN_H}
          style={{
            display: "block",
            cursor: "crosshair",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          } as React.CSSProperties}
          onTouchStart={handleTouchStart as unknown as React.TouchEventHandler<HTMLCanvasElement>}
          onTouchMove={handleTouchMove as unknown as React.TouchEventHandler<HTMLCanvasElement>}
          onTouchEnd={handleTouchEnd as unknown as React.TouchEventHandler<HTMLCanvasElement>}
          onTouchCancel={handleTouchEnd as unknown as React.TouchEventHandler<HTMLCanvasElement>}
        />
        <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
          <GameHUD {...hudState} onDash={() => { inputRef.current.dashing = true; }} />
        </View>

        {/* Touch joystick overlay — visible on mobile web */}
        {isTouchDevice && (
          <>
            {/* Left: move joystick hint (when not active) */}
            {!leftJoy.active && (
              <View style={[styles.joyHint, { left: 40, bottom: 100 }]}>
                <View style={styles.joyRing}>
                  <View style={styles.joyCenterDot} />
                </View>
                <View style={styles.joyLabel}><View style={styles.joyLabelBg}><RNText style={styles.joyLabelText}>MOVE</RNText></View></View>
              </View>
            )}
            {/* Right: fire zone hint (when not active) */}
            {!rightJoy.active && (
              <View style={[styles.joyHint, { right: 40, bottom: 100 }]}>
                <View style={[styles.joyRing, { borderColor: "rgba(255,80,0,0.5)" }]}>
                  <View style={[styles.joyCenterDot, { backgroundColor: "rgba(255,80,0,0.4)" }]} />
                </View>
                <View style={styles.joyLabel}><View style={styles.joyLabelBg}><RNText style={styles.joyLabelText}>AIM + FIRE</RNText></View></View>
              </View>
            )}
            {/* Active left joystick */}
            {leftJoy.active && (
              <View style={[styles.joyActive, { left: leftJoy.baseX - 55, top: leftJoy.baseY - 55 }]}>
                <View style={styles.joyActiveRing} />
                <View style={[styles.joyActiveStick, {
                  left: (leftJoy.stickX - leftJoy.baseX) + 55 - 18,
                  top: (leftJoy.stickY - leftJoy.baseY) + 55 - 18,
                }]} />
              </View>
            )}
            {/* Active right joystick */}
            {rightJoy.active && (
              <View style={[styles.joyActive, { left: rightJoy.baseX - 55, top: rightJoy.baseY - 55 }]}>
                <View style={[styles.joyActiveRing, { borderColor: "rgba(255,100,0,0.7)" }]} />
                <View style={[styles.joyActiveStick, {
                  backgroundColor: "rgba(255,100,0,0.7)",
                  left: (rightJoy.stickX - rightJoy.baseX) + 55 - 18,
                  top: (rightJoy.stickY - rightJoy.baseY) + 55 - 18,
                }]} />
              </View>
            )}
          </>
        )}
      </View>
    );
  }

  // Native: Load web version in WebView so canvas renders properly on iOS/Android
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

// Text component alias to avoid import collision
import { Text as RNText } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0806",
  },
  // Joystick idle hint
  joyHint: {
    position: "absolute",
    alignItems: "center",
    pointerEvents: "none",
  },
  joyRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  joyCenterDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  joyLabel: {
    marginTop: 8,
    alignItems: "center",
  },
  joyLabelBg: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  joyLabelText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  // Active joystick
  joyActive: {
    position: "absolute",
    width: 110,
    height: 110,
    pointerEvents: "none",
  },
  joyActiveRing: {
    position: "absolute",
    top: 0, left: 0,
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  joyActiveStick: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
});
