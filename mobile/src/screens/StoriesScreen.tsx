import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { listStories, Story } from "../api/stories";
import { useRole } from "../context/RoleContext";
import { colors, spacing, fontSize, fontWeight, radius } from "../theme";

const stripHtml = (html: string) =>
  (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export default function StoriesScreen() {
  const navigation = useNavigation<any>();
  const { roles } = useRole();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listStories();
      setStories(data);
    } catch {
      setStories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const roleLabel = (roleId: string | null) => {
    if (!roleId) return "All roles";
    return roles.find((r) => r.id === roleId)?.label || roleId;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Stories</Text>
        <Text style={styles.subtitle}>
          Reusable narratives. Add or edit on desktop.
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.empty}><ActivityIndicator color={colors.orange} /></View>
      ) : stories.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No stories yet. Add some on the desktop app.
          </Text>
        </View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.orange} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("StoryDetail", { storyId: item.id })}
            >
              <Text style={styles.storyTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.storyPreview} numberOfLines={2}>
                {stripHtml(item.content) || "(empty)"}
              </Text>
              <Text style={styles.roleTag}>{roleLabel(item.role_id)}</Text>
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
  list: { padding: spacing.lg, paddingTop: 0 },
  card: {
    backgroundColor: colors.bgMuted,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  storyTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  storyPreview: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  roleTag: {
    fontSize: fontSize.xs,
    color: colors.orange,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: fontWeight.semibold,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: "center" },
});
