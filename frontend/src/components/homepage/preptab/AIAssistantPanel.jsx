import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { LuSparkles, LuX } from "react-icons/lu";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { marked } from "marked";
import { sendChatMessage } from "../../../services/chat";
import {
  listChatSessions,
  createChatSession,
  getSessionMessages,
} from "../../../services/chatSessions";
import { defaultAnswerLabel } from "../../../utils/timestamps";
import BloomAvatar from "../../BloomAvatar";

// Greeting shown on a fresh session before any real reply.
const greeting = () => ({
  sender: "bot",
  text:
    "Hi, I'm Bloom 🐱✨\n\nDraft a new answer, or pick a saved one and I'll build on it.",
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
  selectedAnswer,
  onClearSelection,
  onAddAnswer,
  onUpdateAnswer,
}, ref) => {
  const [chatMessages, setChatMessages] = useState([greeting()]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // Per-message save indicator: { [messageIndex]: "saved-new" | "saved-update" }
  const [savedFlags, setSavedFlags] = useState({});

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
  const sendMessage = async (text) => {
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
        history: chatMessages,
      });
      setChatMessages([...updated, { sender: "bot", text: reply }]);
    } catch {
      setChatMessages([
        ...updated,
        { sender: "bot", text: "Sorry, couldn't connect. Try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatSend = async () => {
    const text = chatInput;
    setChatInput("");
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

  const handleUpdateSelected = async (msgIndex, text) => {
    if (!onUpdateAnswer || !selectedAnswer) return;
    const html = mdToHtml(text);
    try {
      await onUpdateAnswer(selectedAnswer.id, selectedAnswer.label, html);
      setSavedFlags((p) => ({ ...p, [msgIndex]: "saved-update" }));
      setTimeout(() => setSavedFlags((p) => {
        const next = { ...p }; delete next[msgIndex]; return next;
      }), 2000);
    } catch {}
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
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

      {/* Selected-answer banner — shows which answer "Update selected" will hit */}
      {selectedAnswer && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-orange-50 border-b border-orange-100 text-xs text-orange-700">
          <span className="truncate">
            Editing: <span className="font-semibold">{selectedAnswer.label}</span>
          </span>
          <button
            onClick={onClearSelection}
            title="Deselect"
            className="text-orange-400 hover:text-orange-600 cursor-pointer flex-shrink-0 ml-2"
          >
            <LuX size={12} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 show-scrollbar">
        {chatMessages.map((msg, i) => {
          const isBot = msg.sender === "bot";
          const showActions = isBot && !msg.isGreeting;
          const flag = savedFlags[i];
          if (!isBot) {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-orange-400 text-white text-sm whitespace-pre-wrap">
                  {msg.text}
                </div>
              </div>
            );
          }
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
                    <button
                      onClick={() => handleSaveAsNew(i, msg.text)}
                      className="text-[11px] px-2.5 py-1 rounded border border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100 cursor-pointer"
                    >
                      {flag === "saved-new" ? "✓ Saved" : "Save as new answer"}
                    </button>
                    {selectedAnswer && (
                      <button
                        onClick={() => handleUpdateSelected(i, msg.text)}
                        className="text-[11px] px-2.5 py-1 rounded border border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100 cursor-pointer"
                        title={`Overwrite ${selectedAnswer.label}`}
                      >
                        {flag === "saved-update" ? "✓ Updated" : "Update selected"}
                      </button>
                    )}
                    <button
                      onClick={() =>
                        sendMessage("What are likely follow-up questions for this answer?")
                      }
                      disabled={chatLoading}
                      className="text-[11px] px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                    >
                      Likely follow-ups
                    </button>
                    <button
                      onClick={() =>
                        sendMessage(
                          "What recommendations do you have to improve this answer? If none stand out, say so."
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
AIAssistantPanel.title = "Bloom · AI Assistant";
AIAssistantPanel.Icon = LuSparkles;

export default AIAssistantPanel;
