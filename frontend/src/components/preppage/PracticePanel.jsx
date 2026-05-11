import { useState, useRef } from "react";
import { LuMic, LuSquare, LuRotateCcw, LuSave } from "react-icons/lu";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { defaultPracticeTag } from "../../utils/timestamps";

// Same markdown styling as the AI panel — keeps saved feedback on the practice
// card visually consistent with how it looked inside the chat bubble.
const mdComponents = {
  h1: (p) => <h1 className="text-base font-bold text-gray-800 mt-3 mb-1.5" {...p} />,
  h2: (p) => <h2 className="text-sm font-bold text-gray-800 mt-3 mb-1.5" {...p} />,
  h3: (p) => <h3 className="text-sm font-semibold text-gray-700 mt-2 mb-1" {...p} />,
  p: (p) => <p className="text-sm text-gray-700 leading-relaxed my-1.5" {...p} />,
  strong: (p) => <strong className="font-semibold text-gray-900" {...p} />,
  em: (p) => <em className="italic text-gray-700" {...p} />,
  ul: (p) => <ul className="list-disc pl-5 my-1.5 space-y-1 text-sm text-gray-700" {...p} />,
  ol: (p) => <ol className="list-decimal pl-5 my-1.5 space-y-1 text-sm text-gray-700" {...p} />,
  li: (p) => <li className="leading-relaxed" {...p} />,
  hr: () => <hr className="my-3 border-gray-200" />,
};

const PracticePanel = ({
  question,
  selectedPracticeId,
  onSelectPractice,
  onUpdatePractices,
  onAddPractice,
  onAddAnswer,
  onDeletePractice,
}) => {
  const [recordingState, setRecordingState] = useState("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [timerId, setTimerId] = useState(null);
  const [pendingTag, setPendingTag] = useState("");
  const [pendingTranscript, setPendingTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      transcriptRef.current = "";
      setPendingTranscript("");

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognitionRef.current = recognition;
        recognition.onresult = (e) => {
          let full = "";
          for (let i = 0; i < e.results.length; i++) {
            full += e.results[i][0].transcript + (e.results[i].isFinal ? ". " : "");
          }
          transcriptRef.current = full;
          setPendingTranscript(full);
        };
        recognition.onerror = () => {};
        recognition.start();
      }

      setRecordingState("recording");
      setRecordingTime(0);
      const id = setInterval(() => setRecordingTime((p) => p + 1), 1000);
      setTimerId(id);
    } catch {
      alert("Microphone access denied. Please allow microphone permission.");
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    recognitionRef.current?.stop();
    clearInterval(timerId);
    setTimerId(null);
    setRecordingState("recorded");
  };

  const handleDiscardRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingState("idle");
    setRecordingTime(0);
    setPendingTag("");
    setPendingTranscript("");
    transcriptRef.current = "";
  };

  // alsoAsAnswer: when true, also creates a paired answer with the transcript.
  const handleSavePractice = async (alsoAsAnswer) => {
    const tag = pendingTag.trim() || defaultPracticeTag((question.practices?.length || 0) + 1);
    const transcript = transcriptRef.current.trim() || "(No transcript captured)";
    const duration = recordingTime;

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingState("idle");
    setRecordingTime(0);
    setPendingTag("");
    setPendingTranscript("");
    transcriptRef.current = "";

    if (onAddPractice) {
      const saved = await onAddPractice(tag, duration, transcript);
      if (saved) onSelectPractice?.(saved.id);
    } else {
      const newP = { id: `${Date.now()}`, tag, duration, transcript, aiFeedback: null, createdAt: Date.now() };
      onUpdatePractices([newP, ...(question.practices || [])]);
      onSelectPractice?.(newP.id);
    }

    const isReal = transcript && !transcript.startsWith("(No transcript");
    if (alsoAsAnswer && onAddAnswer && isReal) {
      onAddAnswer(`Practice — ${tag}`, transcript).catch(() => {});
    }
  };

  const handleDeletePractice = (practiceId) => {
    if (onDeletePractice) onDeletePractice(practiceId);
    else onUpdatePractices((question.practices || []).filter((p) => p.id !== practiceId));
    if (selectedPracticeId === practiceId) onSelectPractice?.(null);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const practices = question.practices || [];

  const isRealTranscript =
    pendingTranscript && pendingTranscript.trim() && !pendingTranscript.trim().startsWith("(No transcript");

  return (
    <div className="h-full overflow-y-auto show-scrollbar p-5">
      {/* Header — match Saved Answers */}
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Practice History ({practices.length})
      </h3>

      {/* Recorder card */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4">
        {recordingState === "idle" && (
          <div className="flex flex-col items-center py-2">
            <button
              onClick={handleStartRecording}
              className="w-14 h-14 bg-orange-400 hover:bg-orange-500 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transition-all"
            >
              <LuMic size={22} />
            </button>
            <span className="text-xs text-gray-400 mt-2">Click to start recording</span>
          </div>
        )}

        {recordingState === "recording" && (
          <div className="flex flex-col items-center py-2">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-base font-mono text-gray-700">{formatTime(recordingTime)}</span>
            </div>
            {pendingTranscript && (
              <p className="text-xs text-gray-400 italic text-center mb-3 line-clamp-2">{pendingTranscript}</p>
            )}
            <button
              onClick={handleStopRecording}
              className="w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg"
            >
              <LuSquare size={20} fill="currentColor" />
            </button>
            <span className="text-xs text-gray-400 mt-2">Click to stop</span>
          </div>
        )}

        {recordingState === "recorded" && (
          <>
            {/* Title input — on top, matches Version-label position */}
            <input
              type="text"
              value={pendingTag}
              onChange={(e) => setPendingTag(e.target.value)}
              onFocus={() => {
                if (!pendingTag) setPendingTag(defaultPracticeTag(practices.length + 1));
              }}
              placeholder={defaultPracticeTag(practices.length + 1)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300 focus:outline-none focus:border-orange-300 mb-3"
            />

            {audioUrl && (
              <audio controls src={audioUrl} className="w-full mb-3" />
            )}

            {pendingTranscript && (
              <div className="bg-white rounded-lg px-3 py-2 border border-gray-200 mb-3">
                <span className="text-xs font-medium text-gray-500 block mb-1">Transcript</span>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{pendingTranscript}</p>
              </div>
            )}

            {/* Buttons — match Cancel / Save answer pattern */}
            <div className="flex justify-end gap-2 flex-wrap">
              <button
                onClick={handleDiscardRecording}
                className="flex items-center gap-1.5 px-4 py-1.5 text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
              >
                <LuRotateCcw size={12} />
                Re-record
              </button>
              <button
                onClick={() => handleSavePractice(true)}
                disabled={!isRealTranscript}
                className="flex items-center gap-1.5 px-4 py-1.5 border border-orange-300 text-orange-500 rounded-lg hover:bg-orange-50 text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={isRealTranscript ? "" : "No transcript captured — can't save as answer"}
              >
                Save practice + answer
              </button>
              <button
                onClick={() => handleSavePractice(false)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-400 text-white rounded-lg hover:bg-orange-500 text-sm cursor-pointer"
              >
                <LuSave size={12} />
                Save practice
              </button>
            </div>
          </>
        )}
      </div>

      {practices.length === 0 ? (
        <p className="text-gray-300 text-sm text-center py-6">
          No practice sessions yet — hit the mic above
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {practices.map((practice) => {
            const isSelected = selectedPracticeId === practice.id;
            // ai_feedback now stores raw markdown. Pre-existing rows may still
            // contain a JSON string from the old PATCH endpoint — accept either
            // as a string for the markdown renderer.
            const feedbackText =
              typeof practice.aiFeedback === "string"
                ? practice.aiFeedback
                : practice.aiFeedback
                ? JSON.stringify(practice.aiFeedback)
                : "";
            return (
              <div
                key={practice.id}
                className={`bg-white rounded-xl border overflow-hidden ${
                  isSelected ? "border-orange-300 ring-1 ring-orange-200" : "border-gray-200"
                }`}
              >
                <div
                  onClick={() => onSelectPractice?.(isSelected ? null : practice.id)}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-gray-400">{isSelected ? "▾" : "▸"}</span>
                    <span className="text-sm font-medium text-gray-700 truncate">{practice.tag}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(practice.duration)}</span>
                    {feedbackText && (
                      <span className="text-xs px-2 py-0.5 bg-green-50 text-green-500 rounded-full flex-shrink-0">
                        feedback
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePractice(practice.id); }}
                    className="text-gray-300 hover:text-red-400 text-xs cursor-pointer flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
                {isSelected && (
                  <div className="px-4 pb-4 flex flex-col gap-3">
                    <div>
                      <span className="text-xs font-medium text-gray-500 block mb-1">Transcript</span>
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                        {practice.transcript}
                      </p>
                    </div>
                    {feedbackText ? (
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-1">Saved feedback</span>
                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                            {feedbackText}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-300 text-center py-1">
                        Ask Bloom for feedback in the AI panel →
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

PracticePanel.title = "Practice";
PracticePanel.Icon = LuMic;

export default PracticePanel;
