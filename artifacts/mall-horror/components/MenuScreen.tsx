import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICON = require("../assets/images/icon.png");

function drawBg(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const cx = W / 2;

  // Dark base
  ctx.fillStyle = "#060404";
  ctx.fillRect(0, 0, W, H);

  // Tile floor — full coverage, symmetrical
  const T = 48;
  for (let r = 0; r <= Math.ceil(H / T); r++) {
    for (let c = 0; c <= Math.ceil(W / T); c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? "#0f0d0b" : "#0c0a09";
      ctx.fillRect(c * T, r * T, T, T);
      ctx.strokeStyle = "#161210";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(c * T, r * T, T, T);
    }
  }

  // Symmetrical neon glows — mirrored left/right, top/bottom pairs
  const neons = [
    // Left/right wall glows — mirrored
    { x: 0,    y: H * 0.35, color: "#ff0055", r: 320 },
    { x: W,    y: H * 0.35, color: "#ff0055", r: 320 },
    { x: 0,    y: H * 0.70, color: "#0088ff", r: 260 },
    { x: W,    y: H * 0.70, color: "#0088ff", r: 260 },
    // Top/bottom center glow
    { x: cx,   y: 0,        color: "#ff44aa", r: 280 },
    { x: cx,   y: H,        color: "#4400ff", r: 300 },
    // Corner accent — mirrored
    { x: W * 0.25, y: H, color: "#00ffaa", r: 220 },
    { x: W * 0.75, y: H, color: "#00ffaa", r: 220 },
  ];
  for (const { x, y, color, r } of neons) {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, color + "33");
    gr.addColorStop(0.5, color + "0d");
    gr.addColorStop(1, "transparent");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
  }

  // Upward flashlight cone from bottom-centre — perfectly symmetrical
  const coneX = cx, coneY = H;
  const halfFov = Math.PI / 5;
  const gr2 = ctx.createRadialGradient(coneX, coneY, 0, coneX, coneY, H * 1.1);
  gr2.addColorStop(0,    "rgba(255,230,190,0.18)");
  gr2.addColorStop(0.45, "rgba(255,215,160,0.05)");
  gr2.addColorStop(1,    "transparent");
  ctx.save();
  ctx.fillStyle = gr2;
  ctx.beginPath();
  ctx.moveTo(coneX, coneY);
  const coneAngle = -Math.PI / 2;
  ctx.arc(coneX, coneY, H * 1.1, coneAngle - halfFov, coneAngle + halfFov);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Enemy silhouettes — symmetrical pairs about centre-x
  const pairs = [
    { dx: 190, y: H * 0.30, r: 20, a: 0.13 },
    { dx: 110, y: H * 0.55, r: 16, a: 0.10 },
    { dx: 300, y: H * 0.60, r: 14, a: 0.08 },
  ];
  for (const { dx, y, r, a } of pairs) {
    for (const x of [cx - dx, cx + dx]) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = "#8b0000";
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#550000";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ang) * r * 2.3, y + Math.sin(ang) * r * 1.7);
        ctx.stroke();
      }
      ctx.globalAlpha = a * 3.5;
      ctx.fillStyle = "#ff2200";
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = 8;
      for (const ex of [-r * 0.22, r * 0.22]) {
        ctx.beginPath();
        ctx.arc(x + ex, y - r * 0.18, r * 0.11, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Heavy vignette
  const vig = ctx.createRadialGradient(cx, H * 0.45, H * 0.15, cx, H * 0.45, Math.max(W, H) * 0.85);
  vig.addColorStop(0,    "rgba(0,0,0,0)");
  vig.addColorStop(0.4,  "rgba(0,0,0,0.28)");
  vig.addColorStop(0.75, "rgba(0,0,0,0.70)");
  vig.addColorStop(1,    "rgba(0,0,0,0.96)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

interface MenuScreenProps {
  onStart: () => void;
  highScore: number;
  bestWave: number;
}

export function MenuScreen({ onStart, highScore, bestWave }: MenuScreenProps) {
  const insets = useSafeAreaInsets();
  const isWeb  = Platform.OS === "web";
  const topPad = isWeb ? 24 : Math.max(insets.top, 24);
  const botPad = isWeb ? 24 : Math.max(insets.bottom, 16);

  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const flickerAnim = useRef(new Animated.Value(1)).current;
  const glitchAnim  = useRef(new Animated.Value(0)).current;
  const iconGlow    = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    drawBg(canvas);
  }, []);

  useEffect(() => {
    // Button pulse
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.00, duration: 900, useNativeDriver: true }),
    ])).start();

    // Neon flicker on title area
    Animated.loop(Animated.sequence([
      Animated.timing(flickerAnim, { toValue: 0.55, duration: 100, useNativeDriver: true }),
      Animated.timing(flickerAnim, { toValue: 1.00, duration: 80,  useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(flickerAnim, { toValue: 0.40, duration: 60,  useNativeDriver: true }),
      Animated.timing(flickerAnim, { toValue: 1.00, duration: 60,  useNativeDriver: true }),
      Animated.delay(3800),
    ])).start();

    // Glitch shift on title
    Animated.loop(Animated.sequence([
      Animated.delay(5000),
      Animated.timing(glitchAnim, { toValue:  5, duration: 40, useNativeDriver: true }),
      Animated.timing(glitchAnim, { toValue: -5, duration: 40, useNativeDriver: true }),
      Animated.timing(glitchAnim, { toValue:  0, duration: 40, useNativeDriver: true }),
    ])).start();

    // Icon breathing glow
    Animated.loop(Animated.sequence([
      Animated.timing(iconGlow, { toValue: 1.0, duration: 1400, useNativeDriver: true }),
      Animated.timing(iconGlow, { toValue: 0.5, duration: 1400, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: botPad }]}>
      {/* Canvas background (web) */}
      {isWeb && (
        <canvas
          ref={bgCanvasRef as React.RefObject<HTMLCanvasElement>}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" } as React.CSSProperties}
        />
      )}
      {/* Native fallback — solid dark bg */}
      {!isWeb && <View style={styles.nativeBg} />}

      {/* ── Scanline overlay ── */}
      <View style={styles.scanlines} pointerEvents="none" />

      {/* ── Location tag (top, centred) ── */}
      <Animated.View style={[styles.locationTag, { opacity: flickerAnim }]}>
        <Text style={styles.locationText}>WESTFIELD DEAD MALL</Text>
        <View style={styles.locationDivider} />
        <Text style={styles.locationSub}>INFESTATION ZONE · SECTOR 7</Text>
      </Animated.View>

      {/* ── Hero icon ── */}
      <Animated.View style={[styles.iconWrapper, { opacity: iconGlow }]}>
        <Image source={ICON} style={styles.icon} resizeMode="contain" />
      </Animated.View>

      {/* ── Main title ── */}
      <Animated.View style={[styles.titleBlock, { transform: [{ translateX: glitchAnim }] }]}>
        <Text style={styles.titleSmall}>I AM</Text>
        <Animated.Text style={[styles.titleBig, { transform: [{ scale: pulseAnim }] }]}>
          ROOMBA
        </Animated.Text>
        <View style={styles.titleRule} />
        <Text style={styles.tagline}>SURVIVE · EXTERMINATE · ENDURE</Text>
      </Animated.View>

      {/* ── Best run stats ── */}
      {(highScore > 0 || bestWave > 0) && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{highScore.toLocaleString()}</Text>
            <Text style={styles.statLabel}>BEST SCORE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{bestWave}</Text>
            <Text style={styles.statLabel}>BEST WAVE</Text>
          </View>
        </View>
      )}

      {/* ── Start button ── */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }], width: "100%", maxWidth: 300, alignSelf: "center" }}>
        <TouchableOpacity style={styles.startBtn} onPress={onStart} activeOpacity={0.75}>
          <Text style={styles.startText}>ENTER MALL</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Footer warning ── */}
      <Text style={styles.footer}>⚠  INFESTATION LEVEL: CRITICAL</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050303",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 28,
  },
  nativeBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#050303",
  },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    opacity: 0.06,
  },

  // Location tag
  locationTag: { alignItems: "center", gap: 4 },
  locationText: {
    color: "#ff5500",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 5,
    textShadowColor: "#ff4400",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  locationDivider: {
    width: 40,
    height: 1,
    backgroundColor: "#ff3300",
    opacity: 0.5,
  },
  locationSub: {
    color: "#993300",
    fontSize: 9,
    letterSpacing: 3,
  },

  // Icon
  iconWrapper: {
    shadowColor: "#ff0000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 20,
  },
  icon: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },

  // Title
  titleBlock: { alignItems: "center", gap: 6 },
  titleSmall: {
    color: "#cc2200",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 18,
    textShadowColor: "#ff0000",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  titleBig: {
    color: "#ff1111",
    fontSize: 68,
    fontWeight: "900",
    letterSpacing: 4,
    lineHeight: 66,
    textShadowColor: "#ff0000",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 28,
  },
  titleRule: {
    width: "80%",
    height: 1,
    backgroundColor: "#550000",
    marginVertical: 2,
  },
  tagline: {
    color: "#661111",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 4,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a0808",
    borderRadius: 10,
    backgroundColor: "rgba(15,3,3,0.85)",
    paddingVertical: 12,
    paddingHorizontal: 28,
    gap: 0,
    width: "100%",
    maxWidth: 300,
  },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statValue: {
    color: "#ff3333",
    fontSize: 26,
    fontWeight: "900",
    textShadowColor: "#ff0000",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  statLabel: { color: "#553333", fontSize: 9, letterSpacing: 2, fontWeight: "700" },
  statDivider: { width: 1, height: 36, backgroundColor: "#2a0808" },

  // Start button
  startBtn: {
    borderWidth: 2,
    borderColor: "#cc0000",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "rgba(90,0,0,0.45)",
    shadowColor: "#ff0000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  startText: {
    color: "#ff4444",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 6,
    textShadowColor: "#ff0000",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  footer: {
    color: "#3a0808",
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: "700",
  },
});
