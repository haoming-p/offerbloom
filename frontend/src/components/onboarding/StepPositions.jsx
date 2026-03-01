import React, { useState } from "react";

// No more ROLE_LABELS object needed!
// We get labels directly from the role objects passed as props

const StepPositions = ({ roles, positions, onUpdatePositions }) => {
  // roles is now an array of objects: [{ id: "pm", label: "Product Manager", emoji: "🎯" }, ...]
  // So we access role.id, role.label, role.emoji directly

  const [activeRole, setActiveRole] = useState(roles[0]?.id || "");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jd, setJd] = useState("");
  const [expandedJd, setExpandedJd] = useState(null);

  // Helper to get label from role id
  // Finds the role object in the array and returns "emoji label"
  const getRoleLabel = (roleId) => {
    const role = roles.find((r) => r.id === roleId);
    return role ? `${role.emoji} ${role.label}` : roleId;
  };

  const handleAdd = () => {
    if (!title.trim() && !company.trim()) return;

    const newPosition = {
      id: Date.now(),
      role: activeRole,
      title: title.trim() || getRoleLabel(activeRole),
      company: company.trim(),
      // TODO: change for further development — parse JD with LLM to extract skills
      jd: jd.trim(),
    };
    onUpdatePositions([...positions, newPosition]);

    setTitle("");
    setCompany("");
    setJd("");
  };

  const handleRemove = (positionId) => {
    onUpdatePositions(positions.filter((p) => p.id !== positionId));
  };

  const toggleJd = (positionId) => {
    setExpandedJd(expandedJd === positionId ? null : positionId);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        Add specific positions
      </h2>
      <p className="text-gray-400 mb-8">
        Optional — add target companies or job titles for each role.
      </p>

      {/* Add Position Form */}
      <div className="bg-gray-50 rounded-xl p-5 mb-8">
        {/* Row 1: Role + Title + Company */}
        <div className="flex gap-3 mb-3">
          {/* Dropdown now reads from role objects */}
          <select
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-gray-700 text-sm"
          >
            {roles.map((role) => (
              // role is an object now, so we use role.id and role.label
              <option key={role.id} value={role.id}>
                {role.emoji} {role.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Job title (e.g. Senior AI PM)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300"
          />
          <input
            type="text"
            placeholder="Company (e.g. Apple)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300"
          />
        </div>

        {/* Row 2: Job Description */}
        {/* TODO: change for further development — use LLM to parse JD, auto-fill title/company */}
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste job description or LinkedIn URL here (optional) — will auto-extract title, company & required skills"
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300 resize-none mb-3"
        />

        <button
          onClick={handleAdd}
          className="px-5 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer text-sm"
        >
          Add Position
        </button>
      </div>

      {/* Position List — grouped by role */}
      <div className="max-h-64 overflow-y-auto show-scrollbar pr-2">
        {roles.map((role) => {
          // Filter positions for this role using role.id
          const rolePositions = positions.filter((p) => p.role === role.id);
          if (rolePositions.length === 0) return null;

          return (
            <div key={role.id} className="mb-6">
              {/* Section header uses role object directly — no lookup needed */}
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                {role.emoji} {role.label}
              </h3>
              <div className="flex flex-col gap-2">
                {rolePositions.map((pos) => (
                  <div key={pos.id} className="bg-gray-50 rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 font-medium text-sm">
                          {pos.title}
                        </span>
                        {pos.company && (
                          <span className="text-sm text-gray-400">
                            @ {pos.company}
                          </span>
                        )}
                        {pos.jd && (
                          <button
                            onClick={() => toggleJd(pos.id)}
                            className="text-xs text-orange-400 hover:text-orange-500 cursor-pointer ml-1"
                          >
                            {expandedJd === pos.id ? "▾ Hide JD" : "▸ View JD"}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(pos.id)}
                        className="text-gray-300 hover:text-red-400 cursor-pointer text-sm"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Expandable JD preview */}
                    {pos.jd && expandedJd === pos.id && (
                      <div className="mt-2 p-3 bg-white rounded-lg border border-gray-100 text-xs text-gray-500 max-h-32 overflow-y-auto show-scrollbar whitespace-pre-wrap">
                        {pos.jd}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {positions.length === 0 && (
          <p className="text-center text-gray-300 mt-4">
            No positions added yet. You can skip this step or add some above.
          </p>
        )}
      </div>
    </div>
  );
};

export default StepPositions;