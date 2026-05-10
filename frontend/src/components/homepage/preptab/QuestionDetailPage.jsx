import { useState, useRef } from "react";
import { LuChevronLeft, LuChevronRight, LuPencil, LuPanelLeftClose, LuPanelLeftOpen, LuRotateCw, LuHistory } from "react-icons/lu";
import AnswersPanel from "./AnswersPanel";
import PracticePanel from "./PracticePanel";
import AIAssistantPanel from "./AIAssistantPanel";
import { updateQuestion as updateQuestionApi } from "../../../services/questions";

// Reusable column wrapper: header (title + optional extra actions + collapse button),
// body slot, collapsed strip. extraActions render between the title and the collapse btn.
const Column = ({ title, Icon, collapsed, onToggle, children, expandedClass = "flex-1", extraActions = null }) => {
  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="w-10 flex flex-col items-center py-3 border-r border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer flex-shrink-0"
        title={`Expand ${title}`}
      >
        <Icon size={16} className="text-gray-500" />
        <span className="text-[10px] text-gray-400 mt-2 [writing-mode:vertical-rl] tracking-wider">
          {title}
        </span>
      </button>
    );
  }
  return (
    <div className={`${expandedClass} flex flex-col min-w-0 border-r border-gray-200 last:border-r-0`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Icon size={14} className="text-gray-500" />
          {title}
        </div>
        <div className="flex items-center gap-1">
          {extraActions}
          <button
            onClick={onToggle}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
            title={`Minimize ${title}`}
          >
            <LuPanelLeftClose size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
};

const QuestionDetailPage = ({
  question,
  questions,
  onUpdateAnswers,
  onAddAnswer,
  onUpdateAnswer,
  onDeleteAnswer,
  onUpdatePractices,
  onAddPractice,
  onDeletePractice,
  onUpdateQuestionText,
  onBack,
  onNavigate,
}) => {
  const currentIndex = questions.findIndex((q) => q.id === question.id);
  const prevQuestion = currentIndex > 0 ? questions[currentIndex - 1] : null;
  const nextQuestion = currentIndex < questions.length - 1 ? questions[currentIndex + 1] : null;

  // Collapse state per column
  const [answersCollapsed, setAnswersCollapsed] = useState(false);
  const [practiceCollapsed, setPracticeCollapsed] = useState(false);
  const [aiCollapsed, setAiCollapsed] = useState(false);

  // Selection is mutually exclusive across the two columns: at most one of
  // {answer, practice} is selected at a time. The AI panel uses whichever is
  // selected to focus its replies and to decide which action buttons to show.
  // Defaults: first answer if any, no practice.
  const [selectedAnswerId, setSelectedAnswerId] = useState(
    question.answers?.[0]?.id || null
  );
  const [selectedPracticeId, setSelectedPracticeId] = useState(null);
  const selectedAnswer = question.answers?.find((a) => a.id === selectedAnswerId) || null;
  const selectedPractice = question.practices?.find((p) => p.id === selectedPracticeId) || null;

  const handleSelectAnswer = (id) => {
    setSelectedAnswerId(id);
    if (id) setSelectedPracticeId(null);
  };
  const handleSelectPractice = (id) => {
    setSelectedPracticeId(id);
    if (id) setSelectedAnswerId(null);
  };

  // Ref for AIAssistantPanel — lets the AI column header trigger refresh + history dropdown.
  const aiPanelRef = useRef(null);

  // Inline question editing
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [questionDraft, setQuestionDraft] = useState(question.question);

  const handleStartEditQuestion = () => {
    setQuestionDraft(question.question);
    setEditingQuestion(true);
  };

  const handleSaveQuestionEdit = async () => {
    const text = questionDraft.trim();
    if (!text || text === question.question) {
      setEditingQuestion(false);
      return;
    }
    try {
      await updateQuestionApi(question.id, text);
      onUpdateQuestionText?.(question.id, text);
    } catch (err) {
      alert(err.message || "Failed to update question");
    } finally {
      setEditingQuestion(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800 cursor-pointer">
          ← Back to list
        </button>

        <div className="flex-1 mx-6 min-w-0 flex items-center gap-2 justify-center">
          {editingQuestion ? (
            <input
              type="text"
              autoFocus
              value={questionDraft}
              onChange={(e) => setQuestionDraft(e.target.value)}
              onBlur={handleSaveQuestionEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveQuestionEdit();
                if (e.key === "Escape") setEditingQuestion(false);
              }}
              className="w-full max-w-2xl border border-orange-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
            />
          ) : (
            <>
              <h2 className="text-sm font-semibold text-gray-800 max-w-2xl truncate">
                {question.question}
              </h2>
              <button
                onClick={handleStartEditQuestion}
                className="p-1 text-gray-300 hover:text-gray-600 cursor-pointer"
                title="Edit question"
              >
                <LuPencil size={12} />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => prevQuestion && onNavigate(prevQuestion.id)}
            disabled={!prevQuestion}
            className={`p-1 rounded cursor-pointer ${
              prevQuestion
                ? "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                : "text-gray-300 cursor-default"
            }`}
            title="Previous question"
          >
            <LuChevronLeft size={16} />
          </button>
          <span className="text-gray-300 text-xs">
            {currentIndex + 1} / {questions.length}
          </span>
          <button
            onClick={() => nextQuestion && onNavigate(nextQuestion.id)}
            disabled={!nextQuestion}
            className={`p-1 rounded cursor-pointer ${
              nextQuestion
                ? "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                : "text-gray-300 cursor-default"
            }`}
            title="Next question"
          >
            <LuChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Three columns */}
      <div className="flex flex-1 min-h-0">
        <Column
          title={AnswersPanel.title}
          Icon={AnswersPanel.Icon}
          collapsed={answersCollapsed}
          onToggle={() => setAnswersCollapsed((v) => !v)}
        >
          <AnswersPanel
            question={question}
            selectedAnswerId={selectedAnswerId}
            onSelectAnswer={handleSelectAnswer}
            onUpdateAnswers={onUpdateAnswers}
            onAddAnswer={onAddAnswer}
            onUpdateAnswer={onUpdateAnswer}
            onDeleteAnswer={onDeleteAnswer}
          />
        </Column>

        <Column
          title={PracticePanel.title}
          Icon={PracticePanel.Icon}
          collapsed={practiceCollapsed}
          onToggle={() => setPracticeCollapsed((v) => !v)}
        >
          <PracticePanel
            question={question}
            selectedPracticeId={selectedPracticeId}
            onSelectPractice={handleSelectPractice}
            onUpdatePractices={onUpdatePractices}
            onAddPractice={onAddPractice}
            onAddAnswer={onAddAnswer}
            onDeletePractice={onDeletePractice}
          />
        </Column>

        <Column
          title={AIAssistantPanel.title}
          Icon={AIAssistantPanel.Icon}
          collapsed={aiCollapsed}
          onToggle={() => setAiCollapsed((v) => !v)}
          extraActions={
            <>
              <button
                onClick={() => aiPanelRef.current?.openHistory()}
                title="Session history"
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
              >
                <LuHistory size={13} />
              </button>
              <button
                onClick={() => aiPanelRef.current?.refresh()}
                title="Start a new session"
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
              >
                <LuRotateCw size={13} />
              </button>
            </>
          }
        >
          <AIAssistantPanel
            ref={aiPanelRef}
            question={question}
            selectedAnswer={selectedAnswer}
            selectedPractice={selectedPractice}
            onClearSelection={() => {
              setSelectedAnswerId(null);
              setSelectedPracticeId(null);
            }}
            onUpdatePractices={onUpdatePractices}
            onAddAnswer={onAddAnswer}
            onUpdateAnswer={onUpdateAnswer}
          />
        </Column>
      </div>
    </div>
  );
};

export default QuestionDetailPage;
