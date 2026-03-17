import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import SessionCard from "../../components/SessionCard";
import { theme } from "../../constants/theme";
import useAuth from "../../hooks/useAuth";
import useTodaySessions from "../../hooks/useTodaySessions";
import { db } from "../../lib/firebase";
import { claimSession, skipSession } from "../../lib/sessions";
import { Session, UserProfile } from "../../types";

export default function Home() {
  const { user } = useAuth();
  const { sessions, userLogs, loading, refresh } = useTodaySessions(user?.uid);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
    });
  }, [user?.uid]);

  async function handleRefresh() {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }

  const todayLabel = format(new Date(), "EEEE, MMMM d");

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.dateText}>{todayLabel}</Text>
            {profile !== null && (
              <View style={styles.streakRow}>
                <Ionicons name="flame" size={22} color="#FF5722" />
                <Text style={styles.streakText}>
                  {profile.currentStreak} day streak
                </Text>
              </View>
            )}
            <Text style={styles.sectionLabel}>Today's Sessions</Text>
          </View>
        }
        renderItem={({ item }: { item: Session }) => (
          <SessionCard
            session={item}
            userLog={userLogs[item.id] ?? null}
            onClaim={() => claimSession(user!.uid, item.id)}
            onSkip={() => skipSession(user!.uid, item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              style={styles.spinner}
              color={theme.colors.primary}
            />
          ) : (
            <Text style={styles.empty}>No sessions scheduled for today.</Text>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  dateText: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  streakText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF5722",
  },
  sectionLabel: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  spinner: {
    marginTop: 40,
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#999",
    fontSize: 15,
  },
});
