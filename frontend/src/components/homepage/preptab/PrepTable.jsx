import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const columnHelper = createColumnHelper();

// ============================================================
// Draggable Row
// ============================================================
const DraggableRow = ({ row, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.original.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-gray-100 hover:bg-gray-50"
    >
      <td className="w-10 px-2 py-3 text-center">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
        >
          ⠿
        </span>
      </td>
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id} className="px-4 py-3">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
      <td className="w-10 px-2 py-3 text-center">
        <button
          onClick={() => onDelete(row.original.id)}
          className="text-gray-300 hover:text-red-400 cursor-pointer text-sm"
        >
          ✕
        </button>
      </td>
    </tr>
  );
};

// ============================================================
// Answer Modal — quick edit
// ============================================================
const AnswerModal = ({ question, onClose, onAddAnswer, onDeleteAnswer, onOpenAnswerPage }) => {
  const [draftLabel, setDraftLabel] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAddAnswer = async () => {
    if (!draftContent.trim()) return;
    const label = draftLabel.trim() || `Version ${question.answers.length + 1}`;
    const content = draftContent.trim();
    setSaving(true);
    await onAddAnswer(label, content);
    setSaving(false);
    setDraftLabel("");
    setDraftContent("");
    setShowForm(false);
  };

  const handleDeleteAnswer = (answerId) => {
    onDeleteAnswer(answerId);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-800">
            {question.question}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer text-lg"
          >
            ✕
          </button>
        </div>
        <span className="text-xs text-gray-400 mb-6">Quick Edit</span>

        <div className="flex-1 overflow-y-auto show-scrollbar mb-6">
          {question.answers.length === 0 && !showForm ? (
            <p className="text-gray-300 text-sm text-center py-4">
              No answers yet
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {question.answers.map((answer) => (
                <div key={answer.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {answer.label}
                    </span>
                    <button
                      onClick={() => handleDeleteAnswer(answer.id)}
                      className="text-gray-300 hover:text-red-400 cursor-pointer text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {answer.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4">
          {showForm ? (
            <>
              <div className="flex gap-3 mb-3">
                <input
                  type="text"
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  placeholder={`Version ${question.answers.length + 1}`}
                  className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300"
                />
                <span className="text-xs text-gray-300 self-center">
                  Optional label (e.g. "Case - STAR format", "Short version")
                </span>
              </div>
              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="Paste or write your answer here..."
                rows={4}
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300 resize-none mb-3"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowForm(false); setDraftLabel(""); setDraftContent(""); }}
                  className="px-4 py-2 text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAnswer}
                  disabled={saving}
                  className="px-5 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer text-sm disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Add Answer"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowForm(true)}
                className="w-full py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500
                  hover:border-gray-300 hover:text-gray-700 cursor-pointer"
              >
                Quick Edit — Add {question.answers.length === 0 ? "an answer" : "another version"}
              </button>
              <button
                onClick={() => { onClose(); onOpenAnswerPage(question.id); }}
                className="w-full py-2.5 border border-orange-400 bg-orange-50 rounded-lg text-sm text-orange-500
                  hover:bg-orange-100 cursor-pointer"
              >
                ✨ AI Draft — Open full editor
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PrepTable
// ============================================================
const DIFFICULTY_STYLES = {
  Easy:   "bg-green-50 text-green-600",
  Medium: "bg-yellow-50 text-yellow-600",
  Hard:   "bg-red-50 text-red-500",
};

const PrepTable = ({ questions, onUpdateQuestions, onAddQuestion, onDeleteQuestion, onAddAnswer, onDeleteAnswer, onOpenAnswerPage, onOpenPracticePage }) => {
  const [newQuestionText, setNewQuestionText] = useState("");
  const [openAnswerModalId, setOpenAnswerModalId] = useState(null);
  const [experienceFilter, setExperienceFilter] = useState("All");

  const experienceOptions = useMemo(() => {
    const vals = [...new Set(questions.map((q) => q.experience).filter(Boolean))];
    return vals.length ? ["All", ...vals] : [];
  }, [questions]);

  const filteredQuestions = useMemo(() =>
    experienceFilter === "All"
      ? questions
      : questions.filter((q) => q.experience === experienceFilter),
    [questions, experienceFilter]
  );

  const modalQuestion = filteredQuestions.find((q) => q.id === openAnswerModalId);

  const columns = useMemo(
    () => [
      columnHelper.accessor("question", {
        header: "Question",
        cell: (info) => {
          const difficulty = info.row.original.difficulty;
          return (
            <div className="flex items-start gap-2">
              <span className="text-sm text-gray-700">{info.getValue()}</span>
              {difficulty && (
                <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${DIFFICULTY_STYLES[difficulty] || "bg-gray-100 text-gray-400"}`}>
                  {difficulty}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("answers", {
        header: "Answers",
        cell: (info) => {
          const answers = info.getValue();
          const count = answers.length;
          return (
            <button
              onClick={() => setOpenAnswerModalId(info.row.original.id)}
              className={`text-xs px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                count === 0
                  ? "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  : "bg-blue-50 text-blue-500 hover:bg-blue-100"
              }`}
            >
              {count === 0 ? "0 answers" : `${count} ${count === 1 ? "answer" : "answers"}`}
            </button>
          );
        },
      }),
      // TODO: change for further development — wire to real practice/interview mode
      columnHelper.display({
        id: "practice",
        header: "Practice",
        cell: (info) => {
          const hasAnswers = info.row.original.answers.length > 0;
          return (
            <button
              onClick={() => {
                if (hasAnswers) {
                  onOpenPracticePage(info.row.original.id);
                } else {
                  setOpenAnswerModalId(info.row.original.id);
                }
              }}
              className={`text-xs cursor-pointer ${
                hasAnswers
                  ? "text-orange-400 hover:text-orange-500"
                  : "text-gray-400 hover:text-gray-500"
              }`}
            >
              {hasAnswers ? "Practice →" : "Draft Answer"}
            </button>
          );
        },
      }),
    ],
    [onOpenPracticePage]
  );

  const table = useReactTable({
    data: filteredQuestions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filteredQuestions.findIndex((q) => String(q.id) === String(active.id));
    const newIndex = filteredQuestions.findIndex((q) => String(q.id) === String(over.id));
    onUpdateQuestions(arrayMove(filteredQuestions, oldIndex, newIndex));
  };

  const handleAdd = () => {
    if (!newQuestionText.trim()) return;
    const text = newQuestionText.trim();
    setNewQuestionText("");
    if (onAddQuestion) {
      onAddQuestion(text);
    } else {
      // fallback local-only
      const newQ = { id: `${Date.now()}-${Math.random()}`, question: text, answers: [], practices: [] };
      onUpdateQuestions([newQ, ...questions]);
    }
  };

  const handleAddKeyDown = (e) => {
    if (e.key === "Enter") handleAdd();
  };

  const handleDelete = (questionId) => {
    if (onDeleteQuestion) {
      onDeleteQuestion(questionId);
    } else {
      onUpdateQuestions(questions.filter((q) => q.id !== questionId));
    }
  };

  const rowIds = filteredQuestions.map((q) => String(q.id));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
        {/* Experience filter pills — only shown when questions have experience data */}
        {experienceOptions.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {experienceOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setExperienceFilter(opt)}
                className={`px-3 py-1 rounded-full text-xs cursor-pointer transition-all ${
                  experienceFilter === opt
                    ? "bg-orange-400 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-10 px-2 py-3" />
                {table.getHeaderGroups().map((headerGroup) =>
                  headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))
                )}
                <th className="w-10 px-2 py-3" />
              </tr>

              <tr className="border-b border-gray-100">
                <td className="px-2 py-2 text-center text-gray-300">+</td>
                <td className="px-4 py-2" colSpan={columns.length}>
                  <input
                    type="text"
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    onKeyDown={handleAddKeyDown}
                    placeholder="Type a new question and press Enter..."
                    className="w-full text-sm placeholder-gray-300 outline-none"
                  />
                </td>
                <td className="px-2 py-2">
                  {newQuestionText.trim() && (
                    <button
                      onClick={handleAdd}
                      className="text-orange-400 hover:text-orange-500 cursor-pointer text-sm"
                    >
                      ↵
                    </button>
                  )}
                </td>
              </tr>
            </thead>

            <tbody>
              {table.getRowModel().rows.map((row) => (
                <DraggableRow key={row.id} row={row} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>

          {filteredQuestions.length === 0 && (
            <div className="py-12 text-center text-gray-300 text-sm">
              {questions.length === 0
                ? "No questions yet. Add one above!"
                : `No questions for "${experienceFilter}" experience.`}
            </div>
          )}
        </div>

        {modalQuestion && (
          <AnswerModal
            question={modalQuestion}
            onClose={() => setOpenAnswerModalId(null)}
            onAddAnswer={(label, content) => onAddAnswer(openAnswerModalId, label, content)}
            onDeleteAnswer={(answerId) => onDeleteAnswer(openAnswerModalId, answerId)}
            onOpenAnswerPage={onOpenAnswerPage}
          />
        )}
      </SortableContext>
    </DndContext>
  );
};

export default PrepTable;