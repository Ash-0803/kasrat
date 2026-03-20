import { Tabs } from "expo-router";
import { Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useAdminGuard from "../../hooks/useAdminGuard";
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from "../../constants/theme";

export default function TabsLayout() {
  const { isAdmin, loading } = useAdminGuard(false);
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingTop: SPACING.sm,
          paddingBottom: Math.max(insets.bottom, SPACING.sm),
          height: 80 + Math.max(insets.bottom - SPACING.sm, 0),
        },
        tabBarLabelStyle: {
          fontSize: TYPOGRAPHY.xs,
          fontWeight: TYPOGRAPHY.medium,
          marginTop: SPACING.xs,
        },
        headerShown: false, // Remove headers since we have bottom tabs
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: "Sessions",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="fitness" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Leaderboard",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="trophy" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: !loading && isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="settings" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

// Simple icon component using emoji/text
function TabIcon({
  name,
  color,
  size,
}: {
  name: string;
  color: string;
  size: number;
}) {
  const icons: Record<string, string> = {
    home: "🏠",
    fitness: "💪",
    trophy: "🏆",
    settings: "⚙️",
    person: "👤",
  };

  return (
    <Text style={{ color, fontSize: size, marginBottom: SPACING.xs }}>
      {icons[name] || "📱"}
    </Text>
  );
}
