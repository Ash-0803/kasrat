import { Redirect } from "expo-router";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useAuth from "../hooks/useAuth";
import AuthModal from "../components/AuthModal";
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from "../constants/theme";

export default function Index() {
  const { user, authLoading, profileLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const insets = useSafeAreaInsets();

  // Show loading while Firebase initializes
  if (authLoading || profileLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Kasrat</Text>
          <Text style={styles.loadingSubtext}>Initializing your fitness journey...</Text>
        </View>
      </View>
    );
  }

  // If user is authenticated, redirect to main app
  if (user) {
    return <Redirect href="/(tabs)/home" />;
  }

  // Modern minimalist landing page
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.brandSection}>
          <Text style={styles.brandName}>Kasrat</Text>
          <Text style={styles.brandTagline}>Transform your fitness journey</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setShowAuthModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowAuthModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.features, { paddingBottom: Math.max(insets.bottom + SPACING.lg, SPACING['2xl']) }]}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>💪</Text>
            <Text style={styles.featureText}>Track Progress</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🎯</Text>
            <Text style={styles.featureText}>Set Goals</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🏆</Text>
            <Text style={styles.featureText}>Build Habits</Text>
          </View>
        </View>
      </View>

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
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  loadingText: {
    fontSize: TYPOGRAPHY['3xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  loadingSubtext: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: "space-between",
    paddingBottom: SPACING.lg,
    paddingTop: SPACING['2xl'],
  },
  brandSection: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  brandName: {
    fontSize: TYPOGRAPHY['5xl'],
    fontWeight: TYPOGRAPHY.extrabold,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    letterSpacing: -1,
  },
  brandTagline: {
    fontSize: TYPOGRAPHY.lg,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: TYPOGRAPHY.normalLineHeight,
  },
  actions: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: "center",
    ...SHADOWS.md,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
  },
  secondaryButton: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.medium,
  },
  features: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: SPACING.md,
  },
  feature: {
    alignItems: "center",
    flex: 1,
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  featureText: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontWeight: TYPOGRAPHY.medium,
  },
});
