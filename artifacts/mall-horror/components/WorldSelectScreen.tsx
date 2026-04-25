import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WORLDS } from "@/game/worlds";
import { getWorldDifficultyMult, getWorldDifficultyLabel } from "@/game/worlds";

interface WorldSelectScreenProps {
  playerLevel: number;
  selectedWorld: number;
  onSelect: (worldId: number) => void;
  onBack: () => void;
}

export function WorldSelectScreen({ playerLevel, selectedWorld, onSelect, onBack }: WorldSelectScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 16) }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>{"← BACK"}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>SELECT WORLD</Text>
        <Text style={styles.levelBadge}>LV {playerLevel}</Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {WORLDS.map((world) => {
          const locked = playerLevel < world.recommendedLevel;
          const isSelected = world.id === selectedWorld;
          const diffMult = getWorldDifficultyMult(world.recommendedLevel, playerLevel);
          const { label: diffLabel, color: diffColor } = getWorldDifficultyLabel(world.recommendedLevel, playerLevel);

          return (
            <TouchableOpacity
              key={world.id}
              style={[
                styles.worldCard,
                { borderColor: isSelected ? world.themeColor : locked ? "#2a1a1a" : "#2a2020" },
                locked && styles.worldCardLocked,
                isSelected && { backgroundColor: `${world.themeColor}18` },
              ]}
              onPress={() => !locked && onSelect(world.id)}
              activeOpacity={locked ? 1 : 0.75}
            >
              {/* Icon + name */}
              <View style={styles.worldLeft}>
                <Text style={[styles.worldIcon, locked && { opacity: 0.35 }]}>{world.icon}</Text>
                <View style={styles.worldInfo}>
                  <Text style={[styles.worldName, { color: locked ? "#553333" : world.themeColor }]}>
                    {world.name}
                  </Text>
                  <Text style={[styles.worldSubtitle, locked && { opacity: 0.4 }]}>{world.subtitle}</Text>
                  {locked ? (
                    <Text style={styles.lockText}>🔒 UNLOCKS AT LV {world.recommendedLevel}</Text>
                  ) : (
                    <Text style={styles.recText}>REC. LV {world.recommendedLevel}</Text>
                  )}
                </View>
              </View>

              {/* Right side: difficulty + multiplier */}
              <View style={styles.worldRight}>
                {!locked && (
                  <>
                    <Text style={[styles.diffLabel, { color: diffColor }]}>{diffLabel}</Text>
                    <Text style={styles.diffMult}>{diffMult.toFixed(1)}×</Text>
                  </>
                )}
                {isSelected && !locked && (
                  <View style={[styles.selectedDot, { backgroundColor: world.themeColor }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer hint */}
      <Text style={styles.hint}>Higher worlds have tougher enemies but more Brushes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#060404",
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(180,25,0,0.3)",
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  backText: {
    color: "#aa4422",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: "monospace",
  },
  title: {
    color: "#ff4422",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 4,
    fontFamily: "monospace",
    textShadowColor: "#ff0000",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  levelBadge: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: "monospace",
  },

  list: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 10 },

  worldCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(12,4,4,0.9)",
  },
  worldCardLocked: {
    opacity: 0.6,
  },
  worldLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  worldIcon: {
    fontSize: 32,
  },
  worldInfo: {
    flex: 1,
    gap: 2,
  },
  worldName: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
    fontFamily: "monospace",
  },
  worldSubtitle: {
    color: "#666",
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: "monospace",
  },
  lockText: {
    color: "#553333",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 2,
  },
  recText: {
    color: "#555",
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 2,
  },
  worldRight: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 70,
  },
  diffLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    fontFamily: "monospace",
  },
  diffMult: {
    color: "#555",
    fontSize: 9,
    letterSpacing: 1,
    fontFamily: "monospace",
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 2,
  },

  hint: {
    color: "#3a1a1a",
    fontSize: 9,
    letterSpacing: 1.5,
    textAlign: "center",
    paddingTop: 10,
    fontFamily: "monospace",
  },
});
