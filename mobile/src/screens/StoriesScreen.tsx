import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { FileText, Sparkles, Check } from "lucide-react-native";
import { listStories, Story } from "../api/stories";
import { listFiles, FileItem } from "../api/files";
import { useRole } from "../context/RoleContext";
import ChatSheet, { ChatSheetRef, ChatContext } from "../components/ChatSheet";
import { colors, spacing, fontSize, fontWeight, radius } from "../theme";

type Tab = "stories" | "files";

const stripHtml = (html: string) =>
  (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const formatBytes = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Library — Stories + Files (both read-only on mobile; create/edit happens
// on desktop). File name kept as "StoriesScreen" since the navigator route
// is still named Stories — avoids a route rename churn.
export default function StoriesScreen() {
  const navigation = useNavigation<any>();
  const { roles } = useRole();

  const [tab, setTab] = useState<Tab>("stories");
  const [stories, setStories] = useState<Story[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Library-wide chat selection — one of story or file (or neither).
  // Tap a card to select; Ask Bloom button opens the sheet with that focus.
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const chatRef = useRef<ChatSheetRef>(null);

  const selectStory = (s: Story) => {
    setSelectedStoryId((cur) => (cur === s.id ? null : s.id));
    setSelectedFileId(null);
  };
  const selectFile = (f: FileItem) => {
    setSelectedFileId((cur) => (cur === f.id ? null : f.id));
    setSelectedStoryId(null);
  };

  const selectedStory = stories.find((s) => s.id === selectedStoryId) || null;
  const selectedFile = files.find((f) => f.id === selectedFileId) || null;

  const chatCtx: ChatContext = selectedStory
    ? { kind: "story", storyTitle: selectedStory.title, storyContent: selectedStory.content }
    : selectedFile
    ? { kind: "file", fileId: selectedFile.id, fileName: selectedFile.name }
    : { kind: "general" };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, f] = await Promise.all([
        listStories().catch(() => [] as Story[]),
        listFiles().catch(() => [] as FileItem[]),
      ]);
      setStories(s);
      setFiles(f);
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

  const fileTags = (item: FileItem) => {
    if (!item.links || item.links.length === 0) return "No links";
    return item.links
      .map((l) => l.label || l.id)
      .slice(0, 2)
      .join(" · ") + (item.links.length > 2 ? ` +${item.links.length - 2}` : "");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <Text style={styles.subtitle}>Files + reusable stories. Manage on desktop.</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === "stories" && styles.tabActive]}
          onPress={() => setTab("stories")}
        >
          <Text style={[styles.tabText, tab === "stories" && styles.tabTextActive]}>
            Stories ({stories.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "files" && styles.tabActive]}
          onPress={() => setTab("files")}
        >
          <Text style={[styles.tabText, tab === "files" && styles.tabTextActive]}>
            Files ({files.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.empty}><ActivityIndicator color={colors.orange} /></View>
      ) : tab === "stories" ? (
        stories.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No stories yet. Add some on desktop.</Text>
          </View>
        ) : (
          <FlatList
            data={stories}
            keyExtractor={(s) => s.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.orange} />
            }
            renderItem={({ item }) => {
              const selected = selectedStoryId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.card, selected && styles.cardSelected]}
                  onPress={() => selectStory(item)}
                  onLongPress={() => navigation.navigate("StoryDetail", { storyId: item.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.storyTitle} numberOfLines={1}>{item.title}</Text>
                    {selected && <Check size={14} color={colors.orange} />}
                  </View>
                  <Text style={styles.cardPreview} numberOfLines={2}>
                    {stripHtml(item.content) || "(empty)"}
                  </Text>
                  <Text style={styles.tagBadge}>{roleLabel(item.role_id)}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )
      ) : files.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No files uploaded yet. Upload on desktop.</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(f) => f.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.orange} />
          }
          renderItem={({ item }) => {
            const selected = selectedFileId === item.id;
            return (
              <TouchableOpacity
                style={[styles.card, selected && styles.cardSelected]}
                onPress={() => selectFile(item)}
                activeOpacity={0.7}
              >
                <View style={styles.fileHeader}>
                  <FileText size={16} color={colors.orange} />
                  <Text style={styles.storyTitle} numberOfLines={1}>{item.name}</Text>
                  {selected && <Check size={14} color={colors.orange} />}
                </View>
                {!!item.text_content && (
                  <Text style={styles.cardPreview} numberOfLines={3}>
                    {item.text_content}
                  </Text>
                )}
                <View style={styles.fileMeta}>
                  <Text style={styles.tagBadge}>{fileTags(item)}</Text>
                  {item.size && <Text style={styles.fileSize}>{formatBytes(item.size)}</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Floating Ask Bloom button — opens the bottom-sheet chat with the
          current selection (story / file / nothing) as context. */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => chatRef.current?.present()}
        activeOpacity={0.85}
      >
        <Sparkles size={18} color="white" />
        <Text style={styles.fabText}>Ask Bloom</Text>
      </TouchableOpacity>

      <ChatSheet ref={chatRef} ctx={chatCtx} />
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

  tabRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bgMuted,
  },
  tabActive: {
    backgroundColor: colors.orange,
  },
  tabText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  tabTextActive: { color: "white" },

  list: { padding: spacing.lg, paddingTop: 0 },
  card: {
    backgroundColor: colors.bgMuted,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  cardSelected: {
    backgroundColor: colors.orangeLight,
    borderColor: colors.orangeBorder,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  fileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  storyTitle: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardPreview: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  tagBadge: {
    fontSize: fontSize.xs,
    color: colors.orange,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: fontWeight.semibold,
  },
  fileMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fileSize: { fontSize: fontSize.xs, color: colors.textFaint },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: "center" },

  fab: {
    position: "absolute",
    right: spacing.xl,
    bottom: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.orange,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  fabText: { color: "white", fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
