import React, { useState, useMemo, useRef } from "react";
import { LuSearch, LuPencil } from "react-icons/lu";
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
// Draggable Row — whole row clickable to open detail.
// Drag handle and delete cell stop propagation so they don't trigger row click.
// ============================================================
const DraggableRow = ({ row, onDelete, onOpenDetail }) => {
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
      onClick={() => onOpenDetail?.(row.original.id)}
      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
    >
      <td className="w-10 px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
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
      <td className="w-10 px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
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
// PrepTable
// ============================================================
const DIFFICULTY_STYLES = {
  Easy:   "bg-green-50 text-green-600",
  Medium: "bg-yellow-50 text-yellow-600",
  Hard:   "bg-red-50 text-red-500",
};

const PrepTable = ({
  questions,
  onUpdateQuestions,
  onAddQuestion,
  onDeleteQuestion,
  onUpdateQuestionText,         // (questionId, newText) => void
  onOpenDetail,                 // (questionId) => void
  showCategoryTag = false,
  categoryLabelById = {},
  showTagPicker = false,        // when true, add row reveals a tag dropdown after typing (All view)
  availableCategories = [],     // [{ id, label }] for the tag dropdown
}) => {
  // Inline question edit
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editingQuestionText, setEditingQuestionText] = useState("");

  const startEditQuestion = (q) => {
    setEditingQuestionId(q.id);
    setEditingQuestionText(q.question);
  };

  const saveEditQuestion = () => {
    const text = editingQuestionText.trim();
    if (text && editingQuestionId) {
      const original = questions.find((q) => q.id === editingQuestionId);
      if (text !== original?.question) {
        onUpdateQuestionText?.(editingQuestionId, text);
      }
    }
    setEditingQuestionId(null);
    setEditingQuestionText("");
  };

  const cancelEditQuestion = () => {
    setEditingQuestionId(null);
    setEditingQuestionText("");
  };

  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionTag, setNewQuestionTag] = useState(""); // "" = no tag
  const [experienceFilter, setExperienceFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const newQuestionInputRef = useRef(null);

  const experienceOptions = useMemo(() => {
    const vals = [...new Set(questions.map((q) => q.experience).filter(Boolean))];
    return vals.length ? ["All", ...vals] : [];
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    let list = experienceFilter === "All"
      ? questions
      : questions.filter((q) => q.experience === experienceFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((row) => (row.question || "").toLowerCase().includes(q));
    }
    return list;
  }, [questions, experienceFilter, searchQuery]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("question", {
        header: "Question",
        cell: (info) => {
          const q = info.row.original;
          const difficulty = q.difficulty;
          const catId = q.category_id;
          const catLabel = catId ? categoryLabelById[catId] || catId : null;
          const isEditing = editingQuestionId === q.id;

          if (isEditing) {
            return (
              <input
                type="text"
                autoFocus
                value={editingQuestionText}
                onChange={(e) => setEditingQuestionText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={saveEditQuestion}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") saveEditQuestion();
                  if (e.key === "Escape") cancelEditQuestion();
                }}
                className="w-full text-sm border border-orange-300 rounded-md px-2 py-1 focus:outline-none"
              />
            );
          }

          return (
            <div className="group flex items-start gap-2 flex-wrap">
              <span className="text-sm text-gray-700">{info.getValue()}</span>
              <button
                onClick={(e) => { e.stopPropagation(); startEditQuestion(q); }}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-600 cursor-pointer transition-opacity"
                title="Edit question"
              >
                <LuPencil size={11} />
              </button>
              {difficulty && (
                <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${DIFFICULTY_STYLES[difficulty] || "bg-gray-100 text-gray-400"}`}>
                  {difficulty}
                </span>
              )}
              {showCategoryTag && catLabel && (
                <span className="flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                  {catLabel}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("answers", {
        header: "Answers",
        cell: (info) => {
          const count = info.getValue().length;
          return (
            <span
              className={`text-xs px-2 py-0.5 rounded-full inline-block ${
                count === 0
                  ? "bg-gray-100 text-gray-400"
                  : "bg-blue-50 text-blue-500"
              }`}
            >
              {count === 0 ? "0 answers" : `${count} ${count === 1 ? "answer" : "answers"}`}
            </span>
          );
        },
      }),
      columnHelper.accessor((row) => row.practices?.length || 0, {
        id: "practices",
        header: "Practices",
        cell: (info) => {
          const count = info.getValue();
          return (
            <span
              className={`text-xs px-2 py-0.5 rounded-full inline-block ${
                count === 0
                  ? "bg-gray-100 text-gray-400"
                  : "bg-blue-50 text-blue-500"
              }`}
            >
              {count === 0 ? "0 practices" : `${count} ${count === 1 ? "practice" : "practices"}`}
            </span>
          );
        },
      }),
    ],
    [categoryLabelById, showCategoryTag, editingQuestionId, editingQuestionText]
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
    const tag = showTagPicker ? newQuestionTag || null : undefined;
    setNewQuestionText("");
    setNewQuestionTag("");
    if (onAddQuestion) {
      onAddQuestion(text, tag);
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
        {/* Experience filter pills (only when there's experience data) */}
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
                      {header.column.id === "question" ? (
                        <div className="flex items-center gap-3">
                          <span>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          <div className="relative">
                            <LuSearch
                              size={12}
                              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search…"
                              className="pl-7 pr-2 py-1 w-44 text-xs border border-gray-200 rounded-md bg-white normal-case font-normal placeholder-gray-300 focus:outline-none focus:border-orange-300"
                            />
                          </div>
                        </div>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  ))
                )}
                <th className="w-10 px-2 py-3" />
              </tr>

              <tr className="border-b border-gray-100">
                <td className="px-2 py-2 text-center text-gray-300 align-top pt-3">+</td>
                <td className="px-4 py-2" colSpan={columns.length}>
                  <input
                    ref={newQuestionInputRef}
                    type="text"
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    onKeyDown={handleAddKeyDown}
                    placeholder="Type a new question and press Enter…"
                    className="w-full text-sm placeholder-gray-300 outline-none"
                  />
                  {/* Tag picker — only in All view, only once user has typed */}
                  {showTagPicker && newQuestionText.trim() && (
                    <div className="flex items-center gap-1.5 text-xs mt-1.5 text-gray-400">
                      <span>Tag:</span>
                      <select
                        value={newQuestionTag}
                        onChange={(e) => {
                          setNewQuestionTag(e.target.value);
                          // Refocus the input so Enter submits
                          newQuestionInputRef.current?.focus();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAdd();
                          }
                        }}
                        className="text-xs border border-gray-200 rounded-md px-2 py-0.5 text-gray-600 bg-white cursor-pointer"
                      >
                        <option value="">No tag</option>
                        {availableCategories.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </td>
                <td className="px-2 py-2 align-top pt-3">
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
                <DraggableRow key={row.id} row={row} onDelete={handleDelete} onOpenDetail={onOpenDetail} />
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

      </SortableContext>
    </DndContext>
  );
};

export default PrepTable;
