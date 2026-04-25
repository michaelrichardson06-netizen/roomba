import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameCanvas } from "@/components/GameCanvas";
import { DeathScreen } from "@/components/DeathScreen";
import { LeaderboardScreen } from "@/components/LeaderboardScreen";
import type { GameState } from "@/game/types";
import { loadProfile, saveProfile, awardXP, getRankPerks } from "@/game/profile";
import type { PlayerProfile, RankPerks } from "@/game/profile";
import { getWorldById, getWorldDifficultyMult } from "@/game/worlds";

type Phase = "playing" | "dead" | "leaderboard";

interface DeathResult {
  score: number;
  wave: number;
  totalInsects: number;
  deathCause: string;
  hpAtDeath: number;
  sessionBrushes: number;
  sessionXP: number;
}

const HS_SCORE_KEY = "@mallhorror_highscore";
const HS_WAVE_KEY = "@mallhorror_bestwave";

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ worldId?: string }>();
  const worldId = parseInt(params.worldId ?? "0", 10) || 0;

  const [phase, setPhase] = useState<Phase>("playing");
  const [result, setResult] = useState<DeathResult | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [bestWave, setBestWave] = useState(0);
  const [isNewHS, setIsNewHS] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [rankPerks, setRankPerks] = useState<RankPerks | null>(null);
  const profileRef = useRef<PlayerProfile | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(HS_SCORE_KEY).then((v) => { if (v) setHighScore(parseInt(v, 10)); });
    AsyncStorage.getItem(HS_WAVE_KEY).then((v) => { if (v) setBestWave(parseInt(v, 10)); });
    loadProfile().then((p) => {
      profileRef.current = p;
      setProfile(p);
      const world = getWorldById(worldId);
      const diffMult = getWorldDifficultyMult(world.recommendedLevel, p.level);
      setRankPerks(getRankPerks(p, diffMult));
    });
  }, []);

  const handleDeath = useCallback(
    async (state: GameState) => {
      const r: DeathResult = {
        score: state.score,
        wave: state.wave,
        totalInsects: state.totalInsects,
        deathCause: state.deathCause || "unknown",
        hpAtDeath: state.hpAtDeath,
        sessionBrushes: state.sessionBrushes,
        sessionXP: Math.floor(state.sessionXP),
      };
      setResult(r);

      // Award XP + brushes to profile
      const p = profileRef.current;
      if (p) {
        const { profile: updated } = awardXP(p, r.sessionXP);
        const finalProfile: PlayerProfile = {
          ...updated,
          brushes: updated.brushes + r.sessionBrushes,
        };
        profileRef.current = finalProfile;
        setProfile(finalProfile);
        await saveProfile(finalProfile);
      }

      let newRecord = false;
      if (r.score > highScore) {
        setHighScore(r.score);
        setIsNewHS(true);
        newRecord = true;
        await AsyncStorage.setItem(HS_SCORE_KEY, String(r.score));
      }
      if (r.wave > bestWave) {
        setBestWave(r.wave);
        await AsyncStorage.setItem(HS_WAVE_KEY, String(r.wave));
      }
      if (!newRecord) setIsNewHS(false);
      setPhase("dead");
    },
    [highScore, bestWave]
  );

  const handleRetry = useCallback(() => {
    setPhase("playing");
    setResult(null);
    setIsNewHS(false);
    setGameKey((k) => k + 1);
  }, []);

  const handleMenu = useCallback(() => {
    if (Platform.OS === "web") {
      router.replace("/");
    } else {
      router.back();
    }
  }, [router]);

  const handleLeaderboard = useCallback(() => setPhase("leaderboard"), []);
  const handleBackFromLB = useCallback(() => setPhase("dead"), []);

  if (phase === "leaderboard") {
    return (
      <View style={styles.container}>
        <LeaderboardScreen
          onBack={handleBackFromLB}
          highlightScore={result?.score}
        />
      </View>
    );
  }

  if (phase === "dead" && result) {
    return (
      <View style={styles.container}>
        <DeathScreen
          score={result.score}
          wavesCleared={result.wave - 1}
          insectsExterminated={result.totalInsects}
          highScore={highScore}
          bestWave={bestWave}
          isNewHighScore={isNewHS}
          deathCause={result.deathCause}
          hpAtDeath={result.hpAtDeath}
          damageLog={[]}
          onRetry={handleRetry}
          onMenu={handleMenu}
          onLeaderboard={handleLeaderboard}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GameCanvas
        key={gameKey}
        onDeath={handleDeath}
        onExit={handleMenu}
        worldId={worldId}
        rankPerks={rankPerks ?? undefined}
        playerLevel={profile?.level ?? 1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0806" },
});
