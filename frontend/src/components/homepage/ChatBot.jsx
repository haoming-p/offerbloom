import React, { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../../services/chat";

const ChatBot = ({ roles }) => {
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
        contextData: roles?.length ? `User is preparing for: ${roles.map((r) => r.label).join(", ")}` : null,
        history: messages,
      });
      setMessages([...updated, { sender: "bot", text: reply }]);
    } catch {
      setMessages([...updated, { sender: "bot", text: "Sorry, I couldn't connect. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-xl mx-6 mb-6">
      <div className="px-5 py-3">
        <span className="text-sm font-semibold text-gray-700">🤖 Assistant</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-3 show-scrollbar">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] px-4 py-2.5 rounded-xl text-sm ${
                msg.sender === "user"
                  ? "bg-orange-400 text-white rounded-br-none"
                  : "bg-white text-gray-700 rounded-bl-none"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-2.5 rounded-xl text-sm text-gray-400 rounded-bl-none">
              typing…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-5 pb-4 pt-2 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={loading}
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm placeholder-gray-300 bg-white"
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
