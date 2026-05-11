import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { login, signup } from "../api/auth";
import { colors, spacing, fontSize, fontWeight, radius } from "../theme";

type Mode = "signin" | "signup";

// Real sign-in / sign-up form. Mode comes from route params (set by the Hello
// screen CTAs); user can flip with the toggle link at the bottom.
export default function LoginScreen({ navigation, route }: any) {
  const initialMode: Mode = route?.params?.mode === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { setUser } = useAuth();

  const isSignup = mode === "signup";
  const canSubmit =
    !!email.trim() &&
    !!password.trim() &&
    (!isSignup || !!name.trim()) &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const user = isSignup
        ? await signup(name.trim(), email.trim(), password)
        : await login(email.trim(), password);
      // setUser → RootNavigator detects state change → MainTabs.
      setUser(user);
    } catch (e: any) {
      setError(e.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ChevronLeft size={20} color={colors.textMuted} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.heading}>
            <Text style={styles.title}>
              {isSignup ? "Create your account" : "Welcome back"}
            </Text>
            <Text style={styles.subtitle}>
              {isSignup
                ? "Start prepping with Bloom 🐱✨"
                : "Sign in to keep prepping"}
            </Text>
          </View>

          <View style={styles.form}>
            {isSignup && (
              <>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={colors.textGhost}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!submitting}
                />
              </>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textGhost}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!submitting}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor={colors.textGhost}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={isSignup ? "new-password" : "current-password"}
              editable={!submitting}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.primaryText}>
                  {isSignup ? "Create account" : "Sign in"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMode(isSignup ? "signin" : "signup");
                setError("");
              }}
              disabled={submitting}
              style={styles.toggle}
            >
              <Text style={styles.toggleText}>
                {isSignup
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  container: {
    padding: spacing.xl,
    flexGrow: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  backText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  heading: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  form: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.orange,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryText: {
    color: "white",
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  toggle: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  toggleText: {
    color: colors.orange,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
