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
} from "react-native";
import { useState } from "react";
import { auth } from "../lib/firebase";

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
        // Try anonymous sign in first
        await signInAnonymously(auth);
      } else {
        // Create a test account with email/password
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
        // Anonymous auth not enabled, try creating a test user instead
        Alert.alert(
          "Guest Access Unavailable",
          "Anonymous authentication is not enabled. Please sign up with email instead.",
          [{ text: "OK", onPress: () => setMode("signup") }],
        );
      } else if (error.code === "auth/email-already-in-use") {
        // Try signing in instead
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

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.title}>Sign In to Kasrat</Text>
        <Text style={styles.subtitle}>Start your fitness journey</Text>

        {mode === "signup" && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            mode === "guest" ? styles.anonymousButton : styles.signupButton,
          ]}
          onPress={handleAuth}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading
              ? "Signing in..."
              : mode === "guest"
                ? "Continue as Guest"
                : "Sign Up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setMode(mode === "guest" ? "signup" : "guest")}
        >
          <Text style={styles.switchButtonText}>
            {mode === "guest"
              ? "Sign up with email instead"
              : "Continue as guest instead"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "white",
    padding: 30,
    borderRadius: 15,
    width: "80%",
    maxWidth: 400,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    width: "100%",
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  anonymousButton: {
    backgroundColor: "#34C759",
  },
  signupButton: {
    backgroundColor: "#007AFF",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  switchButton: {
    padding: 10,
    marginBottom: 10,
  },
  switchButtonText: {
    color: "#007AFF",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  cancelButton: {
    padding: 10,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 14,
  },
});
