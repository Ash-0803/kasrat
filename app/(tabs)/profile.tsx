import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { updateProfile } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ErrorBoundary from "../../components/ErrorBoundary";
import Skeleton from "../../components/Skeleton";
import StreakBadge from "../../components/StreakBadge";
import { theme } from "../../constants/theme";
import useAuth from "../../hooks/useAuth";
import {
  UserStats,
  getUserStats,
  updateUserName,
  updateUserPhoto,
  uploadAvatar,
} from "../../lib/profile";
import { resolveDisplayName, resolveProfilePhotoUrl } from "../../lib/users";

function ProfileContent() {
  const router = useRouter();
  const { user, profile, profileLoading, logout } = useAuth();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNameDraft(profile?.name ?? user?.displayName ?? "");
  }, [profile?.name, user?.displayName]);

  useEffect(() => {
    let cancelled = false;

    async function loadPhotoUrl() {
      if (!user?.uid) {
        setPhotoUrl(null);
        return;
      }

      const nextPhotoUrl = await resolveProfilePhotoUrl(
        profile?.photoURL ?? user.photoURL,
      );

      if (!cancelled) {
        setPhotoUrl(nextPhotoUrl);
      }
    }

    void loadPhotoUrl();

    return () => {
      cancelled = true;
    };
  }, [profile?.photoURL, user?.photoURL, user?.uid]);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      if (!user?.uid) {
        setStats(null);
        setStatsLoading(false);
        return;
      }

      setStatsLoading(true);

      try {
        const nextStats = await getUserStats(user.uid);
        if (!cancelled) {
          setStats(nextStats);
        }
      } catch {
        if (!cancelled) {
          setStats({
            totalVerified: 0,
            totalClaimed: 0,
            currentStreak:
              typeof profile?.currentStreak === "number"
                ? profile.currentStreak
                : 0,
            longestStreak:
              typeof profile?.longestStreak === "number"
                ? profile.longestStreak
                : 0,
          });
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [profile?.currentStreak, profile?.longestStreak, user?.uid]);

  const displayName = useMemo(() => {
    if (!user?.uid) {
      return "Guest";
    }

    return resolveDisplayName(profile ?? { email: user.email }, user.uid);
  }, [profile, user?.email, user?.uid]);

  async function handleSaveName() {
    if (!user?.uid) {
      return;
    }

    const nextName = nameDraft.trim();

    if (!nextName) {
      setError("Name cannot be empty.");
      return;
    }

    setSavingName(true);
    setError(null);

    try {
      await updateUserName(user.uid, nextName);
      await updateProfile(user, { displayName: nextName });
      setEditingName(false);
    } catch {
      setError("Could not save your name. Please try again.");
    } finally {
      setSavingName(false);
    }
  }

  async function handlePickAvatar() {
    if (!user?.uid) {
      return;
    }

    setError(null);

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (pickerResult.canceled) {
      return;
    }

    const selectedUri = pickerResult.assets[0]?.uri;

    if (!selectedUri) {
      return;
    }

    setUploadingAvatar(true);

    try {
      const nextPhotoUrl = await uploadAvatar(user.uid, selectedUri);
      await updateUserPhoto(user.uid, nextPhotoUrl);
      await updateProfile(user, { photoURL: nextPhotoUrl });
      setPhotoUrl(nextPhotoUrl);
    } catch {
      setError("Could not update your photo. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  if (profileLoading || statsLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.headerCard}>
            <Skeleton variant="avatar" />
            <Skeleton variant="row" style={styles.headerSkeletonRow} />
          </View>
          <View style={styles.statsGrid}>
            {[0, 1, 2, 3].map((index) => (
              <Skeleton
                key={index}
                variant="card"
                style={styles.statSkeleton}
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (!user?.uid) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.empty}>Sign in to view your profile.</Text>
      </View>
    );
  }

  const avatarLetter = displayName.charAt(0).toUpperCase() || "?";
  const email = profile?.email ?? user.email ?? "No email";

  const currentStreak = stats?.currentStreak ?? profile?.currentStreak ?? 0;
  const longestStreak = stats?.longestStreak ?? profile?.longestStreak ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerCard}>
        <Pressable
          style={styles.avatarPressable}
          onPress={handlePickAvatar}
          disabled={uploadingAvatar}
        >
          {uploadingAvatar ? (
            <Skeleton variant="avatar" style={styles.avatar} />
          ) : photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarLetter}>{avatarLetter}</Text>
            </View>
          )}
        </Pressable>

        <Text style={styles.avatarHint}>Tap avatar to update photo</Text>

        {editingName ? (
          <View style={styles.nameEditorRow}>
            <TextInput
              style={styles.nameInput}
              value={nameDraft}
              onChangeText={setNameDraft}
              editable={!savingName}
              autoCapitalize="words"
              placeholder="Your name"
            />
            <Pressable
              style={[
                styles.saveNameButton,
                savingName && styles.buttonDisabled,
              ]}
              onPress={handleSaveName}
              disabled={savingName}
            >
              <Text style={styles.saveNameButtonText}>
                {savingName ? "Saving" : "Save"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              setError(null);
              setEditingName(true);
            }}
          >
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.nameHint}>Tap to edit name</Text>
          </Pressable>
        )}

        <Text style={styles.email}>{email}</Text>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Current streak</Text>
          <StreakBadge streak={currentStreak} style={styles.statBadge} />
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Longest streak</Text>
          <StreakBadge streak={longestStreak} style={styles.statBadge} />
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total verified</Text>
          <Text style={styles.statValue}>{stats?.totalVerified ?? 0}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total claimed</Text>
          <Text style={styles.statValue}>{stats?.totalClaimed ?? 0}</Text>
        </View>
      </View>

      <Pressable
        style={styles.historyButton}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/sessions",
            params: { uid: user.uid },
          })
        }
      >
        <Text style={styles.historyButtonText}>My history</Text>
      </Pressable>

      <Pressable
        style={[styles.logoutButton, loggingOut && styles.buttonDisabled]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        <Text style={styles.logoutButtonText}>
          {loggingOut ? "Logging out..." : "Logout"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

export default function Profile() {
  return (
    <ErrorBoundary>
      <ProfileContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerCard: {
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 22,
  },
  avatarPressable: {
    borderRadius: 999,
  },
  avatar: {
    borderRadius: 40,
    height: 80,
    width: 80,
  },
  avatarHint: {
    color: "#667085",
    fontSize: 12,
    marginTop: 10,
  },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: "#E8ECF5",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#516079",
    fontSize: 30,
    fontWeight: "700",
  },
  name: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 12,
    textAlign: "center",
  },
  nameHint: {
    color: "#667085",
    fontSize: 12,
    marginTop: 3,
    textAlign: "center",
  },
  nameEditorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    width: "100%",
  },
  nameInput: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    color: theme.colors.text,
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveNameButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 74,
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  saveNameButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  email: {
    color: "#667085",
    fontSize: 13,
    marginTop: 8,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 14,
  },
  statCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    minHeight: 100,
    padding: 14,
    width: "48%",
  },
  statLabel: {
    color: "#667085",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statBadge: {
    alignSelf: "flex-start",
    marginTop: 10,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 8,
  },
  historyButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    marginTop: 18,
    paddingVertical: 13,
  },
  historyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  logoutButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.danger,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    paddingVertical: 13,
  },
  logoutButtonText: {
    color: theme.colors.danger,
    fontSize: 15,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  headerSkeletonRow: {
    marginTop: 16,
  },
  statSkeleton: {
    height: 100,
    width: "48%",
  },
  empty: {
    color: "#667085",
    fontSize: 14,
  },
});
