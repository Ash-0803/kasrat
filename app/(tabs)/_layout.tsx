import { Tabs } from "expo-router";
import useAdminGuard from "../../hooks/useAdminGuard";

export default function TabsLayout() {
  const { isAdmin, loading } = useAdminGuard(false);

  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="sessions" options={{ title: "Sessions" }} />
      <Tabs.Screen name="leaderboard" options={{ title: "Leaderboard" }} />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: !loading && isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
