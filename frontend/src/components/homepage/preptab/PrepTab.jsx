import React, { useState } from "react";
import PrepHeader from "./PrepHeader";
import PrepTable from "./PrepTable";
import AnswerPage from "./AnswerPage";
import PracticePage from "./PracticePage";

// ============================================================
// DEFAULT QUESTIONS — easy to replace with backend data later
// TODO: change for further development — load from backend/QuestionBank
// ============================================================
const DEFAULT_QUESTIONS = {
  "pm-bq": [
    "How do you prioritize?",
    "How do you align stakeholders?",
    "A case to deal with conflicts?",
    "How to hold accountability",
    "Tell me the most complicated project you managed",
  ],
  "pm-product_sense": [
    "How would you improve a product you use daily?",
    "Define success metrics for a new feature",
    "Walk me through a product launch strategy",
    "How do you make trade-offs between user needs and business goals?",
    "Describe a data-driven product decision you made",
  ],
  "pm-general": [
    "Why product management?",
    "Tell me about yourself",
    "What's your biggest strength and weakness?",
    "Where do you see yourself in 5 years?",
    "Why should we hire you?",
  ],
  "sde-bq": [
    "Tell me about a challenging technical project",
    "Describe a time you disagreed with a teammate's approach",
    "How do you handle tight deadlines?",
    "Tell me about a time you mentored someone",
    "Describe a time you had to learn something quickly",
  ],
  "sde-algorithm": [
    "How would you find the longest substring without repeating characters?",
    "Implement a LRU cache",
    "Merge k sorted linked lists",
    "Find the shortest path in a weighted graph",
    "Design an algorithm for task scheduling with dependencies",
  ],
  "sde-system_design": [
    "Design a URL shortener",
    "Design a chat messaging system",
    "Design a news feed",
    "Design a rate limiter",
    "Design a notification system",
  ],
  "sde-general": [
    "Why software engineering?",
    "Tell me about yourself",
    "What's your preferred tech stack and why?",
    "How do you stay current with new technologies?",
    "Describe your debugging process",
  ],
};

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

// Each question now has both answers and practices arrays
const makeQuestions = (strings) =>
  strings.map((q, i) => ({
    id: `${Date.now()}-${i}-${Math.random()}`,
    question: q,
    answers: [],
    practices: [],
  }));

const makeKey = (roleId, posKey, catId) => `${roleId}-${posKey}-${catId}`;

const PrepTab = ({ data }) => {
  const { roles = [], positions = [] } = data || {};

  // --- Active selections ---
  const [activeRoleId, setActiveRoleId] = useState(roles[0]?.id || "");
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
  const [questions, setQuestions] = useState(() => {
    const initial = {};
    roles.forEach((role) => {
      const cats = DEFAULT_CATEGORIES[role.id] || [];
      cats.forEach((cat) => {
        const key = makeKey(role.id, "general", cat.id);
        const defaults = DEFAULT_QUESTIONS[`${role.id}-${cat.id}`];
        if (defaults) {
          initial[key] = makeQuestions(defaults);
        }
      });
    });
    return initial;
  });

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

  // --- Question list updates ---
  const handleUpdateQuestions = (newList) => {
    if (!currentKey) return;
    setQuestions((prev) => ({ ...prev, [currentKey]: newList }));
  };

  // --- Answer page: update answers for a specific question ---
  const handleUpdateAnswers = (newAnswers) => {
    if (!currentKey || !activeQuestionId) return;
    setQuestions((prev) => ({
      ...prev,
      [currentKey]: prev[currentKey].map((q) =>
        q.id === activeQuestionId ? { ...q, answers: newAnswers } : q
      ),
    }));
  };

  // --- Practice page: update practices for a specific question ---
  const handleUpdatePractices = (newPractices) => {
    if (!currentKey || !activeQuestionId) return;
    setQuestions((prev) => ({
      ...prev,
      [currentKey]: prev[currentKey].map((q) =>
        q.id === activeQuestionId ? { ...q, practices: newPractices } : q
      ),
    }));
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
            onBack={() => setCurrentView("table")}
            onNavigate={(id) => setCurrentView({ page: "answer", questionId: id })}
          />
        ) : currentView?.page === "practice" && activeQuestion ? (
          // Practice page
          <PracticePage
            question={activeQuestion}
            questions={currentQuestions}
            onUpdatePractices={handleUpdatePractices}
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