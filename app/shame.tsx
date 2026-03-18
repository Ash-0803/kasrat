import { format, subDays } from "date-fns";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Skeleton from "../components/Skeleton";
import { theme } from "../constants/theme";
import { db } from "../lib/firebase";
import { resolveDisplayName, resolveProfilePhotoUrl } from "../lib/users";
import { ShameEntry, UserProfile } from "../types";

type DateMode = "today" | "yesterday";

type ShameListRow = ShameEntry & {
  userName: string;
  photoUrl: string | null;
};

export default function ShameScreen() {
  const [dateMode, setDateMode] = useState<DateMode>("today");
  const [entries, setEntries] = useState<ShameListRow[]>([]);
  const [loading, setLoading] = useState(true);

  const targetDate = useMemo(
    () => (dateMode === "today" ? new Date() : subDays(new Date(), 1)),
    [dateMode],
  );

  const targetDateKey = useMemo(
    () => format(targetDate, "yyyy-MM-dd"),
    [targetDate],
  );

  const targetDateLabel = useMemo(
    () => format(targetDate, "EEEE, MMMM d"),
    [targetDate],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const shameEntriesRef = collection(db, "shame", targetDateKey, "entries");
    const unsubscribe = onSnapshot(
      shameEntriesRef,
      async (snapshot) => {
        const rawEntries = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as ShameEntry;
          return {
            uid: data.uid,
            date: data.date,
            badgeLabel: data.badgeLabel,
          };
        });

        const enrichedEntries = await Promise.all(
          rawEntries.map(async (entry) => {
            const userSnap = await getDoc(doc(db, "users", entry.uid));
            const profile = userSnap.exists()
              ? (userSnap.data() as Partial<UserProfile>)
              : null;

            return {
              ...entry,
              userName: resolveDisplayName(profile, entry.uid),
              photoUrl: await resolveProfilePhotoUrl(profile?.photoURL),
            };
          }),
        );

        if (cancelled) {
          return;
        }

        setEntries(
          enrichedEntries.sort((a, b) => a.userName.localeCompare(b.userName)),
        );
        setLoading(false);
      },
      () => {
        if (!cancelled) {
          setEntries([]);
          setLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [targetDateKey]);

  function renderEntryRow({ item }: { item: ShameListRow }) {
    const avatarLetter = item.userName.charAt(0).toUpperCase() || "?";

    return (
      <View style={styles.entryRow}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>{avatarLetter}</Text>
          </View>
        )}

        <View style={styles.entryCopy}>
          <Text style={styles.userName}>{item.userName}</Text>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>{item.badgeLabel}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wall of Shame</Text>
      <Text style={styles.subtitle}>{targetDateLabel}</Text>

      <View style={styles.switchRow}>
        <Pressable
          style={[
            styles.switchButton,
            dateMode === "today" && styles.switchButtonActive,
          ]}
          onPress={() => setDateMode("today")}
        >
          <Text
            style={[
              styles.switchButtonText,
              dateMode === "today" && styles.switchButtonTextActive,
            ]}
          >
            Today
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.switchButton,
            dateMode === "yesterday" && styles.switchButtonActive,
          ]}
          onPress={() => setDateMode("yesterday")}
        >
          <Text
            style={[
              styles.switchButtonText,
              dateMode === "yesterday" && styles.switchButtonTextActive,
            ]}
          >
            Yesterday
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingList}>
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} variant="row" style={styles.loadingRow} />
          ))}
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            {dateMode === "today"
              ? "Everyone showed up today!"
              : "Everyone showed up yesterday!"}
          </Text>
          <Text style={styles.emptySubtitle}>
            No shame entries were published.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.uid}
          renderItem={renderEntryRow}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#666",
    fontSize: 14,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  switchButton: {
    backgroundColor: theme.colors.background,
    borderColor: "#D5DCE8",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  switchButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  switchButtonText: {
    color: "#555",
    fontSize: 13,
    fontWeight: "700",
  },
  switchButtonTextActive: {
    color: "#FFF",
  },
  loadingList: {
    gap: 12,
    marginTop: 20,
  },
  loadingRow: {
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    padding: 12,
  },
  list: {
    paddingBottom: 24,
    paddingTop: 14,
  },
  entryRow: {
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    flexDirection: "row",
    marginBottom: 10,
    padding: 12,
  },
  avatar: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: "#E8ECF5",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#516079",
    fontSize: 17,
    fontWeight: "700",
  },
  entryCopy: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  badgePill: {
    alignSelf: "flex-start",
    backgroundColor: "#FEE7C8",
    borderRadius: 999,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePillText: {
    color: "#7A4B1B",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 58,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: theme.colors.success,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySubtitle: {
    color: "#666",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
});
