import { useState } from "react";
import { LuClipboardList, LuPencil } from "react-icons/lu";
import RichTextEditor from "../../RichTextEditor";
import { defaultAnswerLabel } from "../../../utils/timestamps";

const AnswersPanel = ({
  question,
  selectedAnswerId,
  onSelectAnswer,
  onUpdateAnswers,
  onAddAnswer,
  onUpdateAnswer,
  onDeleteAnswer,
}) => {
  // Selection is controlled by the parent — the expanded card *is* the
  // selected one. This way AIAssistantPanel knows which answer to target.
  const expandedId = selectedAnswerId;
  const setExpandedId = onSelectAnswer || (() => {});
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editContent, setEditContent] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newContent, setNewContent] = useState("");
  const [showReference, setShowReference] = useState(false);

  const handleToggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
    if (editingId === id) setEditingId(null);
  };

  const handleStartEdit = (answer) => {
    setEditingId(answer.id);
    setEditLabel(answer.label);
    setEditContent(answer.content);
    setExpandedId(answer.id);
  };

  const handleSaveEdit = () => {
    const stripped = (editContent || "").replace(/<[^>]*>/g, "").trim();
    if (!stripped) return;
    const label = editLabel.trim() || question.answers.find((a) => a.id === editingId)?.label || "";
    const content = editContent;
    if (onUpdateAnswer) {
      onUpdateAnswer(editingId, label, content);
    } else {
      onUpdateAnswers(question.answers.map((a) => (a.id === editingId ? { ...a, label, content } : a)));
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
    setEditLabel("");
  };

  const handleDeleteAnswer = (id) => {
    if (onDeleteAnswer) onDeleteAnswer(id);
    else onUpdateAnswers(question.answers.filter((a) => a.id !== id));
    if (expandedId === id) setExpandedId(null);
    if (editingId === id) setEditingId(null);
  };

  const handleAddAnswer = async () => {
    const stripped = (newContent || "").replace(/<[^>]*>/g, "").trim();
    if (!stripped) return;
    const label = newLabel.trim() || defaultAnswerLabel(question.answers.length + 1);
    const content = newContent;
    setNewLabel("");
    setNewContent("");
    setShowAddForm(false);
    if (onAddAnswer) {
      await onAddAnswer(label, content);
    } else {
      const newA = { id: `${Date.now()}-${Math.random()}`, label, content };
      onUpdateAnswers([...question.answers, newA]);
      setExpandedId(newA.id);
    }
  };

  return (
    <div className="h-full overflow-y-auto show-scrollbar p-5">
      {/* Header row with Add answer */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Saved Answers ({question.answers.length})
        </h3>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1.5 bg-orange-400 text-white text-xs rounded-lg hover:bg-orange-500 cursor-pointer"
          >
            + Add answer
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onFocus={() => {
              if (!newLabel) setNewLabel(defaultAnswerLabel(question.answers.length + 1));
            }}
            placeholder={defaultAnswerLabel(question.answers.length + 1)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300 focus:outline-none focus:border-orange-300 mb-3"
          />
          <div className="mb-3">
            <RichTextEditor value={newContent} onChange={setNewContent} placeholder="Write or paste your answer…" autoFocus />
          </div>
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
              Save answer
            </button>
          </div>
        </div>
      )}

      {/* Answer cards */}
      <div className="flex flex-col gap-3 mb-4">
        {question.answers.map((answer) => (
          <div key={answer.id} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <div
              onClick={() => handleToggleExpand(answer.id)}
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-100"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-400">{expandedId === answer.id ? "▾" : "▸"}</span>
                <span className="text-sm font-medium text-gray-700 truncate">{answer.label}</span>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); handleStartEdit(answer); }}
                  className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer flex items-center gap-1"
                >
                  <LuPencil size={11} />
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteAnswer(answer.id); }}
                  className="text-gray-400 hover:text-red-400 text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
            {expandedId === answer.id && (
              <div className="px-4 pb-4">
                {editingId === answer.id ? (
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Version label"
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-300"
                    />
                    <RichTextEditor value={editContent} onChange={setEditContent} autoFocus />
                    <div className="flex justify-end gap-2">
                      <button onClick={handleCancelEdit} className="px-4 py-1.5 text-gray-400 hover:text-gray-600 text-sm cursor-pointer">
                        Cancel
                      </button>
                      <button onClick={handleSaveEdit} className="px-4 py-1.5 bg-orange-400 text-white rounded-lg hover:bg-orange-500 text-sm cursor-pointer">
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="prose prose-sm max-w-none text-sm text-gray-600 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_mark]:bg-yellow-200 [&_a]:text-orange-500 [&_a]:underline [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: answer.content || "" }}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {question.answers.length === 0 && !showAddForm && (
        <p className="text-gray-300 text-sm text-center mt-4">
          No answers yet — click "+ Add answer" above, or use AI on the right
        </p>
      )}

      {/* Reference Answer */}
      {question.ideal_answer && (
        <div className="mt-4 border border-dashed border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowReference((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>{showReference ? "▾" : "▸"}</span>
              <span className="font-medium">Reference Answer</span>
              <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">suggested</span>
            </span>
          </button>
          {showReference && (
            <div className="px-4 pb-4 bg-gray-50">
              <p className="text-sm text-gray-500 whitespace-pre-wrap leading-relaxed">
                {question.ideal_answer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

AnswersPanel.title = "Answers";
AnswersPanel.Icon = LuClipboardList;

export default AnswersPanel;
