import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MenuScreen } from "@/components/MenuScreen";
import { WorldSelectScreen } from "@/components/WorldSelectScreen";
import { BrushStoreScreen } from "@/components/BrushStoreScreen";
import { loadProfile, saveProfile } from "@/game/profile";
import type { PlayerProfile, StartingBuffs } from "@/game/profile";
import { getWorldById, getWorldDifficultyMult } from "@/game/worlds";

const HS_SCORE_KEY = "@mallhorror_highscore";
const HS_WAVE_KEY = "@mallhorror_bestwave";

type HomePhase = "menu" | "world-select" | "store";

export default function HomeScreen() {
  const router = useRouter();
  const [highScore, setHighScore] = useState(0);
  const [bestWave, setBestWave] = useState(0);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [phase, setPhase] = useState<HomePhase>("menu");
  const [pendingWorldId, setPendingWorldId] = useState(0);
  const [pendingBuffs, setPendingBuffs] = useState<StartingBuffs | undefined>(undefined);

  useEffect(() => {
    AsyncStorage.getItem(HS_SCORE_KEY).then((v) => { if (v) setHighScore(parseInt(v, 10)); });
    AsyncStorage.getItem(HS_WAVE_KEY).then((v) => { if (v) setBestWave(parseInt(v, 10)); });
    loadProfile().then(setProfile);
  }, []);

  function enterGame(worldId: number, buffs?: StartingBuffs) {
    if (!profile) return;
    const world = getWorldById(worldId);
    const diffMult = getWorldDifficultyMult(world.recommendedLevel, profile.level);
    const underleveled = diffMult >= 3.0;
    const params: Record<string, string> = { worldId: String(worldId) };
    if (buffs && Object.keys(buffs).length > 0) {
      params.startingBuffs = JSON.stringify(buffs);
    }
    if (underleveled) params.underleveledPenalty = "true";
    router.push({ pathname: "/game", params });
  }

  const handleWorldSelect = async (worldId: number) => {
    if (!profile) return;
    const updated = { ...profile, selectedWorld: worldId };
    setProfile(updated);
    await saveProfile(updated);
    enterGame(worldId, pendingBuffs);
    setPendingBuffs(undefined);
  };

  const handleStoreEnter = async (buffs: StartingBuffs, brushesSpent: number) => {
    if (!profile) return;
    const updated = { ...profile, brushes: Math.max(0, profile.brushes - brushesSpent) };
    setProfile(updated);
    await saveProfile(updated);
    enterGame(pendingWorldId, buffs);
    setPhase("world-select");
  };

  const handleStart = () => setPhase("world-select");
  const handleOpenStore = () => {
    setPendingWorldId(profile?.selectedWorld ?? 0);
    setPhase("store");
  };

  if (phase === "store" && profile) {
    return (
      <View style={styles.container}>
        <BrushStoreScreen
          brushes={profile.brushes}
          onBack={() => setPhase("world-select")}
          onEnterGame={handleStoreEnter}
        />
      </View>
    );
  }

  if (phase === "world-select" && profile) {
    return (
      <View style={styles.container}>
        <WorldSelectScreen
          playerLevel={profile.level}
          selectedWorld={profile.selectedWorld}
          onSelect={handleWorldSelect}
          onBack={() => setPhase("menu")}
          onStore={handleOpenStore}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MenuScreen
        onStart={handleStart}
        onLeaderboard={() => router.push("/leaderboard")}
        highScore={highScore}
        bestWave={bestWave}
        profile={profile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050403" },
});
