import { useState } from "react";
import { LuPlus } from "react-icons/lu";

// Virtual category id used to mean "all categories"
export const ALL_CATEGORY_ID = "__all__";

const PrepCategoryTabs = ({
  categories,        // [{ id, label }, ...]
  activeCategoryId,  // ALL_CATEGORY_ID or a real cat id
  onCategoryChange,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAddCategory(newName.trim());
    setNewName("");
    setShowAdd(false);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    onEditCategory(editingId, editName.trim());
    setEditingId(null);
    setEditName("");
  };

  const renderTab = (id, label, isActive, isVirtual = false) => (
    <div key={id} className="group relative">
      <button
        onClick={() => onCategoryChange(id)}
        className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
          isActive
            ? "bg-orange-50 text-orange-600 border border-orange-300"
            : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300"
        }`}
      >
        {label}
      </button>
      {!isVirtual && (
        <div className="hidden group-hover:flex absolute -top-2 -right-2 gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingId(id);
              setEditName(label);
            }}
            className="w-4 h-4 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
            style={{ fontSize: "8px" }}
          >
            ✎
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCategory(id);
            }}
            className="w-4 h-4 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 cursor-pointer"
            style={{ fontSize: "8px" }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex gap-2 items-center flex-wrap">
      <span className="text-sm text-gray-300 mr-1">Tag:</span>

      {/* All — virtual, always first, can't be edited or deleted */}
      {renderTab(ALL_CATEGORY_ID, "All", activeCategoryId === ALL_CATEGORY_ID, true)}

      {/* Real categories */}
      {categories.map((cat) => {
        if (editingId === cat.id) {
          return (
            <div key={cat.id} className="flex gap-1 items-center">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
                className="border border-orange-400 rounded-lg px-3 py-1 text-sm w-32"
              />
              <button onClick={handleSaveEdit} className="text-orange-400 text-xs cursor-pointer">✓</button>
              <button onClick={() => setEditingId(null)} className="text-gray-400 text-xs cursor-pointer">✕</button>
            </div>
          );
        }
        return renderTab(cat.id, cat.label, activeCategoryId === cat.id);
      })}

      {/* Add new category */}
      {showAdd ? (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setShowAdd(false); setNewName(""); }
            }}
            placeholder="Category name…"
            autoFocus
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm placeholder-gray-300 w-36"
          />
          <button onClick={handleAdd} className="text-orange-400 hover:text-orange-500 text-sm cursor-pointer">Add</button>
          <button onClick={() => { setShowAdd(false); setNewName(""); }} className="text-gray-400 text-sm cursor-pointer">✕</button>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="px-2 py-1.5 rounded-lg text-sm border border-dashed border-gray-200 text-gray-400 hover:border-gray-300 cursor-pointer"
          title="Add a new category"
        >
          <LuPlus size={14} />
        </button>
      )}
    </div>
  );
};

export default PrepCategoryTabs;
