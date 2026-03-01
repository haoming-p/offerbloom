import React, { useState } from "react";

// Props:
// - roles, positions: from onboarding data
// - activeRoleId, activePositionKey, activeCategoryId: current selections
// - onRoleChange, onPositionChange, onCategoryChange: handlers
// - categories: object keyed by roleId
// - onAddCategory, onEditCategory, onDeleteCategory: category management handlers
const PrepHeader = ({
  roles,
  positions,
  activeRoleId,
  activePositionKey,
  categories,
  activeCategoryId,
  effectiveCatId,
  onRoleChange,
  onPositionChange,
  onCategoryChange,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}) => {
  const rolePositions = positions.filter((p) => p.role === activeRoleId);
  const roleCats = categories[activeRoleId] || [];

  // --- Add category input ---
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // --- Edit category ---
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    onAddCategory(newCategoryName.trim());
    setNewCategoryName("");
    setShowAddCategory(false);
  };

  const handleAddCategoryKeyDown = (e) => {
    if (e.key === "Enter") handleAddCategory();
    if (e.key === "Escape") {
      setShowAddCategory(false);
      setNewCategoryName("");
    }
  };

  const handleStartEdit = (e, cat) => {
    e.stopPropagation();
    setEditingCategoryId(cat.id);
    setEditCategoryName(cat.label);
  };

  const handleConfirmEdit = () => {
    if (!editCategoryName.trim()) return;
    onEditCategory(editingCategoryId, editCategoryName.trim());
    setEditingCategoryId(null);
    setEditCategoryName("");
  };

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter") handleConfirmEdit();
    if (e.key === "Escape") {
      setEditingCategoryId(null);
      setEditCategoryName("");
    }
  };

  const handleDelete = (e, catId) => {
    e.stopPropagation();
    onDeleteCategory(catId);
  };

  return (
    <div className="flex-shrink-0 px-6 pt-6 pb-0 bg-white">
      {/* Row 1: Role Tabs */}
      <div className="flex gap-2 mb-2">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => onRoleChange(role.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
              activeRoleId === role.id
                ? "bg-orange-400 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {role.emoji} {role.label}
          </button>
        ))}
      </div>

      {/* Row 2: Position Sub-tabs — indented with connector */}
      <div className="flex items-center gap-2 mb-3 ml-4">
        <span className="text-gray-300 text-sm mr-1">└</span>
        <button
          onClick={() => onPositionChange("general")}
          className={`px-3 py-1 rounded-md text-xs cursor-pointer transition-all ${
            activePositionKey === "general"
              ? "bg-gray-800 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          General
        </button>
        {rolePositions.map((pos) => (
          <button
            key={pos.id}
            onClick={() => onPositionChange(`pos-${pos.id}`)}
            className={`px-3 py-1 rounded-md text-xs cursor-pointer transition-all ${
              activePositionKey === `pos-${pos.id}`
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {pos.title}
            {pos.company && (
              <span className="text-gray-400 ml-1">@ {pos.company}</span>
            )}
          </button>
        ))}
      </div>

      {/* Row 3: Category Tabs — with edit/delete on hover */}
      <div className="flex gap-2 items-center pb-4">
        {roleCats.map((cat) => {
          if (editingCategoryId === cat.id) {
            return (
              <div key={cat.id} className="flex gap-1 items-center">
                <input
                  type="text"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  autoFocus
                  className="border border-orange-400 rounded-lg px-3 py-1 text-sm w-32"
                />
                <button
                  onClick={handleConfirmEdit}
                  className="text-orange-400 hover:text-orange-500 text-xs cursor-pointer"
                >
                  ✓
                </button>
                <button
                  onClick={() => { setEditingCategoryId(null); setEditCategoryName(""); }}
                  className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            );
          }

          return (
            <div key={cat.id} className="group relative">
              <button
                onClick={() => onCategoryChange(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all ${
                  effectiveCatId === cat.id
                    ? "bg-orange-50 text-orange-500 border border-orange-400"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {cat.label}
              </button>
              <div className="hidden group-hover:flex absolute -top-2 -right-2 gap-0.5">
                <button
                  onClick={(e) => handleStartEdit(e, cat)}
                  className="w-4 h-4 bg-white border border-gray-200 rounded-full flex items-center justify-center
                    text-gray-400 hover:text-gray-600 cursor-pointer"
                  style={{ fontSize: "8px" }}
                >
                  ✎
                </button>
                <button
                  onClick={(e) => handleDelete(e, cat.id)}
                  className="w-4 h-4 bg-white border border-gray-200 rounded-full flex items-center justify-center
                    text-gray-400 hover:text-red-400 cursor-pointer"
                  style={{ fontSize: "8px" }}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}

        {showAddCategory ? (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={handleAddCategoryKeyDown}
              placeholder="Category name..."
              autoFocus
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm placeholder-gray-300 w-36"
            />
            <button
              onClick={handleAddCategory}
              className="text-orange-400 hover:text-orange-500 text-sm cursor-pointer"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAddCategory(false); setNewCategoryName(""); }}
              className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddCategory(true)}
            className="px-3 py-1.5 rounded-lg text-sm border border-dashed border-gray-200
              text-gray-400 hover:border-gray-300 cursor-pointer"
          >
            +
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="border-b border-gray-200" />
    </div>
  );
};

export default PrepHeader;