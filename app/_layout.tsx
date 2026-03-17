import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import useAuth from "../hooks/useAuth";
import {
  clearAllSessionAlarms,
  registerForPushNotificationsAsync,
  scheduleDailySessionAlarm,
} from "../lib/notifications";
import { getTodaySessions } from "../lib/sessions";

export default function Layout() {
  const { user } = useAuth();
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapNotifications() {
      if (!user?.uid) {
        setShowPermissionBanner(false);
        await clearAllSessionAlarms();
        return;
      }

      const registration = await registerForPushNotificationsAsync();
      if (!cancelled && registration.shouldShowPermissionBanner) {
        setShowPermissionBanner(true);
      }

      const todaySessions = await getTodaySessions();
      const activeSessions = todaySessions.filter(
        (session) => session.status === "active",
      );

      await clearAllSessionAlarms();
      await Promise.all(
        activeSessions.map((session) => scheduleDailySessionAlarm(session)),
      );
    }

    bootstrapNotifications().catch((error) => {
      console.warn("Failed to initialize notifications", error);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  async function handleOpenSettings() {
    setShowPermissionBanner(false);
    try {
      await Linking.openSettings();
    } catch {
      // Ignore, as not all environments support opening system settings.
    }
  }

  return (
    <SafeAreaProvider>
      {showPermissionBanner && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Notifications help you stay on schedule. Turn them on to get session
            reminders.
          </Text>
          <View style={styles.bannerActions}>
            <Pressable
              style={styles.settingsButton}
              onPress={handleOpenSettings}
            >
              <Text style={styles.settingsButtonText}>Open Settings</Text>
            </Pressable>
            <Pressable
              style={styles.dismissButton}
              onPress={() => setShowPermissionBanner(false)}
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      )}
      <Stack>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#FFF3CD",
    borderBottomColor: "#E8D7A0",
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bannerText: {
    color: "#4A3D1A",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  bannerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  settingsButton: {
    backgroundColor: "#4A3D1A",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  settingsButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  dismissButton: {
    borderColor: "#4A3D1A",
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dismissButtonText: {
    color: "#4A3D1A",
    fontSize: 12,
    fontWeight: "700",
  },
});
