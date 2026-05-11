import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendChatMessage } from "../../services/chat";
import bloomLogo from "../../assets/bloom.png";

const BloomAvatar = ({ size = 28 }) => (
  <img
    src={bloomLogo}
    alt="Bloom"
    style={{ width: size, height: size }}
    className="rounded-full object-cover ring-2 ring-orange-200 flex-shrink-0"
  />
);

const md = {
  p: (p) => <p className="text-sm text-gray-700 leading-relaxed my-1.5" {...p} />,
  strong: (p) => <strong className="font-semibold text-gray-900" {...p} />,
  em: (p) => <em className="italic" {...p} />,
  ul: (p) => <ul className="list-disc pl-5 my-1.5 space-y-1 text-sm text-gray-700" {...p} />,
  ol: (p) => <ol className="list-decimal pl-5 my-1.5 space-y-1 text-sm text-gray-700" {...p} />,
  li: (p) => <li className="leading-relaxed" {...p} />,
  h1: (p) => <h1 className="text-base font-bold text-gray-800 mt-2 mb-1" {...p} />,
  h2: (p) => <h2 className="text-sm font-bold text-gray-800 mt-2 mb-1" {...p} />,
  h3: (p) => <h3 className="text-sm font-semibold text-gray-700 mt-2 mb-1" {...p} />,
  hr: () => <hr className="my-2 border-gray-200" />,
  blockquote: (p) => (
    <blockquote className="border-l-4 border-orange-300 bg-orange-50/50 pl-3 py-1 my-2 text-sm" {...p} />
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
};

const ChatBot = ({ roles }) => {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text:
        "Hey, I'm **Bloom** 🐱✨ Ask me anything about interview prep — STAR structure, behavioral questions, system-design pointers, anything.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const updated = [...messages, { sender: "user", text }];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const reply = await sendChatMessage({
        message: text,
        context: "general",
        contextData: roles?.length
          ? `User is preparing for: ${roles.map((r) => r.label).join(", ")}`
          : null,
        history: messages,
      });
      setMessages([...updated, { sender: "bot", text: reply }]);
    } catch {
      setMessages([
        ...updated,
        { sender: "bot", text: "Sorry — Bloom couldn't connect. Try again." },
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

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-orange-50/40 via-white to-white rounded-xl mx-6 mb-6 border border-gray-100">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5">
        <BloomAvatar size={32} />
        <div className="leading-tight">
          <div className="text-sm font-bold text-gray-800">Bloom</div>
          <div className="text-[11px] text-gray-400">your lucky cat — interview prep</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-3 show-scrollbar">
        {messages.map((msg, i) =>
          msg.sender === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-orange-400 text-white text-sm whitespace-pre-wrap">
                {msg.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2">
              <BloomAvatar size={28} />
              <div className="max-w-[80%] bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm px-3.5 py-2.5">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          )
        )}
        {loading && (
          <div className="flex items-start gap-2">
            <BloomAvatar size={28} />
            <div className="bg-white px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm text-gray-400 border border-gray-100 shadow-sm">
              Bloom is thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-5 pb-4 pt-2 flex gap-3 border-t border-gray-100">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Bloom anything…"
          disabled={loading}
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm placeholder-gray-300 bg-white focus:outline-none focus:border-orange-400"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="px-5 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer text-sm font-medium disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBot;
