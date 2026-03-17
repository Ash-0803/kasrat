import { format, isBefore, parse } from "date-fns";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { theme } from "../constants/theme";
import { Session, SessionLog } from "../types";

interface SessionCardProps {
  session: Session;
  userLog: SessionLog | null;
  onClaim: () => Promise<void>;
  onSkip: () => Promise<void>;
}

function formatTime(time: string): string {
  try {
    const parsed = parse(time, "HH:mm", new Date());
    return format(parsed, "h:mm a");
  } catch {
    return time;
  }
}

function hasTimePassed(time: string): boolean {
  const [hours, minutes] = time.split(":").map(Number);
  const sessionTime = new Date();
  sessionTime.setHours(hours, minutes, 0, 0);
  return isBefore(sessionTime, new Date());
}

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

export default function SessionCard({
  session,
  userLog,
  onClaim,
  onSkip,
}: SessionCardProps) {
  const [actionLoading, setActionLoading] = useState(false);

  const isCancelled = session.status === "cancelled";
  const timePassed = hasTimePassed(session.time);
  const logStatus = userLog?.status as ChipStatus | undefined;
  const needsAction = timePassed && !isCancelled && !logStatus;

  let chipStatus: ChipStatus;
  if (isCancelled) {
    chipStatus = "cancelled";
  } else if (logStatus) {
    chipStatus = logStatus;
  } else {
    chipStatus = "upcoming";
  }

  async function handleClaim() {
    setActionLoading(true);
    try {
      await onClaim();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSkip() {
    setActionLoading(true);
    try {
      await onSkip();
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.time}>{formatTime(session.time)}</Text>
        <StatusChip status={chipStatus} />
      </View>

      {isCancelled && session.note ? (
        <Text style={styles.note}>{session.note}</Text>
      ) : null}

      {needsAction && (
        <View style={styles.actionSection}>
          <Text style={styles.prompt}>Did you do it?</Text>
          {actionLoading ? (
            <ActivityIndicator
              color={theme.colors.primary}
              style={styles.spinner}
            />
          ) : (
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.btn, styles.btnYes]}
                onPress={handleClaim}
              >
                <Text style={styles.btnYesText}>Yes, I did it</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnNo]}
                onPress={handleSkip}
              >
                <Text style={styles.btnNoText}>I skipped it</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {logStatus === "verified" && (
        <Text style={[styles.badge, { color: theme.colors.success }]}>
          ✓ Verified by admin
        </Text>
      )}
      {logStatus === "lied" && (
        <Text style={[styles.badge, { color: theme.colors.danger }]}>
          ⚠ Marked as lied
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  time: {
    fontSize: 17,
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
  note: {
    marginTop: 6,
    fontSize: 13,
    color: theme.colors.danger,
  },
  actionSection: {
    marginTop: 14,
  },
  prompt: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 10,
  },
  spinner: {
    alignSelf: "flex-start",
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  btnYes: {
    backgroundColor: theme.colors.success,
  },
  btnNo: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  btnYesText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  btnNoText: {
    color: theme.colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  badge: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
  },
});
