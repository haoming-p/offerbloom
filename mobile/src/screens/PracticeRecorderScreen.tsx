import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Mic, Square, RotateCcw, Check } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Audio } from "expo-av";
import { addPractice, transcribeAudio } from "../api/practices";
import { colors, spacing, fontSize, fontWeight, radius } from "../theme";

type State = "idle" | "recording" | "stopped" | "transcribing" | "saving";

const formatTime = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
};

export default function PracticeRecorderScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const questionId: string = route.params?.questionId;
  const questionText: string = route.params?.questionText || "";

  const [state, setState] = useState<State>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      // Belt-and-suspenders cleanup if user backs out mid-record.
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const startRecording = async () => {
    setError("");
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setError("Microphone permission denied. Allow it in Settings.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;

      setDurationMs(0);
      timerRef.current = setInterval(() => setDurationMs((d) => d + 250), 250);
      setState("recording");
    } catch (e: any) {
      setError(e.message || "Could not start recording.");
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setRecordingUri(uri);
      setState("stopped");
    } catch (e: any) {
      setError(e.message || "Could not stop recording.");
      setState("idle");
    }
  };

  const handleDiscard = () => {
    setRecordingUri(null);
    setTranscript("");
    setDurationMs(0);
    setError("");
    setState("idle");
  };

  const handleTranscribeAndSave = async () => {
    if (!recordingUri) return;
    setError("");

    // Step 1 — Whisper
    setState("transcribing");
    let text = transcript;
    if (!text) {
      try {
        text = await transcribeAudio(recordingUri);
        setTranscript(text);
      } catch (e: any) {
        setError(e.message || "Transcription failed.");
        setState("stopped");
        return;
      }
    }

    // Step 2 — POST to /practices
    setState("saving");
    try {
      const tag = `Practice — ${new Date().toLocaleString()}`;
      const seconds = Math.round(durationMs / 1000);
      await addPractice(questionId, tag, seconds, text || "(no transcript)");
      Alert.alert("Saved", "Practice saved. You can find it under this question.");
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || "Save failed.");
      setState("stopped");
    }
  };

  const busy = state === "transcribing" || state === "saving";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} disabled={state === "recording" || busy}>
          <ChevronLeft size={20} color={colors.textMuted} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Question</Text>
        <Text style={styles.question}>{questionText}</Text>

        <View style={styles.recorderCard}>
          {state === "idle" && (
            <>
              <Text style={styles.helper}>Tap the mic to start recording your answer.</Text>
              <TouchableOpacity style={styles.micButton} onPress={startRecording}>
                <Mic size={36} color="white" />
              </TouchableOpacity>
              <Text style={styles.timer}>00:00</Text>
            </>
          )}

          {state === "recording" && (
            <>
              <View style={styles.recordingDotRow}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingLabel}>Recording…</Text>
              </View>
              <Text style={styles.timerLarge}>{formatTime(durationMs)}</Text>
              <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                <Square size={28} color="white" fill="white" />
              </TouchableOpacity>
              <Text style={styles.helper}>Tap to stop</Text>
            </>
          )}

          {(state === "stopped" || state === "transcribing" || state === "saving") && (
            <>
              <Text style={styles.timer}>{formatTime(durationMs)} recorded</Text>

              {state === "stopped" && !transcript && (
                <Text style={styles.helper}>
                  Tap "Save" to transcribe with Whisper and save this practice.
                </Text>
              )}
              {!!transcript && (
                <View style={styles.transcriptCard}>
                  <Text style={styles.transcriptLabel}>Transcript</Text>
                  <Text style={styles.transcriptBody}>{transcript}</Text>
                </View>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.discardButton}
                  onPress={handleDiscard}
                  disabled={busy}
                >
                  <RotateCcw size={16} color={colors.textMuted} />
                  <Text style={styles.discardText}>Re-record</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleTranscribeAndSave}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Check size={16} color="white" />
                      <Text style={styles.saveText}>
                        {transcript ? "Save practice" : "Transcribe & save"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  backButton: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  backText: { color: colors.textMuted, fontSize: fontSize.sm },
  content: { padding: spacing.xl, paddingTop: 0 },
  label: {
    fontSize: fontSize.xs,
    color: colors.textFaint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  question: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  recorderCard: {
    backgroundColor: colors.bgMuted,
    padding: spacing.xl,
    borderRadius: radius.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  helper: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: "center" },
  micButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  timer: { fontSize: fontSize.base, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  timerLarge: {
    fontSize: fontSize.xxl,
    color: colors.text,
    fontVariant: ["tabular-nums"],
    fontWeight: fontWeight.bold,
  },
  recordingDotRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  recordingDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger,
  },
  recordingLabel: { color: colors.danger, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  transcriptCard: {
    width: "100%",
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  transcriptLabel: {
    fontSize: fontSize.xs,
    color: colors.textFaint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  transcriptBody: { fontSize: fontSize.sm, color: colors.text, lineHeight: 22 },
  actionRow: { flexDirection: "row", gap: spacing.md, width: "100%" },
  discardButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  discardText: { color: colors.textMuted, fontSize: fontSize.sm },
  saveButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.orange,
  },
  saveText: { color: "white", fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
