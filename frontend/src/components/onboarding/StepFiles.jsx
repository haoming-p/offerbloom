import React, { useState } from "react";
import { uploadFile } from "../../services/files";

const StepFiles = ({ roles, positions, files, onUpdateFiles }) => {
  const [uploading, setUploading] = useState(false);

  const linkTargets = [
    ...roles.map((role) => ({ id: role.id, label: `${role.emoji} ${role.label}` })),
    ...positions.map((pos) => ({
      id: `pos-${pos.id}`,
      label: `${pos.title}${pos.company ? ` @ ${pos.company}` : ""}`,
    })),
  ];

  const guessFileType = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes("resume") || lower.includes("cv")) return "resume";
    if (lower.includes("cover")) return "cover_letter";
    if (lower.includes("jd") || lower.includes("job")) return "job_description";
    return "other";
  };

  const handleFileSelect = async (e) => {
    const selected = Array.from(e.target.files);
    e.target.value = "";
    if (!selected.length) return;

    setUploading(true);
    const uploaded = [];
    for (const file of selected) {
      try {
        const result = await uploadFile(file, guessFileType(file.name));
        uploaded.push({
          id: result.id,
          name: result.name,
          file_type: result.file_type,
          size: result.size,
          url: result.url,
          linkedTo: [],
        });
      } catch {
        // Skip files that fail to upload
      }
    }
    setUploading(false);
    if (uploaded.length) onUpdateFiles([...files, ...uploaded]);
  };

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
      <h2 className="text-xl font-bold text-gray-800 mb-2">Upload your materials</h2>
      <p className="text-gray-400 mb-8">
        Optional — add resumes, cover letters, or notes. Link them to roles or specific positions.
      </p>

      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 mb-8 cursor-pointer hover:border-gray-300 transition-colors">
        <span className="text-3xl mb-2">{uploading ? "⏳" : "📄"}</span>
        <span className="text-gray-500">{uploading ? "Uploading…" : "Click to upload files"}</span>
        <span className="text-sm text-gray-300 mt-1">PDF, DOCX, TXT — max 10 MB</span>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />
      </label>

      <div className="max-h-64 overflow-y-auto show-scrollbar pr-2">
        {files.map((file) => (
          <div key={file.id} className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-700">📄 {file.name}</span>
              <button
                onClick={() => handleRemoveFile(file.id)}
                className="text-gray-300 hover:text-red-400 cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

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
