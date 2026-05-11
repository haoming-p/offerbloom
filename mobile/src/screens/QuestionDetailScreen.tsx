import React, { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Mic, Sparkles } from "lucide-react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useRole } from "../context/RoleContext";
import { fetchQuestions, Question } from "../api/questions";
import { listPracticesForQuestion, Practice } from "../api/practices";
import { colors, spacing, fontSize, fontWeight, radius } from "../theme";

// Helper: HTML tags from TipTap answer content are stripped for plain display.
const stripHtml = (html: string) =>
  (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const formatDuration = (seconds: number) => {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
};

const formatRelativeTime = (ms: number) => {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(ms).toLocaleDateString();
};

export default function QuestionDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { activeRole } = useRole();
  const questionId: string = route.params?.questionId;

  const [question, setQuestion] = useState<Question | null>(null);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);

  // The desktop GET /questions/ returns the whole list with answers embedded.
  // No per-question detail endpoint — we just refetch the role's questions
  // and find ours. Cheap enough on mobile-sized lists. Practices are loaded
  // separately via GET /practices/?question_id=...
  const load = useCallback(async () => {
    if (!activeRole || !questionId) return;
    setLoading(true);
    try {
      const [list, p] = await Promise.all([
        fetchQuestions(activeRole.id, null, "general"),
        listPracticesForQuestion(questionId).catch(() => [] as Practice[]),
      ]);
      setQuestion(list.find((q) => q.id === questionId) || null);
      setPractices(p);
    } catch {
      setQuestion(null);
      setPractices([]);
    } finally {
      setLoading(false);
    }
  }, [activeRole?.id, questionId]);

  // Re-fetch whenever the screen comes back into focus — so a new practice
  // saved from the recorder shows up when the user pops back here.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color={colors.orange} /></View>
      </SafeAreaView>
    );
  }

  if (!question) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Question not found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={20} color={colors.textMuted} />
          <Text style={styles.backText}>Prep</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.categoryTag}>{question.category_id || "general"}</Text>
        <Text style={styles.question}>{question.text}</Text>

        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={[styles.practiceButton, { flex: 2 }]}
            onPress={() =>
              navigation.navigate("PracticeRecorder", {
                questionId: question.id,
                questionText: question.text,
              })
            }
          >
            <Mic color="white" size={18} />
            <Text style={styles.practiceText}>Practice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chatButton, { flex: 1 }]}
            onPress={() =>
              navigation.navigate("AIChat", {
                questionId: question.id,
                questionText: question.text,
              })
            }
          >
            <Sparkles color={colors.orange} size={16} />
            <Text style={styles.chatText}>Ask Bloom</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Saved answers ({question.answers?.length || 0})
          </Text>
        </View>

        {question.answers?.length === 0 ? (
          <Text style={styles.emptyInline}>
            No saved answers yet. Draft answers on desktop.
          </Text>
        ) : (
          question.answers.map((a) => (
            <View key={a.id} style={styles.answerCard}>
              <Text style={styles.answerLabel}>{a.label}</Text>
              <Text style={styles.answerBody} numberOfLines={6}>
                {stripHtml(a.content)}
              </Text>
            </View>
          ))
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Practice attempts ({practices.length})
          </Text>
        </View>

        {practices.length === 0 ? (
          <Text style={styles.emptyInline}>
            No practice attempts yet. Tap "Practice" above to record one.
          </Text>
        ) : (
          practices.map((p) => (
            <View key={p.id} style={styles.practiceCard}>
              <View style={styles.practiceCardHeader}>
                <Text style={styles.practiceCardTag} numberOfLines={1}>{p.tag}</Text>
                <Text style={styles.practiceCardMeta}>
                  {formatDuration(p.duration)} · {formatRelativeTime(p.created_at)}
                </Text>
              </View>
              <Text style={styles.practiceCardBody} numberOfLines={4}>
                {p.transcript || "(no transcript)"}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  backButton: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  backText: { color: colors.textMuted, fontSize: fontSize.sm },
  content: { padding: spacing.xl, paddingTop: 0, paddingBottom: spacing.xxl },
  categoryTag: {
    fontSize: fontSize.xs,
    color: colors.orange,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  question: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: 28,
    marginBottom: spacing.lg,
  },
  ctaRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  practiceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.orange,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  practiceText: { color: "white", fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.orangeLight,
    borderWidth: 1,
    borderColor: colors.orangeBorder,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  chatText: { color: colors.orange, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  sectionHeader: { marginBottom: spacing.sm },
  sectionTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
  },
  emptyInline: { color: colors.textFaint, fontSize: fontSize.sm, fontStyle: "italic" },
  answerCard: {
    backgroundColor: colors.bgMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  answerLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  answerBody: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },
  practiceCard: {
    backgroundColor: colors.bgMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  practiceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  practiceCardTag: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  practiceCardMeta: { fontSize: fontSize.xs, color: colors.textFaint },
  practiceCardBody: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm, marginBottom: spacing.md },
  backLink: { padding: spacing.md },
  backLinkText: { color: colors.orange, fontSize: fontSize.sm },
});
