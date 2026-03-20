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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ErrorBoundary from "../../components/ErrorBoundary";
import SessionCard from "../../components/SessionCard";
import Skeleton from "../../components/Skeleton";
import StreakBadge from "../../components/StreakBadge";
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from "../../constants/theme";
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
  const insets = useSafeAreaInsets();
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Welcome Header */}
      <View style={styles.welcomeSection}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{profile?.name || "Athlete"}! 💪</Text>
        </View>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{format(new Date(), "EEEE")}</Text>
          <Text style={styles.dateNumber}>{format(new Date(), "d MMM")}</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🔥</Text>
          <Text style={styles.statNumber}>{profile?.currentStreak || 0}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🎯</Text>
          <Text style={styles.statNumber}>{sessions.length}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>✅</Text>
          <Text style={styles.statNumber}>{userLogs ? Object.keys(userLogs).length : 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Motivation Card */}
      <View style={styles.motivationCard}>
        <Text style={styles.motivationTitle}>Today's Goal</Text>
        <Text style={styles.motivationText}>
          {sessions.length > 0 
            ? `Crush your ${sessions.length} session${sessions.length > 1 ? 's' : ''} today!` 
            : "Rest day! Recovery is part of the journey."}
        </Text>
        <View style={styles.progressIndicator}>
          <View style={[
            styles.progressFill, 
            { width: `${((userLogs ? Object.keys(userLogs).length : 0) / Math.max(sessions.length, 1)) * 100}%` }
          ]} />
        </View>
      </View>

      {/* Wall of Shame Banner */}
      {todayShameCount > 0 && (
        <Pressable
          style={styles.shameBanner}
          onPress={() => router.push("/shame")}
        >
          <View style={styles.shameBannerCopy}>
            <Text style={styles.shameBannerTitle}>⚠️ Wall of Shame</Text>
            <Text style={styles.shameBannerSubtitle}>
              {todayShameCount} missed session{todayShameCount === 1 ? '' : 's'} today
            </Text>
          </View>
          <Ionicons
            name="arrow-forward-circle"
            size={24}
            color={COLORS.textPrimary}
          />
        </Pressable>
      )}

      {/* Sessions Section */}
      <View style={styles.sessionsSection}>
        <Text style={styles.sectionTitle}>Today's Sessions</Text>
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: Session }) => (
            <SessionCard
              session={item}
              userLog={userLogs[item.id] ?? null}
              onClaim={() => claimSession(user!.uid, item.id)}
              onSkip={() => skipSession(user!.uid, item.id)}
            />
          )}
          contentContainerStyle={styles.sessionsList}
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
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyTitle}>No sessions today</Text>
                <Text style={styles.emptyText}>Enjoy your rest day!</Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
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
    backgroundColor: COLORS.backgroundSecondary,
    paddingBottom: 100,
  },
  // Welcome Section
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  welcomeText: {
    fontSize: TYPOGRAPHY.lg,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.medium,
  },
  userName: {
    fontSize: TYPOGRAPHY['2xl'],
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.bold,
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.medium,
  },
  dateNumber: {
    fontSize: TYPOGRAPHY.lg,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.bold,
  },
  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  statNumber: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.medium,
  },
  // Motivation Card
  motivationCard: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  motivationTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textInverse,
    marginBottom: SPACING.sm,
  },
  motivationText: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textInverse,
    marginBottom: SPACING.md,
    lineHeight: TYPOGRAPHY.normalLineHeight,
  },
  progressIndicator: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  // Sessions Section
  sessionsSection: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  sessionsList: {
    paddingBottom: SPACING.xl,
  },
  // Shame Banner
  shameBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentLight,
    borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  shameBannerCopy: {
    flex: 1,
  },
  shameBannerTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  shameBannerSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
  },
  // Loading & Empty States
  loadingList: {
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  loadingCard: {
    height: 96,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING['2xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
