import React, { useState } from "react";

const ChatBot = ({ roles }) => {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi! I'm your OfferBloom assistant. What would you like to practice today?",
    },
  ]);

  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { sender: "user", text: input.trim() }]);
    setInput("");
    // TODO: change for further development — send to backend, get AI response
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    // One seamless container — no border-top, consistent background
    <div className="flex flex-col h-full bg-gray-50 rounded-xl mx-6 mb-6">
      {/* Header */}
      <div className="px-5 py-3">
        <span className="text-sm font-semibold text-gray-700">🤖 Assistant</span>
      </div>

      {/* Messages area */}
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
      </div>

      {/* Input area — part of the same container */}
      <div className="px-5 pb-4 pt-2 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm placeholder-gray-300 bg-white"
        />
        <button
          onClick={handleSend}
          className="px-5 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer text-sm font-medium"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBot;