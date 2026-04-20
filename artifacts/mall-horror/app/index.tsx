import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MenuScreen } from "@/components/MenuScreen";

const HS_SCORE_KEY = "@mallhorror_highscore";
const HS_WAVE_KEY = "@mallhorror_bestwave";

export default function HomeScreen() {
  const router = useRouter();
  const [highScore, setHighScore] = useState(0);
  const [bestWave, setBestWave] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(HS_SCORE_KEY).then((v) => {
      if (v) setHighScore(parseInt(v, 10));
    });
    AsyncStorage.getItem(HS_WAVE_KEY).then((v) => {
      if (v) setBestWave(parseInt(v, 10));
    });
  }, []);

  return (
    <View style={styles.container}>
      <MenuScreen
        onStart={() => router.push("/game")}
        onLeaderboard={() => router.push("/leaderboard")}
        highScore={highScore}
        bestWave={bestWave}
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
