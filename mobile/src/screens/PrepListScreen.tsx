import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useRole } from "../context/RoleContext";
import { fetchQuestions, Question } from "../api/questions";
import { colors, spacing, fontSize, fontWeight, radius } from "../theme";

// Lists all questions for the active role. Tapping a question opens the
// detail screen. No category filter in v1 — questions usually fit comfortably
// in a single scroll on mobile.
export default function PrepListScreen() {
  const { activeRole, roles } = useRole();
  const navigation = useNavigation<any>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!activeRole) {
      setQuestions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchQuestions(activeRole.id, null, "general");
      // Group by category so they read as sections.
      data.sort((a, b) => {
        if (a.category_id === b.category_id) return a.order - b.order;
        return a.category_id.localeCompare(b.category_id);
      });
      setQuestions(data);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeRole?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (!activeRole) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {roles.length === 0
              ? "No roles yet. Add one on desktop."
              : "Pick a role on the Profile tab."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Prep</Text>
        <Text style={styles.subtitle}>
          {activeRole.emoji ? `${activeRole.emoji} ` : ""}{activeRole.label}
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.orange} />
        </View>
      ) : questions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No questions yet for this role.</Text>
        </View>
      ) : (
        <FlatList
          data={questions}
          keyExtractor={(q) => q.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.orange} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("QuestionDetail", { questionId: item.id })}
            >
              <Text style={styles.categoryTag}>{item.category_id || "general"}</Text>
              <Text style={styles.questionText}>{item.text}</Text>
              <Text style={styles.metaText}>
                {item.answers?.length || 0} saved answer{(item.answers?.length || 0) === 1 ? "" : "s"}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.xl, paddingBottom: spacing.md },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm },
  card: {
    backgroundColor: colors.bgMuted,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  categoryTag: {
    fontSize: fontSize.xs,
    color: colors.orange,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.xs,
    fontWeight: fontWeight.semibold,
  },
  questionText: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  metaText: { fontSize: fontSize.xs, color: colors.textFaint },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: "center" },
});
