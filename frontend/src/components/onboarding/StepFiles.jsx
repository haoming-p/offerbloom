import React from "react";

// Props:
// - roles: array of role objects from Step 1, e.g. [{ id: "pm", label: "Product Manager", emoji: "🎯" }]
// - positions: position objects from Step 2
// - files: array of file objects
// - onUpdateFiles: function to replace the entire files array
const StepFiles = ({ roles, positions, files, onUpdateFiles }) => {

  // Build a flat list of all possible link targets
  // Combines roles + positions into one array for the checkboxes
  // Now reads labels directly from role objects — no ROLE_LABELS needed
  const linkTargets = [
    // Role-level targets — use emoji + label from the role object
    ...roles.map((role) => ({
      id: role.id,
      label: `${role.emoji} ${role.label}`,
    })),
    // Position-level targets — build label from position data
    ...positions.map((pos) => ({
      id: `pos-${pos.id}`,
      label: `${pos.title}${pos.company ? ` @ ${pos.company}` : ""}`,
    })),
  ];

  // Handle "file upload" — for demo, just capture file names
  // TODO: change for further development — upload to backend/storage
  const handleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files).map((file) => ({
      id: Date.now() + Math.random(),
      name: file.name,
      linkedTo: [], // no links yet, user will check boxes
    }));
    onUpdateFiles([...files, ...newFiles]);
    e.target.value = "";
  };

  // Toggle a link on/off for a specific file
  const handleToggleLink = (fileId, targetId) => {
    onUpdateFiles(
      files.map((file) => {
        if (file.id !== fileId) return file;
        const linked = file.linkedTo.includes(targetId)
          ? file.linkedTo.filter((id) => id !== targetId)
          : [...file.linkedTo, targetId];
        return { ...file, linkedTo: linked };
      })
    );
  };

  const handleRemoveFile = (fileId) => {
    onUpdateFiles(files.filter((f) => f.id !== fileId));
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        Upload your materials
      </h2>
      <p className="text-gray-400 mb-8">
        Optional — add resumes, cover letters, or notes. Link them to roles or specific positions.
      </p>

      {/* Upload area */}
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 mb-8 cursor-pointer hover:border-gray-300 transition-colors">
        <span className="text-3xl mb-2">📄</span>
        <span className="text-gray-500">Click to upload files</span>
        <span className="text-sm text-gray-300 mt-1">PDF, DOCX, TXT, etc.</span>
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </label>

      {/* File list with link checkboxes */}
      <div className="max-h-64 overflow-y-auto show-scrollbar pr-2">
        {files.map((file) => (
          <div key={file.id} className="bg-gray-50 rounded-xl p-4 mb-4">
            {/* File name and remove button */}
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-700">📄 {file.name}</span>
              <button
                onClick={() => handleRemoveFile(file.id)}
                className="text-gray-300 hover:text-red-400 cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Link checkboxes — roles and positions as toggle chips */}
            <div className="flex flex-wrap gap-3">
              {linkTargets.map((target) => (
                <label
                  key={target.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer border ${
                    file.linkedTo.includes(target.id)
                      ? "border-orange-400 bg-orange-50 text-orange-600"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={file.linkedTo.includes(target.id)}
                    onChange={() => handleToggleLink(file.id, target.id)}
                    className="hidden"
                  />
                  {target.label}
                </label>
              ))}
            </div>

            {file.linkedTo.length === 0 && (
              <p className="text-xs text-gray-300 mt-2">
                No links yet — this file won't be attached to any role.
              </p>
            )}
          </div>
        ))}

        {files.length === 0 && (
          <p className="text-center text-gray-300">
            No files uploaded yet. You can skip this step and upload later.
          </p>
        )}
      </div>
    </div>
  );
};

export default StepFiles;