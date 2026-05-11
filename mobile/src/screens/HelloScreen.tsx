import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { demoLogin } from "../api/auth";
import { colors, spacing, fontSize, fontWeight, radius } from "../theme";

// Landing screen. Three CTAs: Sign in / Start free / Try demo.
// The demo button fires the auth/demo-login endpoint directly — no need to
// route through the LoginScreen since there's no form to fill.
export default function HelloScreen({ navigation }: any) {
  const { setUser } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDemo = async () => {
    setError("");
    setDemoLoading(true);
    try {
      const guest = await demoLogin();
      setUser(guest); // RootNavigator switches to MainTabs automatically
    } catch (e: any) {
      setError(e.message || "Could not start demo. Try again.");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.heroBlock}>
          <Text style={styles.brand}>OfferBloom</Text>
          <Text style={styles.tagline}>Practice interviews with Bloom 🐱✨</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Login", { mode: "signup" })}
            disabled={demoLoading}
          >
            <Text style={styles.primaryText}>Start free</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("Login", { mode: "signin" })}
            disabled={demoLoading}
          >
            <Text style={styles.secondaryText}>Sign in</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.demoButton}
            onPress={handleDemo}
            disabled={demoLoading}
          >
            {demoLoading ? (
              <ActivityIndicator color={colors.orange} />
            ) : (
              <Text style={styles.demoText}>Try demo</Text>
            )}
          </TouchableOpacity>

          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: "space-between",
  },
  heroBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.orange,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: "center",
  },
  actions: {
    width: "100%",
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.orange,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  primaryText: {
    color: "white",
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: colors.orangeLight,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.orangeBorder,
  },
  secondaryText: {
    color: colors.orange,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textFaint,
    fontSize: fontSize.xs,
  },
  demoButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoText: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
