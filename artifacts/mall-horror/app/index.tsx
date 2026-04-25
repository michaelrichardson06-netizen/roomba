import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MenuScreen } from "@/components/MenuScreen";
import { WorldSelectScreen } from "@/components/WorldSelectScreen";
import { loadProfile, saveProfile } from "@/game/profile";
import type { PlayerProfile } from "@/game/profile";

const HS_SCORE_KEY = "@mallhorror_highscore";
const HS_WAVE_KEY = "@mallhorror_bestwave";

type HomePhase = "menu" | "world-select";

export default function HomeScreen() {
  const router = useRouter();
  const [highScore, setHighScore] = useState(0);
  const [bestWave, setBestWave] = useState(0);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [phase, setPhase] = useState<HomePhase>("menu");

  useEffect(() => {
    AsyncStorage.getItem(HS_SCORE_KEY).then((v) => {
      if (v) setHighScore(parseInt(v, 10));
    });
    AsyncStorage.getItem(HS_WAVE_KEY).then((v) => {
      if (v) setBestWave(parseInt(v, 10));
    });
    loadProfile().then(setProfile);
  }, []);

  const handleWorldSelect = async (worldId: number) => {
    if (!profile) return;
    const updated = { ...profile, selectedWorld: worldId };
    setProfile(updated);
    await saveProfile(updated);
    router.push({ pathname: "/game", params: { worldId: String(worldId) } });
  };

  const handleStart = () => {
    setPhase("world-select");
  };

  if (phase === "world-select" && profile) {
    return (
      <View style={styles.container}>
        <WorldSelectScreen
          playerLevel={profile.level}
          selectedWorld={profile.selectedWorld}
          onSelect={handleWorldSelect}
          onBack={() => setPhase("menu")}
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
  container: {
    flex: 1,
    backgroundColor: "#050403",
  },
});
