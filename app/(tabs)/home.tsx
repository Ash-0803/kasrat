import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ErrorBoundary from "../../components/ErrorBoundary";
import SessionCard from "../../components/SessionCard";
import Skeleton from "../../components/Skeleton";
import StreakBadge from "../../components/StreakBadge";
import { theme } from "../../constants/theme";
import useAuth from "../../hooks/useAuth";
import useTodaySessions from "../../hooks/useTodaySessions";
import { db } from "../../lib/firebase";
import { claimSession, skipSession } from "../../lib/sessions";
import { Session, UserProfile } from "../../types";

function HomeContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { sessions, userLogs, loading, refresh } = useTodaySessions(user?.uid);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [todayShameCount, setTodayShameCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
    });
  }, [user?.uid]);

  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const shameEntriesRef = collection(db, "shame", today, "entries");

    const unsubscribe = onSnapshot(
      shameEntriesRef,
      (snapshot) => {
        setTodayShameCount(snapshot.size);
      },
      () => {
        setTodayShameCount(0);
      },
    );

    return () => unsubscribe();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }

  const todayLabel = format(new Date(), "EEEE, MMMM d");
  const todayHasShame = todayShameCount > 0;

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
                <Text style={styles.streakLabel}>Current streak</Text>
                <StreakBadge streak={profile.currentStreak} />
                <Text style={styles.longestHint}>
                  Longest: {profile.longestStreak}
                </Text>
              </View>
            )}

            {todayHasShame && (
              <Pressable
                style={styles.shameBanner}
                onPress={() => router.push("/shame")}
              >
                <View style={styles.shameBannerCopy}>
                  <Text style={styles.shameBannerTitle}>Wall of Shame</Text>
                  <Text style={styles.shameBannerSubtitle}>
                    {todayShameCount}{" "}
                    {todayShameCount === 1 ? "entry" : "entries"} posted today
                  </Text>
                </View>
                <Ionicons
                  name="arrow-forward-circle"
                  size={24}
                  color={theme.colors.text}
                />
              </Pressable>
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
            <View style={styles.loadingList}>
              {[0, 1, 2].map((item) => (
                <Skeleton
                  key={item}
                  variant="card"
                  style={styles.loadingCard}
                />
              ))}
            </View>
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

export default function Home() {
  return (
    <ErrorBoundary>
      <HomeContent />
    </ErrorBoundary>
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
    gap: 8,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  longestHint: {
    fontSize: 13,
    color: "#666",
  },
  shameBanner: {
    alignItems: "center",
    backgroundColor: "#F8E9D2",
    borderColor: "#E5C79F",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  shameBannerCopy: {
    flex: 1,
    paddingRight: 10,
  },
  shameBannerTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  shameBannerSubtitle: {
    color: "#5C4A35",
    marginTop: 4,
    fontSize: 13,
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
  loadingList: {
    gap: 12,
    marginTop: 24,
  },
  loadingCard: {
    height: 96,
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#999",
    fontSize: 15,
  },
});
