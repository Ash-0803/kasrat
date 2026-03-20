import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { useState } from "react";
import { auth } from "../lib/firebase";
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from "../constants/theme";

const { width: screenWidth } = Dimensions.get("window");

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AuthModal({ visible, onClose }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"guest" | "signup">("guest");

  const handleAuth = async () => {
    try {
      setLoading(true);

      if (mode === "guest") {
        await signInAnonymously(auth);
      } else {
        if (!email || !password) {
          Alert.alert("Error", "Please enter email and password");
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
      }

      onClose();
    } catch (error: any) {
      console.error("Auth failed:", error);

      if (error.code === "auth/operation-not-allowed") {
        Alert.alert(
          "Guest Access Unavailable",
          "Anonymous authentication is not enabled. Please sign up with email instead.",
          [{ text: "OK", onPress: () => setMode("signup") }],
        );
      } else if (error.code === "auth/email-already-in-use") {
        try {
          await signInWithEmailAndPassword(auth, email, password);
          onClose();
        } catch (signInError: any) {
          Alert.alert(
            "Sign In Failed",
            signInError.message || "Invalid credentials",
          );
        }
      } else {
        Alert.alert(
          "Authentication Failed",
          error.message || "Please try again",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Kasrat</Text>
            <Text style={styles.subtitle}>
              {mode === "guest" 
                ? "Continue as a guest to explore" 
                : "Create your account to get started"
              }
            </Text>
          </View>

          <View style={styles.form}>
            {mode === "signup" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={COLORS.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={COLORS.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                />
              </>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                loading && styles.primaryButtonDisabled,
              ]}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {loading
                  ? "Signing in..."
                  : mode === "guest"
                    ? "Continue as Guest"
                    : "Create Account"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setMode(mode === "guest" ? "signup" : "guest")}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>
                {mode === "guest"
                  ? "Sign up with email instead"
                  : "Continue as guest instead"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.6}
          >
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modal: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS['2xl'],
    width: Math.min(screenWidth * 0.9, 400),
    maxWidth: 400,
    ...SHADOWS.lg,
  },
  header: {
    padding: SPACING.xl,
    paddingBottom: SPACING.lg,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  title: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: TYPOGRAPHY.normalLineHeight,
  },
  form: {
    padding: SPACING.xl,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.backgroundSecondary,
    marginBottom: SPACING.md,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.gray300,
    opacity: 0.6,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
  },
  secondaryButton: {
    paddingVertical: SPACING.sm,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: COLORS.accent,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
  },
  closeButton: {
    padding: SPACING.md,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  closeButtonText: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
  },
});
