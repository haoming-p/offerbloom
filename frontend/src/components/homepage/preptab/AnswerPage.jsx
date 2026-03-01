import React, { useState } from "react";

// Props:
// - question: current question object { id, question, answers }
// - questions: all questions in current category (for prev/next)
// - roles: role objects from onboarding
// - positions: position objects from onboarding
// - onUpdateAnswers: function to save updated answers for this question
// - onBack: return to table view
// - onNavigate: switch to a different question by id
const AnswerPage = ({ question, questions, roles, positions, onUpdateAnswers, onBack, onNavigate }) => {

  // --- Answer card expand/collapse ---
  // Tracks which answer card is expanded (by answer id), null = all collapsed
  const [expandedId, setExpandedId] = useState(
    question.answers.length > 0 ? question.answers[0].id : null
  );

  // --- Editing state ---
  // Which answer is currently being edited inline
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editLabel, setEditLabel] = useState("");

  // --- Add answer form ---
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newContent, setNewContent] = useState("");

  // --- AI Chat state ---
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "bot",
      text: "I can help draft an answer based on your resume and the job description. What would you like to focus on?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  // --- Prev/Next navigation ---
  const currentIndex = questions.findIndex((q) => q.id === question.id);
  const prevQuestion = currentIndex > 0 ? questions[currentIndex - 1] : null;
  const nextQuestion = currentIndex < questions.length - 1 ? questions[currentIndex + 1] : null;

  // ============================================================
  // Answer management handlers
  // ============================================================

  const handleToggleExpand = (answerId) => {
    setExpandedId(expandedId === answerId ? null : answerId);
    // Cancel any editing when collapsing
    if (editingId === answerId) {
      setEditingId(null);
    }
  };

  const handleStartEdit = (answer) => {
    setEditingId(answer.id);
    setEditLabel(answer.label);
    setEditContent(answer.content);
    setExpandedId(answer.id); // make sure it's expanded
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    onUpdateAnswers(
      question.answers.map((a) =>
        a.id === editingId
          ? { ...a, label: editLabel.trim() || a.label, content: editContent.trim() }
          : a
      )
    );
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
    setEditLabel("");
  };

  const handleDeleteAnswer = (answerId) => {
    onUpdateAnswers(question.answers.filter((a) => a.id !== answerId));
    if (expandedId === answerId) setExpandedId(null);
    if (editingId === answerId) setEditingId(null);
  };

  const handleAddAnswer = () => {
    if (!newContent.trim()) return;
    const newAnswer = {
      id: `${Date.now()}-${Math.random()}`,
      label: newLabel.trim() || `Version ${question.answers.length + 1}`,
      content: newContent.trim(),
    };
    onUpdateAnswers([...question.answers, newAnswer]);
    setNewLabel("");
    setNewContent("");
    setShowAddForm(false);
    setExpandedId(newAnswer.id); // expand the newly added one
  };

  // ============================================================
  // AI Chat handlers
  // ============================================================

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    setChatMessages([...chatMessages, { sender: "user", text: chatInput.trim() }]);
    setChatInput("");
    // TODO: change for further development — send to LLM, get real response
  };

  const handleChatKeyDown = (e) => {
    if (e.key === "Enter") handleChatSend();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top navigation bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        {/* Left: Back to list */}
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-800 cursor-pointer"
        >
          ← Back to list
        </button>

        {/* Center: Question title */}
        <h2 className="text-sm font-semibold text-gray-800 max-w-md truncate">
          {question.question}
        </h2>

        {/* Right: Prev / Next */}
        <div className="flex gap-3">
          <button
            onClick={() => prevQuestion && onNavigate(prevQuestion.id)}
            className={`text-sm cursor-pointer ${
              prevQuestion
                ? "text-gray-500 hover:text-gray-800"
                : "text-gray-300 cursor-default"
            }`}
            disabled={!prevQuestion}
          >
            ← Prev
          </button>
          <span className="text-gray-300 text-sm">
            {currentIndex + 1} / {questions.length}
          </span>
          <button
            onClick={() => nextQuestion && onNavigate(nextQuestion.id)}
            className={`text-sm cursor-pointer ${
              nextQuestion
                ? "text-gray-500 hover:text-gray-800"
                : "text-gray-300 cursor-default"
            }`}
            disabled={!nextQuestion}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Main content: Left/Right split */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Saved Answers */}
        <div className="flex-1 overflow-y-auto show-scrollbar p-6 border-r border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Saved Answers ({question.answers.length})
          </h3>

          {/* Answer cards */}
          <div className="flex flex-col gap-3 mb-4">
            {question.answers.map((answer) => (
              <div
                key={answer.id}
                className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Card header — always visible, click to expand/collapse */}
                <div
                  onClick={() => handleToggleExpand(answer.id)}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {expandedId === answer.id ? "▾" : "▸"}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {answer.label}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStartEdit(answer); }}
                      className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                    >
                      ✎ Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteAnswer(answer.id); }}
                      className="text-gray-400 hover:text-red-400 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Card body — expanded content or edit form */}
                {expandedId === answer.id && (
                  <div className="px-4 pb-4">
                    {editingId === answer.id ? (
                      // Edit mode
                      <div className="flex flex-col gap-3">
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          placeholder="Version label"
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        />
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={6}
                          autoFocus
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleCancelEdit}
                            className="px-4 py-1.5 text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="px-4 py-1.5 bg-orange-400 text-white rounded-lg hover:bg-orange-500 text-sm cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {answer.content}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add new answer */}
          {showAddForm ? (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="flex gap-3 mb-3">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder={`Version ${question.answers.length + 1}`}
                  className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300"
                />
                <span className="text-xs text-gray-300 self-center">Optional label</span>
              </div>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write or paste your answer..."
                rows={5}
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300 resize-none mb-3"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowAddForm(false); setNewLabel(""); setNewContent(""); }}
                  className="px-4 py-1.5 text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAnswer}
                  className="px-4 py-1.5 bg-orange-400 text-white rounded-lg hover:bg-orange-500 text-sm cursor-pointer"
                >
                  Add Answer
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-2.5 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400
                hover:border-gray-300 hover:text-gray-500 cursor-pointer"
            >
              + Add new answer
            </button>
          )}

          {/* Empty state */}
          {question.answers.length === 0 && !showAddForm && (
            <p className="text-gray-300 text-sm text-center mt-4">
              No answers yet — add one manually or use AI Draft on the right
            </p>
          )}
        </div>

        {/* Right: AI Chat */}
        <div className="w-96 flex flex-col bg-gray-50 flex-shrink-0">
          {/* Chat header */}
          <div className="px-5 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">✨ AI Draft</span>
            <span className="text-xs text-gray-400 ml-2">Coming soon</span>
          </div>

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

            {/* AI coming soon notice */}
            <div className="text-center py-4">
              <span className="text-xs text-gray-300 bg-gray-100 px-3 py-1 rounded-full">
                🤖 AI responses coming soon — type to preview the chat flow
              </span>
            </div>
          </div>

          {/* Input */}
          <div className="px-5 pb-4 pt-2 flex gap-3 border-t border-gray-100">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="Ask AI to draft an answer..."
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm placeholder-gray-300 bg-white"
            />
            <button
              onClick={handleChatSend}
              className="px-4 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer text-sm"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnswerPage;