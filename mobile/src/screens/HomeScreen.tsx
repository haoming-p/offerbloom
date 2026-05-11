import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Mic, ChevronRight } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { fetchQuestions, Question } from "../api/questions";
import { colors, spacing, fontSize, fontWeight, radius } from "../theme";

// Pick a random question from the active role's "general" position. Used by
// the Quick Practice CTA — the whole point on mobile is fast practice with
// minimal navigation.
function pickRandom<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { activeRole, roles, loading: rolesLoading } = useRole();
  const navigation = useNavigation<any>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!activeRole) {
      setQuestions([]);
      return;
    }
    setQuestionsLoading(true);
    try {
      const data = await fetchQuestions(activeRole.id, null, "general");
      setQuestions(data);
    } catch {
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }, [activeRole?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleQuickPractice = () => {
    const q = pickRandom(questions);
    if (!q) return;
    navigation.navigate("Prep", {
      screen: "PracticeRecorder",
      params: { questionId: q.id, questionText: q.text },
    });
  };

  const noRole = !rolesLoading && !activeRole;
  const noQuestions = !questionsLoading && activeRole && questions.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.greeting}>
          Hi {user?.name || "there"} 🐱
        </Text>
        <Text style={styles.subtitle}>
          {activeRole
            ? `Prepping for ${activeRole.emoji ? `${activeRole.emoji} ` : ""}${activeRole.label}`
            : "Set up a role on desktop to start prepping"}
        </Text>

        {noRole && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No roles yet. Add one on the desktop app, then come back.
            </Text>
          </View>
        )}

        {activeRole && (
          <>
            <TouchableOpacity
              style={[styles.quickCard, (noQuestions || questionsLoading) && styles.quickCardDisabled]}
              onPress={handleQuickPractice}
              disabled={noQuestions || questionsLoading}
            >
              <View style={styles.micBubble}>
                {questionsLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Mic size={28} color="white" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickTitle}>Quick Practice</Text>
                <Text style={styles.quickSubtitle}>
                  {noQuestions
                    ? "No questions in this role yet"
                    : `Random question from ${questions.length} available`}
                </Text>
              </View>
              <ChevronRight color="white" size={20} />
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>More options</Text>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => navigation.navigate("Prep", { screen: "PrepList" })}
            >
              <Text style={styles.linkText}>Browse all questions</Text>
              <ChevronRight color={colors.textFaint} size={18} />
            </TouchableOpacity>
            {roles.length > 1 && (
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => navigation.navigate("Profile")}
              >
                <Text style={styles.linkText}>Switch role</Text>
                <ChevronRight color={colors.textFaint} size={18} />
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.xl, paddingBottom: spacing.xxl },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  emptyCard: {
    padding: spacing.lg,
    backgroundColor: colors.bgMuted,
    borderRadius: radius.lg,
  },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm },
  quickCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.orange,
  },
  quickCardDisabled: {
    opacity: 0.5,
  },
  micBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickTitle: {
    color: "white",
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  quickSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  sectionLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: fontSize.xs,
    color: colors.textFaint,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgMuted,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  linkText: {
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
});
