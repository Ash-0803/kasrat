import { StyleSheet, Text, View } from "react-native";

interface LeaderboardProps {}

export default function Leaderboard(_props: LeaderboardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "600" },
});
