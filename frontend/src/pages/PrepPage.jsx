import { useState, useEffect, useRef } from "react";
import PrepNavigator from "../components/preppage/PrepNavigator";
import PrepCategoryTabs, { ALL_CATEGORY_ID } from "../components/preppage/PrepCategoryTabs";
import PrepTable from "../components/preppage/PrepTable";
import QuestionDetailPage from "../components/preppage/QuestionDetailPage";
import PreloadPicker from "../components/preppage/PreloadPicker";
import { fetchQuestions, addQuestion, deleteQuestion, updateQuestion, reorderQuestions } from "../services/questions";
import { fetchPublicCategories } from "../services/publicMeta";
import { addAnswer, updateAnswer, deleteAnswer } from "../services/answers";
import { addPractice, deletePractice } from "../services/practices";

// Per-role default categories. Users can edit/add/delete from these defaults
// in the UI; their saved list (in data.categories) wins on subsequent loads.
// Roles not in this lookup get no defaults — user can build their own list.
const DEFAULT_CATEGORIES_BY_ROLE = {
  pm: [
    { id: "bq",            label: "BQ" },
    { id: "product_sense", label: "Product Sense" },
    { id: "general",       label: "General" },
  ],
  sde: [
    { id: "bq",            label: "BQ" },
    { id: "algorithm",     label: "Algorithm" },
    { id: "system_design", label: "System Design" },
    { id: "frontend",      label: "Frontend" },
  ],
  pjm: [
    { id: "bq",            label: "BQ" },
  ],
  ds: [
    { id: "ml_theory",     label: "ML Theory" },
    { id: "nlp",           label: "NLP" },
  ],
};

// Per-role defaults win; otherwise fall back to the public category pool
// (Kaggle tag set: adaptability, leadership, …). Empty array only if neither.
const defaultsForRole = (roleId, publicCategories = []) =>
  DEFAULT_CATEGORIES_BY_ROLE[roleId] || publicCategories || [];

const makeKey = (roleId, posKey, catId) => `${roleId}-${posKey}-${catId}`;

// Session-persisted nav state. sessionStorage (not localStorage) so refresh
// keeps the user in place but closing the tab returns to defaults next time.
const STORAGE_KEY = "preptab.view";
const readSavedView = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeSavedView = (state) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
};

const PrepPage = ({ data, user, defaultRoleId, onUpdateCategories, onNavigateToMe }) => {
  const { roles = [], positions = [], categories: savedCategories = {} } = data || {};
  const isDemoGuest = user?.is_demo_guest;

  // Restore saved nav state on mount so a browser refresh keeps the user on
  // the same question detail page (or the same role/position/category tab).
  // Sanity-fall back to the default if a saved role no longer exists.
  const savedView = readSavedView();
  const savedRoleExists =
    savedView?.activeRoleId && roles.some((r) => r.id === savedView.activeRoleId);

  // --- Active selections ---
  const [activeRoleId, setActiveRoleId] = useState(
    (savedRoleExists ? savedView.activeRoleId : null) || defaultRoleId || roles[0]?.id || ""
  );
  const [activePositionKey, setActivePositionKey] = useState(savedView?.activePositionKey || "general");
  const [activeCategoryId, setActiveCategoryId] = useState(savedView?.activeCategoryId || ALL_CATEGORY_ID);

  // --- View routing: "table" | { page: "detail", questionId }
  const [currentView, setCurrentView] = useState(savedView?.currentView || "table");

  // Tracks which (role-position-category) keys have completed a fetch attempt.
  // Used to distinguish "still loading" from "loaded but question not found"
  // so refreshing on a detail page shows a loader instead of an error flash.
  const [loadedKeys, setLoadedKeys] = useState(() => new Set());

  // --- Roles & Positions sidebar collapse ---
  const [navCollapsed, setNavCollapsed] = useState(false);

  // --- Preload picker modal ---
  const [showPreloadPicker, setShowPreloadPicker] = useState(false);

  // --- Categories per role: load saved or fall back to shared seeded set.
  const [categories, setCategories] = useState(() => {
    const initial = {};
    roles.forEach((role) => {
      const saved = savedCategories[role.id];
      initial[role.id] = Array.isArray(saved) && saved.length ? saved : defaultsForRole(role.id);
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
          next[role.id] = Array.isArray(saved) && saved.length ? saved : defaultsForRole(role.id);
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

  // --- Public category pool (Kaggle tags) — used as fallback when a role
  // has no entry in DEFAULT_CATEGORIES_BY_ROLE. Lets ux/ds/devops/etc.
  // show the standard tag chips out of the box.
  const [publicCategories, setPublicCategories] = useState([]);
  useEffect(() => {
    let cancelled = false;
    fetchPublicCategories()
      .then((cats) => { if (!cancelled) setPublicCategories(cats); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // When publicCategories arrive, backfill any role that's still on an empty
  // default list (no saved, no hardcoded). Roles already populated stay.
  useEffect(() => {
    if (!publicCategories.length) return;
    setCategories((prev) => {
      const next = { ...prev };
      let changed = false;
      roles.forEach((role) => {
        if (DEFAULT_CATEGORIES_BY_ROLE[role.id]) return;
        const saved = savedCategories[role.id];
        if (Array.isArray(saved) && saved.length) return;
        if (!next[role.id] || next[role.id].length === 0) {
          next[role.id] = publicCategories;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [publicCategories, roles, savedCategories]);

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
    if (questions[currentKey]) {
      // Already cached — count it as "loaded" so the detail-view loader
      // doesn't hang on a key that was hydrated by a previous fetch.
      setLoadedKeys((prev) => (prev.has(currentKey) ? prev : new Set(prev).add(currentKey)));
      return;
    }
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
          practices: (q.practices || []).map((p) => ({
            id: p.id,
            tag: p.tag,
            duration: p.duration,
            transcript: p.transcript,
            aiFeedback: p.ai_feedback,
            createdAt: p.created_at,
          })),
        }));
        setQuestions((prev) => ({ ...prev, [currentKey]: mapped }));
      })
      .catch(() => {})
      .finally(() => {
        setLoadedKeys((prev) => (prev.has(currentKey) ? prev : new Set(prev).add(currentKey)));
      });
  }, [currentKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist nav state to sessionStorage on every change so a refresh restores it.
  useEffect(() => {
    writeSavedView({ activeRoleId, activePositionKey, activeCategoryId, currentView });
  }, [activeRoleId, activePositionKey, activeCategoryId, currentView]);

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

  const handleOpenDetail = (questionId) => setCurrentView({ page: "detail", questionId });

  // After preload picker copies questions: invalidate caches for the target
  // (role, position) so a fresh fetch hydrates the new rows, then navigate
  // there if the user picked a different position.
  const handlePreloadCopied = (created) => {
    if (!created || created.length === 0) return;
    const targetPos = created[0].position_key || "general";
    setQuestions((prev) => {
      const next = { ...prev };
      const prefix = `${activeRoleId}-${targetPos}-`;
      for (const k of Object.keys(next)) {
        if (k.startsWith(prefix)) delete next[k];
      }
      return next;
    });
    setLoadedKeys((prev) => {
      const next = new Set(prev);
      const prefix = `${activeRoleId}-${targetPos}-`;
      for (const k of Array.from(next)) {
        if (k.startsWith(prefix)) next.delete(k);
      }
      return next;
    });
    if (targetPos !== activePositionKey) {
      setActivePositionKey(targetPos);
    }
    setActiveCategoryId(ALL_CATEGORY_ID);
    setCurrentView("table");
  };

  // Inline question text update — backend persisted by QuestionDetailPage; we just patch local cache.
  const handleUpdateQuestionText = (questionId, newText) => {
    setQuestions((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        next[key] = (next[key] || []).map((q) =>
          q.id === questionId ? { ...q, question: newText } : q
        );
      });
      return next;
    });
  };

  // Used by inline question edit in PrepTable (no extra UI in QuestionDetailPage to handle errors)
  const handleSaveQuestionEdit = async (questionId, newText) => {
    try {
      await updateQuestion(questionId, newText);
      handleUpdateQuestionText(questionId, newText);
    } catch (err) {
      alert(err.message || "Failed to update question");
    }
  };

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
            ? "Your updates clear in 24h. Save to account to keep them."
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
          collapsed={navCollapsed}
          onToggleCollapse={() => setNavCollapsed((v) => !v)}
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
                  onUpdateQuestionText={handleSaveQuestionEdit}
                  onOpenDetail={handleOpenDetail}
                  onOpenPreloadPicker={activeRoleId ? () => setShowPreloadPicker(true) : undefined}
                />
              </div>
            </>
          ) : currentView?.page === "detail" && activeQuestion ? (
            <QuestionDetailPage
              question={activeQuestion}
              questions={currentQuestions}
              roleId={activeRoleId}
              onUpdateAnswers={handleUpdateAnswers}
              onAddAnswer={(label, content) => handleAddAnswer(activeQuestion.id, label, content)}
              onUpdateAnswer={(answerId, label, content) =>
                handleUpdateAnswer(activeQuestion.id, answerId, label, content)
              }
              onDeleteAnswer={(answerId) => handleDeleteAnswer(activeQuestion.id, answerId)}
              onUpdatePractices={handleUpdatePractices}
              onAddPractice={(tag, duration, transcript) =>
                handleAddPractice(activeQuestion.id, tag, duration, transcript)
              }
              onDeletePractice={(practiceId) => handleDeletePractice(activeQuestion.id, practiceId)}
              onUpdateQuestionText={handleUpdateQuestionText}
              onBack={() => setCurrentView("table")}
              onNavigate={(id) => setCurrentView({ page: "detail", questionId: id })}
              onNavigateToMe={onNavigateToMe}
            />
          ) : currentView?.page === "detail" && !loadedKeys.has(currentKey) ? (
            // Detail view requested but the question list for this category
            // hasn't finished loading yet. Show a quiet loader instead of
            // briefly flashing "Question not found" right after a refresh.
            <div className="flex items-center justify-center h-48 text-sm text-gray-300">
              Loading…
            </div>
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

      {showPreloadPicker && activeRoleId && (
        <PreloadPicker
          roleId={activeRoleId}
          roleLabel={activeRole?.label}
          positions={positions.filter((p) => p.role === activeRoleId)}
          defaultPositionKey={activePositionKey}
          categories={roleCats}
          initialCategoryId={activeCategoryId === ALL_CATEGORY_ID ? null : activeCategoryId}
          onClose={() => setShowPreloadPicker(false)}
          onCopied={handlePreloadCopied}
        />
      )}
    </div>
  );
};

export default PrepPage;
