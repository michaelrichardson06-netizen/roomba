import React, { useState } from "react";
import {
  Modal,
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
  onStore: () => void;
}

// Danger threshold: diffMult >= 3.0 triggers warning
const DANGER_MULT = 3.0;

export function WorldSelectScreen({ playerLevel, selectedWorld, onSelect, onBack, onStore }: WorldSelectScreenProps) {
  const insets = useSafeAreaInsets();
  const [warningWorld, setWarningWorld] = useState<typeof WORLDS[number] | null>(null);

  function handleWorldPress(world: typeof WORLDS[number]) {
    const diffMult = getWorldDifficultyMult(world.recommendedLevel, playerLevel);
    if (diffMult >= DANGER_MULT) {
      setWarningWorld(world);
    } else {
      onSelect(world.id);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 16) }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>{"← BACK"}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>SELECT WORLD</Text>
        <TouchableOpacity onPress={onStore} style={styles.storeBtn} activeOpacity={0.8}>
          <Text style={styles.storeBtnText}>🛒 STORE</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.levelBadge}>LV {playerLevel}</Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {WORLDS.map((world) => {
          const isSelected = world.id === selectedWorld;
          const diffMult = getWorldDifficultyMult(world.recommendedLevel, playerLevel);
          const { label: diffLabel, color: diffColor } = getWorldDifficultyLabel(world.recommendedLevel, playerLevel);
          const isDangerous = diffMult >= DANGER_MULT;

          return (
            <TouchableOpacity
              key={world.id}
              style={[
                styles.worldCard,
                { borderColor: isSelected ? world.themeColor : isDangerous ? "#660000" : "#2a2020" },
                isSelected && { backgroundColor: `${world.themeColor}18` },
                isDangerous && styles.worldCardDanger,
              ]}
              onPress={() => handleWorldPress(world)}
              activeOpacity={0.75}
            >
              {/* Icon + name */}
              <View style={styles.worldLeft}>
                <Text style={styles.worldIcon}>{world.icon}</Text>
                <View style={styles.worldInfo}>
                  <Text style={[styles.worldName, { color: isDangerous ? "#aa2222" : world.themeColor }]}>
                    {world.name}
                  </Text>
                  <Text style={styles.worldSubtitle}>{world.subtitle}</Text>
                  <Text style={styles.recText}>REC. LV {world.recommendedLevel}</Text>
                </View>
              </View>

              {/* Right side: difficulty + multiplier */}
              <View style={styles.worldRight}>
                <Text style={[styles.diffLabel, { color: diffColor }]}>{diffLabel}</Text>
                <Text style={styles.diffMult}>{diffMult.toFixed(1)}×</Text>
                {isDangerous && <Text style={styles.warningBadge}>⚠️</Text>}
                {isSelected && (
                  <View style={[styles.selectedDot, { backgroundColor: world.themeColor }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer hint */}
      <Text style={styles.hint}>Higher worlds have tougher enemies but more Brushes · ⚠️ = Danger</Text>

      {/* ── Danger Warning Modal ─────────────────────────────────────────── */}
      <Modal
        visible={!!warningWorld}
        transparent
        animationType="fade"
        onRequestClose={() => setWarningWorld(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalWarningIcon}>☠️</Text>
            <Text style={styles.modalTitle}>DANGER ZONE</Text>
            <Text style={styles.modalWorldName}>{warningWorld?.name}</Text>

            <View style={styles.modalDivider} />

            <Text style={styles.modalBody}>
              You are <Text style={styles.modalEmphasis}>way too low level</Text> for this world.
            </Text>
            <Text style={styles.modalBody}>
              Enemies are too strong — you barely deal damage.
            </Text>

            <View style={styles.modalTimeline}>
              <View style={styles.timelineRow}>
                <Text style={styles.timelineIcon}>🔋</Text>
                <Text style={styles.timelineText}>Battery drains to 0 in ~<Text style={styles.timelineNum}>3 seconds</Text></Text>
              </View>
              <View style={styles.timelineRow}>
                <Text style={styles.timelineIcon}>💀</Text>
                <Text style={styles.timelineText}>Then HP drains — you die in ~<Text style={styles.timelineNum}>4 more seconds</Text></Text>
              </View>
            </View>

            <Text style={styles.modalFooter}>Total survival time: ~7 seconds. Are you sure?</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setWarningWorld(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>← GO BACK</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.enterAnywayBtn}
                onPress={() => {
                  if (!warningWorld) return;
                  const id = warningWorld.id;
                  setWarningWorld(null);
                  // Defer navigation until after the modal close animation
                  // completes to avoid re-renders with warningWorld = null
                  setTimeout(() => onSelect(id), 350);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.enterAnywayText}>ENTER ANYWAY ☠️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(180,25,0,0.3)",
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backText: { color: "#aa4422", fontSize: 13, fontWeight: "700", letterSpacing: 1, fontFamily: "monospace" },
  title: {
    color: "#ff4422", fontSize: 16, fontWeight: "900", letterSpacing: 4, fontFamily: "monospace",
    textShadowColor: "#ff0000", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  storeBtn: {
    backgroundColor: "rgba(50,20,100,0.5)",
    borderWidth: 1,
    borderColor: "#6633bb",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  storeBtnText: { color: "#cc88ff", fontSize: 12, fontWeight: "900", letterSpacing: 1, fontFamily: "monospace" },

  levelBadge: { color: "#555", fontSize: 10, fontWeight: "700", letterSpacing: 2, textAlign: "center", marginBottom: 8, fontFamily: "monospace" },

  list: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 10 },

  worldCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: "rgba(12,4,4,0.9)",
  },
  worldCardDanger: { backgroundColor: "rgba(25,4,4,0.9)" },
  worldLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  worldIcon: { fontSize: 32 },
  worldInfo: { flex: 1, gap: 2 },
  worldName: { fontSize: 14, fontWeight: "900", letterSpacing: 2, fontFamily: "monospace" },
  worldSubtitle: { color: "#666", fontSize: 10, letterSpacing: 1, fontFamily: "monospace" },
  recText: { color: "#555", fontSize: 9, letterSpacing: 1, marginTop: 2, fontFamily: "monospace" },

  worldRight: { alignItems: "flex-end", gap: 4, minWidth: 70 },
  diffLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 2, fontFamily: "monospace" },
  diffMult: { color: "#555", fontSize: 9, letterSpacing: 1, fontFamily: "monospace" },
  warningBadge: { fontSize: 14 },
  selectedDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },

  hint: { color: "#3a1a1a", fontSize: 9, letterSpacing: 1.5, textAlign: "center", paddingTop: 10, fontFamily: "monospace" },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  modalBox: {
    backgroundColor: "#0d0204", borderWidth: 2, borderColor: "#880000",
    borderRadius: 12, padding: 22, width: "100%", maxWidth: 340, gap: 10,
    alignItems: "center",
  },
  modalWarningIcon: { fontSize: 40, marginBottom: 2 },
  modalTitle: {
    color: "#ff2222", fontSize: 24, fontWeight: "900", letterSpacing: 4,
    textAlign: "center", fontFamily: "monospace",
  },
  modalWorldName: { color: "#aa3333", fontSize: 12, letterSpacing: 2, fontFamily: "monospace" },
  modalDivider: { width: "100%", height: 1, backgroundColor: "#2a0808", marginVertical: 2 },
  modalBody: { color: "#884444", fontSize: 12, textAlign: "center", letterSpacing: 0.5, fontFamily: "monospace" },
  modalEmphasis: { color: "#ff4444", fontWeight: "900" },
  modalTimeline: { width: "100%", gap: 8, marginVertical: 4 },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timelineIcon: { fontSize: 18, width: 24 },
  timelineText: { color: "#773333", fontSize: 11, letterSpacing: 0.5, flex: 1, fontFamily: "monospace" },
  timelineNum: { color: "#ff4422", fontWeight: "900" },
  modalFooter: { color: "#552222", fontSize: 10, letterSpacing: 1, textAlign: "center", fontStyle: "italic", fontFamily: "monospace" },
  modalActions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: "#442222", borderRadius: 6,
    paddingVertical: 11, alignItems: "center",
  },
  cancelText: { color: "#774444", fontSize: 12, fontWeight: "700", letterSpacing: 2, fontFamily: "monospace" },
  enterAnywayBtn: {
    flex: 1, borderWidth: 2, borderColor: "#cc0000", borderRadius: 6,
    paddingVertical: 11, alignItems: "center", backgroundColor: "rgba(50,0,0,0.4)",
  },
  enterAnywayText: { color: "#ff4444", fontSize: 11, fontWeight: "900", letterSpacing: 1, fontFamily: "monospace" },
});
