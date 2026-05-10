import React, { useState, useEffect } from "react";
import FilesList from "./FilesList";
import ContentLibrary from "./ContentLibrary";
import FileAIChat from "./FileAIChat";
import { listFiles, deleteFile } from "../../../services/files";

// View tabs for the files section
const VIEW_TABS = [
  { id: "files", label: "📄 Files & Links" },
  { id: "library", label: "📝 Content Library" },
];

const FilesTab = ({ data }) => {
  const { roles = [], positions = [], files: initialFiles = [] } = data || {};

  // --- Local state ---
  // TODO: change for further development — lift state to App.jsx for cross-tab sync
  const [files, setFiles] = useState(
    initialFiles.map((f) => ({
      ...f,
      type: f.type || "file",
      size: f.size || null,
      url: f.url || null,
    }))
  );

  // Fetch files from backend on mount
  useEffect(() => {
    listFiles()
      .then((data) =>
        setFiles(
          data.map((f) => ({
            ...f,
            type: f.type || "file",
            size: f.size || null,
            url: f.url || null,
            linkedTo: f.linkedTo || [],
          }))
        )
      )
      .catch(() => {}); // fallback: keep initialFiles if request fails
  }, []);

  const [activeRoleId, setActiveRoleId] = useState("all");
  const [activeView, setActiveView] = useState("files");

  // --- Selected file for AI chat context ---
  const [selectedFileId, setSelectedFileId] = useState(null);
  const selectedFile = files.find((f) => f.id === selectedFileId);

  // --- Active section for AI chat context (Content Library) ---
  const [activeSection, setActiveSection] = useState(null);

  // --- Filter files by role ---
  const filteredFiles = activeRoleId === "all"
    ? files
    : files.filter((f) =>
        (f.linkedTo || []).some((link) => {
          if (link === activeRoleId) return true;
          const pos = positions.find((p) => `pos-${p.id}` === link || p.id === link);
          return pos && pos.role === activeRoleId;
        })
      );

  // --- File management handlers ---
  const handleAddFile = (newFile) => {
    setFiles([...files, newFile]);
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await deleteFile(fileId);
    } catch {
      // If backend delete fails, still remove from UI (or you can add an error toast here)
    }
    setFiles(files.filter((f) => f.id !== fileId));
    if (selectedFileId === fileId) setSelectedFileId(null);
  };

  const handleUpdateFileLinks = (fileId, newLinks) => {
    setFiles(files.map((f) =>
      f.id === fileId ? { ...f, linkedTo: newLinks } : f
    ));
  };

  // Build link targets from roles + positions
  const linkTargets = [
    ...roles.map((r) => ({ id: r.id, label: `${r.emoji} ${r.label}` })),
    ...positions.map((p) => ({
      id: `pos-${p.id}`,
      label: `${p.title}${p.company ? ` @ ${p.company}` : ""}`,
    })),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Fixed header */}
      <div className="flex-shrink-0 px-6 pt-6 bg-white">
        {/* Role tabs */}
        <div className="flex gap-2 items-center mb-4">
          <button
            onClick={() => setActiveRoleId("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
              activeRoleId === "all"
                ? "bg-orange-400 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            All Roles
          </button>
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setActiveRoleId(role.id)}
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

        {/* View tabs */}
        <div className="flex gap-2 mb-4">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all ${
                activeView === tab.id
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="border-b border-gray-200" />
      </div>

      {/* Content area: left + right split */}
      <div className="flex flex-1 min-h-0">
        {/* Left side */}
        <div className="flex-1 overflow-y-auto show-scrollbar p-6 border-r border-gray-100">
          {activeView === "files" ? (
            <FilesList
              files={filteredFiles}
              linkTargets={linkTargets}
              selectedFileId={selectedFileId}
              onSelectFile={(id) => { setSelectedFileId(id); setActiveSection(null); }}
              onAddFile={handleAddFile}
              onDeleteFile={handleDeleteFile}
              onUpdateLinks={handleUpdateFileLinks}
            />
          ) : (
            <ContentLibrary
              onSectionChange={(section) => { setActiveSection(section); setSelectedFileId(null); }}
            />
          )}
        </div>

        {/* Right side — Bloom AI Chat */}
        <div className="w-[520px] xl:w-[640px] flex-shrink-0 border-l border-gray-100">
          <FileAIChat
            selectedFile={activeView === "files" ? selectedFile : null}
            activeSection={activeView === "library" ? activeSection : null}
          />
        </div>
      </div>
    </div>
  );
};

export default FilesTab;