import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { listStories, Story } from "../api/stories";
import { useRole } from "../context/RoleContext";
import { colors, spacing, fontSize, fontWeight, radius } from "../theme";

const stripHtml = (html: string) =>
  (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// Read-only view of a single story. No per-story endpoint exists, so we list
// and find — cheap on mobile-sized story lists.
export default function StoryDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const storyId: string = route.params?.storyId;
  const { roles } = useRole();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await listStories();
        setStory(list.find((s) => s.id === storyId) || null);
      } catch {
        setStory(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [storyId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color={colors.orange} /></View>
      </SafeAreaView>
    );
  }

  if (!story) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Story not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const roleLabel = story.role_id
    ? roles.find((r) => r.id === story.role_id)?.label || story.role_id
    : "All roles";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={20} color={colors.textMuted} />
          <Text style={styles.backText}>Stories</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.roleTag}>{roleLabel}</Text>
        <Text style={styles.title}>{story.title}</Text>
        <Text style={styles.body}>{stripHtml(story.content) || "(empty)"}</Text>
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
  roleTag: {
    fontSize: fontSize.xs,
    color: colors.orange,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    lineHeight: 28,
  },
  body: { fontSize: fontSize.base, color: colors.text, lineHeight: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm },
});
