import React, { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../../../services/chat";

const FileAIChat = ({ selectedFile, activeSection }) => {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi! Select a file or content section on the left and I can help you tailor, improve, or analyze your materials.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildContextData = () => {
    if (selectedFile) return `File: ${selectedFile.name} (type: ${selectedFile.file_type || "unknown"})`;
    if (activeSection) return `Content section: ${activeSection.label}`;
    return null;
  };

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
        context: "file_review",
        contextData: buildContextData(),
        history: messages,
      });
      setMessages([...updated, { sender: "bot", text: reply }]);
    } catch {
      setMessages([...updated, { sender: "bot", text: "Sorry, couldn't connect. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  const contextName = selectedFile
    ? selectedFile.name
    : activeSection
    ? activeSection.label
    : null;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-5 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-700">✨ AI Assistant</span>
      </div>

      {selectedFile && (
        <div className="px-5 py-2 bg-orange-50 border-b border-orange-100">
          <span className="text-xs text-orange-500">
            📎 Working with: <span className="font-medium">{selectedFile.name}</span>
          </span>
        </div>
      )}

      {activeSection && !selectedFile && (
        <div className="px-5 py-2 bg-purple-50 border-b border-purple-100">
          <span className="text-xs text-purple-500">
            📝 Working with: <span className="font-medium">{activeSection.label}</span>
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 show-scrollbar">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-xl text-sm ${
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

      {messages.length <= 2 && selectedFile && (
        <div className="px-5 pb-2 flex flex-wrap gap-2">
          {selectedFile.type === "url" ? (
            <button
              onClick={() => handleSend(`Analyze the content at ${selectedFile.url}`)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500 hover:border-orange-400 hover:text-orange-500 cursor-pointer"
            >
              Analyze this link
            </button>
          ) : (
            <>
              <button
                onClick={() => handleSend(`Help me tailor ${selectedFile.name} for my target role`)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500 hover:border-orange-400 hover:text-orange-500 cursor-pointer"
              >
                Tailor for role
              </button>
              <button
                onClick={() => handleSend(`Review ${selectedFile.name} and suggest improvements`)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500 hover:border-orange-400 hover:text-orange-500 cursor-pointer"
              >
                Suggest improvements
              </button>
              <button
                onClick={() => handleSend(`Check ${selectedFile.name} for formatting and grammar`)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500 hover:border-orange-400 hover:text-orange-500 cursor-pointer"
              >
                Check formatting
              </button>
            </>
          )}
        </div>
      )}

      {messages.length <= 2 && activeSection && !selectedFile && (
        <div className="px-5 pb-2 flex flex-wrap gap-2">
          <button
            onClick={() => handleSend(`Help me improve my ${activeSection.label} section`)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500 hover:border-orange-400 hover:text-orange-500 cursor-pointer"
          >
            Improve this section
          </button>
          <button
            onClick={() => handleSend(`Make my ${activeSection.label} more concise and impactful`)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500 hover:border-orange-400 hover:text-orange-500 cursor-pointer"
          >
            Make more concise
          </button>
          <button
            onClick={() => handleSend(`Tailor my ${activeSection.label} for a PM role`)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500 hover:border-orange-400 hover:text-orange-500 cursor-pointer"
          >
            Tailor for role
          </button>
        </div>
      )}

      <div className="px-5 pb-4 pt-2 flex gap-3 border-t border-gray-100">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder={contextName ? `Ask about ${contextName}...` : "Select a file or section to get started..."}
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm placeholder-gray-300 bg-white"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading}
          className="px-4 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default FileAIChat;
