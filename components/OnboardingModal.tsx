import * as ImagePicker from "expo-image-picker";
import { User, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { theme } from "../constants/theme";
import { db } from "../lib/firebase";
import { updateUserName, updateUserPhoto, uploadAvatar } from "../lib/profile";
import Skeleton from "./Skeleton";

type OnboardingModalProps = {
  user: User | null;
  visible: boolean;
};

export default function OnboardingModal({
  user,
  visible,
}: OnboardingModalProps) {
  const [name, setName] = useState("");
  const [pickedAvatarUri, setPickedAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(user?.displayName?.trim() ?? "");
    setPickedAvatarUri(null);
    setError(null);
  }, [visible, user]);

  const nameIsValid = useMemo(() => name.trim().length > 0, [name]);
  const currentPhotoUrl = user?.photoURL?.trim() ?? "";
  const hasPhoto = pickedAvatarUri !== null || currentPhotoUrl.length > 0;

  async function handlePickAvatar() {
    setError(null);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const firstAsset = result.assets[0];
    if (firstAsset?.uri) {
      setPickedAvatarUri(firstAsset.uri);
    }
  }

  async function handleComplete() {
    if (!user?.uid) {
      return;
    }

    if (!nameIsValid || !hasPhoto) {
      setError("Please add a name and a profile photo to continue.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const trimmedName = name.trim();
      await updateUserName(user.uid, trimmedName);

      let nextPhotoUrl = currentPhotoUrl;
      if (pickedAvatarUri) {
        nextPhotoUrl = await uploadAvatar(user.uid, pickedAvatarUri);
        await updateUserPhoto(user.uid, nextPhotoUrl);
      }

      await updateProfile(user, {
        displayName: trimmedName,
        photoURL: nextPhotoUrl,
      });

      await setDoc(
        doc(db, "users", user.uid),
        {
          email: user.email ?? null,
          completedOnboarding: true,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    } catch {
      setError("Could not finish onboarding. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Finish your profile</Text>
          <Text style={styles.subtitle}>
            Add your name and photo before entering Kasrat.
          </Text>

          <Pressable style={styles.avatarPressable} onPress={handlePickAvatar}>
            {pickedAvatarUri ? (
              <Image source={{ uri: pickedAvatarUri }} style={styles.avatar} />
            ) : currentPhotoUrl ? (
              <Image source={{ uri: currentPhotoUrl }} style={styles.avatar} />
            ) : saving ? (
              <Skeleton variant="avatar" style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarFallbackText}>Add photo</Text>
              </View>
            )}
          </Pressable>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
            editable={!saving}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[
              styles.saveButton,
              (!nameIsValid || !hasPhoto || saving) &&
                styles.saveButtonDisabled,
            ]}
            onPress={handleComplete}
            disabled={!nameIsValid || !hasPhoto || saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Saving..." : "Complete onboarding"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(12, 17, 28, 0.68)",
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    maxWidth: 420,
    paddingHorizontal: 18,
    paddingVertical: 22,
    width: "100%",
  },
  title: {
    color: theme.colors.text,
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#5D6679",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
  avatarPressable: {
    alignSelf: "center",
    marginTop: 16,
  },
  avatar: {
    borderRadius: 48,
    height: 96,
    width: 96,
  },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: "#ECEFF7",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: "#5F6C86",
    fontSize: 12,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 16,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
    marginTop: 10,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    marginTop: 14,
    paddingVertical: 12,
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
