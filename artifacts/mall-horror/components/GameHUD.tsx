import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  dashCooldown: number;
  spawnGrace: number;
  onDash: () => void;
}

export function GameHUD({
  hp, maxHp, battery, maxBattery, berserkerTimer,
  score, wave, killCount, waveTotalKills,
  tripleShot, quadShot, rapidFireStacks, bazookaMode, lightningStrike,
  dashCooldown, spawnGrace, onDash,
}: GameHUDProps) {
  const insets = useSafeAreaInsets();
  const isWeb  = Platform.OS === "web";
  const topPad    = isWeb ? 10 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const hpRatio      = hp / maxHp;
  const hpColor      = hpRatio > 0.5 ? "#22cc44" : hpRatio > 0.25 ? "#ffaa00" : "#ff2222";
  const waveProgress = killCount / waveTotalKills;
  const batteryRatio = battery / maxBattery;
  const batteryColor = batteryRatio > 0.5 ? "#44ff88" : batteryRatio > 0.2 ? "#ffcc00" : "#ff4400";
  const isBerserking = berserkerTimer > 0;
  const berserkSecs  = Math.ceil(berserkerTimer / 1000);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Berserker screen pulse */}
      {isBerserking && (
        <View style={styles.berserkerOverlay} pointerEvents="none" />
      )}

      {/* Top bar — HP/battery left, wave+score center, kills right */}
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        {/* HP + Battery stacked */}
        <View style={styles.leftSection}>
          <Text style={styles.label}>HP</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${hpRatio * 100}%` as any, backgroundColor: hpColor }]} />
          </View>
          <Text style={[styles.smallText, { color: hpColor }]}>{Math.ceil(hp)}</Text>

          <Text style={[styles.label, { marginTop: 4 }]}>⚡ BATTERY</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${batteryRatio * 100}%` as any, backgroundColor: batteryColor }]} />
            {batteryRatio < 0.15 && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "#ff4400", opacity: 0.3 }]} />
            )}
          </View>
          <Text style={[styles.smallText, { color: batteryColor }]}>{Math.ceil(battery)}%</Text>
        </View>

        {/* Wave (large) + Score */}
        <View style={styles.centerInfo}>
          <Text style={styles.waveText}>WAVE {wave}</Text>
          <Text style={styles.scoreText}>{score.toLocaleString()}</Text>
        </View>

        {/* Kill progress */}
        <View style={styles.killSection}>
          <Text style={styles.label}>KILLS</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, {
              width: `${Math.min(waveProgress, 1) * 100}%` as any,
              backgroundColor: waveProgress < 1 ? "#ff6600" : "#ff2222",
            }]} />
          </View>
          <Text style={styles.smallText}>{killCount}/{waveTotalKills}</Text>
        </View>
      </View>

      {/* Boss shield bar — full-width, very prominent, separate from top bar */}
      <View style={styles.bossShieldRow}>
        <View style={styles.bossShieldLabelRow}>
          {waveProgress < 1 ? (
            <Text style={styles.bossShieldLabel}>🛡 BOSS SHIELD</Text>
          ) : (
            <Text style={[styles.bossShieldLabel, { color: "#ff2222" }]}>⚠ BOSS EXPOSED</Text>
          )}
          <Text style={styles.bossShieldPct}>{Math.min(100, Math.round(waveProgress * 100))}%</Text>
        </View>
        <View style={styles.bossShieldTrack}>
          <View style={[styles.bossShieldFill, {
            width: `${Math.min(waveProgress, 1) * 100}%` as any,
            backgroundColor: waveProgress < 1 ? "#ff6600" : "#ff2222",
          }]} />
          {waveProgress >= 1 && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#ff0000", opacity: 0.18 }]} />
          )}
        </View>
      </View>

      {/* Berserker timer bar */}
      {isBerserking && (
        <View style={styles.berserkerBar}>
          <View style={styles.berserkerBarTrack}>
            <View style={[styles.berserkerBarFill, { width: `${(berserkerTimer / (berserkSecs <= 15 ? 15000 : 30000)) * 100}%` as any }]} />
          </View>
          <Text style={styles.berserkerText}>🔥 BERSERKER {berserkSecs}s 🔥</Text>
        </View>
      )}

      {/* Spawn grace countdown + wave 1 objective hint */}
      {spawnGrace > 0 && (
        <View style={styles.graceRow}>
          {wave === 1 && (
            <Text style={styles.objectiveText}>SURVIVE AS MANY WAVES AS POSSIBLE!</Text>
          )}
          <Text style={styles.graceText}>ENEMIES INCOMING IN {Math.ceil(spawnGrace / 1000)}...</Text>
        </View>
      )}

      {/* Active buffs */}
      <View style={styles.buffRow}>
        {isBerserking && <BuffBadge label={`BERSERK ${berserkSecs}s`} color="#ff0044" />}
        {tripleShot && !quadShot && <BuffBadge label="3x" color="#00e5ff" />}
        {quadShot && <BuffBadge label="4x" color="#7c4dff" />}
        {rapidFireStacks > 0 && <BuffBadge label={`R×${rapidFireStacks}`} color="#ffea00" />}
        {bazookaMode && !isBerserking && <BuffBadge label="BAZOOKA" color="#ff6d00" />}
        {lightningStrike && <BuffBadge label="⚡ CHAIN" color="#88eeff" />}
      </View>

      {/* Bottom controls (touch only) */}
      {Platform.OS !== "web" && (
        <View style={[styles.bottomControls, { paddingBottom: bottomPad + 8 }]}>
          <TouchableOpacity
            style={[styles.dashButton, dashCooldown > 0 && styles.dashButtonCooldown]}
            onPress={onDash}
            activeOpacity={0.7}
          >
            <Text style={styles.dashButtonText}>{dashCooldown <= 0 ? "DASH" : "..."}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Web controls hint */}
      {isWeb && (
        <View style={styles.webHint}>
          <Text style={styles.webHintText}>WASD: Move  |  Mouse: Aim  |  Click: Shoot  |  Space: Dash</Text>
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
    borderRadius: 0,
  },

  topBar: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 12, gap: 8 },

  leftSection: { flex: 1, gap: 1 },
  label: { color: "#888", fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  barTrack: { height: 6, backgroundColor: "#1a1a1a", borderRadius: 3, overflow: "hidden" },
  barFill:  { height: "100%", borderRadius: 3 },
  smallText: { color: "#aaa", fontSize: 9, fontWeight: "700" },

  // Wave is now much bigger — centered, very prominent
  centerInfo: { alignItems: "center", minWidth: 90 },
  waveText:  {
    color: "#ff6644",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 3,
    textShadow: "0 0 12px rgba(255,80,30,0.7)" as any,
  },
  scoreText: { color: "#fff", fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"] },

  killSection:   { flex: 1, gap: 1, alignItems: "flex-end" },

  // ── Boss shield — full-width, very prominent ────────────────────────────────
  bossShieldRow: {
    marginHorizontal: 12,
    marginTop: 6,
  },
  bossShieldLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  bossShieldLabel: {
    color: "#ff8800",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
    textShadow: "0 0 8px rgba(255,120,0,0.6)" as any,
  },
  bossShieldPct: {
    color: "#ff8800",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  bossShieldTrack: {
    height: 10,
    backgroundColor: "#1a1a1a",
    borderRadius: 5,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,100,0,0.3)",
  },
  bossShieldFill: { height: "100%", borderRadius: 5 },

  berserkerBar: { alignItems: "center", paddingHorizontal: 20, paddingTop: 6, gap: 3 },
  berserkerBarTrack: { width: "100%", height: 8, backgroundColor: "#330011", borderRadius: 4, overflow: "hidden", borderWidth: 1, borderColor: "#ff0044" },
  berserkerBarFill:  { height: "100%", backgroundColor: "#ff0044", borderRadius: 4 },
  berserkerText:     { color: "#ff0044", fontSize: 14, fontWeight: "700", letterSpacing: 2 },

  graceRow:      { alignItems: "center", paddingTop: 6, gap: 4 },
  objectiveText: { color: "#00cfff", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textAlign: "center", opacity: 0.9 },
  graceText:     { color: "#ff8800", fontSize: 13, fontWeight: "700", letterSpacing: 1 },

  buffRow:       { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingTop: 4, gap: 6 },
  buffBadge:     { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: "rgba(0,0,0,0.6)" },
  buffBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },

  bottomControls:    { position: "absolute", bottom: 0, right: 16, alignItems: "flex-end" },
  dashButton:        { backgroundColor: "rgba(0,120,255,0.3)", borderWidth: 1, borderColor: "#4488ff", borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  dashButtonCooldown: { opacity: 0.4 },
  dashButtonText:    { color: "#4488ff", fontWeight: "700", fontSize: 14, letterSpacing: 2 },

  webHint:     { position: "absolute", bottom: 12, left: 0, right: 0, alignItems: "center" },
  webHintText: { color: "rgba(255,255,255,0.25)", fontSize: 10 },
});
