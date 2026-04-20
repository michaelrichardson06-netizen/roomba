import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NAME_KEY = "@mallhorror_playername";
const API_BASE = typeof window !== "undefined"
  ? "/api-server/api"
  : `https://${process.env.EXPO_PUBLIC_DOMAIN}/api-server/api`;

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
  onLeaderboard: () => void;
}

export function DeathScreen({
  score, wavesCleared, insectsExterminated,
  highScore, bestWave, isNewHighScore,
  deathCause, onRetry, onMenu, onLeaderboard,
}: DeathScreenProps) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 20 : insets.top + 8;

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rank, setRank] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    AsyncStorage.getItem(NAME_KEY).then((v) => { if (v) setName(v); });
  }, []);

  async function submitScore() {
    if (submitting || submitted) return;
    const trimmed = name.trim() || "Anonymous";
    await AsyncStorage.setItem(NAME_KEY, trimmed);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/leaderboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, score, wave: wavesCleared + 1, insects_killed: insectsExterminated }),
      });
      const data = await res.json();
      if (data.ok) setRank(data.rank);
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Animated.View style={[styles.container, { paddingTop: topPad, opacity: fadeAnim }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Title */}
        <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
          <Animated.Text style={[styles.deathTitle, { transform: [{ scale: pulseAnim }] }]}>
            ROOMBA{"\n"}DIDN'T{"\n"}MAKE IT :(
          </Animated.Text>
          <Text style={styles.deathSub}>The insects have claimed another victim</Text>
        </Animated.View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>FINAL REPORT</Text>
          <StatRow label="SCORE" value={score.toLocaleString()} highlight={isNewHighScore} />
          <StatRow label="WAVES CLEARED" value={String(wavesCleared)} />
          <StatRow label="INSECTS KILLED" value={String(insectsExterminated)} />
          <StatRow label="KILLED BY" value={deathCause} small />
          {isNewHighScore && (
            <View style={styles.newRecord}>
              <Text style={styles.newRecordText}>★ NEW HIGH SCORE ★</Text>
            </View>
          )}
        </View>

        {/* Personal best */}
        <View style={styles.bestCard}>
          <Text style={styles.cardTitle}>PERSONAL BEST</Text>
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

        {/* Leaderboard submit */}
        <View style={styles.submitCard}>
          <Text style={styles.cardTitle}>SUBMIT TO WORLD RANKINGS</Text>
          {submitted ? (
            <View style={styles.rankResult}>
              <Text style={styles.rankText}>
                {rank !== null ? `🏆 GLOBAL RANK #${rank}` : "Score submitted!"}
              </Text>
              <TouchableOpacity style={styles.lbButton} onPress={onLeaderboard} activeOpacity={0.8}>
                <Text style={styles.lbButtonText}>VIEW LEADERBOARD →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.nameInput}
                placeholder="Enter your name..."
                placeholderTextColor="#442233"
                value={name}
                onChangeText={setName}
                maxLength={20}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submittingButton]}
                onPress={submitScore}
                activeOpacity={0.8}
              >
                <Text style={styles.submitText}>
                  {submitting ? "SUBMITTING..." : "[ SUBMIT SCORE ]"}
                </Text>
              </TouchableOpacity>
            </>
          )}
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

        <Text style={styles.flavor}>"No one leaves the mall."</Text>
      </ScrollView>
    </Animated.View>
  );
}

function StatRow({ label, value, highlight, small }: { label: string; value: string; highlight?: boolean; small?: boolean }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statHighlight, small && styles.statSmall]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060202" },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 14, alignItems: "center" },

  header: { alignItems: "center", gap: 6, marginBottom: 4 },
  deathTitle: {
    color: "#cc0000",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
    textShadow: "0 0 20px rgba(255,0,0,0.8), 0 2px 4px rgba(0,0,0,0.99)" as any,
  },
  deathSub: { color: "#553333", fontSize: 11, fontStyle: "italic" },

  statsCard: {
    backgroundColor: "rgba(12,3,3,0.95)",
    borderWidth: 1,
    borderColor: "#2a0808",
    borderRadius: 8,
    padding: 14,
    width: "100%",
    maxWidth: 340,
    gap: 6,
  },
  bestCard: {
    backgroundColor: "rgba(10,4,3,0.9)",
    borderWidth: 1,
    borderColor: "#1a0808",
    borderRadius: 8,
    padding: 12,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    gap: 10,
  },
  submitCard: {
    backgroundColor: "rgba(5,3,12,0.95)",
    borderWidth: 1,
    borderColor: "#220840",
    borderRadius: 8,
    padding: 14,
    width: "100%",
    maxWidth: 340,
    gap: 10,
  },
  cardTitle: {
    color: "#442222",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 2,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#150404",
    gap: 8,
  },
  statLabel: { color: "#553333", fontSize: 10, letterSpacing: 1.5 },
  statValue: { color: "#ff6644", fontSize: 18, fontWeight: "700", textAlign: "right", flex: 1 },
  statHighlight: { color: "#ffaa00", textShadow: "0 0 8px rgba(255,170,0,0.7)" as any },
  statSmall: { fontSize: 12 },

  newRecord: {
    marginTop: 6,
    backgroundColor: "rgba(80,50,0,0.4)",
    borderWidth: 1,
    borderColor: "#ffaa00",
    borderRadius: 4,
    paddingVertical: 4,
    alignItems: "center",
  },
  newRecordText: { color: "#ffaa00", fontSize: 11, fontWeight: "700", letterSpacing: 2 },

  bestRow: { flexDirection: "row", gap: 20, alignItems: "center" },
  bestItem: { alignItems: "center", gap: 2 },
  bestValue: { color: "#773322", fontSize: 22, fontWeight: "700" },
  bestLabel: { color: "#3a1a1a", fontSize: 9, letterSpacing: 2 },
  bestDivider: { width: 1, height: 28, backgroundColor: "#1a0808" },

  nameInput: {
    borderWidth: 1,
    borderColor: "#440088",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#cc88ff",
    fontSize: 15,
    fontWeight: "700",
    backgroundColor: "rgba(20,5,40,0.8)",
  },
  submitButton: {
    borderWidth: 2,
    borderColor: "#6600cc",
    borderRadius: 6,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: "rgba(30,0,60,0.5)",
  },
  submittingButton: { opacity: 0.5 },
  submitText: { color: "#aa66ff", fontSize: 14, fontWeight: "700", letterSpacing: 2 },

  rankResult: { gap: 10, alignItems: "center" },
  rankText: { color: "#cc88ff", fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  lbButton: {
    borderWidth: 1,
    borderColor: "#440088",
    borderRadius: 6,
    paddingVertical: 9,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  lbButtonText: { color: "#8844cc", fontSize: 12, fontWeight: "700", letterSpacing: 2 },

  actions: { gap: 8, width: "100%", maxWidth: 340 },
  retryButton: {
    borderWidth: 2,
    borderColor: "#cc0000",
    borderRadius: 6,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "rgba(50,0,0,0.4)",
  },
  retryText: { color: "#ff4444", fontSize: 16, fontWeight: "700", letterSpacing: 4 },
  menuButton: {
    borderWidth: 1,
    borderColor: "#2a1010",
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
  },
  menuText: { color: "#553322", fontSize: 12, letterSpacing: 3 },
  flavor: { color: "#1a0808", fontSize: 10, fontStyle: "italic" },
});
