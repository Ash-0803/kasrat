import { Tabs } from "expo-router";
import { Text } from "react-native";
import useAdminGuard from "../../hooks/useAdminGuard";

export default function TabsLayout() {
  const { isAdmin, loading } = useAdminGuard(false);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: {
          backgroundColor: "#F2F2F7",
          borderTopColor: "#E5E5EA",
        },
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

  return <Text style={{ color, fontSize: size }}>{icons[name] || "📱"}</Text>;
}
