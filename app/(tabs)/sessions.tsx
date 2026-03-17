import { format, parseISO, subDays } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    SectionList,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { theme } from "../../constants/theme";
import useAuth from "../../hooks/useAuth";
import {
    getSessionsForDateRange,
    getUserLogsForDateRange,
} from "../../lib/sessions";
import { Session, SessionLog } from "../../types";

type ChipStatus =
  | "upcoming"
  | "claimed"
  | "verified"
  | "lied"
  | "skipped"
  | "cancelled";

const CHIP_CONFIG: Record<
  ChipStatus,
  { label: string; bg: string; color: string }
> = {
  upcoming: { label: "Upcoming", bg: theme.colors.surface, color: "#666" },
  claimed: { label: "Claimed", bg: "#E8F5E9", color: theme.colors.success },
  verified: { label: "Verified", bg: "#E3F2FD", color: "#1565C0" },
  lied: { label: "Lied", bg: "#FFEBEE", color: theme.colors.danger },
  skipped: { label: "Skipped", bg: "#FFF8E1", color: "#E65100" },
  cancelled: { label: "Cancelled", bg: "#FFEBEE", color: theme.colors.danger },
};

function StatusChip({ status }: { status: ChipStatus }) {
  const cfg = CHIP_CONFIG[status];
  return (
    <View style={[styles.chip, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.chipText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function formattedTime(time: string): string {
  try {
    const [h, m] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return format(d, "h:mm a");
  } catch {
    return time;
  }
}

function SessionRow({ session, log }: { session: Session; log?: SessionLog }) {
  let status: ChipStatus;
  if (session.status === "cancelled") {
    status = "cancelled";
  } else if (log?.status) {
    status = log.status as ChipStatus;
  } else {
    status = "upcoming";
  }

  return (
    <View style={styles.row}>
      <Text style={styles.rowTime}>{formattedTime(session.time)}</Text>
      <StatusChip status={status} />
      {(log?.status === "verified" || log?.status === "lied") && (
        <Text
          style={[
            styles.verifyBadge,
            log.status === "lied" && { color: theme.colors.danger },
          ]}
        >
          {log.status === "verified" ? "✓" : "⚠"}
        </Text>
      )}
    </View>
  );
}

type RowItem = { session: Session; log?: SessionLog };
type Section = { title: string; data: RowItem[] };

export default function Sessions() {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const startDate = format(subDays(new Date(), 13), "yyyy-MM-dd");

    const [sessionsList, logsList] = await Promise.all([
      getSessionsForDateRange(startDate, today),
      getUserLogsForDateRange(user.uid, startDate, today),
    ]);

    const logsMap: Record<string, SessionLog> = {};
    logsList.forEach((log) => {
      logsMap[log.sessionId] = log;
    });

    const byDate: Record<string, RowItem[]> = {};
    sessionsList.forEach((session) => {
      if (!byDate[session.date]) byDate[session.date] = [];
      byDate[session.date].push({ session, log: logsMap[session.id] });
    });

    const built: Section[] = Object.keys(byDate)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        title: format(parseISO(date), "EEEE, MMMM d"),
        data: byDate[date].sort((a, b) =>
          a.session.time.localeCompare(b.session.time),
        ),
      }));

    setSections(built);
    setLoading(false);
    setRefreshing(false);
  }, [user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.session.id}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <SessionRow session={item.session} log={item.log} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No history yet.</Text>}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
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
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingBottom: 30,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  rowTime: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  verifyBadge: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.success,
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#999",
    fontSize: 15,
  },
});
