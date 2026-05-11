import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, TextInput, ScrollView, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Search, SlidersHorizontal, X, Check, ChevronRight } from "lucide-react-native";
import { useRole } from "../context/RoleContext";
import { fetchQuestions, Question } from "../api/questions";
import { getUserData, Position } from "../api/userData";
import { colors, spacing, fontSize, fontWeight, radius } from "../theme";

const GENERAL: Position = { id: "general", role: "", title: "General", company: "" };

export default function PrepListScreen() {
  const { roles, activeRole, setActiveRoleId } = useRole();
  const navigation = useNavigation<any>();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [positions, setPositions] = useState<Position[]>([]);
  const [activePositionKey, setActivePositionKey] = useState<string>("general");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getUserData();
        setPositions(data.positions || []);
      } catch {
        setPositions([]);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!activeRole) {
      setQuestions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchQuestions(activeRole.id, null, activePositionKey);
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
  }, [activeRole?.id, activePositionKey]);

  useEffect(() => {
    load();
  }, [load]);

  // Categories that actually exist in the current question set.
  const categories = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => q.category_id && set.add(q.category_id));
    return ["all", ...Array.from(set).sort()];
  }, [questions]);

  // Apply category + search filter locally.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return questions.filter((item) => {
      if (activeCategory !== "all" && item.category_id !== activeCategory) return false;
      if (q && !item.text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [questions, activeCategory, search]);

  const rolePositions = useMemo(() => {
    if (!activeRole) return [GENERAL];
    return [GENERAL, ...positions.filter((p) => p.role === activeRole.id)];
  }, [positions, activeRole?.id]);

  const activePosition = rolePositions.find((p) => String(p.id) === activePositionKey) || GENERAL;

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

  // Selector pill summary
  const selectorParts: string[] = [];
  selectorParts.push(`${activeRole.emoji ? `${activeRole.emoji} ` : ""}${activeRole.label}`);
  if (activePosition.id !== "general") selectorParts.push(activePosition.title);
  if (activeCategory !== "all") selectorParts.push(activeCategory);
  const selectorText = selectorParts.join(" · ");

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Prep</Text>
      </View>

      {/* Selector pill — tap to open filter picker */}
      <TouchableOpacity
        style={styles.selectorPill}
        onPress={() => setFilterOpen(true)}
        activeOpacity={0.7}
      >
        <SlidersHorizontal size={16} color={colors.orange} />
        <Text style={styles.selectorText} numberOfLines={1}>
          {selectorText}
        </Text>
        <ChevronRight size={16} color={colors.textFaint} />
      </TouchableOpacity>

      {/* Search — bigger */}
      <View style={styles.searchBox}>
        <Search size={18} color={colors.textFaint} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search questions"
          placeholderTextColor={colors.textGhost}
          autoCorrect={false}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <X size={18} color={colors.textFaint} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.empty}><ActivityIndicator color={colors.orange} /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {questions.length === 0
              ? "No questions yet for this role + position."
              : "No questions match your search."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(q) => q.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.orange} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate("QuestionDetail", {
                  questionId: item.id,
                  positionKey: activePositionKey,
                })
              }
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

      {/* Filter picker — full-screen modal with role / position / category */}
      <Modal
        visible={filterOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterOpen(false)}
      >
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter</Text>
            <TouchableOpacity onPress={() => setFilterOpen(false)}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent}>
            {/* Role */}
            <Text style={styles.sectionLabel}>Role</Text>
            {roles.map((r) => {
              const active = r.id === activeRole.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.pickerRow, active && styles.pickerRowActive]}
                  onPress={() => {
                    setActiveRoleId(r.id);
                    // Reset position when role changes (position belongs to a role)
                    setActivePositionKey("general");
                  }}
                >
                  <Text style={[styles.pickerLabel, active && styles.pickerLabelActive]}>
                    {r.emoji ? `${r.emoji} ` : ""}{r.label}
                  </Text>
                  {active && <Check size={16} color={colors.orange} />}
                </TouchableOpacity>
              );
            })}

            {/* Position */}
            <Text style={styles.sectionLabel}>Position</Text>
            {rolePositions.map((p) => {
              const active = String(p.id) === activePositionKey;
              return (
                <TouchableOpacity
                  key={String(p.id)}
                  style={[styles.pickerRow, active && styles.pickerRowActive]}
                  onPress={() => setActivePositionKey(String(p.id))}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerLabel, active && styles.pickerLabelActive]}>
                      {p.id === "general" ? "General" : p.title}
                    </Text>
                    {!!p.company && p.id !== "general" && (
                      <Text style={styles.pickerSubLabel}>@ {p.company}</Text>
                    )}
                  </View>
                  {active && <Check size={16} color={colors.orange} />}
                </TouchableOpacity>
              );
            })}

            {/* Category */}
            <Text style={styles.sectionLabel}>Category</Text>
            {categories.map((c) => {
              const active = c === activeCategory;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.pickerRow, active && styles.pickerRowActive]}
                  onPress={() => setActiveCategory(c)}
                >
                  <Text style={[styles.pickerLabel, active && styles.pickerLabelActive]}>
                    {c === "all" ? "All categories" : c}
                  </Text>
                  {active && <Check size={16} color={colors.orange} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setFilterOpen(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.sm },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  selectorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.orangeLight,
    borderWidth: 1,
    borderColor: colors.orangeBorder,
    borderRadius: radius.lg,
  },
  selectorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.orange,
    fontWeight: fontWeight.semibold,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bgMuted,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
    paddingVertical: 0,
  },

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

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  modalTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    color: colors.textFaint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontWeight: fontWeight.semibold,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.bgMuted,
  },
  pickerRowActive: {
    backgroundColor: colors.orangeLight,
    borderWidth: 1,
    borderColor: colors.orangeBorder,
  },
  pickerLabel: { fontSize: fontSize.base, color: colors.text, flex: 1 },
  pickerLabelActive: { color: colors.orange, fontWeight: fontWeight.semibold },
  pickerSubLabel: { fontSize: fontSize.xs, color: colors.textFaint, marginTop: 2 },

  modalFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  doneButton: {
    backgroundColor: colors.orange,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  doneButtonText: { color: "white", fontSize: fontSize.base, fontWeight: fontWeight.semibold },
});
