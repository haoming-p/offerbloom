import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { colors, spacing, fontSize, fontWeight, radius } from "../theme";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { roles, activeRole, setActiveRoleId } = useRole();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user?.name || "—"}</Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email || "—"}</Text>
          {user?.is_demo_guest && (
            <Text style={styles.demoTag}>Demo session · clears in 24h</Text>
          )}
        </View>

        {roles.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Active role</Text>
            <View style={styles.roleList}>
              {roles.map((r) => {
                const active = activeRole?.id === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.roleRow, active && styles.roleRowActive]}
                    onPress={() => setActiveRoleId(r.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>
                        {r.emoji ? `${r.emoji} ` : ""}{r.label}
                      </Text>
                    </View>
                    {active && <Check size={16} color={colors.orange} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <TouchableOpacity style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.xl, paddingBottom: spacing.xxl },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.bgMuted,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textFaint,
    marginTop: spacing.sm,
  },
  value: { fontSize: fontSize.base, color: colors.text, fontWeight: fontWeight.medium },
  demoTag: { marginTop: spacing.md, fontSize: fontSize.xs, color: colors.orange },
  sectionLabel: {
    fontSize: fontSize.xs,
    color: colors.textFaint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  roleList: { gap: spacing.sm, marginBottom: spacing.xl },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.bgMuted,
    borderWidth: 1,
    borderColor: "transparent",
  },
  roleRowActive: {
    backgroundColor: colors.orangeLight,
    borderColor: colors.orangeBorder,
  },
  roleLabel: { fontSize: fontSize.base, color: colors.text },
  roleLabelActive: { color: colors.orange, fontWeight: fontWeight.semibold },
  signOut: {
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  signOutText: { color: colors.danger, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
});
