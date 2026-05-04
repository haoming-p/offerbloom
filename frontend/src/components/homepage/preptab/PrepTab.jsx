import React, { useState, useEffect } from "react";
import PrepHeader from "./PrepHeader";
import PrepTable from "./PrepTable";
import AnswerPage from "./AnswerPage";
import PracticePage from "./PracticePage";
import { fetchQuestions, addQuestion, deleteQuestion } from "../../../services/questions";
import { addAnswer, updateAnswer, deleteAnswer } from "../../../services/answers";
import { addPractice, deletePractice } from "../../../services/practices";

const DEFAULT_CATEGORIES = {
  pm: [
    { id: "bq", label: "BQ" },
    { id: "product_sense", label: "Product Sense" },
    { id: "general", label: "General" },
  ],
  sde: [
    { id: "bq", label: "BQ" },
    { id: "algorithm", label: "Algorithm" },
    { id: "system_design", label: "System Design" },
    { id: "general", label: "General" },
  ],
};

const makeKey = (roleId, posKey, catId) => `${roleId}-${posKey}-${catId}`;

const PrepTab = ({ data, defaultRoleId }) => {
  const { roles = [], positions = [] } = data || {};

  // --- Active selections ---
  const [activeRoleId, setActiveRoleId] = useState(defaultRoleId || roles[0]?.id || "");
  const [activePositionKey, setActivePositionKey] = useState("general");
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  // --- View routing ---
  // "table" | { page: "answer", questionId } | { page: "practice", questionId }
  const [currentView, setCurrentView] = useState("table");

  // --- Categories per role ---
  const [categories, setCategories] = useState(() => {
    const initial = {};
    roles.forEach((role) => {
      initial[role.id] = DEFAULT_CATEGORIES[role.id] || [];
    });
    return initial;
  });

  // --- Questions stored by composite key ---
  const [questions, setQuestions] = useState({});

  // ============================================================
  // Derived values
  // ============================================================
  const roleCats = categories[activeRoleId] || [];

  const effectiveCatId =
    activeCategoryId && roleCats.some((c) => c.id === activeCategoryId)
      ? activeCategoryId
      : roleCats[0]?.id || null;

  const currentKey = effectiveCatId
    ? makeKey(activeRoleId, activePositionKey, effectiveCatId)
    : null;
  const currentQuestions = currentKey ? questions[currentKey] || [] : [];

  // For answer/practice pages — find the active question
  const activeQuestionId =
    typeof currentView === "object" ? currentView.questionId : null;
  const activeQuestion = currentQuestions.find((q) => q.id === activeQuestionId);

  // Fetch questions from backend whenever the active role/category/position changes
  useEffect(() => {
    if (!activeRoleId || !effectiveCatId) return;
    // Only fetch if not already loaded
    if (questions[currentKey]) return;
    fetchQuestions(activeRoleId, effectiveCatId, activePositionKey)
      .then((data) => {
        const mapped = data.map((q) => ({
          id: q.id,
          question: q.text,
          answers: (q.answers || []).map((a) => ({ id: a.id, label: a.label, content: a.content })),
          practices: [],
        }));
        setQuestions((prev) => ({ ...prev, [currentKey]: mapped }));
      })
      .catch(() => {});
  }, [currentKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // Tab change handlers — reset view to table when switching
  // ============================================================

  const handleRoleChange = (roleId) => {
    setActiveRoleId(roleId);
    setActivePositionKey("general");
    setActiveCategoryId(null);
    setCurrentView("table");
  };

  const handlePositionChange = (posKey) => {
    setActivePositionKey(posKey);
    setActiveCategoryId(null);
    setCurrentView("table");
  };

  const handleCategoryChange = (catId) => {
    setActiveCategoryId(catId);
    setCurrentView("table");
  };

  // --- Category management ---
  const handleAddCategory = (name) => {
    const newCat = { id: `custom-${Date.now()}`, label: name };
    setCategories((prev) => ({
      ...prev,
      [activeRoleId]: [...(prev[activeRoleId] || []), newCat],
    }));
    setActiveCategoryId(newCat.id);
    setCurrentView("table");
  };

  const handleEditCategory = (catId, newLabel) => {
    setCategories((prev) => ({
      ...prev,
      [activeRoleId]: prev[activeRoleId].map((c) =>
        c.id === catId ? { ...c, label: newLabel } : c
      ),
    }));
  };

  const handleDeleteCategory = (catId) => {
    setCategories((prev) => ({
      ...prev,
      [activeRoleId]: prev[activeRoleId].filter((c) => c.id !== catId),
    }));
    if (effectiveCatId === catId) {
      setActiveCategoryId(null);
    }
    setCurrentView("table");
  };

  // --- Question list updates (used for reorder and answer saves — local only) ---
  const handleUpdateQuestions = (newList) => {
    if (!currentKey) return;
    setQuestions((prev) => ({ ...prev, [currentKey]: newList }));
  };

  // --- Add question — persists to backend ---
  const handleAddQuestion = async (text) => {
    if (!currentKey || !activeRoleId || !effectiveCatId) return;
    try {
      const created = await addQuestion(activeRoleId, effectiveCatId, activePositionKey, text);
      const newQ = { id: created.id, question: created.text, answers: [], practices: [] };
      setQuestions((prev) => ({
        ...prev,
        [currentKey]: [newQ, ...(prev[currentKey] || [])],
      }));
    } catch (err) {
      console.error("Failed to add question:", err);
    }
  };

  // --- Delete question — persists to backend ---
  const handleDeleteQuestion = async (questionId) => {
    if (!currentKey) return;
    try {
      await deleteQuestion(questionId);
    } catch (err) {
      console.error("Failed to delete question:", err);
    }
    setQuestions((prev) => ({
      ...prev,
      [currentKey]: (prev[currentKey] || []).filter((q) => q.id !== questionId),
    }));
    if (activeQuestionId === questionId) setCurrentView("table");
  };

  // --- Helper to update a single question's field in state ---
  const _updateQuestion = (questionId, patch) => {
    if (!currentKey) return;
    setQuestions((prev) => ({
      ...prev,
      [currentKey]: (prev[currentKey] || []).map((q) =>
        q.id === questionId ? { ...q, ...patch } : q
      ),
    }));
  };

  // --- Answer handlers (backend + local state) ---
  const handleAddAnswer = async (questionId, label, content) => {
    try {
      const created = await addAnswer(questionId, label, content);
      _updateQuestion(questionId, {
        answers: [...(currentQuestions.find((q) => q.id === questionId)?.answers || []), created],
      });
    } catch (err) {
      console.error("Failed to add answer:", err);
    }
  };

  const handleUpdateAnswer = async (questionId, answerId, label, content) => {
    try {
      await updateAnswer(answerId, label, content);
      _updateQuestion(questionId, {
        answers: (currentQuestions.find((q) => q.id === questionId)?.answers || []).map((a) =>
          a.id === answerId ? { ...a, label, content } : a
        ),
      });
    } catch (err) {
      console.error("Failed to update answer:", err);
    }
  };

  const handleDeleteAnswer = async (questionId, answerId) => {
    try {
      await deleteAnswer(answerId);
    } catch (err) {
      console.error("Failed to delete answer:", err);
    }
    _updateQuestion(questionId, {
      answers: (currentQuestions.find((q) => q.id === questionId)?.answers || []).filter(
        (a) => a.id !== answerId
      ),
    });
  };

  // --- Practice handlers (backend + local state) ---
  const handleAddPractice = async (questionId, tag, duration, transcript) => {
    try {
      const created = await addPractice(questionId, tag, duration, transcript);
      const practice = {
        id: created.id,
        tag: created.tag,
        duration: created.duration,
        transcript: created.transcript,
        aiFeedback: null,
        createdAt: created.created_at,
      };
      _updateQuestion(questionId, {
        practices: [practice, ...(currentQuestions.find((q) => q.id === questionId)?.practices || [])],
      });
      return practice;
    } catch (err) {
      console.error("Failed to save practice:", err);
      return null;
    }
  };

  const handleDeletePractice = async (questionId, practiceId) => {
    try {
      await deletePractice(practiceId);
    } catch (err) {
      console.error("Failed to delete practice:", err);
    }
    _updateQuestion(questionId, {
      practices: (currentQuestions.find((q) => q.id === questionId)?.practices || []).filter(
        (p) => p.id !== practiceId
      ),
    });
  };

  // --- Legacy: local-only updates used by answer/practice pages for non-persisted changes ---
  const handleUpdateAnswers = (newAnswers) => {
    if (!currentKey || !activeQuestionId) return;
    _updateQuestion(activeQuestionId, { answers: newAnswers });
  };

  const handleUpdatePractices = (newPractices) => {
    if (!currentKey || !activeQuestionId) return;
    _updateQuestion(activeQuestionId, { practices: newPractices });
  };

  // --- Navigation ---
  const handleOpenAnswerPage = (questionId) => {
    setCurrentView({ page: "answer", questionId });
  };

  const handleOpenPracticePage = (questionId) => {
    setCurrentView({ page: "practice", questionId });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Shared tab header — always visible */}
      <PrepHeader
        roles={roles}
        positions={positions}
        activeRoleId={activeRoleId}
        activePositionKey={activePositionKey}
        categories={categories}
        activeCategoryId={activeCategoryId}
        effectiveCatId={effectiveCatId}
        onRoleChange={handleRoleChange}
        onPositionChange={handlePositionChange}
        onCategoryChange={handleCategoryChange}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Content area — switches between table, answer page, practice page */}
      <div className="flex-1 min-h-0">
        {currentView === "table" ? (
          // Table view
          <div className="h-full overflow-y-auto show-scrollbar px-6 py-4">
            {effectiveCatId ? (
              <PrepTable
                questions={currentQuestions}
                onUpdateQuestions={handleUpdateQuestions}
                onAddQuestion={handleAddQuestion}
                onDeleteQuestion={handleDeleteQuestion}
                onAddAnswer={(questionId, label, content) => handleAddAnswer(questionId, label, content)}
                onDeleteAnswer={(questionId, answerId) => handleDeleteAnswer(questionId, answerId)}
                onOpenAnswerPage={handleOpenAnswerPage}
                onOpenPracticePage={handleOpenPracticePage}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-300">
                <span className="text-lg mb-2">No categories yet</span>
                <span className="text-sm">Click "+" to add your first category</span>
              </div>
            )}
          </div>
        ) : currentView?.page === "answer" && activeQuestion ? (
          // Answer page
          <AnswerPage
            question={activeQuestion}
            questions={currentQuestions}
            roles={roles}
            positions={positions}
            onUpdateAnswers={handleUpdateAnswers}
            onAddAnswer={(label, content) => handleAddAnswer(activeQuestion.id, label, content)}
            onUpdateAnswer={(answerId, label, content) => handleUpdateAnswer(activeQuestion.id, answerId, label, content)}
            onDeleteAnswer={(answerId) => handleDeleteAnswer(activeQuestion.id, answerId)}
            onBack={() => setCurrentView("table")}
            onNavigate={(id) => setCurrentView({ page: "answer", questionId: id })}
          />
        ) : currentView?.page === "practice" && activeQuestion ? (
          // Practice page
          <PracticePage
            question={activeQuestion}
            questions={currentQuestions}
            onUpdatePractices={handleUpdatePractices}
            onAddPractice={(tag, duration, transcript) => handleAddPractice(activeQuestion.id, tag, duration, transcript)}
            onDeletePractice={(practiceId) => handleDeletePractice(activeQuestion.id, practiceId)}
            onBack={() => setCurrentView("table")}
            onNavigate={(id) => setCurrentView({ page: "practice", questionId: id })}
          />
        ) : (
          // Fallback — question not found
          <div className="flex flex-col items-center justify-center h-48 text-gray-300">
            <span className="text-lg mb-2">Question not found</span>
            <button
              onClick={() => setCurrentView("table")}
              className="text-orange-400 hover:text-orange-500 text-sm cursor-pointer"
            >
              ← Back to list
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrepTab;