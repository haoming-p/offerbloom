import React, {
  useRef, useState, useEffect, forwardRef, useImperativeHandle,
} from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  Keyboard, Animated, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Pressable,
} from "react-native";
import { Send, Mic, Square, X, Sparkles } from "lucide-react-native";
import { Audio } from "expo-av";
import { sendChat, ChatMessage } from "../api/chat";
import { transcribeAudio } from "../api/practices";
import { colors, spacing, fontSize, fontWeight, radius } from "../theme";

// Context types this sheet can chat about. Drives RAG focus.
export type ChatContext =
  | { kind: "question"; questionId: string; questionText: string;
      selectedAnswerId?: string; selectedAnswerLabel?: string;
      selectedPracticeId?: string; selectedPracticeTag?: string }
  | { kind: "file"; fileId: string; fileName: string }
  | { kind: "story"; storyTitle: string; storyContent: string }
  | { kind: "general" };

export type ChatSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type Props = { ctx: ChatContext };

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.72); // 72% — leaves room above for context

const stripHtml = (html: string) =>
  (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi, I'm Bloom 🐱✨\n\nAsk me anything about what you've selected — drafting, refining, or what to highlight.",
};

// Built using plain RN Animated (no Reanimated). Works in Expo Go without
// any native modules. The outer wrapper uses pointerEvents="box-none" so
// taps on the visible area above the sheet pass through to the underlying
// screen — that's how the user selects a practice/answer/story/file while
// the chat is up.
const ChatSheet = forwardRef<ChatSheetRef, Props>(({ ctx }, ref) => {
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const present = () => {
    setVisible(true);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };
  const dismiss = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

  useImperativeHandle(ref, () => ({ present, dismiss }));

  // --- Chat state ---
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState("");
  const recordingRef = useRef<Audio.Recording | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  // Reset chat when context KIND changes (e.g. open chat for different question).
  const ctxKey = ctx.kind === "question" ? `q:${ctx.questionId}` :
                 ctx.kind === "file" ? `f:${ctx.fileId}` :
                 ctx.kind === "story" ? `s:${ctx.storyTitle}` : "general";
  useEffect(() => {
    setMessages([GREETING]);
    setInput("");
    setError("");
  }, [ctxKey]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages]);

  useEffect(() => () => {
    if (recordingRef.current) recordingRef.current.stopAndUnloadAsync().catch(() => {});
  }, []);

  const buildSendArgs = (text: string) => {
    if (ctx.kind === "question") {
      return {
        message: text,
        context: "answer_draft",
        contextData: ctx.questionText ? `Interview question: "${ctx.questionText}"` : null,
        questionId: ctx.questionId,
        selectedAnswerId: ctx.selectedAnswerId || null,
        selectedPracticeId: ctx.selectedPracticeId || null,
        history: messages.filter((m) => m !== GREETING),
      };
    }
    if (ctx.kind === "file") {
      return {
        message: text,
        context: "file_review",
        contextData: `File: ${ctx.fileName}`,
        fileId: ctx.fileId,
        history: messages.filter((m) => m !== GREETING),
      };
    }
    if (ctx.kind === "story") {
      const body = stripHtml(ctx.storyContent).slice(0, 2000);
      return {
        message: text,
        context: "general",
        contextData: `Story title: "${ctx.storyTitle}"\nStory content:\n${body}`,
        history: messages.filter((m) => m !== GREETING),
      };
    }
    return {
      message: text,
      context: "general",
      history: messages.filter((m) => m !== GREETING),
    };
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setSending(true);
    setError("");
    Keyboard.dismiss();
    try {
      const reply = await sendChat(buildSendArgs(trimmed));
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setError(e.message || "Bloom couldn't reply. Try again.");
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    setError("");
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { setError("Microphone permission denied."); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const r = new Audio.Recording();
      await r.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await r.startAsync();
      recordingRef.current = r;
      setRecording(true);
    } catch (e: any) {
      setError(e.message || "Could not start recording.");
    }
  };

  const stopRecordingAndTranscribe = async () => {
    if (!recordingRef.current) return;
    setRecording(false);
    setTranscribing(true);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) throw new Error("No audio captured.");
      const text = await transcribeAudio(uri);
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    } catch (e: any) {
      setError(e.message || "Transcription failed.");
    } finally {
      setTranscribing(false);
    }
  };

  const banner = (() => {
    if (ctx.kind === "question") {
      if (ctx.selectedAnswerId) return `Editing: ${ctx.selectedAnswerLabel || "selected answer"}`;
      if (ctx.selectedPracticeId) return `Reviewing: ${ctx.selectedPracticeTag || "selected practice"}`;
      return null;
    }
    if (ctx.kind === "file") return `📎 ${ctx.fileName}`;
    if (ctx.kind === "story") return `📖 ${ctx.storyTitle}`;
    return null;
  })();

  if (!visible) return null;

  return (
    // box-none = this wrapper passes touches through to underlying screen
    // (the sheet itself still receives its own taps via pointerEvents="auto").
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop: faint dim above the sheet. Tap to dismiss. */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: fade,
            // Confined to the area above the sheet so taps below the backdrop
            // (i.e. into the sheet) reach the sheet, while taps further up
            // dismiss it.
            height: SCREEN_HEIGHT - SHEET_HEIGHT,
          },
        ]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      {/* Sheet itself */}
      <Animated.View
        style={[
          styles.sheet,
          { height: SHEET_HEIGHT, transform: [{ translateY }] },
        ]}
        pointerEvents="auto"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <View style={styles.grabber} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Sparkles size={14} color={colors.textMuted} />
              <Text style={styles.headerTitleText}>
                <Text style={styles.bloom}>Bloom</Text>
                <Text style={styles.headerTitleTextMuted}>
                  {ctx.kind === "file" ? " · Library AI" : " · Prep AI"}
                </Text>
              </Text>
            </View>
            <TouchableOpacity onPress={dismiss}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {banner && (
            <View style={styles.banner}>
              <Text style={styles.bannerText} numberOfLines={1}>{banner}</Text>
            </View>
          )}

          <ScrollView ref={scrollRef} contentContainerStyle={styles.messages}>
            {messages.map((m, i) => (
              <View
                key={i}
                style={[styles.bubble, m.role === "user" ? styles.userBubble : styles.botBubble]}
              >
                <Text style={[styles.bubbleText, m.role === "user" && styles.userText]}>
                  {m.content}
                </Text>
              </View>
            ))}
            {sending && (
              <View style={[styles.bubble, styles.botBubble]}>
                <ActivityIndicator color={colors.orange} />
              </View>
            )}
            {!!error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>

          <View style={styles.inputRow}>
            {recording ? (
              <TouchableOpacity style={styles.micButtonActive} onPress={stopRecordingAndTranscribe}>
                <Square size={16} color="white" fill="white" />
              </TouchableOpacity>
            ) : transcribing ? (
              <View style={styles.micButton}>
                <ActivityIndicator color={colors.orange} size="small" />
              </View>
            ) : (
              <TouchableOpacity style={styles.micButton} onPress={startRecording} disabled={sending}>
                <Mic size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={recording ? "Listening…" : "Ask Bloom"}
              placeholderTextColor={colors.textGhost}
              multiline
              editable={!recording && !transcribing && !sending}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || sending}
            >
              <Send size={18} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
});

ChatSheet.displayName = "ChatSheet";
export default ChatSheet;

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 16,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  headerTitleText: { fontSize: fontSize.sm },
  bloom: { fontWeight: fontWeight.bold, color: colors.text },
  headerTitleTextMuted: { color: colors.textFaint },
  banner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.orangeLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.orangeBorder,
  },
  bannerText: { fontSize: fontSize.xs, color: colors.orange, fontWeight: fontWeight.semibold },
  messages: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  bubble: { padding: spacing.md, borderRadius: radius.lg, maxWidth: "85%" },
  botBubble: { backgroundColor: colors.bgMuted, alignSelf: "flex-start", borderTopLeftRadius: 4 },
  userBubble: { backgroundColor: colors.orange, alignSelf: "flex-end", borderTopRightRadius: 4 },
  bubbleText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  userText: { color: "white" },
  error: { color: colors.danger, fontSize: fontSize.sm, textAlign: "center" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.bg,
  },
  micButton: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  micButtonActive: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.danger,
    alignItems: "center", justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.orange,
    alignItems: "center", justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.4 },
});
