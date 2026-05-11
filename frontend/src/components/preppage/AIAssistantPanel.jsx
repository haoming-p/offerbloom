import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { LuSparkles, LuX, LuCircleHelp } from "react-icons/lu";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { marked } from "marked";
import { sendChatMessage } from "../../services/chat";
import { saveFeedbackMarkdown } from "../../services/practices";
import { createPreference } from "../../services/preferences";
import {
  listChatSessions,
  createChatSession,
  getSessionMessages,
} from "../../services/chatSessions";
import { defaultAnswerLabel } from "../../utils/timestamps";
import BloomAvatar from "../BloomAvatar";

// Greeting shown on a fresh session before any real reply. Lists the
// resources the model grounds on + the main affordances so users know what
// to try first. Keep it under ~3 short paragraphs.
const greeting = () => ({
  sender: "bot",
  text:
    "Hi, I'm **Bloom**, your lucky cat 🐱✨\n\n" +
    "I draw from your answers, practices, stories, role + position, files, and preferences. " +
    "Draft **a new answer** or pick **a saved one**.\n\n" +
    "Can also help you **practice** — pick any attempt for feedback.",
  isGreeting: true,
});

// Backend Message ({role, content}) → UI message ({sender, text}).
const fromApi = (m) => ({
  sender: m.role === "user" ? "user" : "bot",
  text: m.content,
});

const formatTimeAgo = (ms) => {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
};

const HISTORY_PAGE = 10;

// If Bloom's reply is short and ends with a question mark, it's almost
// certainly a clarification ("Which experience should I use?"), so the
// Save / Follow-ups / Recommendations buttons are useless on it. ~80 words
// matches the spec in WIP_AI_PANEL.md.
const isClarification = (text) => {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed.endsWith("?")) return false;
  return trimmed.split(/\s+/).length < 80;
};

// Typed phrases the input box treats as command shortcuts (exact match,
// case-insensitive). Anything not on this list falls through to the AI as a
// normal message — so users who don't know the shortcuts aren't broken.
const PHRASE_ACTIONS = {
  "save as new answer": "save-as-new",
  "update selected": "update-selected",
  "refine": "refine",
  "get feedback": "get-feedback",
  "likely follow-ups": "follow-ups",
  "recommendations": "recommendations",
};

// Tailwind classes for the markdown renderer inside bot bubbles.
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

const AIAssistantPanel = forwardRef(({
  question,
  roleId,
  selectedAnswer,
  selectedPractice,
  onClearSelection,
  onAddAnswer,
  onUpdateAnswer,
  onUpdatePractices,
}, ref) => {
  // What kind of item is currently selected — drives banner + buttons.
  // Mutual exclusion is enforced upstream (QuestionDetailPage); we just read it.
  const selectionKind = selectedAnswer ? "answer" : selectedPractice ? "practice" : "none";
  const selectionLabel = selectedAnswer?.label || selectedPractice?.tag || "";
  const [chatMessages, setChatMessages] = useState([greeting()]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // Per-message save indicator: { [messageIndex]: "saved-new" | "saved-update" }
  const [savedFlags, setSavedFlags] = useState({});

  // Per-user-message remembered indicator: { [messageIndex]: true }
  const [rememberedFlags, setRememberedFlags] = useState({});

  const [sessionId, setSessionId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsOffset, setSessionsOffset] = useState(0);
  const [hasMoreSessions, setHasMoreSessions] = useState(false);

  // Load most recent session when question changes.
  useEffect(() => {
    if (!question?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const recent = await listChatSessions(question.id, { limit: 1, offset: 0 });
        if (cancelled) return;
        if (recent.length > 0) {
          const s = recent[0];
          setSessionId(s.id);
          const msgs = await getSessionMessages(s.id);
          if (cancelled) return;
          setChatMessages(msgs.length ? msgs.map(fromApi) : [greeting()]);
        } else {
          setSessionId(null);
          setChatMessages([greeting()]);
        }
        setSavedFlags({});
      } catch {
        setSessionId(null);
        setChatMessages([greeting()]);
        setSavedFlags({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [question?.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const loadHistoryPage = async (offset) => {
    if (!question?.id) return;
    const page = await listChatSessions(question.id, {
      limit: HISTORY_PAGE,
      offset,
    });
    setSessions((prev) => (offset === 0 ? page : [...prev, ...page]));
    setSessionsOffset(offset + page.length);
    setHasMoreSessions(page.length === HISTORY_PAGE);
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    await loadHistoryPage(0);
  };

  // Expose openHistory + refresh to the parent (Column header buttons live there now).
  useImperativeHandle(ref, () => ({
    openHistory,
    refresh: () => handleRefresh(),
  }));

  const handleRefresh = async () => {
    if (!question?.id || chatLoading) return;
    try {
      const s = await createChatSession(question.id);
      setSessionId(s.id);
      setChatMessages([greeting()]);
      setSavedFlags({});
    } catch {
      setSessionId(null);
      setChatMessages([greeting()]);
      setSavedFlags({});
    }
  };

  const handlePickSession = async (s) => {
    setHistoryOpen(false);
    setSessionId(s.id);
    try {
      const msgs = await getSessionMessages(s.id);
      setChatMessages(msgs.length ? msgs.map(fromApi) : [greeting()]);
      setSavedFlags({});
    } catch {
      setChatMessages([greeting()]);
      setSavedFlags({});
    }
  };

  // Send a chat message (either user-typed or button-triggered).
  // replyKind tags the resulting bot reply so its action buttons match the
  // intent of the turn:
  //   "answer"   → likely producing an answer draft (Save as new / Update etc.)
  //   "feedback" → reviewing a practice (Save feedback to practice)
  //   "meta"     → listing follow-ups or recommendations — no save buttons
  const sendMessage = async (text, replyKind = "answer") => {
    const trimmed = text.trim();
    if (!trimmed || chatLoading || !question?.id) return;

    let activeSessionId = sessionId;
    if (!activeSessionId) {
      try {
        const s = await createChatSession(question.id);
        activeSessionId = s.id;
        setSessionId(s.id);
      } catch {}
    }

    // Snapshot the selection state at the time the message is sent. We attach
    // this to the bot reply so its action buttons (and labels) stay anchored
    // to *that* turn — switching selection later must not retroactively change
    // the buttons on older replies.
    const ctxSnapshot = {
      kind: selectionKind,
      answerId: selectedAnswer?.id || null,
      answerLabel: selectedAnswer?.label || null,
      practiceId: selectedPractice?.id || null,
      practiceTag: selectedPractice?.tag || null,
    };

    const updated = [...chatMessages, { sender: "user", text: trimmed }];
    setChatMessages(updated);
    setChatLoading(true);
    try {
      const reply = await sendChatMessage({
        message: trimmed,
        context: "answer_draft",
        contextData: `Interview question: "${question?.question || ""}"`,
        questionId: question?.id || null,
        sessionId: activeSessionId,
        selectedAnswerId: selectedAnswer?.id || null,
        selectedPracticeId: selectedPractice?.id || null,
        history: chatMessages,
      });
      setChatMessages([...updated, { sender: "bot", text: reply, selectionContext: ctxSnapshot, replyKind }]);
    } catch {
      setChatMessages([
        ...updated,
        { sender: "bot", text: "Sorry, couldn't connect. Try again.", selectionContext: ctxSnapshot, replyKind },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Run a typed-phrase shortcut against the most recent actionable bot reply.
  // Returns true if the phrase was handled; false means "fall through and send
  // this as a normal message to the AI."
  const tryRunPhraseAction = (action) => {
    let lastBotIndex = -1;
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      const m = chatMessages[i];
      if (m.sender === "bot" && !m.isGreeting) {
        lastBotIndex = i;
        break;
      }
    }
    const lastBot = lastBotIndex >= 0 ? chatMessages[lastBotIndex] : null;
    const lastCtx = lastBot?.selectionContext || { kind: "none" };

    switch (action) {
      case "save-as-new":
        if (!lastBot) return false;
        handleSaveAsNew(lastBotIndex, lastBot.text);
        return true;
      case "update-selected":
        // Update targets the answer that was selected when that reply was
        // generated — not whatever's selected now.
        if (!lastBot || !lastCtx.answerId) return false;
        handleUpdateSelected(lastBotIndex, lastBot.text, lastCtx.answerId, lastCtx.answerLabel);
        return true;
      case "refine":
        // refine/get-feedback fire a NEW message, so they read live selection.
        if (!selectedAnswer) return false;
        sendMessage("Refine the selected answer.", "answer");
        return true;
      case "get-feedback":
        if (!selectedPractice) return false;
        sendMessage("Give feedback on this practice.", "feedback");
        return true;
      case "follow-ups":
        // Conversation-follow-up shortcuts follow the thread of the last reply,
        // not the user's current selection.
        sendMessage(
          lastCtx.kind === "practice"
            ? "What are likely follow-up questions for this practice attempt?"
            : "What are likely follow-up questions for this answer?",
          "meta"
        );
        return true;
      case "recommendations":
        sendMessage(
          lastCtx.kind === "practice"
            ? "What recommendations do you have to improve this practice attempt? If none stand out, say so."
            : "What recommendations do you have to improve this answer? If none stand out, say so.",
          "meta"
        );
        return true;
      default:
        return false;
    }
  };

  const handleChatSend = async () => {
    const text = chatInput;
    setChatInput("");
    const action = PHRASE_ACTIONS[text.trim().toLowerCase()];
    if (action && tryRunPhraseAction(action)) return;
    await sendMessage(text);
  };

  // Convert markdown → HTML for TipTap-friendly storage in Answer.content.
  const mdToHtml = (md) => {
    try {
      return marked.parse(md || "", { gfm: true, breaks: false }).trim();
    } catch {
      return `<p>${(md || "").replace(/</g, "&lt;")}</p>`;
    }
  };

  const handleSaveAsNew = async (msgIndex, text) => {
    if (!onAddAnswer) return;
    const html = mdToHtml(text);
    const label = `AI draft ${defaultAnswerLabel((question.answers?.length || 0) + 1).replace(/^Version /, "")}`;
    try {
      await onAddAnswer(label, html);
      setSavedFlags((p) => ({ ...p, [msgIndex]: "saved-new" }));
      setTimeout(() => setSavedFlags((p) => {
        const next = { ...p }; delete next[msgIndex]; return next;
      }), 2000);
    } catch {}
  };

  // answerId/answerLabel come from the message's captured selectionContext,
  // not live state — so this still updates the right answer even if the user
  // has since changed selection.
  const handleUpdateSelected = async (msgIndex, text, answerId, answerLabel) => {
    if (!onUpdateAnswer || !answerId) return;
    const html = mdToHtml(text);
    try {
      await onUpdateAnswer(answerId, answerLabel, html);
      setSavedFlags((p) => ({ ...p, [msgIndex]: "saved-update" }));
      setTimeout(() => setSavedFlags((p) => {
        const next = { ...p }; delete next[msgIndex]; return next;
      }), 2000);
    } catch {}
  };

  // Save a user message as a persisted AI preference. Defaults to the role
  // currently being prepped for — so "Remember this" while practicing PM saves
  // a PM-only rule by default. Users can broaden the scope/role in the Me tab.
  const handleRememberPreference = async (msgIndex, text) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    if (rememberedFlags[msgIndex]) return; // already saved
    try {
      await createPreference({ text: trimmed, scope: "prep", roleId: roleId || null });
      setRememberedFlags((p) => ({ ...p, [msgIndex]: true }));
    } catch {}
  };

  // Save the bot reply (raw markdown) to a Practice as ai_feedback. The
  // practiceId comes from the message's captured selectionContext so the save
  // targets the practice that was selected when the reply was generated.
  const handleSaveFeedbackToPractice = async (msgIndex, text, practiceId) => {
    if (!practiceId || !onUpdatePractices) return;
    try {
      const updated = await saveFeedbackMarkdown(practiceId, text);
      onUpdatePractices(
        (question.practices || []).map((p) =>
          p.id === practiceId ? { ...p, aiFeedback: updated.ai_feedback } : p
        )
      );
      setSavedFlags((p) => ({ ...p, [msgIndex]: "saved-feedback" }));
      setTimeout(() => setSavedFlags((p) => {
        const next = { ...p }; delete next[msgIndex]; return next;
      }), 2000);
    } catch {}
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-orange-50/40 via-white to-white relative">
      {/* History dropdown — rendered as overlay; trigger lives in the column header now. */}
      {historyOpen && (
        <div className="absolute top-2 right-3 w-72 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-10 show-scrollbar">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-600">Past sessions</span>
            <button
              onClick={() => setHistoryOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              ✕
            </button>
          </div>
          {sessions.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-6">No sessions yet</p>
          ) : (
            <>
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handlePickSession(s)}
                  className={`w-full text-left px-3 py-2 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${
                    s.id === sessionId ? "bg-orange-50" : ""
                  }`}
                >
                  <div className="text-xs text-gray-700 truncate">
                    {s.title || "(empty session)"}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {formatTimeAgo(s.last_used_at)} · {s.message_count} msg
                  </div>
                </button>
              ))}
              {hasMoreSessions && (
                <button
                  onClick={() => loadHistoryPage(sessionsOffset)}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 py-2 cursor-pointer"
                >
                  Load more
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Selection banner — shows the currently focused item + a primary quick action.
          "Refine" (for answers) and "Get feedback" (for practices) auto-send a
          short prompt that the backend resolves against the [FOCUS] item. */}
      {selectionKind !== "none" && (
        <div className="flex items-center justify-between gap-2 px-4 py-1.5 bg-orange-50 border-b border-orange-100 text-xs text-orange-700">
          <span className="truncate flex-1 min-w-0">
            {selectionKind === "answer" ? "Editing" : "Reviewing"}:{" "}
            <span className="font-semibold">{selectionLabel}</span>
          </span>
          <button
            onClick={() =>
              sendMessage(
                selectionKind === "answer"
                  ? "Refine the selected answer."
                  : "Give feedback on this practice.",
                selectionKind === "answer" ? "answer" : "feedback"
              )
            }
            disabled={chatLoading}
            className="text-[11px] px-2.5 py-0.5 rounded border border-orange-300 bg-white text-orange-600 hover:bg-orange-100 cursor-pointer disabled:opacity-50 flex-shrink-0"
          >
            {selectionKind === "answer" ? "Refine" : "Get feedback"}
          </button>
          <button
            onClick={onClearSelection}
            title="Deselect"
            className="text-orange-400 hover:text-orange-600 cursor-pointer flex-shrink-0"
          >
            <LuX size={12} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 show-scrollbar">
        {chatMessages.map((msg, i) => {
          const isBot = msg.sender === "bot";
          // Hide all action buttons when the reply is a short clarification
          // question — buttons would be useless on "Which experience should I use?".
          const showActions = isBot && !msg.isGreeting && !isClarification(msg.text);
          const flag = savedFlags[i];
          if (!isBot) {
            const remembered = !!rememberedFlags[i];
            return (
              <div key={i} className="flex justify-end">
                <div className="flex flex-col items-end max-w-[85%] gap-1">
                  <div className="px-4 py-2.5 rounded-2xl rounded-br-sm bg-orange-400 text-white text-sm whitespace-pre-wrap">
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRememberPreference(i, msg.text)}
                      disabled={remembered}
                      className={`text-[10px] px-2 py-0.5 rounded-full border cursor-pointer ${
                        remembered
                          ? "border-orange-200 bg-orange-50 text-orange-500 cursor-default"
                          : "border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500"
                      }`}
                    >
                      {remembered ? "✓ Remembered" : "Remember this"}
                    </button>
                    <span
                      title="Bloom will follow this rule in future replies. Manage in the Me tab."
                      className="text-gray-300 hover:text-gray-500 cursor-help"
                    >
                      <LuCircleHelp size={11} />
                    </span>
                  </div>
                </div>
              </div>
            );
          }
          // Snapshot the turn's selection so the buttons don't change when
          // the user later switches selection.
          const msgCtx = msg.selectionContext || { kind: "none" };
          // replyKind drives WHICH save buttons render. "meta" replies (e.g.
          // a list of follow-up questions) hide save buttons entirely because
          // saving a list of questions as an answer makes no sense. Old
          // session-history messages have no replyKind — default to "answer"
          // so they keep the original button set.
          const replyKind = msg.replyKind || "answer";
          // Phrasing of follow-ups / recommendations follows the reply's
          // selection context, e.g. "this practice" vs "this answer".
          const ctxKind = msgCtx.kind;
          return (
            <div key={i} className="flex items-start gap-2.5">
              <BloomAvatar size={32} />
              <div className="max-w-[88%] bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm">
                <div className="px-4 pt-3 pb-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
                {showActions && (
                  <div className="flex flex-wrap gap-1.5 px-3 pb-3 pt-1 border-t border-gray-50 mt-1">
                    {replyKind === "feedback" && msgCtx.practiceId && (
                      <button
                        onClick={() => handleSaveFeedbackToPractice(i, msg.text, msgCtx.practiceId)}
                        className="text-[11px] px-2.5 py-1 rounded border border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100 cursor-pointer"
                        title={`Save this reply as feedback on ${msgCtx.practiceTag || "practice"}`}
                      >
                        {flag === "saved-feedback" ? "✓ Saved" : "Save feedback to practice"}
                      </button>
                    )}
                    {replyKind === "answer" && (
                      <>
                        <button
                          onClick={() => handleSaveAsNew(i, msg.text)}
                          className="text-[11px] px-2.5 py-1 rounded border border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100 cursor-pointer"
                        >
                          {flag === "saved-new" ? "✓ Saved" : "Save as new answer"}
                        </button>
                        {msgCtx.answerId && (
                          <button
                            onClick={() => handleUpdateSelected(i, msg.text, msgCtx.answerId, msgCtx.answerLabel)}
                            className="text-[11px] px-2.5 py-1 rounded border border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100 cursor-pointer"
                            title={`Overwrite ${msgCtx.answerLabel}`}
                          >
                            {flag === "saved-update" ? "✓ Updated" : "Update selected"}
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() =>
                        sendMessage(
                          ctxKind === "practice"
                            ? "What are likely follow-up questions for this practice attempt?"
                            : "What are likely follow-up questions for this answer?",
                          "meta"
                        )
                      }
                      disabled={chatLoading}
                      className="text-[11px] px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                    >
                      Likely follow-ups
                    </button>
                    <button
                      onClick={() =>
                        sendMessage(
                          ctxKind === "practice"
                            ? "What recommendations do you have to improve this practice attempt? If none stand out, say so."
                            : "What recommendations do you have to improve this answer? If none stand out, say so.",
                          "meta"
                        )
                      }
                      disabled={chatLoading}
                      className="text-[11px] px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                    >
                      Recommendations
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {chatLoading && (
          <div className="flex items-start gap-2.5">
            <BloomAvatar size={32} />
            <div className="bg-white px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm text-gray-400 border border-gray-100 shadow-sm">
              typing…
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 pb-4 pt-2 flex gap-3 border-t border-gray-100">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
          disabled={chatLoading}
          placeholder="Ask AI to draft an answer..."
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm placeholder-gray-300 bg-white focus:outline-none focus:border-orange-300"
        />
        <button
          onClick={handleChatSend}
          disabled={chatLoading}
          className="px-4 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
});

AIAssistantPanel.displayName = "AIAssistantPanel";
AIAssistantPanel.title = "Bloom · Prep AI";
AIAssistantPanel.Icon = LuSparkles;

export default AIAssistantPanel;
