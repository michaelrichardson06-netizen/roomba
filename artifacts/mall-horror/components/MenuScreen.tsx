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

interface MenuScreenProps {
  onStart: () => void;
  highScore: number;
  bestWave: number;
}

export function MenuScreen({ onStart, highScore, bestWave }: MenuScreenProps) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flickerAnim = useRef(new Animated.Value(1)).current;
  const glitchAnim = useRef(new Animated.Value(0)).current;

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
            ? "WASD/Arrows: Move   Mouse: Aim   Click: Fire   Space: Dash"
            : "Left joystick: Move   Right joystick: Aim + Fire   Dash button: Escape"}
        </Text>
        <Text style={styles.instrText}>Kill all insects to summon the BOSS and advance waves</Text>
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
