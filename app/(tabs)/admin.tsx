import { format, parse } from "date-fns";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { theme } from "../../constants/theme";
import useTodaySessions from "../../hooks/useTodaySessions";
import { cancelSession, updateSessionTime } from "../../lib/sessions";
import { Session } from "../../types";

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function formatDisplayTime(time: string): string {
  try {
    return format(parse(time, "HH:mm", new Date()), "h:mm a");
  } catch {
    return time;
  }
}

export default function Admin() {
  const { sessions, loading, refresh } = useTodaySessions();
  const [draftTimes, setDraftTimes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraftTimes((prev) => {
      const next = { ...prev };
      sessions.forEach((session) => {
        if (!next[session.id]) {
          next[session.id] = session.time;
        }
      });
      return next;
    });
  }, [sessions]);

  async function handleUpdateTime(session: Session) {
    const nextTime = (draftTimes[session.id] ?? "").trim();
    if (!isValidTime(nextTime)) {
      setErrorMessage("Use HH:mm format (for example: 09:30).");
      return;
    }

    setActiveId(session.id);
    setErrorMessage(null);

    try {
      await updateSessionTime(session.id, nextTime);
      await refresh();
    } catch {
      setErrorMessage("Could not update the session time. Please retry.");
    } finally {
      setActiveId(null);
    }
  }

  async function handleCancel(session: Session) {
    setActiveId(session.id);
    setErrorMessage(null);

    try {
      await cancelSession(session.id, notes[session.id]);
      await refresh();
    } catch {
      setErrorMessage("Could not cancel the session. Please retry.");
    } finally {
      setActiveId(null);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Panel</Text>
      <Text style={styles.subtitle}>Edit or cancel today&apos;s sessions</Text>
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No sessions available for today.</Text>
        }
        renderItem={({ item }) => {
          const busy = activeId === item.id;
          const isCancelled = item.status === "cancelled";

          return (
            <View style={styles.card}>
              <View style={styles.rowHeader}>
                <Text style={styles.timeLabel}>
                  {formatDisplayTime(item.time)}
                </Text>
                <Text
                  style={[
                    styles.status,
                    isCancelled ? styles.statusCancelled : styles.statusActive,
                  ]}
                >
                  {isCancelled ? "Cancelled" : "Active"}
                </Text>
              </View>

              <Text style={styles.fieldLabel}>New time (HH:mm)</Text>
              <TextInput
                value={draftTimes[item.id] ?? item.time}
                onChangeText={(value) =>
                  setDraftTimes((prev) => ({ ...prev, [item.id]: value }))
                }
                style={styles.input}
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
                placeholder="09:30"
                editable={!busy}
              />

              <Text style={styles.fieldLabel}>
                Cancellation note (optional)
              </Text>
              <TextInput
                value={notes[item.id] ?? ""}
                onChangeText={(value) =>
                  setNotes((prev) => ({ ...prev, [item.id]: value }))
                }
                style={[styles.input, styles.noteInput]}
                multiline
                placeholder="Reason for cancellation"
                editable={!busy}
              />

              <View style={styles.actions}>
                <Pressable
                  style={[
                    styles.button,
                    styles.updateButton,
                    busy && styles.buttonDisabled,
                  ]}
                  onPress={() => handleUpdateTime(item)}
                  disabled={busy}
                >
                  <Text style={styles.updateButtonText}>Save Time</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.button,
                    styles.cancelButton,
                    busy && styles.buttonDisabled,
                  ]}
                  onPress={() => handleCancel(item)}
                  disabled={busy}
                >
                  <Text style={styles.cancelButtonText}>Cancel Session</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
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
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 6,
    paddingHorizontal: 16,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: 12,
    gap: 12,
  },
  empty: {
    color: "#888",
    fontSize: 14,
    marginTop: 18,
    textAlign: "center",
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  rowHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeLabel: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  status: {
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
  fieldLabel: {
    color: "#555",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 12,
  },
  input: {
    backgroundColor: "#FFF",
    borderColor: "#DDD",
    borderRadius: 8,
    borderWidth: 1,
    color: theme.colors.text,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  noteInput: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    paddingVertical: 10,
  },
  updateButton: {
    backgroundColor: theme.colors.primary,
  },
  updateButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  cancelButton: {
    backgroundColor: "#FFF",
    borderColor: theme.colors.danger,
    borderWidth: 1,
  },
  cancelButtonText: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
