import React, { useState } from "react";

// Props:
// - selectedFile: the currently selected file object (or null)
// - activeSection: the currently active content library section (or null)
const FileAIChat = ({ selectedFile, activeSection }) => {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi! Select a file or content section on the left and I can help you tailor, improve, or analyze your materials.",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { sender: "user", text: input.trim() }]);
    setInput("");
    // TODO: change for further development — send to LLM with file/section context
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  // Helper to add a suggestion as a user message
  const handleSuggestion = (text) => {
    setMessages([...messages, { sender: "user", text }]);
  };

  // Determine context label for input placeholder
  const contextName = selectedFile
    ? selectedFile.name
    : activeSection
    ? activeSection.label
    : null;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-700">✨ AI Assistant</span>
        <span className="text-xs text-gray-400 ml-2">Coming soon</span>
      </div>

      {/* File context indicator */}
      {selectedFile && (
        <div className="px-5 py-2 bg-orange-50 border-b border-orange-100">
          <span className="text-xs text-orange-500">
            📎 Working with: <span className="font-medium">{selectedFile.name}</span>
          </span>
        </div>
      )}

      {/* Section context indicator */}
      {activeSection && !selectedFile && (
        <div className="px-5 py-2 bg-purple-50 border-b border-purple-100">
          <span className="text-xs text-purple-500">
            📝 Working with: <span className="font-medium">{activeSection.label}</span>
          </span>
        </div>
      )}

      {/* Messages */}
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

        {/* AI coming soon notice */}
        <div className="text-center py-4">
          <span className="text-xs text-gray-300 bg-gray-100 px-3 py-1 rounded-full">
            🤖 AI responses coming soon — type to preview the chat flow
          </span>
        </div>
      </div>

      {/* Suggestion chips — file context */}
      {messages.length <= 2 && selectedFile && (
        <div className="px-5 pb-2 flex flex-wrap gap-2">
          {selectedFile.type === "url" ? (
            <button
              onClick={() => handleSuggestion(`Analyze the content at ${selectedFile.url}`)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500
                hover:border-orange-400 hover:text-orange-500 cursor-pointer"
            >
              Analyze this link
            </button>
          ) : (
            <>
              <button
                onClick={() => handleSuggestion(`Help me tailor ${selectedFile.name} for my target role`)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500
                  hover:border-orange-400 hover:text-orange-500 cursor-pointer"
              >
                Tailor for role
              </button>
              <button
                onClick={() => handleSuggestion(`Review ${selectedFile.name} and suggest improvements`)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500
                  hover:border-orange-400 hover:text-orange-500 cursor-pointer"
              >
                Suggest improvements
              </button>
              <button
                onClick={() => handleSuggestion(`Check ${selectedFile.name} for formatting and grammar`)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500
                  hover:border-orange-400 hover:text-orange-500 cursor-pointer"
              >
                Check formatting
              </button>
            </>
          )}
        </div>
      )}

      {/* Suggestion chips — section context */}
      {messages.length <= 2 && activeSection && !selectedFile && (
        <div className="px-5 pb-2 flex flex-wrap gap-2">
          <button
            onClick={() => handleSuggestion(`Help me improve my ${activeSection.label} section`)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500
              hover:border-orange-400 hover:text-orange-500 cursor-pointer"
          >
            Improve this section
          </button>
          <button
            onClick={() => handleSuggestion(`Make my ${activeSection.label} more concise and impactful`)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500
              hover:border-orange-400 hover:text-orange-500 cursor-pointer"
          >
            Make more concise
          </button>
          <button
            onClick={() => handleSuggestion(`Tailor my ${activeSection.label} for a PM role`)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500
              hover:border-orange-400 hover:text-orange-500 cursor-pointer"
          >
            Tailor for role
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-5 pb-4 pt-2 flex gap-3 border-t border-gray-100">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={contextName ? `Ask about ${contextName}...` : "Select a file or section to get started..."}
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm placeholder-gray-300 bg-white"
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default FileAIChat;