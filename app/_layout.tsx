import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import OnboardingModal from "../components/OnboardingModal";
import { AuthProvider } from "../context/AuthContext";
import useAuth from "../hooks/useAuth";
import { loadRemoteAppConfig, subscribeToRemoteAppConfig } from "../lib/config";
import {
  clearAllSessionAlarms,
  registerForPushNotificationsAsync,
  scheduleDailySessionAlarm,
} from "../lib/notifications";
import { getTodaySessions } from "../lib/sessions";
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from "../constants/theme";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore: splash may already be prevented by platform bootstrap.
});

function RootLayoutContent() {
  const { user, authLoading, profileLoading, onboardingRequired } = useAuth();
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore: splash may already be hidden.
      });
    }
  }, [authLoading, profileLoading]);

  useEffect(() => {
    void loadRemoteAppConfig();
    const unsubscribe = subscribeToRemoteAppConfig();

    return () => {
      unsubscribe();
    };
  }, []);

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
        <Stack.Screen name="shame" options={{ title: "Wall of Shame" }} />
      </Stack>
      <OnboardingModal user={user} visible={onboardingRequired} />
    </SafeAreaProvider>
  );
}

export default function Layout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: COLORS.accentLight,
    borderBottomColor: COLORS.accent,
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  bannerText: {
    color: COLORS.primaryDark,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
    lineHeight: TYPOGRAPHY.normalLineHeight,
    textAlign: "center",
  },
  bannerActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  settingsButton: {
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...SHADOWS.sm,
  },
  settingsButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.semibold,
  },
  dismissButton: {
    borderColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  dismissButtonText: {
    color: COLORS.accent,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.semibold,
  },
});
