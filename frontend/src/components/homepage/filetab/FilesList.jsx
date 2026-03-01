import React, { useState, useRef } from "react";

// Helper: get icon based on file name or type
const getFileIcon = (file) => {
  if (file.type === "url") return "🔗";
  const name = file.name?.toLowerCase() || "";
  if (name.endsWith(".pdf")) return "📕";
  if (name.endsWith(".doc") || name.endsWith(".docx")) return "📘";
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg"))
    return "🖼️";
  return "📄";
};

// Helper: format file size
const formatSize = (bytes) => {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Helper: get domain from URL
const getDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

// Props:
// - files: filtered file array
// - linkTargets: [{ id, label }] for roles + positions
// - selectedFileId: which file is selected for AI chat
// - onSelectFile, onAddFile, onDeleteFile, onUpdateLinks: handlers
const FilesList = ({
  files,
  linkTargets,
  selectedFileId,
  onSelectFile,
  onAddFile,
  onDeleteFile,
  onUpdateLinks,
}) => {
  // --- Edit links state ---
  const [editingLinksId, setEditingLinksId] = useState(null);

  // --- Add file/URL state ---
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [newUrlName, setNewUrlName] = useState("");
  const [newUrlValue, setNewUrlValue] = useState("");

  // Hidden file input ref
  const fileInputRef = useRef(null);

  // ============================================================
  // File upload handler (browser memory only)
  // ============================================================
  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files || []);
    uploadedFiles.forEach((file) => {
      const newFile = {
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: "file",
        size: file.size,
        // Store the file object in memory for preview
        // TODO: change for further development — upload to backend storage
        fileObj: file,
        linkedTo: [],
      };
      onAddFile(newFile);
    });
    // Reset input so the same file can be uploaded again
    e.target.value = "";
  };

  // ============================================================
  // URL add handler
  // ============================================================
  const handleAddUrl = () => {
    if (!newUrlValue.trim()) return;
    // Ensure URL has protocol
    let url = newUrlValue.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    const newUrl = {
      id: `url-${Date.now()}-${Math.random()}`,
      name: newUrlName.trim() || getDomain(url),
      type: "url",
      url,
      size: null,
      linkedTo: [],
    };
    onAddFile(newUrl);
    setNewUrlName("");
    setNewUrlValue("");
    setShowAddUrl(false);
  };

  const handleAddUrlKeyDown = (e) => {
    if (e.key === "Enter") handleAddUrl();
    if (e.key === "Escape") {
      setShowAddUrl(false);
      setNewUrlName("");
      setNewUrlValue("");
    }
  };

  // ============================================================
  // Link toggle handler
  // ============================================================
  const handleToggleLink = (fileId, targetId, currentLinks) => {
    const safeLinks = currentLinks || [];
    const newLinks = safeLinks.includes(targetId)
      ? safeLinks.filter((l) => l !== targetId)
      : [...safeLinks, targetId];
    onUpdateLinks(fileId, newLinks);
  };

  return (
    <div>
      {/* File cards */}
      <div className="flex flex-col gap-3 mb-4">
        {files.map((file) => {
          const isSelected = selectedFileId === file.id;
          const isEditingLinks = editingLinksId === file.id;
          const fileLinks = file.linkedTo || [];

          return (
            <div
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                isSelected
                  ? "border-orange-400 bg-orange-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}>
              {/* Top row: icon, name, delete */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getFileIcon(file)}</span>
                  <span className="text-sm font-medium text-gray-800">
                    {file.name}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(file.id);
                  }}
                  className="text-gray-300 hover:text-red-400 text-xs cursor-pointer">
                  ✕
                </button>
              </div>

              {/* Meta row: type, size, or URL */}
              <div className="text-xs text-gray-400 mb-2">
                {file.type === "url" ? (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-400 hover:underline">
                    {getDomain(file.url)}
                  </a>
                ) : (
                  <span>
                    {file.name?.split(".").pop()?.toUpperCase() || "FILE"}
                    {file.size && ` · ${formatSize(file.size)}`}
                  </span>
                )}
              </div>

              {/* Linked tags */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {fileLinks.map((linkId) => {
                  const target = linkTargets.find((t) => t.id === linkId);
                  return target ? (
                    <span
                      key={linkId}
                      className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                      {target.label}
                    </span>
                  ) : null;
                })}
                {fileLinks.length === 0 && (
                  <span className="text-xs text-gray-300">No links</span>
                )}
              </div>

              {/* Edit links toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingLinksId(isEditingLinks ? null : file.id);
                }}
                className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">
                {isEditingLinks ? "▾ Close links" : "▸ Edit links"}
              </button>

              {/* Expanded link chips */}
              {isEditingLinks && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                  {linkTargets.map((target) => {
                    const isLinked = fileLinks.includes(target.id);
                    return (
                      <button
                        key={target.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLink(file.id, target.id, fileLinks);
                        }}
                        className={`px-3 py-1 rounded-full text-xs cursor-pointer transition-all ${
                          isLinked
                            ? "bg-orange-50 text-orange-500 border border-orange-400"
                            : "bg-gray-50 text-gray-400 border border-gray-200 hover:border-gray-300"
                        }`}>
                        {isLinked ? "✓ " : ""}
                        {target.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {files.length === 0 && (
          <p className="text-gray-300 text-sm text-center py-8">
            No files or links yet — add one below
          </p>
        )}
      </div>

      {/* Add buttons */}
      {showAddUrl ? (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <input
            type="text"
            value={newUrlName}
            onChange={(e) => setNewUrlName(e.target.value)}
            placeholder="Name (e.g. GitHub Portfolio)"
            autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300 mb-3"
          />
          <input
            type="text"
            value={newUrlValue}
            onChange={(e) => setNewUrlValue(e.target.value)}
            onKeyDown={handleAddUrlKeyDown}
            placeholder="URL (e.g. https://github.com/ming)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300 mb-3"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowAddUrl(false);
                setNewUrlName("");
                setNewUrlValue("");
              }}
              className="px-4 py-1.5 text-gray-400 hover:text-gray-600 text-sm cursor-pointer">
              Cancel
            </button>
            <button
              onClick={handleAddUrl}
              className="px-4 py-1.5 bg-orange-400 text-white rounded-lg hover:bg-orange-500 text-sm cursor-pointer">
              Add Link
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2.5 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400
              hover:border-gray-300 hover:text-gray-500 cursor-pointer">
            📄 + Upload File
          </button>
          <button
            onClick={() => setShowAddUrl(true)}
            className="flex-1 py-2.5 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400
              hover:border-gray-300 hover:text-gray-500 cursor-pointer">
            🔗 + Add Link
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};

export default FilesList;
