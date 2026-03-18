import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ErrorBoundary from "../../components/ErrorBoundary";
import Skeleton from "../../components/Skeleton";
import StreakBadge from "../../components/StreakBadge";
import { theme } from "../../constants/theme";
import useAuth from "../../hooks/useAuth";
import { db } from "../../lib/firebase";
import { resolveDisplayName, resolveProfilePhotoUrl } from "../../lib/users";
import { UserProfile } from "../../types";

type RankingMode = "current" | "longest";

type LeaderboardRow = {
  uid: string;
  displayName: string;
  photoUrl: string | null;
  currentStreak: number;
  longestStreak: number;
};

function LeaderboardContent() {
  const { user } = useAuth();
  const [mode, setMode] = useState<RankingMode>("current");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const metric = mode === "current" ? "currentStreak" : "longestStreak";
    const leaderboardQuery = query(
      collection(db, "users"),
      orderBy(metric, "desc"),
      limit(50),
    );

    const unsubscribe = onSnapshot(
      leaderboardQuery,
      async (snapshot) => {
        const mappedRows = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data() as Partial<UserProfile>;

            return {
              uid: docSnap.id,
              displayName: resolveDisplayName(data, docSnap.id),
              photoUrl: await resolveProfilePhotoUrl(data.photoURL),
              currentStreak:
                typeof data.currentStreak === "number" ? data.currentStreak : 0,
              longestStreak:
                typeof data.longestStreak === "number" ? data.longestStreak : 0,
            };
          }),
        );

        if (cancelled) {
          return;
        }

        setRows(mappedRows);
        setLoading(false);
      },
      () => {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [mode]);

  function renderRow({ item, index }: { item: LeaderboardRow; index: number }) {
    const isCurrentUser = item.uid === user?.uid;
    const avatarLetter = item.displayName.charAt(0).toUpperCase() || "?";

    return (
      <View style={[styles.row, isCurrentUser && styles.currentUserRow]}>
        <Text style={styles.rank}>{index + 1}</Text>

        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>{avatarLetter}</Text>
          </View>
        )}

        <View style={styles.nameBlock}>
          <Text style={styles.name}>{item.displayName}</Text>
          <Text style={styles.metaText}>Longest: {item.longestStreak}</Text>
        </View>

        <StreakBadge streak={item.currentStreak} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>

      <View style={styles.toggleRow}>
        <Pressable
          style={[
            styles.toggleButton,
            mode === "current" && styles.toggleButtonActive,
          ]}
          onPress={() => setMode("current")}
        >
          <Text
            style={[
              styles.toggleButtonText,
              mode === "current" && styles.toggleButtonTextActive,
            ]}
          >
            Current streak
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.toggleButton,
            mode === "longest" && styles.toggleButtonActive,
          ]}
          onPress={() => setMode("longest")}
        >
          <Text
            style={[
              styles.toggleButtonText,
              mode === "longest" && styles.toggleButtonTextActive,
            ]}
          >
            Longest streak
          </Text>
        </Pressable>
      </View>

      <Text style={styles.modeHint}>
        Ranking by {mode === "current" ? "current streak" : "longest streak"}
      </Text>

      {loading ? (
        <View style={styles.loadingList}>
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} variant="row" style={styles.loadingRow} />
          ))}
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.uid}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No leaderboard data available yet.</Text>
          }
        />
      )}
    </View>
  );
}

export default function Leaderboard() {
  return (
    <ErrorBoundary>
      <LeaderboardContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  toggleButton: {
    backgroundColor: theme.colors.background,
    borderColor: "#D5DCE8",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  toggleButtonText: {
    color: "#555",
    fontSize: 13,
    fontWeight: "700",
  },
  toggleButtonTextActive: {
    color: "#FFF",
  },
  loadingList: {
    gap: 12,
    marginTop: 18,
  },
  loadingRow: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
  },
  modeHint: {
    color: "#667085",
    fontSize: 12,
    marginTop: 8,
  },
  list: {
    paddingBottom: 24,
    paddingTop: 14,
  },
  row: {
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    flexDirection: "row",
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  currentUserRow: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  rank: {
    color: "#7A7D85",
    fontSize: 17,
    fontWeight: "700",
    width: 28,
  },
  avatar: {
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: "#E8ECF5",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#516079",
    fontSize: 15,
    fontWeight: "700",
  },
  nameBlock: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  name: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  metaText: {
    color: "#667085",
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    color: "#999",
    fontSize: 15,
    marginTop: 38,
    textAlign: "center",
  },
});
