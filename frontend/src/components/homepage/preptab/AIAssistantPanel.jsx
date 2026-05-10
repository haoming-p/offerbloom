import { useState, useRef, useEffect } from "react";
import { LuSparkles, LuRotateCw, LuHistory } from "react-icons/lu";
import { sendChatMessage } from "../../../services/chat";
import {
  listChatSessions,
  createChatSession,
  getSessionMessages,
} from "../../../services/chatSessions";

// Static greeting shown when a fresh session has no messages yet.
const GREETING = {
  sender: "bot",
  text: "I can help draft an answer using your saved answers, practice attempts, and any files you've linked to this role or position. What would you like to work on?",
};

// Convert backend Message ({role, content}) → UI message ({sender, text}).
const fromApi = (m) => ({
  sender: m.role === "user" ? "user" : "bot",
  text: m.content,
});

// Quick display of "2h ago" / "yesterday" / "Mar 5".
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

const AIAssistantPanel = ({ question }) => {
  const [chatMessages, setChatMessages] = useState([GREETING]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // Session state for this question
  const [sessionId, setSessionId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsOffset, setSessionsOffset] = useState(0);
  const [hasMoreSessions, setHasMoreSessions] = useState(false);

  // On question change: load most-recent session (if any) + its messages.
  // No session yet → leave sessionId null; we'll lazy-create on first send.
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
          setChatMessages(msgs.length ? msgs.map(fromApi) : [GREETING]);
        } else {
          setSessionId(null);
          setChatMessages([GREETING]);
        }
      } catch {
        setSessionId(null);
        setChatMessages([GREETING]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [question?.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // History dropdown loader (paginated by 10; scroll for more).
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

  // Refresh = start a brand-new session. Previous session stays in history.
  const handleRefresh = async () => {
    if (!question?.id || chatLoading) return;
    try {
      const s = await createChatSession(question.id);
      setSessionId(s.id);
      setChatMessages([GREETING]);
    } catch {
      // Network blip: still let user start over locally; we'll create on send.
      setSessionId(null);
      setChatMessages([GREETING]);
    }
  };

  // Pick a session from history and load its messages.
  const handlePickSession = async (s) => {
    setHistoryOpen(false);
    setSessionId(s.id);
    try {
      const msgs = await getSessionMessages(s.id);
      setChatMessages(msgs.length ? msgs.map(fromApi) : [GREETING]);
    } catch {
      setChatMessages([GREETING]);
    }
  };

  const handleChatSend = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading || !question?.id) return;

    // If there's no session yet (first message on this question), create one now.
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      try {
        const s = await createChatSession(question.id);
        activeSessionId = s.id;
        setSessionId(s.id);
      } catch {
        // Persistence will silently fail on the backend if id is missing; chat still works.
      }
    }

    const updated = [...chatMessages, { sender: "user", text }];
    setChatMessages(updated);
    setChatInput("");
    setChatLoading(true);
    try {
      const reply = await sendChatMessage({
        message: text,
        context: "answer_draft",
        contextData: `Interview question: "${question?.question || ""}"`,
        questionId: question?.id || null,
        sessionId: activeSessionId,
        history: chatMessages,
      });
      setChatMessages([...updated, { sender: "bot", text: reply }]);
    } catch {
      setChatMessages([...updated, { sender: "bot", text: "Sorry, couldn't connect. Try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Header: refresh + history */}
      <div className="flex items-center justify-end gap-1 px-3 py-2 border-b border-gray-100 bg-white">
        <button
          onClick={openHistory}
          disabled={!question?.id}
          title="Session history"
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-pointer disabled:opacity-40"
        >
          <LuHistory size={15} />
        </button>
        <button
          onClick={handleRefresh}
          disabled={!question?.id || chatLoading}
          title="Start a new session"
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-pointer disabled:opacity-40"
        >
          <LuRotateCw size={15} />
        </button>
      </div>

      {/* History panel (overlay-style dropdown) */}
      {historyOpen && (
        <div className="absolute top-10 right-3 w-72 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-10 show-scrollbar">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 show-scrollbar">
        {chatMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-xl text-sm whitespace-pre-wrap ${
                msg.sender === "user"
                  ? "bg-orange-400 text-white rounded-br-none"
                  : "bg-white text-gray-700 rounded-bl-none border border-gray-100"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {chatLoading && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-2.5 rounded-xl text-sm text-gray-400 rounded-bl-none border border-gray-100">
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
};

AIAssistantPanel.title = "AI Assistant";
AIAssistantPanel.Icon = LuSparkles;

export default AIAssistantPanel;
