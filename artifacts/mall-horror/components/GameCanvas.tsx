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
    dx: 0,
    dy: 0,
    aimAngle: -Math.PI / 2,
    shooting: false,
    dashing: false,
  });
  const lastTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const deathRef = useRef(false);
  const hudTickRef = useRef(0);

  const [hudState, setHudState] = useState<HUDState>(DEFAULT_HUD);

  const gameLoop = useCallback((timestamp: number) => {
    const dt = Math.min(lastTimeRef.current ? timestamp - lastTimeRef.current : 16, 50);
    lastTimeRef.current = timestamp;

    const newState = updateGame(stateRef.current, dt, inputRef.current);
    stateRef.current = newState;
    inputRef.current.dashing = false;

    if (newState.phase === "dead" && !deathRef.current) {
      deathRef.current = true;
      onDeath(newState);
      return;
    }

    if (Platform.OS === "web" && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        renderFrame(ctx, newState, canvasRef.current.width, canvasRef.current.height);
      }
    }

    hudTickRef.current += dt;
    if (hudTickRef.current > 100) {
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
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [gameLoop]);

  // Touch controls for web canvas
  const leftTouchRef = useRef<{ id: number; sx: number; sy: number } | null>(null);
  const rightTouchRef = useRef<{ id: number; sx: number; sy: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = Array.from(e.changedTouches);
    for (const touch of touches) {
      const isLeft = touch.clientX < SCREEN_W / 2;
      if (isLeft && !leftTouchRef.current) {
        leftTouchRef.current = { id: touch.identifier, sx: touch.clientX, sy: touch.clientY };
      } else if (!isLeft && !rightTouchRef.current) {
        rightTouchRef.current = { id: touch.identifier, sx: touch.clientX, sy: touch.clientY };
        inputRef.current.shooting = true;
      }
    }
    e.preventDefault();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
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
      }
      if (rightTouchRef.current && touch.identifier === rightTouchRef.current.id) {
        const dx = touch.clientX - rightTouchRef.current.sx;
        const dy = touch.clientY - rightTouchRef.current.sy;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 10) {
          inputRef.current.aimAngle = Math.atan2(dy, dx) - Math.PI / 2;
          inputRef.current.shooting = true;
        }
      }
    }
    e.preventDefault();
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touches = Array.from(e.changedTouches);
    for (const touch of touches) {
      if (leftTouchRef.current && touch.identifier === leftTouchRef.current.id) {
        leftTouchRef.current = null;
        inputRef.current.dx = 0;
        inputRef.current.dy = 0;
      }
      if (rightTouchRef.current && touch.identifier === rightTouchRef.current.id) {
        rightTouchRef.current = null;
        inputRef.current.shooting = false;
      }
    }
    e.preventDefault();
  }, []);

  // Keyboard + mouse controls (web)
  useEffect(() => {
    if (Platform.OS !== "web") return;
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
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <canvas
          ref={canvasRef}
          width={SCREEN_W}
          height={SCREEN_H}
          style={{ display: "block", cursor: "crosshair" }}
          onTouchStart={handleTouchStart as unknown as React.TouchEventHandler<HTMLCanvasElement>}
          onTouchMove={handleTouchMove as unknown as React.TouchEventHandler<HTMLCanvasElement>}
          onTouchEnd={handleTouchEnd as unknown as React.TouchEventHandler<HTMLCanvasElement>}
        />
        <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
          <GameHUD {...hudState} onDash={() => { inputRef.current.dashing = true; }} />
        </View>
      </View>
    );
  }

  // Native: Load web version in WebView so canvas renders properly on iOS/Android
  const webUrl = (Constants.expoConfig?.extra as any)?.webUrl;
  const gameUrl = webUrl ? `${webUrl}/game` : null;

  if (!gameUrl) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <View style={{ padding: 24 }}>
          <GameHUD {...hudState} onDash={() => {}} />
        </View>
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
  container: {
    flex: 1,
    backgroundColor: "#0a0806",
  },
});
