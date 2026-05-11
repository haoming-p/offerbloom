import { useState, useRef, useEffect } from "react";
import { LuSparkles, LuX } from "react-icons/lu";
import { sendChatMessage } from "../../services/chat";

const FloatingChatBot = ({ roles }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi! I'm your OfferBloom assistant. What would you like to practice today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

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
        { sender: "bot", text: "Sorry, I couldn't connect. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Closed: floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-orange-400 hover:bg-orange-500 text-white shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
          title="Open AI assistant"
        >
          <LuSparkles size={24} />
        </button>
      )}

      {/* Open: chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-96 h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <LuSparkles size={16} className="text-orange-400" />
              <span className="text-sm font-semibold text-gray-800">
                AI Assistant
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              title="Close"
            >
              <LuX size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 bg-gray-50 show-scrollbar">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm ${
                    msg.sender === "user"
                      ? "bg-orange-400 text-white rounded-br-none"
                      : "bg-white text-gray-700 rounded-bl-none border border-gray-100"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-2.5 rounded-xl text-sm text-gray-400 rounded-bl-none border border-gray-100">
                  typing…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 flex gap-2 bg-white border-t border-gray-100">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask anything…"
              disabled={loading}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300 focus:outline-none focus:border-orange-300"
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="px-4 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer text-sm font-medium disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChatBot;
