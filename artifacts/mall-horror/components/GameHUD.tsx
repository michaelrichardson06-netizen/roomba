import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MALL_NAME = "WESTVIEW MALL";

const ZONE_NAMES: string[][] = [
  ["West Wing",      "North Entrance",   "Electronics Wing"],
  ["Food Court",     "Central Atrium",   "East Corridor"   ],
  ["South Arcade",   "South Promenade",  "Parking Access"  ],
];

function getMallZone(x: number, y: number): string {
  const col = x < 1000 ? 0 : x < 2000 ? 1 : 2;
  const row = y < 1000 ? 0 : y < 2000 ? 1 : 2;
  return ZONE_NAMES[row][col];
}

interface GameHUDProps {
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
  speedBoost: number;
  dashCooldown: number;
  spawnGrace: number;
  showDash?: boolean;
  playerX: number;
  playerY: number;
  brushes: number;
  level: number;
  rankName: string;
  rankColor: string;
  xpPct: number;
  onDash: () => void;
  onPause: () => void;
}

export function GameHUD({
  hp, maxHp, battery, maxBattery, berserkerTimer,
  score, wave, killCount, waveTotalKills,
  tripleShot, quadShot, rapidFireStacks, bazookaMode, lightningStrike, speedBoost,
  dashCooldown, spawnGrace, showDash, playerX, playerY,
  brushes, level, rankName, rankColor, xpPct,
  onDash, onPause,
}: GameHUDProps) {
  const insets = useSafeAreaInsets();
  const isWeb  = Platform.OS === "web";

  const prevScoreRef  = useRef(score);
  const [scoreDelta, setScoreDelta] = useState(0);
  const popOpacity    = useRef(new Animated.Value(0)).current;
  const popTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delta = score - prevScoreRef.current;
    prevScoreRef.current = score;
    if (delta <= 0) return;
    setScoreDelta(delta);
    popOpacity.setValue(1);
    popTranslateY.setValue(0);
    Animated.parallel([
      Animated.timing(popOpacity,    { toValue: 0, duration: 1100, useNativeDriver: true }),
      Animated.timing(popTranslateY, { toValue: -30, duration: 1100, useNativeDriver: true }),
    ]).start();
  }, [score]);

  const topPad    = Math.max(insets.top, isWeb ? 10 : 0);
  const hudTopPad = topPad + 38;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const hpRatio      = hp / maxHp;
  const hpColor      = hpRatio > 0.5 ? "#33dd55" : hpRatio > 0.25 ? "#ffaa00" : "#ff2222";
  const waveProgress = killCount / waveTotalKills;
  const batteryRatio = battery / maxBattery;
  const batteryColor = batteryRatio > 0.5 ? "#44ffaa" : batteryRatio > 0.2 ? "#ffcc00" : "#ff4400";
  const shieldColor  = waveProgress < 0.4 ? "#4499ff" : waveProgress < 0.8 ? "#ff9900" : "#ff3300";
  const isBerserking = berserkerTimer > 0;
  const berserkSecs  = Math.ceil(berserkerTimer / 1000);
  const lowBattery   = batteryRatio < 0.2;
  const mallZone     = getMallZone(playerX, playerY);

  return (
    <View style={styles.container} pointerEvents="box-none">

      {/* ── Berserker border flash ── */}
      {isBerserking && (
        <View style={styles.berserkerOverlay} pointerEvents="none" />
      )}

      {/* ══ MAIN HUD PANEL ══════════════════════════════════════════════════ */}
      <View style={[styles.hudPanel, { paddingTop: hudTopPad + 4 }]}>

        {/* ── Mall name + zone header ── */}
        <View style={[styles.mallHeader, { top: topPad + 3 }]} pointerEvents="none">
          <Text style={styles.mallName}>{MALL_NAME}</Text>
          <View style={styles.mallDivider} />
          <Text style={styles.mallZone} numberOfLines={1}>{mallZone}</Text>
        </View>

        {/* ── Pause button (left of sound DOM button) ── */}
        <TouchableOpacity
          style={[styles.pauseBtn, { top: topPad + 3 }]}
          onPress={onPause}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.pauseBtnText}>{"[ \u275a\u275a ]"}</Text>
        </TouchableOpacity>

        <View style={styles.panelInner}>

          {/* ── LEFT: stat bars ── */}
          <View style={styles.statsCol}>

            {/* HP */}
            <View style={styles.statRow}>
              <Text style={[styles.statIcon, { color: hpColor }]}>❤</Text>
              <View style={styles.statTrack}>
                <View style={[styles.statFill, { width: `${hpRatio * 100}%` as any, backgroundColor: hpColor }]} />
              </View>
              <Text style={[styles.statVal, { color: hpColor }]}>{Math.ceil(hp)}</Text>
            </View>

            {/* Battery */}
            <View style={styles.statRow}>
              <Text style={[styles.statIcon, { color: batteryColor }]}>
                {lowBattery ? "⚠" : "⚡"}
              </Text>
              <View style={styles.statTrack}>
                <View style={[styles.statFill, { width: `${batteryRatio * 100}%` as any, backgroundColor: batteryColor }]} />
              </View>
              <Text style={[styles.statVal, { color: batteryColor }]}>{Math.ceil(battery)}%</Text>
            </View>

            {/* ── separator before boss row ── */}
            <View style={styles.bossRowSep} />

            {/* Boss shield */}
            <View style={styles.statRow}>
              <Text style={[styles.statIcon, { color: waveProgress < 1 ? "#bb88ff" : "#ff2222" }]}>💀</Text>
              <View style={[styles.statTrack, { borderColor: "rgba(160,80,255,0.25)" }]}>
                <View style={[styles.statFill, {
                  width: `${(1 - Math.min(waveProgress, 1)) * 100}%` as any,
                  backgroundColor: shieldColor,
                }]} />
              </View>
              <Text style={[styles.statVal, { color: shieldColor }]}>
                {killCount}/{waveTotalKills}
              </Text>
            </View>

          </View>

          {/* ── DIVIDER ── */}
          <View style={styles.divider} />

          {/* ── RIGHT: Wave + Score + Brushes + Level ── */}
          <View style={styles.waveCol}>
            <Text style={styles.waveNum}>{wave}</Text>
            <Text style={styles.waveLabel}>WAVE</Text>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreRow}>
              <Text style={styles.scoreNum}>{score.toLocaleString()}</Text>
              <Animated.Text style={[styles.scorePop, {
                opacity: popOpacity,
                transform: [{ translateY: popTranslateY }],
              }]}>
                +{scoreDelta.toLocaleString()}
              </Animated.Text>
            </View>
            <View style={styles.scoreDivider} />
            {/* Brushes row */}
            <View style={styles.brushRow}>
              <Text style={styles.brushIcon}>🪙</Text>
              <Text style={styles.brushNum}>{brushes}</Text>
            </View>
            {/* Level + rank strip */}
            <Text style={[styles.levelText, { color: rankColor }]}>Lv{level} {rankName}</Text>
            {/* XP progress bar */}
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${Math.min(1, xpPct) * 100}%` as any, backgroundColor: rankColor }]} />
            </View>
          </View>

        </View>

        {/* ── Berserker timer strip ── */}
        {isBerserking && (
          <View style={styles.berserkStrip}>
            <View style={styles.berserkTrack}>
              <View style={[styles.berserkFill, {
                width: `${(berserkerTimer / (berserkSecs <= 15 ? 15000 : 30000)) * 100}%` as any,
              }]} />
            </View>
            <Text style={styles.berserkLabel}>🔥 BERSERK {berserkSecs}s 🔥</Text>
          </View>
        )}

      </View>
      {/* ══ END HUD PANEL ═══════════════════════════════════════════════════ */}

      {/* ── Grace + objective ── */}
      {spawnGrace > 0 && (
        <View style={styles.graceRow}>
          {wave === 1 && (
            <Text style={styles.objectiveText}>SURVIVE AS MANY WAVES AS POSSIBLE!</Text>
          )}
          <Text style={styles.graceText}>ENEMIES INCOMING IN {Math.ceil(spawnGrace / 1000)}...</Text>
        </View>
      )}

      {/* ── Active buff badges ── */}
      <View style={styles.buffRow}>
        {isBerserking && <BuffBadge label={`BERSERK ${berserkSecs}s`} color="#ff0044" />}
        {tripleShot && !quadShot && <BuffBadge label="3×" color="#00e5ff" />}
        {quadShot && <BuffBadge label="4×" color="#7c4dff" />}
        {rapidFireStacks > 0 && <BuffBadge label={`R×${rapidFireStacks}`} color="#ffea00" />}
        {bazookaMode && !isBerserking && <BuffBadge label="BAZOOKA" color="#ff6d00" />}
        {lightningStrike && <BuffBadge label="⚡ CHAIN" color="#88eeff" />}
        {speedBoost > 0 && <BuffBadge label={`SPD ${Math.ceil(speedBoost / 1000)}s`} color="#00ff88" />}
      </View>

      {/* ── Dash button ── */}
      {(Platform.OS !== "web" || showDash) && (
        <View style={[styles.bottomControls, { paddingBottom: bottomPad + 8 }]}>
          <TouchableOpacity
            style={[styles.dashButton, dashCooldown > 0 && styles.dashButtonCooldown]}
            onPress={onDash}
            activeOpacity={0.7}
          >
            <Text style={styles.dashButtonText}>{dashCooldown <= 0 ? "[ DASH ]" : "·····"}</Text>
          </TouchableOpacity>
        </View>
      )}

    </View>
  );
}

function BuffBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.buffBadge, { borderColor: color }]}>
      <Text style={[styles.buffBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },

  berserkerOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 6,
    borderColor: "rgba(255,0,50,0.35)",
  },

  // ── Mall name + zone header ───────────────────────────────────────────────
  mallHeader: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mallName: {
    fontFamily: "monospace",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 2,
    color: "#c8a84b",
    opacity: 0.9,
    textTransform: "uppercase",
  },
  mallDivider: {
    width: 1,
    height: 10,
    backgroundColor: "rgba(180,120,40,0.45)",
  },
  mallZone: {
    fontFamily: "monospace",
    fontSize: 9,
    letterSpacing: 0.8,
    color: "#88aacc",
    opacity: 0.85,
    flex: 1,
    textTransform: "uppercase",
  },

  // ── HUD panel ─────────────────────────────────────────────────────────────
  hudPanel: {
    backgroundColor: "rgba(4, 1, 1, 0.88)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(180, 25, 0, 0.55)",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },

  panelInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // ── Stat bars (left column) ───────────────────────────────────────────────
  statsCol: { flex: 1, gap: 6 },
  bossRowSep: {
    height: 1,
    backgroundColor: "rgba(160,80,255,0.22)",
    marginVertical: 1,
  },

  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statIcon: {
    fontSize: 12,
    width: 16,
    textAlign: "center",
  },
  statTrack: {
    flex: 1,
    height: 10,
    backgroundColor: "#0e0808",
    borderRadius: 2,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  statFill: { height: "100%", borderRadius: 1 },
  statVal: {
    fontSize: 10,
    fontWeight: "700",
    width: 40,
    textAlign: "right",
    letterSpacing: 0.5,
    fontVariant: ["tabular-nums"] as any,
    textShadow: "0 1px 4px rgba(0,0,0,0.99)" as any,
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(180, 25, 0, 0.35)",
    marginVertical: 2,
  },

  // ── Wave + Score (right column) ───────────────────────────────────────────
  waveCol: {
    alignItems: "center",
    minWidth: 72,
  },
  waveNum: {
    color: "#ff5533",
    fontSize: 48,
    fontWeight: "900",
    lineHeight: 50,
    letterSpacing: 1,
    textShadow: "0 0 22px rgba(255,60,20,0.85), 0 0 8px rgba(255,60,20,0.5), 0 2px 4px rgba(0,0,0,0.99)" as any,
  },
  waveLabel: {
    color: "rgba(255,100,60,0.65)",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 5,
    marginTop: -5,
  },
  scoreDivider: {
    height: 1,
    width: "75%",
    backgroundColor: "rgba(255,60,20,0.2)",
    marginVertical: 5,
  },
  scoreRow: { position: "relative", alignItems: "center" },
  scoreNum: {
    color: "#ffffffcc",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"] as any,
    textShadow: "0 1px 4px rgba(0,0,0,0.99)" as any,
  },
  scorePop: {
    position: "absolute",
    top: -2,
    color: "#ffee44",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textShadow: "0 0 8px rgba(255,220,0,0.9), 0 1px 3px rgba(0,0,0,0.99)" as any,
    pointerEvents: "none" as any,
  },

  // ── Berserker strip inside panel ──────────────────────────────────────────
  berserkStrip: { marginTop: 7, gap: 3 },
  berserkTrack: {
    height: 6,
    backgroundColor: "#330011",
    borderRadius: 2,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ff0044",
  },
  berserkFill:  { height: "100%", backgroundColor: "#ff0044", borderRadius: 1 },
  berserkLabel: {
    color: "#ff0044",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    textAlign: "center",
    textShadow: "0 0 8px rgba(255,0,68,0.8)" as any,
  },

  // ── Below-panel elements ──────────────────────────────────────────────────
  graceRow:      { alignItems: "center", paddingTop: 8, gap: 4 },
  objectiveText: { color: "#00cfff", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textAlign: "center", opacity: 0.9 },
  graceText:     { color: "#ff8800", fontSize: 13, fontWeight: "700", letterSpacing: 1 },

  buffRow:       { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 14, paddingTop: 6, gap: 6 },
  buffBadge:     { borderWidth: 1, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: "rgba(0,0,0,0.7)" },
  buffBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },

  // ── Brushes + level (inside waveCol) ─────────────────────────────────────
  brushRow:  { flexDirection: "row", alignItems: "center", gap: 3 },
  brushIcon: { fontSize: 11 },
  brushNum:  { color: "#ffd700", fontSize: 13, fontWeight: "900", letterSpacing: 1, fontVariant: ["tabular-nums"] as any },
  levelText: { fontSize: 8, fontWeight: "800", letterSpacing: 1, marginTop: 1 },
  xpTrack:   { height: 4, width: "100%", backgroundColor: "#1a0808", borderRadius: 2, overflow: "hidden", marginTop: 2, borderWidth: 0.5, borderColor: "rgba(255,255,255,0.08)" },
  xpFill:    { height: "100%", borderRadius: 1 },

  // ── Pause button ──────────────────────────────────────────────────────────
  pauseBtn: {
    position: "absolute",
    right: 58,
    height: 26,
    paddingHorizontal: 7,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  pauseBtnText: {
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(220,220,255,0.85)",
    letterSpacing: 1,
  },

  // ── Dash ─────────────────────────────────────────────────────────────────
  bottomControls:     { position: "absolute", bottom: 12, left: 0, right: 0, alignItems: "center" },
  dashButton:         { backgroundColor: "rgba(0,80,200,0.45)", borderWidth: 1.5, borderColor: "#4488ff", borderRadius: 10, paddingHorizontal: 28, paddingVertical: 14 },
  dashButtonCooldown: { opacity: 0.35 },
  dashButtonText:     { color: "#88bbff", fontWeight: "900", fontSize: 15, letterSpacing: 3 },
});
