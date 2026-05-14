import React, { useState, useEffect } from "react";
import {
  LuFolder, LuBookOpen, LuChevronsLeft, LuChevronsRight, LuLibrary,
} from "react-icons/lu";
import FilesList from "../components/librarypage/FilesList";
import StoryList from "../components/librarypage/StoryList";
import FileAIChat from "../components/librarypage/FileAIChat";
import { listFiles, deleteFile, updateFileLinks } from "../services/files";

// Convert backend's [{kind, id, label}] into the flat string array the UI uses
// (raw role id, or "pos-{positionId}" for positions).
const linksToFlat = (links = []) =>
  links.map((l) => (l.kind === "position" ? `pos-${l.id}` : l.id));

// Reverse: split flat array back into role_ids / position_ids for the backend.
const flatToPayload = (flat = []) => {
  const roleIds = [];
  const positionIds = [];
  for (const v of flat) {
    if (typeof v === "string" && v.startsWith("pos-")) {
      positionIds.push(v.slice(4));
    } else {
      roleIds.push(v);
    }
  }
  return { roleIds, positionIds };
};

// Sections in the left sub-nav. Add more here when new library types arrive.
const SECTIONS = [
  { id: "files", label: "My Files", Icon: LuFolder },
  { id: "stories", label: "My Stories", Icon: LuBookOpen },
];

const LibraryPage = ({ data, user, onNavigateToMe }) => {
  const { roles = [], positions = [], files: initialFiles = [] } = data || {};
  const isDemoGuest = user?.is_demo_guest;

  const [files, setFiles] = useState(
    initialFiles.map((f) => ({
      ...f,
      type: f.type || "file",
      size: f.size || null,
      url: f.url || null,
    }))
  );

  // Fetch files on mount.
  useEffect(() => {
    listFiles()
      .then((data) =>
        setFiles(
          data.map((f) => ({
            ...f,
            type: f.type || "file",
            size: f.size || null,
            url: f.url || null,
            linkedTo: linksToFlat(f.links),
          }))
        )
      )
      .catch(() => {}); // fallback: keep initialFiles if request fails
  }, []);

  // --- Sub-nav state ---
  const [activeSection, setActiveSection] = useState("files");
  const [navCollapsed, setNavCollapsed] = useState(false);

  // --- Files-side filter + selection ---
  const [activeRoleId, setActiveRoleId] = useState("all");
  const [selectedFileId, setSelectedFileId] = useState(null);
  const selectedFile = files.find((f) => f.id === selectedFileId);

  // Story selection lives at this level so the AI chat panel can pick it up.
  // Mutually exclusive with file selection — selecting one clears the other.
  const [selectedStory, setSelectedStory] = useState(null);
  const handleSelectStory = (story) => {
    setSelectedStory(story);
    if (story) setSelectedFileId(null);
  };

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
  const handleAddFile = (newFile) => setFiles([...files, newFile]);

  const handleDeleteFile = async (fileId) => {
    try {
      await deleteFile(fileId);
    } catch {}
    setFiles(files.filter((f) => f.id !== fileId));
    if (selectedFileId === fileId) setSelectedFileId(null);
  };

  const handleUpdateFileLinks = async (fileId, newLinks) => {
    const prev = files;
    setFiles(files.map((f) =>
      f.id === fileId ? { ...f, linkedTo: newLinks } : f
    ));
    try {
      await updateFileLinks(fileId, flatToPayload(newLinks));
    } catch {
      setFiles(prev);
    }
  };

  const linkTargets = [
    ...roles.map((r) => ({ id: r.id, label: `${r.emoji} ${r.label}` })),
    ...positions.map((p) => ({
      id: `pos-${p.id}`,
      label: `${p.title}${p.company ? ` @ ${p.company}` : ""}`,
    })),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Title bar — same style as PrepPage / MePage */}
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          {isDemoGuest ? "Explore sample files and stories" : "My Library"}
        </h1>
        <p className="text-sm text-gray-400">
          {isDemoGuest
            ? "Your updates clear in 24h. Save to account to keep them."
            : "Your files and reusable stories — Bloom uses these to ground answers."}
        </p>
      </div>

      {/* Body: left subnav + middle + chat */}
      <div className="flex flex-1 min-h-0 border-t border-gray-200">
        {/* Left sub-nav — collapsible, matches PrepNavigator pattern */}
        {navCollapsed ? (
          <aside className="w-12 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-3 flex-shrink-0">
            <button
              onClick={() => setNavCollapsed(false)}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              title="Expand Library menu"
            >
              <LuChevronsRight size={16} />
            </button>
            <LuLibrary size={16} className="text-gray-400 mt-3" />
            <span className="text-[10px] text-gray-400 mt-2 [writing-mode:vertical-rl] tracking-wider">
              Library
            </span>
          </aside>
        ) : (
          <aside className="w-56 bg-gray-50 border-r border-gray-200 overflow-y-auto show-scrollbar flex-shrink-0">
            <div className="flex items-center justify-between pl-4 pr-2 py-3 border-b border-gray-200 sticky top-0 bg-gray-50 z-10">
              <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                Library
              </span>
              <button
                onClick={() => setNavCollapsed(true)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                title="Collapse"
              >
                <LuChevronsLeft size={16} />
              </button>
            </div>
            <nav className="py-3 flex flex-col gap-1">
              {SECTIONS.map(({ id, label, Icon }) => {
                const active = activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer text-left transition-colors ${
                      active
                        ? "bg-orange-50 text-orange-600 font-medium border-l-2 border-orange-400 -ml-px"
                        : "text-gray-600 hover:bg-white/60 hover:text-gray-800"
                    }`}
                  >
                    <Icon size={14} className="flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Middle pane */}
        <div className="flex-1 overflow-y-auto show-scrollbar p-6">
          {/* Role filter chips — apply to both Files and Stories. Same size as Positions */}
          <div className="flex gap-2 items-center mb-4 flex-wrap">
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

          {activeSection === "files" ? (
            <FilesList
              files={filteredFiles}
              linkTargets={linkTargets}
              selectedFileId={selectedFileId}
              onSelectFile={(id) => { setSelectedFileId(id); setSelectedStory(null); }}
              onAddFile={handleAddFile}
              onDeleteFile={handleDeleteFile}
              onUpdateLinks={handleUpdateFileLinks}
            />
          ) : (
            <StoryList
              roles={roles}
              activeRoleId={activeRoleId}
              onSelectStory={handleSelectStory}
            />
          )}
        </div>

        {/* Right — Bloom AI chat. File context for files; story context for stories. */}
        <div className="w-[480px] xl:w-[560px] flex-shrink-0 border-l border-gray-100">
          <FileAIChat
            selectedFile={activeSection === "files" ? selectedFile : null}
            selectedStory={activeSection === "stories" ? selectedStory : null}
            onClearStory={() => setSelectedStory(null)}
            activeSection={null}
            onNavigateToMe={onNavigateToMe}
          />
        </div>
      </div>
    </div>
  );
};

export default LibraryPage;
