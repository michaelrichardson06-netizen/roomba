import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STORE_ITEMS } from "@/game/profile";
import type { StartingBuffs } from "@/game/profile";

interface BrushStoreScreenProps {
  brushes: number;
  onBack: () => void;
  onEnterGame: (buffs: StartingBuffs, brushesSpent: number) => void;
}

type CartItem = { [key: string]: boolean };

export function BrushStoreScreen({ brushes, onBack, onEnterGame }: BrushStoreScreenProps) {
  const insets = useSafeAreaInsets();
  const [cart, setCart] = useState<CartItem>({});

  const totalCost = STORE_ITEMS.reduce((sum, item) => {
    return sum + (cart[item.id] ? item.cost : 0);
  }, 0);
  const canAfford = (itemCost: number) => brushes - totalCost >= itemCost;

  function toggle(id: string, cost: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else if (canAfford(cost)) {
        next[id] = true;
      }
      return next;
    });
  }

  function handleEnter() {
    const buffs: StartingBuffs = {
      tripleShot:      cart["tripleShot"]      ? true : undefined,
      quadShot:        cart["quadShot"]         ? true : undefined,
      rapidFireStacks: cart["rapidFire"]        ? 1    : undefined,
      speedBoost:      cart["speedBoost"]       ? 12000 : undefined,
      lightningStrike: cart["lightningStrike"]  ? true : undefined,
    };
    onEnterGame(buffs, totalCost);
  }

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>{"← BACK"}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🛒  BUFF STORE</Text>
        <View style={styles.walletBadge}>
          <Text style={styles.walletText}>🪙 {brushes - totalCost}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>Load up before the next run. Buffs are consumed on entry.</Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {STORE_ITEMS.map((item) => {
          const selected = !!cart[item.id];
          const affordable = selected || canAfford(item.cost);
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.card,
                selected && styles.cardSelected,
                !affordable && !selected && styles.cardDisabled,
              ]}
              onPress={() => toggle(item.id, item.cost)}
              activeOpacity={0.75}
            >
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemLabel, selected && styles.itemLabelSelected]}>
                  {item.label}
                </Text>
                <Text style={styles.itemDesc}>{item.desc}</Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={[styles.itemCost, !affordable && !selected && styles.itemCostGray]}>
                  🪙 {item.cost}
                </Text>
                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                  {selected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Summary + Enter */}
      <View style={styles.footer}>
        {totalCost > 0 && (
          <Text style={styles.costSummary}>
            Total: 🪙 {totalCost} · Remaining: 🪙 {brushes - totalCost}
          </Text>
        )}
        <TouchableOpacity style={styles.enterBtn} onPress={handleEnter} activeOpacity={0.8}>
          <Text style={styles.enterText}>
            {totalCost > 0 ? `[ SPEND ${totalCost} & ENTER GAME ]` : "[ ENTER GAME (NO BUFFS) ]"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#040408",
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(100,100,255,0.2)",
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backText: { color: "#6644aa", fontSize: 13, fontWeight: "700", letterSpacing: 1, fontFamily: "monospace" },
  title: { color: "#aa88ff", fontSize: 16, fontWeight: "900", letterSpacing: 3, fontFamily: "monospace" },
  walletBadge: {
    backgroundColor: "rgba(80,60,10,0.5)",
    borderWidth: 1,
    borderColor: "#aa8800",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  walletText: { color: "#ffd700", fontSize: 13, fontWeight: "900" },

  subtitle: { color: "#442266", fontSize: 10, letterSpacing: 1, textAlign: "center", marginBottom: 10, fontFamily: "monospace" },

  list: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 10 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#221133",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(10,4,20,0.9)",
  },
  cardSelected: {
    borderColor: "#aa44ff",
    backgroundColor: "rgba(60,10,100,0.35)",
  },
  cardDisabled: { opacity: 0.4 },

  itemIcon: { fontSize: 28 },
  itemInfo: { flex: 1, gap: 2 },
  itemLabel: { color: "#776688", fontSize: 13, fontWeight: "900", letterSpacing: 2, fontFamily: "monospace" },
  itemLabelSelected: { color: "#cc88ff" },
  itemDesc: { color: "#443355", fontSize: 10, letterSpacing: 1, fontFamily: "monospace" },

  itemRight: { alignItems: "flex-end", gap: 6 },
  itemCost: { color: "#ffd700", fontSize: 12, fontWeight: "700" },
  itemCostGray: { color: "#443333" },
  checkbox: {
    width: 22, height: 22, borderRadius: 5,
    borderWidth: 1, borderColor: "#442266",
    alignItems: "center", justifyContent: "center",
  },
  checkboxSelected: { backgroundColor: "#8833cc", borderColor: "#cc88ff" },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "900" },

  footer: { gap: 8, paddingTop: 10 },
  costSummary: { color: "#6644aa", fontSize: 10, letterSpacing: 1.5, textAlign: "center", fontFamily: "monospace" },
  enterBtn: {
    borderWidth: 2,
    borderColor: "#6633bb",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(30,5,60,0.6)",
  },
  enterText: { color: "#cc88ff", fontSize: 14, fontWeight: "900", letterSpacing: 2, fontFamily: "monospace" },
});
