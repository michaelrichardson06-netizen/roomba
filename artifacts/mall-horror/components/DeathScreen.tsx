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
import * as Haptics from "expo-haptics";

interface DeathScreenProps {
  score: number;
  wavesCleared: number;
  insectsExterminated: number;
  highScore: number;
  bestWave: number;
  isNewHighScore: boolean;
  deathCause: string;
  hpAtDeath: number;
  damageLog: string[];
  onRetry: () => void;
  onMenu: () => void;
}

export function DeathScreen({
  score,
  wavesCleared,
  insectsExterminated,
  highScore,
  bestWave,
  isNewHighScore,
  deathCause,
  hpAtDeath,
  damageLog,
  onRetry,
  onMenu,
}: DeathScreenProps) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { paddingTop: topPad, opacity: fadeAnim }]}>
      {/* Death header */}
      <Animated.View style={[styles.deathHeader, { transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.deathLabel}>ROOMBA DIDN'T MAKE IT :(</Text>
        <Animated.Text style={[styles.deathTitle, { transform: [{ scale: pulseAnim }] }]}>
          CONSUMED
        </Animated.Text>
        <Text style={styles.deathSub}>The insects have claimed another victim</Text>
      </Animated.View>

      {/* Stats */}
      <Animated.View style={[styles.statsCard, { transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.statsTitle}>FINAL REPORT</Text>

        <View style={styles.statsGrid}>
          <StatItem label="SCORE" value={score.toLocaleString()} highlight={isNewHighScore} />
          <StatItem label="WAVES CLEARED" value={String(wavesCleared)} />
          <StatItem label="INSECTS KILLED" value={String(insectsExterminated)} />
          <StatItem label="KILLED BY" value={deathCause} wrap />
        </View>

        {isNewHighScore && (
          <View style={styles.newRecordBadge}>
            <Text style={styles.newRecordText}>NEW HIGH SCORE</Text>
          </View>
        )}
      </Animated.View>

      {/* Personal best */}
      <View style={styles.bestCard}>
        <Text style={styles.bestTitle}>PERSONAL BEST</Text>
        <View style={styles.bestRow}>
          <View style={styles.bestItem}>
            <Text style={styles.bestValue}>{highScore.toLocaleString()}</Text>
            <Text style={styles.bestLabel}>SCORE</Text>
          </View>
          <View style={styles.bestDivider} />
          <View style={styles.bestItem}>
            <Text style={styles.bestValue}>{bestWave}</Text>
            <Text style={styles.bestLabel}>BEST WAVE</Text>
          </View>
        </View>
      </View>


      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
          <Text style={styles.retryText}>[ TRY AGAIN ]</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={onMenu} activeOpacity={0.8}>
          <Text style={styles.menuText}>MAIN MENU</Text>
        </TouchableOpacity>
      </View>

      {/* Flavor text */}
      <Text style={styles.flavorText}>"No one leaves the mall."</Text>
    </Animated.View>
  );
}

function StatItem({ label, value, highlight, wrap }: { label: string; value: string; highlight?: boolean; wrap?: boolean }) {
  if (wrap) {
    return (
      <View style={[styles.statItem, { flexDirection: "column", alignItems: "flex-start", gap: 2 }]}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { fontSize: 13, color: "#ff8855" }]} numberOfLines={3}>{value}</Text>
      </View>
    );
  }
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060202",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 20,
  },
  deathHeader: {
    alignItems: "center",
    gap: 4,
  },
  deathLabel: {
    color: "#660000",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 6,
  },
  deathTitle: {
    color: "#cc0000",
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -1,
    textShadowColor: "#ff0000",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  deathSub: {
    color: "#553333",
    fontSize: 11,
    fontStyle: "italic",
  },
  statsCard: {
    backgroundColor: "rgba(15,3,3,0.9)",
    borderWidth: 1,
    borderColor: "#3a0808",
    borderRadius: 8,
    padding: 16,
    width: "100%",
    maxWidth: 320,
    gap: 12,
  },
  statsTitle: {
    color: "#662222",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 4,
    textAlign: "center",
  },
  statsGrid: {
    gap: 8,
  },
  statItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#1a0505",
  },
  statValue: {
    color: "#ff6644",
    fontSize: 22,
    fontWeight: "700",
  },
  statValueHighlight: {
    color: "#ffaa00",
    textShadowColor: "#ffaa00",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  statLabel: {
    color: "#664433",
    fontSize: 10,
    letterSpacing: 2,
  },
  newRecordBadge: {
    backgroundColor: "rgba(100,60,0,0.4)",
    borderWidth: 1,
    borderColor: "#ffaa00",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: "center",
  },
  newRecordText: {
    color: "#ffaa00",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
  },
  bestCard: {
    backgroundColor: "rgba(10,5,3,0.8)",
    borderWidth: 1,
    borderColor: "#2a1008",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    gap: 8,
    width: "100%",
    maxWidth: 280,
  },
  bestTitle: {
    color: "#4a2a1a",
    fontSize: 9,
    letterSpacing: 3,
  },
  bestRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  bestItem: {
    alignItems: "center",
    gap: 2,
  },
  bestValue: {
    color: "#884422",
    fontSize: 24,
    fontWeight: "700",
  },
  bestLabel: {
    color: "#4a2a1a",
    fontSize: 9,
    letterSpacing: 2,
  },
  bestDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#2a1008",
  },
  actions: {
    gap: 10,
    width: "100%",
    maxWidth: 280,
  },
  retryButton: {
    borderWidth: 2,
    borderColor: "#cc0000",
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(60,0,0,0.4)",
  },
  retryText: {
    color: "#ff4444",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 4,
  },
  menuButton: {
    borderWidth: 1,
    borderColor: "#3a1a1a",
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
  },
  menuText: {
    color: "#664433",
    fontSize: 12,
    letterSpacing: 3,
  },
  flavorText: {
    color: "#220808",
    fontSize: 10,
    fontStyle: "italic",
  },
});
