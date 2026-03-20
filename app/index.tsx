import { Redirect } from "expo-router";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useState } from "react";
import useAuth from "../hooks/useAuth";
import AuthModal from "../components/AuthModal";

export default function Index() {
  const { user, authLoading, profileLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Show loading while Firebase initializes
  if (authLoading || profileLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading Kasrat...</Text>
        <Text style={styles.subtitle}>Initializing Firebase...</Text>
      </View>
    );
  }

  // If user is authenticated, redirect to main app
  if (user) {
    return <Redirect href="/(tabs)/home" />;
  }

  // If no user, show landing page with auth options
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Kasrat</Text>
      <Text style={styles.subtitle}>Your fitness journey starts here</Text>

      <TouchableOpacity
        style={styles.signInButton}
        onPress={() => setShowAuthModal(true)}
      >
        <Text style={styles.signInButtonText}>Get Started</Text>
      </TouchableOpacity>

      <Text style={styles.debug}>
        Auth Loading: {authLoading ? "true" : "false"} | Profile Loading:{" "}
        {profileLoading ? "true" : "false"} | User: {user ? "exists" : "null"}
      </Text>

      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
  },
  signInButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    width: "80%",
    alignItems: "center",
    marginBottom: 20,
  },
  signInButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  debug: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    fontFamily: "monospace",
    position: "absolute",
    bottom: 20,
  },
});
