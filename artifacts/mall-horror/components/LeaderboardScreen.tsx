import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Entry {
  name: string;
  score: number;
  wave: number;
  insects_killed: number;
  created_at: string;
}

interface LeaderboardScreenProps {
  onBack: () => void;
  highlightScore?: number;
}

// On web the Metro proxy forwards /api-server/* to localhost:8080 (same origin, no CORS).
// On native, use the full domain URL.
const API_BASE = typeof window !== "undefined"
  ? "/api-server/api"
  : `https://${process.env.EXPO_PUBLIC_DOMAIN}/api-server/api`;

export function LeaderboardScreen({ onBack, highlightScore }: LeaderboardScreenProps) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 20 : insets.top + 8;

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    fetch(`${API_BASE}/leaderboard`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries || []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <Animated.View style={[styles.container, { paddingTop: topPad, opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.title}>WORLD RANKINGS</Text>
        <Text style={styles.sub}>TOP ROOMBA SURVIVORS</Text>
      </View>

      {loading && <ActivityIndicator color="#ff6644" style={{ marginTop: 40 }} />}
      {error && <Text style={styles.errorText}>Could not load rankings.</Text>}

      {!loading && !error && (
        <FlatList
          data={entries}
          keyExtractor={(_, i) => String(i)}
          style={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No scores yet. Be the first!</Text>}
          renderItem={({ item, index }) => {
            const isHighlight = highlightScore !== undefined && item.score === highlightScore;
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
            return (
              <View style={[styles.row, isHighlight && styles.rowHighlight]}>
                <Text style={styles.rank}>{medal ?? `#${index + 1}`}</Text>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <View style={styles.stats}>
                  <Text style={styles.scoreVal}>{item.score.toLocaleString()}</Text>
                  <Text style={styles.waveVal}>W{item.wave}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
        <Text style={styles.backText}>[ BACK ]</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060108",
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  header: { alignItems: "center", marginBottom: 16, gap: 4 },
  title: {
    color: "#ff6644",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 4,
    textShadow: "0 0 16px rgba(255,80,30,0.8)" as any,
  },
  sub: { color: "#552233", fontSize: 10, letterSpacing: 3 },
  list: { flex: 1 },
  emptyText: { color: "#442233", textAlign: "center", marginTop: 40, fontSize: 13 },
  errorText: { color: "#ff4400", textAlign: "center", marginTop: 40, fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1a0808",
    gap: 8,
  },
  rowHighlight: {
    backgroundColor: "rgba(255,100,30,0.15)",
    borderRadius: 6,
    borderBottomColor: "#ff6644",
  },
  rank: { color: "#664433", fontSize: 13, fontWeight: "700", width: 34 },
  name: { flex: 1, color: "#ff9977", fontSize: 13, fontWeight: "700" },
  stats: { alignItems: "flex-end", gap: 1 },
  scoreVal: { color: "#ffffff", fontSize: 15, fontWeight: "900", fontVariant: ["tabular-nums"] as any },
  waveVal: { color: "#664433", fontSize: 10, letterSpacing: 1 },
  backButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#3a1a1a",
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: "center",
  },
  backText: { color: "#664433", fontSize: 13, letterSpacing: 3 },
});
