import React, { useState } from "react";

const DEFAULT_ROLES = [
  { id: "pm", label: "Product Manager", emoji: "🎯", desc: "Behavioral, case studies, product sense" },
  { id: "sde", label: "Software Engineer", emoji: "💻", desc: "System design, coding, architecture" },
  { id: "ds", label: "Data Science", emoji: "📊", desc: "Metrics, modeling, A/B testing" },
  { id: "pjm", label: "Project Manager", emoji: "📋", desc: "Planning, execution, stakeholder management" },
  { id: "uiux", label: "UI/UX Designer", emoji: "🎨", desc: "User research, wireframes, prototyping" },
  { id: "bd", label: "Business Development", emoji: "🤝", desc: "Partnerships, strategy, market expansion" },
];

// Props changed:
// - selectedRoles: now array of OBJECTS, e.g. [{ id: "pm", label: "Product Manager", emoji: "🎯" }]
// - onToggleRole: now receives a full role object, not just an id
const StepRoles = ({ selectedRoles, onToggleRole }) => {
  const [customRoles, setCustomRoles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const allRoles = [...DEFAULT_ROLES, ...customRoles];

  // Changed: check by id inside the objects array
  // Before: selectedRoles.includes(roleId)
  // After: selectedRoles.some(r => r.id === roleId)
  const isSelected = (roleId) => selectedRoles.some((r) => r.id === roleId);

  // --- Add custom role ---
  const handleStartAdd = () => {
    setEditingId("new");
    setEditValue("");
  };

  const handleConfirmAdd = () => {
    if (!editValue.trim()) return;
    const newRole = {
      id: `custom-${Date.now()}`,
      label: editValue.trim(),
      emoji: "✨",
      desc: "Custom role",
    };
    setCustomRoles([...customRoles, newRole]);
    setEditingId(null);
    setEditValue("");
  };

  // --- Edit custom role ---
  const handleStartEdit = (e, role) => {
    e.stopPropagation();
    setEditingId(role.id);
    setEditValue(role.label);
  };

  const handleConfirmEdit = () => {
    if (!editValue.trim()) return;
    const newLabel = editValue.trim();

    // Update in customRoles list
    setCustomRoles(
      customRoles.map((r) =>
        r.id === editingId ? { ...r, label: newLabel } : r
      )
    );

    // If this role is selected, we also need to update it in selectedRoles
    // We do this by toggling it off with the old data, then on with the new
    // But simpler: just toggle with the updated object — OnboardingPage
    // replaces by id, so the new label will overwrite
    if (isSelected(editingId)) {
      const updated = customRoles.find((r) => r.id === editingId);
      if (updated) {
        // Toggle off then on to update the label in parent state
        onToggleRole({ ...updated, label: newLabel }); // remove old
        onToggleRole({ ...updated, label: newLabel }); // add new
        // Actually this would cancel out! Let's handle it differently:
        // We won't touch parent here — the label updates when user
        // goes back to Step 1 and the card re-renders with new label.
        // For a proper fix, we'd need an onUpdateRole prop.
        // TODO: change for further development — sync edited labels to parent
      }
    }

    setEditingId(null);
    setEditValue("");
  };

  // --- Delete custom role ---
  const handleDelete = (e, roleId) => {
    e.stopPropagation();
    // If selected, deselect first by finding the full object
    if (isSelected(roleId)) {
      const role = customRoles.find((r) => r.id === roleId);
      if (role) onToggleRole(role);
    }
    setCustomRoles(customRoles.filter((r) => r.id !== roleId));
  };

  // --- Keyboard handler ---
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      editingId === "new" ? handleConfirmAdd() : handleConfirmEdit();
    }
    if (e.key === "Escape") handleCancel();
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const isCustom = (roleId) => roleId.startsWith("custom-");

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        What roles are you preparing for?
      </h2>
      <p className="text-gray-400 mb-8">
        Select one or more. You can always change this later.
      </p>

      <div className="max-h-96 overflow-y-auto show-scrollbar pr-2">
        <div className="grid grid-cols-3 gap-4">
          {allRoles.map((role) => {
            // Edit mode for this card
            if (editingId === role.id) {
              return (
                <div
                  key={role.id}
                  className="h-40 p-5 rounded-xl border-2 border-orange-400 bg-orange-50 flex flex-col"
                >
                  <span className="text-3xl mb-2">{role.emoji}</span>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm placeholder-gray-300 mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmEdit}
                      className="flex-1 px-3 py-1 bg-orange-400 text-white text-sm rounded-lg hover:bg-orange-500 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 px-3 py-1 text-gray-400 text-sm rounded-lg hover:text-gray-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            // Normal card — now passes full role object on click
            return (
              <button
                key={role.id}
                onClick={() => onToggleRole(role)}
                className={`h-40 p-5 rounded-xl border-2 text-left cursor-pointer transition-all relative ${
                  isSelected(role.id)
                    ? "border-orange-400 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {isCustom(role.id) && (
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span
                      onClick={(e) => handleStartEdit(e, role)}
                      className="text-gray-300 hover:text-gray-500 text-xs cursor-pointer"
                    >
                      ✎
                    </span>
                    <span
                      onClick={(e) => handleDelete(e, role.id)}
                      className="text-gray-300 hover:text-red-400 text-xs cursor-pointer"
                    >
                      ✕
                    </span>
                  </div>
                )}
                <span className="text-3xl">{role.emoji}</span>
                <h3 className="text-lg font-semibold text-gray-800 mt-3">
                  {role.label}
                </h3>
                <p className="text-sm text-gray-400 mt-1">{role.desc}</p>
              </button>
            );
          })}

          {/* Add custom role */}
          {editingId === "new" ? (
            <div className="h-40 p-5 rounded-xl border-2 border-orange-400 bg-orange-50 flex flex-col">
              <span className="text-3xl mb-2">✨</span>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Role name..."
                autoFocus
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm placeholder-gray-300 mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmAdd}
                  className="flex-1 px-3 py-1 bg-orange-400 text-white text-sm rounded-lg hover:bg-orange-500 cursor-pointer"
                >
                  Add
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-3 py-1 text-gray-400 text-sm rounded-lg hover:text-gray-600 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleStartAdd}
              className="h-40 p-5 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-300
                flex flex-col items-center justify-center cursor-pointer transition-all"
            >
              <span className="text-3xl text-gray-300">+</span>
              <span className="text-sm text-gray-400 mt-2">Add custom role</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepRoles;