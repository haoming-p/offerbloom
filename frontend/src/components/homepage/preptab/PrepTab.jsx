import { useState, useEffect, useRef } from "react";
import PrepNavigator from "./PrepNavigator";
import PrepCategoryTabs, { ALL_CATEGORY_ID } from "./PrepCategoryTabs";
import PrepTable from "./PrepTable";
import AnswerPage from "./AnswerPage";
import PracticePage from "./PracticePage";
import { fetchQuestions, addQuestion, deleteQuestion, reorderQuestions } from "../../../services/questions";
import { addAnswer, updateAnswer, deleteAnswer } from "../../../services/answers";
import { addPractice, deletePractice } from "../../../services/practices";

// Categories match the 8 behavioral buckets seeded in Neo4j (PreloadedQuestion).
const SHARED_CATEGORIES = [
  { id: "leadership",          label: "Leadership" },
  { id: "team_collaboration",  label: "Team Collaboration" },
  { id: "conflict_resolution", label: "Conflict Resolution" },
  { id: "adaptability",        label: "Adaptability" },
  { id: "culture_fit",         label: "Culture Fit" },
  { id: "motivation",          label: "Motivation" },
  { id: "work_style",          label: "Work Style" },
  { id: "career_goals",        label: "Career Goals" },
];

const makeKey = (roleId, posKey, catId) => `${roleId}-${posKey}-${catId}`;

const PrepTab = ({ data, user, defaultRoleId, onUpdateCategories }) => {
  const { roles = [], positions = [], categories: savedCategories = {} } = data || {};
  const isDemoGuest = user?.is_demo_guest;

  // --- Active selections ---
  const [activeRoleId, setActiveRoleId] = useState(defaultRoleId || roles[0]?.id || "");
  const [activePositionKey, setActivePositionKey] = useState("general");
  const [activeCategoryId, setActiveCategoryId] = useState(ALL_CATEGORY_ID);

  const [currentView, setCurrentView] = useState("table");

  // --- Categories per role: load saved or fall back to shared seeded set.
  const [categories, setCategories] = useState(() => {
    const initial = {};
    roles.forEach((role) => {
      const saved = savedCategories[role.id];
      initial[role.id] = Array.isArray(saved) && saved.length ? saved : [...SHARED_CATEGORIES];
    });
    return initial;
  });

  // Reconcile when roles or savedCategories arrive after mount.
  useEffect(() => {
    setCategories((prev) => {
      const next = { ...prev };
      roles.forEach((role) => {
        if (!next[role.id] || next[role.id].length === 0) {
          const saved = savedCategories[role.id];
          next[role.id] = Array.isArray(saved) && saved.length ? saved : [...SHARED_CATEGORIES];
        }
      });
      return next;
    });
  }, [roles, savedCategories]);

  // Debounced persist to backend.
  const categoriesSyncTimer = useRef(null);
  const persistCategories = (next) => {
    if (!onUpdateCategories) return;
    clearTimeout(categoriesSyncTimer.current);
    categoriesSyncTimer.current = setTimeout(() => {
      onUpdateCategories(next);
    }, 500);
  };

  // --- Questions cached by composite key ---
  const [questions, setQuestions] = useState({});

  // ============================================================
  // Derived
  // ============================================================
  const roleCats = categories[activeRoleId] || [];
  const activeRole = roles.find((r) => r.id === activeRoleId);
  const activePosition =
    activePositionKey === "general"
      ? null
      : positions.find((p) => String(p.id) === activePositionKey);

  const currentKey = makeKey(activeRoleId, activePositionKey, activeCategoryId);
  const currentQuestions = questions[currentKey] || [];

  const activeQuestionId = typeof currentView === "object" ? currentView.questionId : null;
  const activeQuestion = currentQuestions.find((q) => q.id === activeQuestionId);

  // Fetch when the active selection changes
  useEffect(() => {
    if (!activeRoleId) return;
    if (questions[currentKey]) return; // already cached
    const catParam = activeCategoryId === ALL_CATEGORY_ID ? null : activeCategoryId;
    fetchQuestions(activeRoleId, catParam, activePositionKey)
      .then((data) => {
        const mapped = data.map((q) => ({
          id: q.id,
          question: q.text,
          category_id: q.category_id,
          difficulty: q.difficulty || "",
          experience: q.experience || "",
          ideal_answer: q.ideal_answer || "",
          answers: (q.answers || []).map((a) => ({ id: a.id, label: a.label, content: a.content })),
          practices: [],
        }));
        setQuestions((prev) => ({ ...prev, [currentKey]: mapped }));
      })
      .catch(() => {});
  }, [currentKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // Selection handlers
  // ============================================================
  const handleNavSelect = (roleId, positionKey) => {
    setActiveRoleId(roleId);
    setActivePositionKey(positionKey);
    setActiveCategoryId(ALL_CATEGORY_ID);
    setCurrentView("table");
  };

  const handleCategoryChange = (catId) => {
    setActiveCategoryId(catId);
    setCurrentView("table");
  };

  // --- Category management (with backend persistence) ---
  const handleAddCategory = (name) => {
    const newCat = { id: `custom-${Date.now()}`, label: name };
    setCategories((prev) => {
      const next = { ...prev, [activeRoleId]: [...(prev[activeRoleId] || []), newCat] };
      persistCategories(next);
      return next;
    });
    setActiveCategoryId(newCat.id);
    setCurrentView("table");
  };

  const handleEditCategory = (catId, newLabel) => {
    setCategories((prev) => {
      const next = {
        ...prev,
        [activeRoleId]: prev[activeRoleId].map((c) =>
          c.id === catId ? { ...c, label: newLabel } : c,
        ),
      };
      persistCategories(next);
      return next;
    });
  };

  const handleDeleteCategory = (catId) => {
    setCategories((prev) => {
      const next = {
        ...prev,
        [activeRoleId]: prev[activeRoleId].filter((c) => c.id !== catId),
      };
      persistCategories(next);
      return next;
    });
    if (activeCategoryId === catId) {
      setActiveCategoryId(ALL_CATEGORY_ID);
    }
    setCurrentView("table");
  };

  // ============================================================
  // Question CRUD
  // ============================================================
  const handleUpdateQuestions = (newList) => {
    const prevList = questions[currentKey] || [];
    setQuestions((prev) => ({ ...prev, [currentKey]: newList }));

    // Persist new order to backend when ids order changes.
    // Skip when on the "All" tab — reorder is per-category in storage.
    const newIds = newList.map((q) => String(q.id));
    const prevIds = prevList.map((q) => String(q.id));
    const orderChanged =
      newIds.length === prevIds.length && newIds.some((id, i) => id !== prevIds[i]);
    if (
      orderChanged &&
      activeRoleId &&
      activeCategoryId &&
      activeCategoryId !== ALL_CATEGORY_ID
    ) {
      reorderQuestions(activeRoleId, activeCategoryId, activePositionKey, newIds).catch(() => {});
    }
  };

  // Add a question. tagOverride is used when adding from the "All" tab where the
  // user picks an optional tag from a dropdown (null = no tag).
  const handleAddQuestion = async (text, tagOverride) => {
    if (!activeRoleId) return;
    const categoryForSave =
      activeCategoryId === ALL_CATEGORY_ID
        ? tagOverride || null
        : activeCategoryId;
    try {
      const created = await addQuestion(activeRoleId, categoryForSave, activePositionKey, text);
      const newQ = {
        id: created.id,
        question: created.text,
        category_id: created.category_id,
        answers: [],
        practices: [],
      };
      setQuestions((prev) => {
        const next = {
          ...prev,
          [currentKey]: [newQ, ...(prev[currentKey] || [])],
        };
        const prefix = `${activeRoleId}-${activePositionKey}-`;
        for (const k of Object.keys(next)) {
          if (k.startsWith(prefix) && k !== currentKey) {
            delete next[k];
          }
        }
        return next;
      });
    } catch (err) {
      console.error("Failed to add question:", err);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
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

  // --- Answer / Practice handlers ---
  const _updateQuestion = (questionId, patch) => {
    setQuestions((prev) => ({
      ...prev,
      [currentKey]: (prev[currentKey] || []).map((q) =>
        q.id === questionId ? { ...q, ...patch } : q,
      ),
    }));
  };

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
          a.id === answerId ? { ...a, label, content } : a,
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
        (a) => a.id !== answerId,
      ),
    });
  };

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
        (p) => p.id !== practiceId,
      ),
    });
  };

  const handleUpdateAnswers = (newAnswers) => {
    if (!activeQuestionId) return;
    _updateQuestion(activeQuestionId, { answers: newAnswers });
  };

  const handleUpdatePractices = (newPractices) => {
    if (!activeQuestionId) return;
    _updateQuestion(activeQuestionId, { practices: newPractices });
  };

  const handleOpenAnswerPage = (questionId) => setCurrentView({ page: "answer", questionId });
  const handleOpenPracticePage = (questionId) => setCurrentView({ page: "practice", questionId });

  // ============================================================
  // Layout
  // ============================================================
  const categoryLabelById = Object.fromEntries(roleCats.map((c) => [c.id, c.label]));
  const showCategoryTag = activeCategoryId === ALL_CATEGORY_ID;

  return (
    <div className="flex flex-col h-full">
      {/* Title bar */}
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          {isDemoGuest ? "Practice with sample questions" : "Practice questions"}
        </h1>
        <p className="text-sm text-gray-400">
          {isDemoGuest
            ? "Pick a role and category — questions cloned from the demo source are ready to explore."
            : "Pick a role on the left, then a category to start practicing."}
        </p>
      </div>

      {/* Body: navigator + content */}
      <div className="flex flex-1 min-h-0 border-t border-gray-200">
        <PrepNavigator
          roles={roles}
          positions={positions}
          activeRoleId={activeRoleId}
          activePositionKey={activePositionKey}
          onSelect={handleNavSelect}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {currentView === "table" ? (
            <>
              {/* Context badge */}
              <div className="px-6 pt-5 pb-3 flex items-center gap-2 text-sm">
                <span className="text-gray-300">Showing:</span>
                {activeRole?.emoji && <span>{activeRole.emoji}</span>}
                <span className="font-medium text-gray-700 truncate">
                  {activeRole?.label || activeRoleId}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-gray-700 truncate">
                  {activePosition ? activePosition.title : "General"}
                </span>
                {activePosition?.company && (
                  <span className="text-gray-400 truncate">@ {activePosition.company}</span>
                )}
              </div>

              {/* Category tabs */}
              <div className="px-6 pb-3">
                <PrepCategoryTabs
                  categories={roleCats}
                  activeCategoryId={activeCategoryId}
                  onCategoryChange={handleCategoryChange}
                  onAddCategory={handleAddCategory}
                  onEditCategory={handleEditCategory}
                  onDeleteCategory={handleDeleteCategory}
                />
              </div>

              <div className="border-b border-gray-200" />

              {/* Question table */}
              <div className="flex-1 overflow-y-auto show-scrollbar px-6 py-4">
                <PrepTable
                  questions={currentQuestions}
                  showCategoryTag={showCategoryTag}
                  categoryLabelById={categoryLabelById}
                  showTagPicker={activeCategoryId === ALL_CATEGORY_ID}
                  availableCategories={roleCats}
                  onUpdateQuestions={handleUpdateQuestions}
                  onAddQuestion={handleAddQuestion}
                  onDeleteQuestion={handleDeleteQuestion}
                  onAddAnswer={(questionId, label, content) => handleAddAnswer(questionId, label, content)}
                  onDeleteAnswer={(questionId, answerId) => handleDeleteAnswer(questionId, answerId)}
                  onOpenAnswerPage={handleOpenAnswerPage}
                  onOpenPracticePage={handleOpenPracticePage}
                />
              </div>
            </>
          ) : currentView?.page === "answer" && activeQuestion ? (
            <AnswerPage
              question={activeQuestion}
              questions={currentQuestions}
              roles={roles}
              positions={positions}
              onUpdateAnswers={handleUpdateAnswers}
              onAddAnswer={(label, content) => handleAddAnswer(activeQuestion.id, label, content)}
              onUpdateAnswer={(answerId, label, content) =>
                handleUpdateAnswer(activeQuestion.id, answerId, label, content)
              }
              onDeleteAnswer={(answerId) => handleDeleteAnswer(activeQuestion.id, answerId)}
              onBack={() => setCurrentView("table")}
              onNavigate={(id) => setCurrentView({ page: "answer", questionId: id })}
            />
          ) : currentView?.page === "practice" && activeQuestion ? (
            <PracticePage
              question={activeQuestion}
              questions={currentQuestions}
              onUpdatePractices={handleUpdatePractices}
              onAddPractice={(tag, duration, transcript) =>
                handleAddPractice(activeQuestion.id, tag, duration, transcript)
              }
              onDeletePractice={(practiceId) => handleDeletePractice(activeQuestion.id, practiceId)}
              onBack={() => setCurrentView("table")}
              onNavigate={(id) => setCurrentView({ page: "practice", questionId: id })}
            />
          ) : (
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
    </div>
  );
};

export default PrepTab;
