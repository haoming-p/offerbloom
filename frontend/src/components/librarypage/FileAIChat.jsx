import React, { useState, useRef, useEffect } from "react";
import { LuSparkles, LuX } from "react-icons/lu";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendChatMessage } from "../../services/chat";
import { createPreference } from "../../services/preferences";
import AIPreferenceHelp from "../AIPreferenceHelp";
import BloomAvatar from "../BloomAvatar";

const stripHtml = (html) => {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button
      onClick={onClick}
      className="text-[11px] px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:border-orange-400 hover:text-orange-500 cursor-pointer"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
};

const markdownComponents = {
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
  blockquote: (p) => (
    <blockquote className="border-l-4 border-orange-300 bg-orange-50/50 pl-3 py-1 my-2 text-sm text-gray-700" {...p} />
  ),
  code: ({ inline, children, ...rest }) =>
    inline ? (
      <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-[12px]" {...rest}>
        {children}
      </code>
    ) : (
      <code className="block bg-gray-900 text-gray-100 rounded-md p-3 my-2 text-[12px] overflow-x-auto whitespace-pre-wrap" {...rest}>
        {children}
      </code>
    ),
  pre: (p) => <pre className="my-2" {...p} />,
  table: (p) => <table className="w-full text-xs border-collapse my-2" {...p} />,
  th: (p) => <th className="border border-gray-200 px-2 py-1 bg-gray-50 text-left font-semibold" {...p} />,
  td: (p) => <td className="border border-gray-200 px-2 py-1 align-top" {...p} />,
};

const BotMessage = ({ text, hideActions }) => (
  <div className="flex items-start gap-2.5">
    <BloomAvatar size={32} />
    <div className="max-w-[88%] bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm px-4 py-3">
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {text}
        </ReactMarkdown>
      </div>
      {!hideActions && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end">
          <CopyButton text={text} />
        </div>
      )}
    </div>
  </div>
);

const UserMessage = ({ text, remembered, onRemember, onNavigateToMe }) => (
  <div className="flex justify-end">
    <div className="flex flex-col items-end max-w-[85%] gap-1">
      <div className="px-4 py-2.5 rounded-2xl rounded-br-sm bg-orange-400 text-white text-sm whitespace-pre-wrap">
        {text}
      </div>
      {onRemember && (
        <div className="flex items-center gap-1">
          <button
            onClick={onRemember}
            disabled={remembered}
            className={`text-[10px] px-2 py-0.5 rounded-full border cursor-pointer ${
              remembered
                ? "border-orange-200 bg-orange-50 text-orange-500 cursor-default"
                : "border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500"
            }`}
          >
            {remembered ? "✓ Saved" : "+ AI preference"}
          </button>
          <AIPreferenceHelp onNavigateToMe={onNavigateToMe} />
        </div>
      )}
    </div>
  </div>
);

const FileAIChat = ({ selectedFile, activeSection, selectedStory, onClearStory, onNavigateToMe }) => {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text:
        "Hi, I'm **Bloom**, your lucky cat 🐱✨\n\n" +
        "I review your files for paste-ready edits, or refine your stories — both follow your AI preferences.\n\n" +
        "Pick a file or story on the left to start.",
      isGreeting: true,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Story content is sent inline via contextData (no schema change needed) so
  // the model can quote/reference it directly. Capped to keep prompts sane.
  const buildContextData = () => {
    if (selectedFile) return `File: ${selectedFile.name} (type: ${selectedFile.file_type || "unknown"})`;
    if (selectedStory) {
      const body = stripHtml(selectedStory.content || "").slice(0, 2000);
      return `Story title: "${selectedStory.title}"\nStory content:\n${body}`;
    }
    if (activeSection) return `Content section: ${activeSection.label}`;
    return null;
  };

  // file_review's system prompt is tuned for paste-ready resume edits — keep
  // that for actual files. For story chats use "general" so the assistant
  // doesn't try to apply the Resume-edit template.
  const chatContext = selectedFile ? "file_review" : "general";

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    const updated = [...messages, { sender: "user", text: msg }];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const reply = await sendChatMessage({
        message: msg,
        context: chatContext,
        contextData: buildContextData(),
        fileId: selectedFile?.id || null,
        history: messages,
      });
      setMessages([...updated, { sender: "bot", text: reply }]);
    } catch {
      setMessages([
        ...updated,
        { sender: "bot", text: "Sorry — Bloom couldn't connect. Try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Per-user-message remembered indicator: { [messageIndex]: true }
  const [rememberedFlags, setRememberedFlags] = useState({});
  const handleRemember = async (msgIndex, text) => {
    const trimmed = (text || "").trim();
    if (!trimmed || rememberedFlags[msgIndex]) return;
    try {
      // Scope=files because we're in the file-review chat; role_id stays null
      // since file review isn't role-specific.
      await createPreference({ text: trimmed, scope: "files", roleId: null });
      setRememberedFlags((p) => ({ ...p, [msgIndex]: true }));
    } catch {}
  };

  const contextName = selectedFile
    ? selectedFile.name
    : selectedStory
    ? selectedStory.title
    : activeSection
    ? activeSection.label
    : null;

  const quickPrompts = selectedFile
    ? selectedFile.type === "url"
      ? [{ label: "Analyze this link", text: `Analyze the content at ${selectedFile.url}` }]
      : [
          { label: "Tailor for role", text: `Suggest paste-ready edits to tailor ${selectedFile.name} for my target role.` },
          { label: "Top 5 weak bullets", text: `Find the 5 weakest bullets in ${selectedFile.name} and give paste-ready replacements.` },
          { label: "ATS check", text: `Check ${selectedFile.name} for ATS issues. Give specific lines to fix.` },
        ]
    : selectedStory
    ? [
        { label: "Refine", text: "Refine this story — keep the voice, tighten the language." },
        { label: "Make shorter", text: "Make this story shorter — keep the key beats only." },
        { label: "Where else can it apply?", text: "What other interview questions could this story answer?" },
      ]
    : activeSection
    ? [
        { label: "Improve this section", text: `Suggest paste-ready edits to improve my ${activeSection.label} section.` },
        { label: "Make concise", text: `Make my ${activeSection.label} more concise and impactful.` },
      ]
    : [];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-orange-50/40 via-white to-white">
      {/* Header — matches the Prep AI column header style. */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <LuSparkles size={14} className="text-gray-500" />
          <span>
            <strong className="font-bold text-gray-800">Bloom</strong>
            <span className="text-gray-400"> · Library AI</span>
          </span>
        </div>
      </div>

      {/* Selection banner — file OR story selected. Files keep the existing
          orange treatment; stories share it for consistency. */}
      {selectedFile && (
        <div className="flex items-center justify-between gap-2 px-4 py-1.5 bg-orange-50 border-b border-orange-100 text-xs text-orange-700">
          <span className="truncate flex-1 min-w-0">
            📎 Working with: <span className="font-semibold">{selectedFile.name}</span>
          </span>
        </div>
      )}
      {!selectedFile && selectedStory && (
        <div className="flex items-center justify-between gap-2 px-4 py-1.5 bg-orange-50 border-b border-orange-100 text-xs text-orange-700">
          <span className="truncate flex-1 min-w-0">
            Editing: <span className="font-semibold">{selectedStory.title}</span>
          </span>
          {onClearStory && (
            <button
              onClick={onClearStory}
              title="Deselect"
              className="text-orange-400 hover:text-orange-600 cursor-pointer flex-shrink-0"
            >
              <LuX size={12} />
            </button>
          )}
        </div>
      )}
      {activeSection && !selectedFile && !selectedStory && (
        <div className="px-5 py-2 bg-purple-50 border-b border-purple-100">
          <span className="text-xs text-purple-600">
            📝 Working with: <span className="font-medium">{activeSection.label}</span>
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 show-scrollbar">
        {messages.map((msg, i) =>
          msg.sender === "user" ? (
            <UserMessage
              key={i}
              text={msg.text}
              remembered={!!rememberedFlags[i]}
              onRemember={() => handleRemember(i, msg.text)}
              onNavigateToMe={onNavigateToMe}
            />
          ) : (
            <BotMessage key={i} text={msg.text} hideActions={msg.isGreeting} />
          )
        )}
        {loading && (
          <div className="flex items-start gap-2.5">
            <BloomAvatar size={32} />
            <div className="bg-white px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm text-gray-400 border border-gray-100 shadow-sm">
              Bloom is thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 2 && quickPrompts.length > 0 && (
        <div className="px-5 pb-2 flex flex-wrap gap-2">
          {quickPrompts.map((qp) => (
            <button
              key={qp.label}
              onClick={() => handleSend(qp.text)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:border-orange-400 hover:text-orange-500 cursor-pointer"
            >
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-5 pb-4 pt-2 flex gap-3 border-t border-gray-100 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder={contextName ? `Ask Bloom about ${contextName}…` : "Select a file or section to start…"}
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm placeholder-gray-300 bg-white focus:outline-none focus:border-orange-400"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading}
          className="px-4 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer text-sm disabled:opacity-50 font-medium"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default FileAIChat;
