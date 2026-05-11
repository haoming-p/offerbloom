import { useEffect, useState } from "react";
import { LuPencil, LuTrash2, LuPlus, LuCheck, LuX } from "react-icons/lu";
import RichTextEditor from "../RichTextEditor";
import {
  listStories,
  createStory,
  updateStory,
  deleteStory,
} from "../../services/stories";

const stripHtml = (html) => {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};

// Single story card. Read-only collapsed; click → inline expand with the same
// RichTextEditor used by Answer drafts. Auto-saves on Save click only — no
// debounce magic, so the user always knows when state is persisted.
const StoryCard = ({ story, roles, expanded, onExpand, onCollapse, onSave, onDelete }) => {
  const [draftTitle, setDraftTitle] = useState(story.title);
  const [draftContent, setDraftContent] = useState(story.content);
  const [draftRole, setDraftRole] = useState(story.role_id || "");
  const [saving, setSaving] = useState(false);

  // Re-sync drafts when the underlying story changes (e.g. after a parent-side
  // update from another card). Prevents stale text after a save round-trip.
  useEffect(() => {
    setDraftTitle(story.title);
    setDraftContent(story.content);
    setDraftRole(story.role_id || "");
  }, [story.id, story.title, story.content, story.role_id]);

  const handleSave = async () => {
    const title = draftTitle.trim();
    if (!title) return;
    setSaving(true);
    try {
      await onSave(story.id, { title, content: draftContent, roleId: draftRole });
      onCollapse();
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftTitle(story.title);
    setDraftContent(story.content);
    setDraftRole(story.role_id || "");
    onCollapse();
  };

  const roleLabel = story.role_id
    ? (roles.find((r) => r.id === story.role_id)?.label || story.role_id)
    : "All roles";

  if (!expanded) {
    const preview = stripHtml(story.content).slice(0, 140);
    return (
      <div
        onClick={onExpand}
        className="bg-white rounded-xl border border-gray-200 px-5 py-4 cursor-pointer hover:border-orange-200 flex items-start gap-3"
      >
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <h3 className="text-sm font-semibold text-gray-800 truncate leading-relaxed">
            {story.title}
          </h3>
          {preview && (
            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{preview}</p>
          )}
          <span className="text-[10px] uppercase tracking-wide self-start px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-200">
            {roleLabel}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onExpand(); }}
            className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded cursor-pointer"
            title="Edit"
          >
            <LuPencil size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(story.id); }}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded cursor-pointer"
            title="Delete"
          >
            <LuTrash2 size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-orange-200 ring-1 ring-orange-100 px-5 py-4 flex flex-col gap-3">
      <input
        type="text"
        value={draftTitle}
        onChange={(e) => setDraftTitle(e.target.value)}
        placeholder="Story title (e.g. Onboarding intern team)"
        className="w-full text-sm font-semibold text-gray-800 border border-gray-200 rounded px-3 py-2 placeholder-gray-300 focus:outline-none focus:border-orange-300"
      />
      <RichTextEditor
        value={draftContent}
        onChange={setDraftContent}
        placeholder="Write the story once — Bloom can reuse it across questions."
      />
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs text-gray-500">Applies to</label>
        <select
          value={draftRole}
          onChange={(e) => setDraftRole(e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer"
        >
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          onClick={handleCancel}
          disabled={saving}
          className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700 cursor-pointer flex items-center gap-1"
        >
          <LuX size={12} /> Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !draftTitle.trim()}
          className="text-xs px-3 py-1.5 bg-orange-400 text-white rounded hover:bg-orange-500 cursor-pointer disabled:opacity-50 flex items-center gap-1"
        >
          <LuCheck size={12} /> {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
};

const StoryList = ({ roles = [], activeRoleId = "all", onSelectStory }) => {
  const [stories, setStories] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // The expanded story is also the AI-focused one. When it changes, notify the
  // parent so the chat panel can show the right banner + send story content
  // as context.
  useEffect(() => {
    if (!onSelectStory) return;
    onSelectStory(expandedId ? stories.find((s) => s.id === expandedId) || null : null);
  }, [expandedId, stories, onSelectStory]);

  useEffect(() => {
    let cancelled = false;
    listStories()
      .then((data) => {
        if (!cancelled) {
          setStories(data);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter: "all" shows everything. A specific role shows that role + null-tagged
  // (universal) stories — keeps cross-role narratives visible everywhere.
  const filteredStories = stories.filter((s) => {
    if (activeRoleId === "all") return true;
    if (!s.role_id) return true;
    return s.role_id === activeRoleId;
  });

  const handleAdd = async () => {
    // Seed default role to current filter so adding while on PM tab → PM story.
    const defaultRole = activeRoleId === "all" ? null : activeRoleId;
    try {
      const created = await createStory({ title: "Untitled story", content: "", roleId: defaultRole });
      setStories((prev) => [created, ...prev]);
      setExpandedId(created.id);
    } catch {}
  };

  const handleSave = async (id, patch) => {
    const updated = await updateStory(id, patch);
    setStories((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };

  const handleDelete = async (id) => {
    try {
      await deleteStory(id);
      setStories((prev) => prev.filter((s) => s.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch {}
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          My Stories ({filteredStories.length})
        </h3>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer"
        >
          <LuPlus size={13} /> New story
        </button>
      </div>

      {loaded && filteredStories.length === 0 && (
        <p className="text-xs text-gray-300 text-center py-8">
          No stories here yet — click "+ New story" to add one.
        </p>
      )}

      {filteredStories.map((s) => (
        <StoryCard
          key={s.id}
          story={s}
          roles={roles}
          expanded={expandedId === s.id}
          onExpand={() => setExpandedId(s.id)}
          onCollapse={() => setExpandedId(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
};

export default StoryList;
