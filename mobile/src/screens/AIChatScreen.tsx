import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Send, Mic, Square, Sparkles } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Audio } from "expo-av";
import { sendChat, ChatMessage } from "../api/chat";
import { transcribeAudio } from "../api/practices";
import { colors, spacing, fontSize, fontWeight, radius } from "../theme";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi, I'm Bloom 🐱✨\n\nAsk me anything about this question — drafting an answer, structuring it, or what to highlight.",
};

// Bloom chat for a specific question. Voice input via mic icon next to send:
// records audio → Whisper → fills the text field so the user can edit before
// sending.
export default function AIChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const questionId: string = route.params?.questionId;
  const questionText: string = route.params?.questionText || "";

  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState("");

  const recordingRef = useRef<Audio.Recording | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    // Scroll to bottom whenever messages change.
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages]);

  useEffect(() => {
    return () => {
      if (recordingRef.current) recordingRef.current.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setSending(true);
    setError("");

    try {
      const reply = await sendChat({
        message: trimmed,
        context: "answer_draft",
        contextData: questionText ? `Interview question: "${questionText}"` : null,
        questionId,
        history: messages.filter((m) => m !== GREETING || messages.length > 1),
      });
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
      if (!perm.granted) {
        setError("Microphone permission denied.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
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
      // Append to current input — lets user keep typing after dictation.
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    } catch (e: any) {
      setError(e.message || "Transcription failed.");
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={20} color={colors.textMuted} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Sparkles size={14} color={colors.textMuted} />
          <Text style={styles.headerTitleText}>
            <Text style={styles.bloom}>Bloom</Text>
            <Text style={styles.headerTitleTextMuted}> · Prep AI</Text>
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
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
            style={[
              styles.sendButton,
              (!input.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            <Send size={18} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.bgMuted,
  },
  backButton: { flexDirection: "row", alignItems: "center", width: 60 },
  backText: { color: colors.textMuted, fontSize: fontSize.sm },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  headerTitleText: { fontSize: fontSize.sm },
  bloom: { fontWeight: fontWeight.bold, color: colors.text },
  headerTitleTextMuted: { color: colors.textFaint },
  messages: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  bubble: { padding: spacing.md, borderRadius: radius.lg, maxWidth: "85%" },
  botBubble: {
    backgroundColor: colors.bgMuted,
    alignSelf: "flex-start",
    borderTopLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: colors.orange,
    alignSelf: "flex-end",
    borderTopRightRadius: 4,
  },
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
