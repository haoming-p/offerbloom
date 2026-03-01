import React, { useState } from "react";

// ============================================================
// Default sections
// ============================================================
const DEFAULT_SECTIONS = [
  { id: "professional", label: "Professional Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
];

// ============================================================
// Markdown toolbar helper — inserts syntax around selection
// ============================================================
const insertMarkdown = (textareaRef, syntax, wrap = true) => {
  const textarea = textareaRef.current;
  if (!textarea) return null;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end);

  let newText;
  let newCursorPos;

  if (wrap) {
    // Wrap selection: **selected** or *selected*
    newText = text.substring(0, start) + syntax + selected + syntax + text.substring(end);
    newCursorPos = selected ? end + syntax.length * 2 : start + syntax.length;
  } else {
    // Prefix line: ## heading or - bullet
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    newText = text.substring(0, lineStart) + syntax + text.substring(lineStart);
    newCursorPos = start + syntax.length;
  }

  // Return new text + cursor position — parent handles setState
  return { newText, newCursorPos };
};

// ============================================================
// Simple markdown renderer — renders basic markdown to JSX
// ============================================================
const renderMarkdown = (text) => {
  if (!text) return null;

  return text.split("\n").map((line, i) => {
    // Heading ##
    if (line.startsWith("## ")) {
      return (
        <h2 key={i} className="text-base font-bold text-gray-800 mt-4 mb-1">
          {formatInline(line.substring(3))}
        </h2>
      );
    }
    // Heading #
    if (line.startsWith("# ")) {
      return (
        <h1 key={i} className="text-lg font-bold text-gray-800 mt-4 mb-1">
          {formatInline(line.substring(2))}
        </h1>
      );
    }
    // Bullet
    if (line.startsWith("- ")) {
      return (
        <div key={i} className="flex gap-2 ml-2">
          <span className="text-gray-400">•</span>
          <span className="text-sm text-gray-600">{formatInline(line.substring(2))}</span>
        </div>
      );
    }
    // Empty line
    if (line.trim() === "") {
      return <div key={i} className="h-2" />;
    }
    // Normal paragraph
    return (
      <p key={i} className="text-sm text-gray-600">
        {formatInline(line)}
      </p>
    );
  });
};

// Inline formatting: **bold** and *italic*
const formatInline = (text) => {
  // Split by **bold** and *italic* patterns
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Check for **bold**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Check for *italic*
    const italicMatch = remaining.match(/\*(.+?)\*/);

    // Find the earliest match
    const boldIndex = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity;
    const italicIndex = italicMatch ? remaining.indexOf(italicMatch[0]) : Infinity;

    if (boldIndex === Infinity && italicIndex === Infinity) {
      // No more formatting
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    if (boldIndex <= italicIndex) {
      // Bold first
      if (boldIndex > 0) {
        parts.push(<span key={key++}>{remaining.substring(0, boldIndex)}</span>);
      }
      parts.push(
        <strong key={key++} className="font-semibold text-gray-800">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.substring(boldIndex + boldMatch[0].length);
    } else {
      // Italic first
      if (italicIndex > 0) {
        parts.push(<span key={key++}>{remaining.substring(0, italicIndex)}</span>);
      }
      parts.push(
        <em key={key++} className="italic">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.substring(italicIndex + italicMatch[0].length);
    }
  }

  return parts;
};

// ============================================================
// ContentLibrary component
// ============================================================
// Props:
// - onSectionChange: callback to notify parent of active section (for AI chat context)
const ContentLibrary = ({ onSectionChange }) => {
  // --- Sections ---
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id || "");

  // --- Content per section ---
  const [contents, setContents] = useState({
    professional:
      "# Professional Experience\n\n## Product Manager @ Company A\n*Jan 2023 – Present*\n\n- Led cross-functional team of 8 engineers and designers\n- **Increased user retention by 25%** through data-driven feature prioritization\n- Managed $2M annual budget for product development\n\n## Technical PM Intern @ Company B\n*Summer 2022*\n\n- Shipped recommendation engine serving 10M daily users\n- Reduced API latency by 40% through caching strategy",
    projects:
      "# Projects\n\n## OfferBloom — AI Interview Prep Platform\n*React, FastAPI, Neo4j, OpenAI*\n\n- Built **knowledge graph** for interview question management\n- Designed multi-agent system with Interviewer, Evaluator, and Coach roles\n- Implemented drag-and-drop question organization with version control\n\n## ML Fraud Detection Pipeline\n*Python, TensorFlow, AWS*\n\n- Developed end-to-end pipeline processing 1M+ transactions daily\n- Achieved **98.5% accuracy** with ensemble model approach",
    skills:
      "# Skills\n\n## Technical\n- **Languages:** Python, JavaScript, TypeScript, SQL\n- **Frontend:** React, Tailwind CSS, TipTap\n- **Backend:** FastAPI, Node.js, Neo4j, PostgreSQL\n- **ML/AI:** TensorFlow, SpaCy, LangChain, OpenAI API\n\n## Product\n- Product strategy and roadmapping\n- A/B testing and experimentation\n- User research and stakeholder management\n\n## Tools\n- Figma, Jira, Notion, Git, AWS",
  });

  // --- Edit vs preview mode ---
  const [mode, setMode] = useState("edit"); // "edit" | "preview"

  // --- Section management ---
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editSectionLabel, setEditSectionLabel] = useState("");

  // --- Textarea ref for markdown toolbar ---
  const textareaRef = React.useRef(null);

  // ============================================================
  // Derived
  // ============================================================
  const activeSection = sections.find((s) => s.id === activeSectionId);
  const activeContent = contents[activeSectionId] || "";

  // ============================================================
  // Section handlers
  // ============================================================

  const handleSwitchSection = (sectionId) => {
    setActiveSectionId(sectionId);
    onSectionChange?.(sections.find((s) => s.id === sectionId) || null);
  };

  const handleAddSection = () => {
    if (!newSectionLabel.trim()) return;
    const newSection = {
      id: `section-${Date.now()}`,
      label: newSectionLabel.trim(),
    };
    setSections([...sections, newSection]);
    setActiveSectionId(newSection.id);
    setContents({ ...contents, [newSection.id]: `# ${newSectionLabel.trim()}\n\n` });
    setNewSectionLabel("");
    setShowAddSection(false);
    onSectionChange?.(newSection);
  };

  const handleAddSectionKeyDown = (e) => {
    if (e.key === "Enter") handleAddSection();
    if (e.key === "Escape") { setShowAddSection(false); setNewSectionLabel(""); }
  };

  const handleStartEditSection = (e, section) => {
    e.stopPropagation();
    setEditingSectionId(section.id);
    setEditSectionLabel(section.label);
  };

  const handleSaveEditSection = () => {
    if (!editSectionLabel.trim()) return;
    setSections(sections.map((s) =>
      s.id === editingSectionId ? { ...s, label: editSectionLabel.trim() } : s
    ));
    setEditingSectionId(null);
  };

  const handleEditSectionKeyDown = (e) => {
    if (e.key === "Enter") handleSaveEditSection();
    if (e.key === "Escape") setEditingSectionId(null);
  };

  const handleDeleteSection = (e, sectionId) => {
    e.stopPropagation();
    setSections(sections.filter((s) => s.id !== sectionId));
    const newContents = { ...contents };
    delete newContents[sectionId];
    setContents(newContents);
    if (activeSectionId === sectionId) {
      const remaining = sections.filter((s) => s.id !== sectionId);
      setActiveSectionId(remaining[0]?.id || "");
    }
  };

  // ============================================================
  // Content editing
  // ============================================================

  const handleContentChange = (e) => {
    setContents({ ...contents, [activeSectionId]: e.target.value });
  };

  // Toolbar actions
  const handleToolbar = (action) => {
    let result;
    switch (action) {
      case "bold":
        result = insertMarkdown(textareaRef, "**");
        break;
      case "italic":
        result = insertMarkdown(textareaRef, "*");
        break;
      case "h1":
        result = insertMarkdown(textareaRef, "# ", false);
        break;
      case "h2":
        result = insertMarkdown(textareaRef, "## ", false);
        break;
      case "bullet":
        result = insertMarkdown(textareaRef, "- ", false);
        break;
      default:
        return;
    }
    if (result) {
      setContents({ ...contents, [activeSectionId]: result.newText });
      // Restore cursor position after state update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(result.newCursorPos, result.newCursorPos);
        }
      }, 0);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Section tabs */}
      <div className="flex gap-2 items-center mb-4 flex-wrap">
        {sections.map((section) => {
          if (editingSectionId === section.id) {
            return (
              <div key={section.id} className="flex gap-1 items-center">
                <input
                  type="text"
                  value={editSectionLabel}
                  onChange={(e) => setEditSectionLabel(e.target.value)}
                  onKeyDown={handleEditSectionKeyDown}
                  autoFocus
                  className="border border-orange-400 rounded-lg px-3 py-1 text-sm w-40"
                />
                <button onClick={handleSaveEditSection} className="text-orange-400 text-xs cursor-pointer">✓</button>
                <button onClick={() => setEditingSectionId(null)} className="text-gray-400 text-xs cursor-pointer">✕</button>
              </div>
            );
          }
          return (
            <div key={section.id} className="group relative">
              <button
                onClick={() => handleSwitchSection(section.id)}
                className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all ${
                  activeSectionId === section.id
                    ? "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {section.label}
              </button>
              <div className="hidden group-hover:flex absolute -top-2 -right-2 gap-0.5">
                <button
                  onClick={(e) => handleStartEditSection(e, section)}
                  className="w-4 h-4 bg-white border border-gray-200 rounded-full flex items-center justify-center
                    text-gray-400 hover:text-gray-600 cursor-pointer"
                  style={{ fontSize: "8px" }}
                >
                  ✎
                </button>
                <button
                  onClick={(e) => handleDeleteSection(e, section.id)}
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

        {/* Add section */}
        {showAddSection ? (
          <div className="flex gap-1 items-center">
            <input
              type="text"
              value={newSectionLabel}
              onChange={(e) => setNewSectionLabel(e.target.value)}
              onKeyDown={handleAddSectionKeyDown}
              placeholder="Section name..."
              autoFocus
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm placeholder-gray-300 w-36"
            />
            <button onClick={handleAddSection} className="text-orange-400 text-sm cursor-pointer">Add</button>
            <button onClick={() => { setShowAddSection(false); setNewSectionLabel(""); }} className="text-gray-400 text-sm cursor-pointer">✕</button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddSection(true)}
            className="px-3 py-1.5 rounded-lg text-sm border border-dashed border-gray-200
              text-gray-400 hover:border-gray-300 cursor-pointer"
          >
            +
          </button>
        )}

        {/* Edit / Preview toggle — pushed to right */}
        <div className="ml-auto flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setMode("edit")}
            className={`px-3 py-1 rounded-md text-xs cursor-pointer transition-all ${
              mode === "edit" ? "bg-white text-gray-700 shadow-sm" : "text-gray-400"
            }`}
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => setMode("preview")}
            className={`px-3 py-1 rounded-md text-xs cursor-pointer transition-all ${
              mode === "preview" ? "bg-white text-gray-700 shadow-sm" : "text-gray-400"
            }`}
          >
            👁️ Preview
          </button>
        </div>
      </div>

      {/* Editor area */}
      {activeSection ? (
        <div className="flex-1 flex flex-col min-h-0">
          {mode === "edit" ? (
            <>
              {/* Formatting toolbar */}
              <div className="flex gap-1 mb-2 pb-2 border-b border-gray-100">
                <button
                  onClick={() => handleToolbar("h1")}
                  className="px-2 py-1 text-xs bg-gray-50 rounded hover:bg-gray-100 cursor-pointer text-gray-500 font-bold"
                >
                  H1
                </button>
                <button
                  onClick={() => handleToolbar("h2")}
                  className="px-2 py-1 text-xs bg-gray-50 rounded hover:bg-gray-100 cursor-pointer text-gray-500 font-semibold"
                >
                  H2
                </button>
                <div className="w-px bg-gray-200 mx-1" />
                <button
                  onClick={() => handleToolbar("bold")}
                  className="px-2 py-1 text-xs bg-gray-50 rounded hover:bg-gray-100 cursor-pointer text-gray-500 font-bold"
                >
                  B
                </button>
                <button
                  onClick={() => handleToolbar("italic")}
                  className="px-2 py-1 text-xs bg-gray-50 rounded hover:bg-gray-100 cursor-pointer text-gray-500 italic"
                >
                  I
                </button>
                <div className="w-px bg-gray-200 mx-1" />
                <button
                  onClick={() => handleToolbar("bullet")}
                  className="px-2 py-1 text-xs bg-gray-50 rounded hover:bg-gray-100 cursor-pointer text-gray-500"
                >
                  • List
                </button>
              </div>

              {/* Textarea editor */}
              <textarea
                ref={textareaRef}
                value={activeContent}
                onChange={handleContentChange}
                className="flex-1 w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700
                  font-mono resize-none outline-none focus:border-orange-400 show-scrollbar"
                placeholder="Start writing..."
              />
            </>
          ) : (
            // Preview mode
            <div className="flex-1 overflow-y-auto show-scrollbar bg-white border border-gray-200 rounded-lg px-6 py-4">
              {activeContent ? (
                renderMarkdown(activeContent)
              ) : (
                <p className="text-gray-300 text-sm text-center py-8">
                  Nothing to preview — switch to Edit and start writing
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-300">
          <span className="text-sm">No sections yet — click "+" to add one</span>
        </div>
      )}
    </div>
  );
};

export default ContentLibrary;