import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameCanvas } from "@/components/GameCanvas";
import { DeathScreen } from "@/components/DeathScreen";
import type { GameState } from "@/game/types";

type Phase = "playing" | "dead";

interface DeathResult {
  score: number;
  wave: number;
  totalInsects: number;
  deathCause: string;
  hpAtDeath: number;
  damageLog: string[];
}

const HS_SCORE_KEY = "@mallhorror_highscore";
const HS_WAVE_KEY = "@mallhorror_bestwave";

export default function GameScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("playing");
  const [result, setResult] = useState<DeathResult | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [bestWave, setBestWave] = useState(0);
  const [isNewHS, setIsNewHS] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(HS_SCORE_KEY).then((v) => {
      if (v) setHighScore(parseInt(v, 10));
    });
    AsyncStorage.getItem(HS_WAVE_KEY).then((v) => {
      if (v) setBestWave(parseInt(v, 10));
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
        damageLog: state.damageLog ?? [],
      };
      setResult(r);

      let newHS = highScore;
      let newBW = bestWave;
      let newRecord = false;

      if (r.score > highScore) {
        newHS = r.score;
        setHighScore(newHS);
        setIsNewHS(true);
        newRecord = true;
        await AsyncStorage.setItem(HS_SCORE_KEY, String(newHS));
      }
      if (r.wave > bestWave) {
        newBW = r.wave;
        setBestWave(newBW);
        await AsyncStorage.setItem(HS_WAVE_KEY, String(newBW));
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
    router.back();
  }, [router]);

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
          damageLog={result.damageLog}
          onRetry={handleRetry}
          onMenu={handleMenu}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GameCanvas key={gameKey} onDeath={handleDeath} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0806",
  },
});
