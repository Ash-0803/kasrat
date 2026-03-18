import DateTimePicker from "@react-native-community/datetimepicker";
import { addDays, format, parse, parseISO } from "date-fns";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ErrorBoundary from "../../components/ErrorBoundary";
import Skeleton from "../../components/Skeleton";
import { theme } from "../../constants/theme";
import useAdminGuard from "../../hooks/useAdminGuard";
import {
  cancelSession,
  flagAsLie,
  getAllClaimedLogsForDate,
  getReviewedLogsForDate,
  updateSessionTime,
  verifyLog,
} from "../../lib/admin";
import { db } from "../../lib/firebase";
import { getSessionsForDateRange } from "../../lib/sessions";
import { Session, SessionLog, UserProfile } from "../../types";

type Segment = "sessions" | "verify";

type SessionSection = {
  title: string;
  data: Session[];
};

type AdminLogRow = SessionLog & {
  userName: string;
  sessionTime: string;
};

type VerifySection = {
  key: "pending" | "reviewed";
  title: string;
  data: AdminLogRow[];
};

function formatDisplayTime(time: string): string {
  try {
    return format(parse(time, "HH:mm", new Date()), "h:mm a");
  } catch {
    return time;
  }
}

function formatClaimedAt(timestamp?: number): string {
  if (!timestamp) {
    return "Unknown";
  }

  return format(new Date(timestamp), "h:mm a");
}

function parseTimeToDate(time: string): Date {
  const parsed = parse(time, "HH:mm", new Date());

  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

function toUserName(profile: Partial<UserProfile> | null, uid: string): string {
  const trimmedName = profile?.name?.trim();
  if (trimmedName) {
    return trimmedName;
  }

  const trimmedEmail = profile?.email?.trim();
  if (trimmedEmail) {
    return trimmedEmail;
  }

  return uid;
}

function buildSessionSections(sessions: Session[]): SessionSection[] {
  const byDate: Record<string, Session[]> = {};

  sessions.forEach((session) => {
    if (!byDate[session.date]) {
      byDate[session.date] = [];
    }
    byDate[session.date].push(session);
  });

  return Object.keys(byDate)
    .sort((a, b) => a.localeCompare(b))
    .map((date) => ({
      title: format(parseISO(date), "EEEE, MMM d"),
      data: byDate[date].sort((a, b) => a.time.localeCompare(b.time)),
    }));
}

function AdminContent() {
  const { user, isAdmin, loading: checkingAdmin } = useAdminGuard();
  const [segment, setSegment] = useState<Segment>("sessions");
  const [sessionSections, setSessionSections] = useState<SessionSection[]>([]);
  const [pendingLogs, setPendingLogs] = useState<AdminLogRow[]>([]);
  const [reviewedLogs, setReviewedLogs] = useState<AdminLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());

  const verifySections = useMemo<VerifySection[]>(
    () => [
      {
        key: "pending",
        title: "Pending Claims",
        data: pendingLogs,
      },
      {
        key: "reviewed",
        title: "Reviewed",
        data: reviewedLogs,
      },
    ],
    [pendingLogs, reviewedLogs],
  );

  const loadAdminData = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setErrorMessage(null);

      const today = format(new Date(), "yyyy-MM-dd");
      const endDate = format(addDays(new Date(), 7), "yyyy-MM-dd");

      const [sessions, claimedLogs, reviewed] = await Promise.all([
        getSessionsForDateRange(today, endDate),
        getAllClaimedLogsForDate(today),
        getReviewedLogsForDate(today),
      ]);

      const sortedSessions = [...sessions].sort((a, b) => {
        const dateDiff = a.date.localeCompare(b.date);
        if (dateDiff !== 0) {
          return dateDiff;
        }
        return a.time.localeCompare(b.time);
      });

      setSessionSections(buildSessionSections(sortedSessions));

      const sessionTimesById: Record<string, string> = {};
      sortedSessions.forEach((session) => {
        sessionTimesById[session.id] = session.time;
      });

      const uniqueUids = Array.from(
        new Set([...claimedLogs, ...reviewed].map((log) => log.uid)),
      );

      const userNameEntries = await Promise.all(
        uniqueUids.map(async (uid) => {
          const userSnap = await getDoc(doc(db, "users", uid));

          if (!userSnap.exists()) {
            return [uid, uid] as const;
          }

          const profile = userSnap.data() as Partial<UserProfile>;
          return [uid, toUserName(profile, uid)] as const;
        }),
      );

      const userNameByUid = Object.fromEntries(userNameEntries) as Record<
        string,
        string
      >;

      const mapToRow = (log: SessionLog): AdminLogRow => ({
        ...log,
        userName: userNameByUid[log.uid] ?? log.uid,
        sessionTime: sessionTimesById[log.sessionId] ?? "--:--",
      });

      setPendingLogs(
        claimedLogs
          .map(mapToRow)
          .sort((a, b) => (b.claimedAt ?? 0) - (a.claimedAt ?? 0)),
      );

      setReviewedLogs(
        reviewed
          .map(mapToRow)
          .sort((a, b) => (b.claimedAt ?? 0) - (a.claimedAt ?? 0)),
      );
    } catch {
      setErrorMessage(
        "Could not load admin data. Pull to refresh and try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (checkingAdmin || !isAdmin) {
      return;
    }

    setLoading(true);
    loadAdminData();
  }, [checkingAdmin, isAdmin, loadAdminData]);

  function openEditModal(session: Session) {
    setEditingSession(session);
    setSelectedTime(parseTimeToDate(session.time));
  }

  function closeEditModal() {
    setEditingSession(null);
  }

  async function handleSaveTime() {
    if (!editingSession) {
      return;
    }

    const actionKey = `save-${editingSession.id}`;
    setActiveActionKey(actionKey);
    setErrorMessage(null);

    try {
      const nextTime = format(selectedTime, "HH:mm");
      await updateSessionTime(editingSession.id, nextTime);
      closeEditModal();
      await loadAdminData();
    } catch {
      setErrorMessage("Could not update the session time. Please retry.");
    } finally {
      setActiveActionKey(null);
    }
  }

  async function handleCancelSession(session: Session) {
    if (!user?.uid) {
      return;
    }

    const actionKey = `cancel-${session.id}`;
    setActiveActionKey(actionKey);
    setErrorMessage(null);

    try {
      await cancelSession(session.id, user.uid);
      await loadAdminData();
    } catch {
      setErrorMessage("Could not cancel this session. Please retry.");
    } finally {
      setActiveActionKey(null);
    }
  }

  async function handleVerify(log: AdminLogRow) {
    if (!user?.uid) {
      return;
    }

    const actionKey = `verify-${log.id}`;
    setActiveActionKey(actionKey);
    setErrorMessage(null);

    try {
      await verifyLog(log.id, user.uid);
      await loadAdminData();
    } catch {
      setErrorMessage("Could not verify this log. Please retry.");
    } finally {
      setActiveActionKey(null);
    }
  }

  async function handleFlag(log: AdminLogRow) {
    if (!user?.uid) {
      return;
    }

    const actionKey = `flag-${log.id}`;
    setActiveActionKey(actionKey);
    setErrorMessage(null);

    try {
      await flagAsLie(log.id, user.uid);
      await loadAdminData();
    } catch {
      setErrorMessage("Could not flag this log. Please retry.");
    } finally {
      setActiveActionKey(null);
    }
  }

  if (checkingAdmin || (loading && !refreshing)) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingList}>
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} variant="card" style={styles.loadingCard} />
          ))}
        </View>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingList}>
          {[0, 1].map((item) => (
            <Skeleton key={item} variant="card" style={styles.loadingCard} />
          ))}
        </View>
      </View>
    );
  }

  const saveBusyForCurrentEdit =
    editingSession !== null && activeActionKey === `save-${editingSession.id}`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Panel</Text>

      <View style={styles.segmentedControl}>
        <Pressable
          style={[
            styles.segmentButton,
            segment === "sessions" && styles.segmentButtonActive,
          ]}
          onPress={() => setSegment("sessions")}
        >
          <Text
            style={[
              styles.segmentButtonText,
              segment === "sessions" && styles.segmentButtonTextActive,
            ]}
          >
            Sessions
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.segmentButton,
            segment === "verify" && styles.segmentButtonActive,
          ]}
          onPress={() => setSegment("verify")}
        >
          <Text
            style={[
              styles.segmentButtonText,
              segment === "verify" && styles.segmentButtonTextActive,
            ]}
          >
            Verify Logs
          </Text>
        </Pressable>
      </View>

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      {segment === "sessions" ? (
        <SectionList
          sections={sessionSections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => {
            const cancelBusy = activeActionKey === `cancel-${item.id}`;

            return (
              <View style={styles.card}>
                <View style={styles.rowHeader}>
                  <Text style={styles.sessionTime}>
                    {formatDisplayTime(item.time)}
                  </Text>
                  <Text
                    style={[
                      styles.statusChip,
                      item.status === "cancelled"
                        ? styles.statusCancelled
                        : styles.statusActive,
                    ]}
                  >
                    {item.status === "cancelled" ? "Cancelled" : "Active"}
                  </Text>
                </View>

                <View style={styles.rowActions}>
                  <Pressable
                    style={[styles.button, styles.editButton]}
                    onPress={() => openEditModal(item)}
                  >
                    <Text style={styles.editButtonText}>Edit time</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.button,
                      styles.cancelButton,
                      (cancelBusy || item.status === "cancelled") &&
                        styles.buttonDisabled,
                    ]}
                    onPress={() => handleCancelSession(item)}
                    disabled={cancelBusy || item.status === "cancelled"}
                  >
                    <Text style={styles.cancelButtonText}>
                      {item.status === "cancelled" ? "Cancelled" : "Cancel"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No sessions scheduled in this range.
            </Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadAdminData();
              }}
            />
          }
        />
      ) : (
        <SectionList
          sections={verifySections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item, section }) => {
            const isReviewed = section.key === "reviewed";
            const verifyBusy = activeActionKey === `verify-${item.id}`;
            const flagBusy = activeActionKey === `flag-${item.id}`;

            return (
              <View style={[styles.card, isReviewed && styles.reviewedCard]}>
                <Text style={[styles.logName, isReviewed && styles.mutedText]}>
                  {item.userName}
                </Text>
                <Text style={[styles.logMeta, isReviewed && styles.mutedText]}>
                  Session: {formatDisplayTime(item.sessionTime)}
                </Text>
                <Text style={[styles.logMeta, isReviewed && styles.mutedText]}>
                  Claimed at: {formatClaimedAt(item.claimedAt)}
                </Text>

                {isReviewed ? (
                  <Text
                    style={[
                      styles.reviewBadge,
                      item.status === "lied" && styles.flaggedBadge,
                    ]}
                  >
                    {item.status === "verified" ? "Verified" : "Flagged as lie"}
                  </Text>
                ) : (
                  <View style={styles.rowActions}>
                    <Pressable
                      style={[
                        styles.button,
                        styles.verifyButton,
                        verifyBusy && styles.buttonDisabled,
                      ]}
                      onPress={() => handleVerify(item)}
                      disabled={verifyBusy}
                    >
                      <Text style={styles.verifyButtonText}>Verify</Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.button,
                        styles.flagButton,
                        flagBusy && styles.buttonDisabled,
                      ]}
                      onPress={() => handleFlag(item)}
                      disabled={flagBusy}
                    >
                      <Text style={styles.flagButtonText}>Flag as lie</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No claimed logs for today.</Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadAdminData();
              }}
            />
          }
        />
      )}

      <Modal
        visible={Boolean(editingSession)}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Session Time</Text>
            <Text style={styles.modalSubtitle}>
              New time: {formatDisplayTime(format(selectedTime, "HH:mm"))}
            </Text>

            <DateTimePicker
              value={selectedTime}
              mode="time"
              is24Hour
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, date) => {
                if (date) {
                  setSelectedTime(date);
                }
              }}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.button, styles.modalCancelButton]}
                onPress={closeEditModal}
              >
                <Text style={styles.modalCancelButtonText}>Close</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.button,
                  styles.modalSaveButton,
                  saveBusyForCurrentEdit && styles.buttonDisabled,
                ]}
                onPress={handleSaveTime}
                disabled={saveBusyForCurrentEdit}
              >
                <Text style={styles.modalSaveButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function Admin() {
  return (
    <ErrorBoundary>
      <AdminContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingTop: 16,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingList: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  loadingCard: {
    height: 96,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700",
    paddingHorizontal: 16,
  },
  segmentedControl: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    padding: 4,
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    paddingVertical: 10,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentButtonText: {
    color: "#667085",
    fontSize: 14,
    fontWeight: "700",
  },
  segmentButtonTextActive: {
    color: "#FFFFFF",
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  list: {
    paddingBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionHeader: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    paddingBottom: 6,
    paddingTop: 10,
    textTransform: "uppercase",
  },
  empty: {
    color: "#8A8A8A",
    fontSize: 14,
    marginTop: 16,
    textAlign: "center",
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginBottom: 10,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  reviewedCard: {
    backgroundColor: "#F2F4F7",
  },
  rowHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sessionTime: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  statusChip: {
    borderRadius: 16,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  statusActive: {
    backgroundColor: "#E8F5E9",
    color: theme.colors.success,
  },
  statusCancelled: {
    backgroundColor: "#FFEBEE",
    color: theme.colors.danger,
  },
  rowActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    paddingVertical: 10,
  },
  editButton: {
    backgroundColor: theme.colors.primary,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  cancelButton: {
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.danger,
    borderWidth: 1,
  },
  cancelButtonText: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  verifyButton: {
    backgroundColor: "#1E88E5",
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  flagButton: {
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.danger,
    borderWidth: 1,
  },
  flagButtonText: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  logMeta: {
    color: "#667085",
    fontSize: 13,
    marginTop: 2,
  },
  mutedText: {
    color: "#8A8F98",
  },
  reviewBadge: {
    color: theme.colors.success,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
  },
  flaggedBadge: {
    color: theme.colors.danger,
  },
  modalBackdrop: {
    backgroundColor: "rgba(0,0,0,0.3)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  modalSubtitle: {
    color: "#667085",
    fontSize: 14,
    marginBottom: 10,
    marginTop: 6,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  modalCancelButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderWidth: 1,
  },
  modalCancelButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  modalSaveButton: {
    backgroundColor: theme.colors.primary,
  },
  modalSaveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
