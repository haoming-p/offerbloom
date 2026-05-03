import React, { useState } from "react";

// Props:
// - question: current question object { id, question, answers, practices }
// - questions: all questions in current category (for prev/next)
// - onUpdatePractices: save updated practices array for this question
// - onBack: return to table view
// - onNavigate: switch to a different question by id
const PracticePage = ({ question, questions, onUpdatePractices, onAddPractice, onDeletePractice, onBack, onNavigate }) => {

  // --- Recording state ---
  // "idle" | "recording" | "recorded"
  const [recordingState, setRecordingState] = useState("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [timerId, setTimerId] = useState(null);

  // --- After recording, before saving ---
  const [pendingTag, setPendingTag] = useState("");

  // --- Which practice card is expanded ---
  const [expandedId, setExpandedId] = useState(null);

  // --- Prev/Next navigation ---
  const currentIndex = questions.findIndex((q) => q.id === question.id);
  const prevQuestion = currentIndex > 0 ? questions[currentIndex - 1] : null;
  const nextQuestion = currentIndex < questions.length - 1 ? questions[currentIndex + 1] : null;

  // ============================================================
  // Recording handlers (UI shell — no real audio)
  // TODO: change for further development — integrate Web Audio API for real recording
  // ============================================================

  const handleStartRecording = () => {
    setRecordingState("recording");
    setRecordingTime(0);
    // Fake timer that counts seconds
    const id = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
    setTimerId(id);
  };

  const handleStopRecording = () => {
    setRecordingState("recorded");
    clearInterval(timerId);
    setTimerId(null);
  };

  const handleDiscardRecording = () => {
    setRecordingState("idle");
    setRecordingTime(0);
    setPendingTag("");
  };

  const handleSavePractice = async () => {
    const tag = pendingTag.trim() || `Attempt ${(question.practices?.length || 0) + 1}`;
    const transcript = "(Voice transcript will appear here — Speech-to-Text coming soon)";
    setRecordingState("idle");
    setRecordingTime(0);
    setPendingTag("");

    if (onAddPractice) {
      const saved = await onAddPractice(tag, recordingTime, transcript);
      if (saved) setExpandedId(saved.id);
    } else {
      const newPractice = {
        id: `${Date.now()}-${Math.random()}`,
        tag,
        duration: recordingTime,
        transcript,
        aiFeedback: null,
        createdAt: Date.now(),
      };
      onUpdatePractices([newPractice, ...(question.practices || [])]);
      setExpandedId(newPractice.id);
    }
  };

  // --- Request AI feedback for a specific practice ---
  // TODO: change for further development — send transcript to LLM for real feedback
  const handleRequestFeedback = (practiceId) => {
    const fakeFeedback = {
      score: 8,
      strengths: [
        "Clear structure using the STAR method",
        "Specific examples with measurable outcomes",
        "Good pacing and logical flow",
      ],
      improvements: [
        "Could be more concise — aim for 2 minutes",
        "Add more detail about your specific role vs team effort",
        "Stronger closing that ties back to the role",
      ],
    };
    onUpdatePractices(
      (question.practices || []).map((p) =>
        p.id === practiceId ? { ...p, aiFeedback: fakeFeedback } : p
      )
    );
  };

  // --- Delete a practice ---
  const handleDeletePractice = (practiceId) => {
    if (onDeletePractice) {
      onDeletePractice(practiceId);
    } else {
      onUpdatePractices((question.practices || []).filter((p) => p.id !== practiceId));
    }
    if (expandedId === practiceId) setExpandedId(null);
  };

  // Format seconds to mm:ss
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const practices = question.practices || [];

  return (
    <div className="flex flex-col h-full">
      {/* Top navigation bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-800 cursor-pointer"
        >
          ← Back to list
        </button>
        <h2 className="text-sm font-semibold text-gray-800 max-w-md truncate">
          {question.question}
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => prevQuestion && onNavigate(prevQuestion.id)}
            className={`text-sm cursor-pointer ${
              prevQuestion ? "text-gray-500 hover:text-gray-800" : "text-gray-300 cursor-default"
            }`}
            disabled={!prevQuestion}
          >
            ← Prev
          </button>
          <span className="text-gray-300 text-sm">
            {currentIndex + 1} / {questions.length}
          </span>
          <button
            onClick={() => nextQuestion && onNavigate(nextQuestion.id)}
            className={`text-sm cursor-pointer ${
              nextQuestion ? "text-gray-500 hover:text-gray-800" : "text-gray-300 cursor-default"
            }`}
            disabled={!nextQuestion}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Main content: Left/Right split */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Answers for reference */}
        <div className="w-80 overflow-y-auto show-scrollbar p-6 border-r border-gray-100 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">
            Reference Answers
          </h3>
          <p className="text-xs text-gray-400 mb-4">Review before practicing</p>

          {question.answers.length === 0 ? (
            <p className="text-gray-300 text-sm text-center py-4">
              No answers yet — draft one in the Answer Editor first
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {question.answers.map((answer) => (
                <div key={answer.id} className="bg-gray-50 rounded-xl p-4">
                  <span className="text-xs font-medium text-gray-500 block mb-2">
                    {answer.label}
                  </span>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-6">
                    {answer.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Practice area + history */}
        <div className="flex-1 overflow-y-auto show-scrollbar p-6">
          {/* Recording section */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              🎙️ Voice Practice
            </h3>

            {recordingState === "idle" && (
              <div className="flex flex-col items-center py-4">
                <button
                  onClick={handleStartRecording}
                  className="w-16 h-16 bg-orange-400 hover:bg-orange-500 text-white rounded-full
                    flex items-center justify-center text-2xl cursor-pointer transition-all
                    shadow-lg hover:shadow-xl"
                >
                  🎤
                </button>
                <span className="text-xs text-gray-400 mt-3">Click to start recording</span>
              </div>
            )}

            {recordingState === "recording" && (
              <div className="flex flex-col items-center py-4">
                {/* Pulsing red dot + timer */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-lg font-mono text-gray-700">
                    {formatTime(recordingTime)}
                  </span>
                </div>
                <button
                  onClick={handleStopRecording}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full
                    flex items-center justify-center text-xl cursor-pointer transition-all
                    shadow-lg"
                >
                  ⏹
                </button>
                <span className="text-xs text-gray-400 mt-3">Recording... click to stop</span>
              </div>
            )}

            {recordingState === "recorded" && (
              <div className="flex flex-col gap-4 py-2">
                {/* Recording preview */}
                <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-gray-200">
                  <div className="flex items-center gap-3">
                    {/* TODO: change for further development — real audio playback */}
                    <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
                      ▶️
                    </button>
                    <span className="text-sm text-gray-600">
                      Recording — {formatTime(recordingTime)}
                    </span>
                  </div>
                </div>

                {/* Tag input */}
                <input
                  type="text"
                  value={pendingTag}
                  onChange={(e) => setPendingTag(e.target.value)}
                  placeholder={`Attempt ${(practices.length) + 1}`}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300"
                />

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleDiscardRecording}
                    className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-500
                      hover:border-gray-300 cursor-pointer"
                  >
                    🔄 Re-record
                  </button>
                  <button
                    onClick={handleSavePractice}
                    className="flex-1 py-2 bg-orange-400 text-white rounded-lg text-sm
                      hover:bg-orange-500 cursor-pointer"
                  >
                    💾 Save
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Practice History — timeline, newest first */}
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Practice History ({practices.length})
          </h3>

          {practices.length === 0 ? (
            <p className="text-gray-300 text-sm text-center py-8">
              No practice sessions yet — hit the mic to start!
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {practices.map((practice) => (
                <div
                  key={practice.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  {/* Card header */}
                  <div
                    onClick={() => setExpandedId(expandedId === practice.id ? null : practice.id)}
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {expandedId === practice.id ? "▾" : "▸"}
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {practice.tag}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(practice.duration)}
                      </span>
                      {practice.aiFeedback && (
                        <span className="text-xs px-2 py-0.5 bg-green-50 text-green-500 rounded-full">
                          Score: {practice.aiFeedback.score}/10
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 items-center">
                      {/* TODO: change for further development — real audio playback */}
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                      >
                        ▶️ Play
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePractice(practice.id); }}
                        className="text-gray-300 hover:text-red-400 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expandedId === practice.id && (
                    <div className="px-4 pb-4 flex flex-col gap-4">
                      {/* Transcript */}
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-1">
                          Transcript
                        </span>
                        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                          {practice.transcript}
                        </p>
                      </div>

                      {/* AI Feedback */}
                      {practice.aiFeedback ? (
                        <div>
                          <span className="text-xs font-medium text-gray-500 block mb-2">
                            AI Feedback — {practice.aiFeedback.score}/10
                          </span>
                          <div className="bg-green-50 rounded-lg p-3 mb-2">
                            <span className="text-xs font-medium text-green-600 block mb-1">
                              ✅ Strengths
                            </span>
                            {practice.aiFeedback.strengths.map((s, i) => (
                              <p key={i} className="text-sm text-gray-600 ml-2">• {s}</p>
                            ))}
                          </div>
                          <div className="bg-orange-50 rounded-lg p-3">
                            <span className="text-xs font-medium text-orange-600 block mb-1">
                              💡 Improvements
                            </span>
                            {practice.aiFeedback.improvements.map((s, i) => (
                              <p key={i} className="text-sm text-gray-600 ml-2">• {s}</p>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRequestFeedback(practice.id)}
                          className="w-full py-2.5 border border-orange-400 bg-orange-50 rounded-lg text-sm
                            text-orange-500 hover:bg-orange-100 cursor-pointer"
                        >
                          ✨ Get AI Feedback
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticePage;