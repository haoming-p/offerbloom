import { useState, useRef, useEffect } from "react";
import { LuSparkles } from "react-icons/lu";
import { sendChatMessage } from "../../../services/chat";

const AIAssistantPanel = ({ question }) => {
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "bot",
      text: "I can help draft an answer based on your resume and the job description. What would you like to focus on?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleChatSend = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const updated = [...chatMessages, { sender: "user", text }];
    setChatMessages(updated);
    setChatInput("");
    setChatLoading(true);
    try {
      const reply = await sendChatMessage({
        message: text,
        context: "answer_draft",
        contextData: `Interview question: "${question?.question || ""}"`,
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
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 show-scrollbar">
        {chatMessages.map((msg, i) => (
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
