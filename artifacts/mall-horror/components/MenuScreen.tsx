import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Draw a static mall background on a canvas (web only) ─────────────────────
function drawMenuBackground(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H * 0.52;

  // ── Tile floor ──────────────────────────────────────────────────────────────
  const T = 52;
  for (let r = 0; r <= Math.ceil(H / T); r++) {
    for (let c = 0; c <= Math.ceil(W / T); c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? "#13110f" : "#100e0c";
      ctx.fillRect(c * T, r * T, T, T);
      ctx.strokeStyle = "#1b1916";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(c * T, r * T, T, T);
    }
  }

  // ── Neon storefront glows at edges ──────────────────────────────────────────
  const neons: { x: number; y: number; color: string }[] = [
    { x: 0,         y: H * 0.45, color: "#ff0066" },
    { x: W,         y: H * 0.55, color: "#00ffcc" },
    { x: W * 0.18,  y: H,        color: "#ff8800" },
    { x: W * 0.82,  y: H,        color: "#4466ff" },
    { x: W * 0.5,   y: 0,        color: "#ff22ff" },
    { x: W * 0.3,   y: H,        color: "#00ff88" },
    { x: W * 0.75,  y: 0,        color: "#ffcc00" },
  ];
  for (const { x, y, color } of neons) {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, 280);
    gr.addColorStop(0, color + "44");
    gr.addColorStop(0.5, color + "11");
    gr.addColorStop(1, "transparent");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Flashlight cone from centre (as if Roomba is shining it) ────────────────
  const lightAngle = Math.PI * 0.62;
  const halfFov = Math.PI / 3.5;
  const gr2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.9);
  gr2.addColorStop(0,   "rgba(255,230,190,0.22)");
  gr2.addColorStop(0.55,"rgba(255,220,170,0.05)");
  gr2.addColorStop(1,   "transparent");
  ctx.save();
  ctx.fillStyle = gr2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, H * 0.9, lightAngle - halfFov, lightAngle + halfFov);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ── Enemy silhouettes lurking in the fog ────────────────────────────────────
  const enemies = [
    { x: cx - 240, y: cy - 90,  r: 24, a: 0.15 },
    { x: cx + 200, y: cy + 100, r: 20, a: 0.12 },
    { x: cx - 120, y: cy + 220, r: 28, a: 0.10 },
    { x: cx + 300, y: cy - 200, r: 17, a: 0.13 },
    { x: cx - 350, y: cy + 160, r: 22, a: 0.09 },
  ];
  for (const { x, y, r, a } of enemies) {
    ctx.save();
    ctx.globalAlpha = a;
    // Body
    ctx.fillStyle = "#880000";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs
    ctx.strokeStyle = "#660000";
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * r * 2.4, y + Math.sin(ang) * r * 1.8);
      ctx.stroke();
    }
    // Glowing eyes
    ctx.globalAlpha = a * 3;
    ctx.fillStyle = "#ff2200";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x - r * 0.22, y - r * 0.18, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + r * 0.22, y - r * 0.18, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Central Roomba silhouette ────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#4a3a2c";
  ctx.shadowColor = "#eecc88";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cx, cy, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Roomba detail ring
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#6a5a44";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.stroke();
  // Central LED
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#ff2200";
  ctx.shadowColor = "#ff0000";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Fog of war overlay ───────────────────────────────────────────────────────
  const fog = ctx.createRadialGradient(cx, cy, 40, cx, cy, Math.max(W, H) * 0.75);
  fog.addColorStop(0,    "rgba(0,0,0,0)");
  fog.addColorStop(0.3,  "rgba(0,0,0,0.2)");
  fog.addColorStop(0.65, "rgba(0,0,0,0.62)");
  fog.addColorStop(1,    "rgba(0,0,0,0.97)");
  ctx.fillStyle = fog;
  ctx.fillRect(0, 0, W, H);
}

interface MenuScreenProps {
  onStart: () => void;
  highScore: number;
  bestWave: number;
}

export function MenuScreen({ onStart, highScore, bestWave }: MenuScreenProps) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flickerAnim = useRef(new Animated.Value(1)).current;
  const glitchAnim = useRef(new Animated.Value(0)).current;

  // ── Draw background canvas (web only) ──────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    drawMenuBackground(canvas);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(flickerAnim, { toValue: 0.6, duration: 120, useNativeDriver: true }),
        Animated.timing(flickerAnim, { toValue: 1.0, duration: 80, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(flickerAnim, { toValue: 0.4, duration: 80, useNativeDriver: true }),
        Animated.timing(flickerAnim, { toValue: 1.0, duration: 60, useNativeDriver: true }),
        Animated.delay(3000),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(4000),
        Animated.timing(glitchAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Mall background canvas (web only) */}
      {isWeb && (
        <canvas
          ref={bgCanvasRef as React.RefObject<HTMLCanvasElement>}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" } as React.CSSProperties}
        />
      )}
      {/* Background scanlines effect */}
      <View style={styles.scanlines} />

      {/* Flickering mall name */}
      <Animated.View style={[styles.mallNameContainer, { opacity: flickerAnim }]}>
        <Text style={styles.mallName}>WESTFIELD DEAD</Text>
        <Text style={styles.mallSubName}>SHOPPING CENTRE</Text>
      </Animated.View>

      {/* Title */}
      <Animated.View style={[styles.titleContainer, { transform: [{ translateX: glitchAnim }] }]}>
        <Animated.Text style={[styles.title, { transform: [{ scale: pulseAnim }] }]}>
          MALL{"\n"}HORROR
        </Animated.Text>
        <Text style={styles.subtitle}>SURVIVAL SHOOTER</Text>
      </Animated.View>

      {/* Decorative bugs */}
      <View style={styles.bugsRow}>
        <Text style={styles.bugIcon}>●</Text>
        <Text style={styles.bugIcon}>●</Text>
        <Text style={styles.bugIcon}>●</Text>
      </View>

      {/* High score */}
      {(highScore > 0 || bestWave > 0) && (
        <View style={styles.recordBox}>
          <Text style={styles.recordLabel}>BEST RUN</Text>
          <View style={styles.recordRow}>
            <View style={styles.recordItem}>
              <Text style={styles.recordValue}>{highScore.toLocaleString()}</Text>
              <Text style={styles.recordSub}>SCORE</Text>
            </View>
            <View style={styles.recordDivider} />
            <View style={styles.recordItem}>
              <Text style={styles.recordValue}>{bestWave}</Text>
              <Text style={styles.recordSub}>WAVE</Text>
            </View>
          </View>
        </View>
      )}

      {/* Start button */}
      <TouchableOpacity style={styles.startButton} onPress={onStart} activeOpacity={0.8}>
        <Text style={styles.startText}>[ ENTER MALL ]</Text>
      </TouchableOpacity>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instrTitle}>HOW TO SURVIVE</Text>
        <Text style={styles.instrText}>
          {Platform.OS === "web"
            ? "WASD/Arrows: Move   Mouse: Aim + Flashlight   Click: Fire   Space: Dash"
            : "Left stick: Move + Flashlight   Right stick: Shoot direction   Tap right: Auto-aim"}
        </Text>
        <Text style={styles.instrText}>Kill {100} insects to break the BOSS SHIELD, then destroy the boss</Text>
        <Text style={styles.instrText}>Collect ELITE drops  |  No healing  |  Survive as long as you can</Text>
      </View>

      {/* Warning footer */}
      <Text style={styles.warning}>WARNING: INFESTATION LEVEL CRITICAL</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050403",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  scanlines: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
    // CSS scanlines pattern via opacity
  },
  mallNameContainer: {
    alignItems: "center",
  },
  mallName: {
    color: "#ff6600",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 4,
  },
  mallSubName: {
    color: "#ff4400",
    fontSize: 8,
    letterSpacing: 3,
  },
  titleContainer: {
    alignItems: "center",
    gap: 4,
  },
  title: {
    color: "#cc0000",
    fontSize: 72,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 70,
    letterSpacing: -2,
    textShadowColor: "#ff0000",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    color: "#880000",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 8,
  },
  bugsRow: {
    flexDirection: "row",
    gap: 16,
  },
  bugIcon: {
    color: "#1a5c1a",
    fontSize: 16,
    textShadowColor: "#2aff2a",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  recordBox: {
    backgroundColor: "rgba(20,5,5,0.9)",
    borderWidth: 1,
    borderColor: "#3a1010",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    gap: 8,
    width: "100%",
    maxWidth: 280,
  },
  recordLabel: {
    color: "#666",
    fontSize: 9,
    letterSpacing: 3,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  recordItem: {
    alignItems: "center",
    gap: 2,
  },
  recordValue: {
    color: "#ff4444",
    fontSize: 28,
    fontWeight: "700",
  },
  recordSub: {
    color: "#666",
    fontSize: 9,
    letterSpacing: 2,
  },
  recordDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#3a1010",
  },
  startButton: {
    borderWidth: 2,
    borderColor: "#cc0000",
    borderRadius: 6,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: "rgba(80,0,0,0.4)",
  },
  startText: {
    color: "#ff4444",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 4,
  },
  instructions: {
    backgroundColor: "rgba(10,5,5,0.8)",
    borderWidth: 1,
    borderColor: "#2a1010",
    borderRadius: 6,
    padding: 12,
    gap: 4,
    width: "100%",
    maxWidth: 380,
  },
  instrTitle: {
    color: "#884422",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
    marginBottom: 2,
  },
  instrText: {
    color: "#664433",
    fontSize: 10,
    textAlign: "center",
  },
  warning: {
    color: "#330000",
    fontSize: 9,
    letterSpacing: 3,
  },
});
