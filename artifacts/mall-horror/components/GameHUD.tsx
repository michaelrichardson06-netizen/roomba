import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface GameHUDProps {
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
  onDash: () => void;
}

export function GameHUD({
  hp,
  maxHp,
  score,
  wave,
  killCount,
  waveTotalKills,
  tripleShot,
  quadShot,
  rapidFireStacks,
  bazookaMode,
  dashCooldown,
  spawnGrace,
  onDash,
}: GameHUDProps) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const hpRatio = hp / maxHp;
  const hpColor = hpRatio > 0.5 ? "#22cc44" : hpRatio > 0.25 ? "#ffaa00" : "#ff2222";
  const waveProgress = killCount / waveTotalKills;

  const dashReady = dashCooldown <= 0;

  return (
    <View style={[styles.container, { pointerEvents: "box-none" }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        {/* HP Bar */}
        <View style={styles.hpSection}>
          <Text style={styles.label}>HP</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${hpRatio * 100}%` as any, backgroundColor: hpColor }]} />
          </View>
          <Text style={[styles.hpText, { color: hpColor }]}>{hp}</Text>
        </View>

        {/* Score / Wave */}
        <View style={styles.centerInfo}>
          <Text style={styles.waveText}>WAVE {wave}</Text>
          <Text style={styles.scoreText}>{score.toLocaleString()}</Text>
        </View>

        {/* Kill progress */}
        <View style={styles.killSection}>
          <Text style={styles.label}>KILLS</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.min(waveProgress, 1) * 100}%` as any, backgroundColor: "#ff4400" }]} />
          </View>
          <Text style={styles.killText}>{killCount}/{waveTotalKills}</Text>
        </View>
      </View>

      {/* Spawn grace countdown */}
      {spawnGrace > 0 && (
        <View style={styles.graceRow}>
          <Text style={styles.graceText}>
            ENEMIES INCOMING IN {Math.ceil(spawnGrace / 1000)}...
          </Text>
        </View>
      )}

      {/* Active buffs */}
      <View style={styles.buffRow}>
        {tripleShot && !quadShot && <BuffBadge label="3x" color="#00e5ff" />}
        {quadShot && <BuffBadge label="4x" color="#7c4dff" />}
        {rapidFireStacks > 0 && <BuffBadge label={`R${rapidFireStacks}`} color="#ffea00" />}
        {bazookaMode && <BuffBadge label="BAZOOKA" color="#ff6d00" />}
      </View>

      {/* Bottom controls (touch only) */}
      {Platform.OS !== "web" && (
        <View style={[styles.bottomControls, { paddingBottom: bottomPad + 8 }]}>
          <TouchableOpacity
            style={[styles.dashButton, !dashReady && styles.dashButtonCooldown]}
            onPress={onDash}
            activeOpacity={0.7}
          >
            <Text style={styles.dashButtonText}>{dashReady ? "DASH" : "..."}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Web controls hint */}
      {isWeb && (
        <View style={styles.webHint}>
          <Text style={styles.webHintText}>WASD/Arrows: Move  |  Mouse: Aim  |  Click: Shoot  |  Space: Dash</Text>
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
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  hpSection: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: "#888",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  barTrack: {
    height: 6,
    backgroundColor: "#1a1a1a",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  hpText: {
    fontSize: 10,
    fontWeight: "700",
  },
  centerInfo: {
    alignItems: "center",
    minWidth: 80,
  },
  waveText: {
    color: "#ff6644",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  scoreText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  killSection: {
    flex: 1,
    gap: 2,
    alignItems: "flex-end",
  },
  killText: {
    color: "#ff8866",
    fontSize: 10,
    fontWeight: "700",
  },
  graceRow: {
    alignItems: "center",
    paddingTop: 6,
  },
  graceText: {
    color: "#ff8800",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textShadowColor: "#000",
    textShadowRadius: 4,
    textShadowOffset: { width: 1, height: 1 },
  },
  buffRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingTop: 4,
    gap: 6,
  },
  buffBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  buffBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  bottomControls: {
    position: "absolute",
    bottom: 0,
    right: 16,
    alignItems: "flex-end",
  },
  dashButton: {
    backgroundColor: "rgba(0,120,255,0.3)",
    borderWidth: 1,
    borderColor: "#4488ff",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  dashButtonCooldown: {
    opacity: 0.4,
  },
  dashButtonText: {
    color: "#4488ff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 2,
  },
  webHint: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  webHintText: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 10,
  },
});
