import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { LeaderboardScreen } from "@/components/LeaderboardScreen";

export default function LeaderboardPage() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <LeaderboardScreen onBack={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060108" },
});
