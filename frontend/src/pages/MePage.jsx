import { useEffect, useState } from "react";
import { LuPencil, LuTrash2, LuPlus, LuCheck, LuX } from "react-icons/lu";
import {
  listPreferences,
  createPreference,
  updatePreference,
  deletePreference,
} from "../services/preferences";

const SCOPE_OPTIONS = [
  { value: "prep", label: "Prep AI" },
  { value: "files", label: "Files AI" },
  { value: "all", label: "All chats" },
];

const scopeLabel = (s) => SCOPE_OPTIONS.find((o) => o.value === s)?.label || s;

// Renders one preference row: read-only summary OR an inline edit form.
const PreferenceRow = ({ pref, roles, onSave, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(pref.text);
  const [draftScope, setDraftScope] = useState(pref.scope);
  const [draftRole, setDraftRole] = useState(pref.role_id || "");
  const [saving, setSaving] = useState(false);

  const beginEdit = () => {
    setDraftText(pref.text);
    setDraftScope(pref.scope);
    setDraftRole(pref.role_id || "");
    setEditing(true);
  };

  const handleSave = async () => {
    const t = draftText.trim();
    if (!t) return;
    setSaving(true);
    try {
      await onSave(pref.id, {
        text: t,
        scope: draftScope,
        roleId: draftScope === "prep" ? draftRole : "",
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const roleName = pref.role_id
    ? roles.find((r) => r.id === pref.role_id)?.label || pref.role_id
    : null;

  if (!editing) {
    return (
      <div className="border border-gray-200 rounded-lg px-4 py-3 bg-white flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{pref.text}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-orange-50 text-orange-500 border border-orange-100">
              {scopeLabel(pref.scope)}
            </span>
            {pref.scope === "prep" && (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-200">
                {roleName ? roleName : "All roles"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={beginEdit}
            className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded cursor-pointer"
            title="Edit"
          >
            <LuPencil size={13} />
          </button>
          <button
            onClick={() => onDelete(pref.id)}
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
    <div className="border border-orange-200 rounded-lg px-4 py-3 bg-orange-50/40 flex flex-col gap-2">
      <textarea
        value={draftText}
        onChange={(e) => setDraftText(e.target.value)}
        rows={3}
        className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-orange-300 bg-white"
      />
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-gray-500">Applies to</label>
        <select
          value={draftScope}
          onChange={(e) => setDraftScope(e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer"
        >
          {SCOPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {draftScope === "prep" && (
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
        )}
        <div className="flex-1" />
        <button
          onClick={() => setEditing(false)}
          disabled={saving}
          className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 cursor-pointer flex items-center gap-1"
        >
          <LuX size={12} /> Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !draftText.trim()}
          className="text-xs px-3 py-1 bg-orange-400 text-white rounded hover:bg-orange-500 cursor-pointer disabled:opacity-50 flex items-center gap-1"
        >
          <LuCheck size={12} /> Save
        </button>
      </div>
    </div>
  );
};

// Inline "+ Add preference" form. Collapsed to a button until clicked.
const AddPreferenceForm = ({ roles, onAdd }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [scope, setScope] = useState("all");
  const [roleId, setRoleId] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setText("");
    setScope("all");
    setRoleId("");
  };

  const handleAdd = async () => {
    const t = text.trim();
    if (!t) return;
    setSaving(true);
    try {
      await onAdd({ text: t, scope, roleId: scope === "prep" ? roleId || null : null });
      reset();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 border border-dashed border-gray-300 text-sm text-gray-500 hover:border-orange-300 hover:text-orange-500 rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
      >
        <LuPlus size={14} /> Add preference
      </button>
    );
  }

  return (
    <div className="border border-orange-200 rounded-lg px-4 py-3 bg-orange-50/40 flex flex-col gap-2">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder='e.g. "For framework questions, use numbered steps instead of STAR."'
        className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 placeholder-gray-300 focus:outline-none focus:border-orange-300 bg-white"
      />
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-gray-500">Applies to</label>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer"
        >
          {SCOPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {scope === "prep" && (
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer"
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        )}
        <div className="flex-1" />
        <button
          onClick={() => { reset(); setOpen(false); }}
          disabled={saving}
          className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleAdd}
          disabled={saving || !text.trim()}
          className="text-xs px-3 py-1 bg-orange-400 text-white rounded hover:bg-orange-500 cursor-pointer disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add"}
        </button>
      </div>
    </div>
  );
};

const MePage = ({ user, roles = [], onLogout }) => {
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const [prefs, setPrefs] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listPreferences()
      .then((data) => {
        if (!cancelled) {
          setPrefs(data);
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

  const handleAdd = async ({ text, scope, roleId }) => {
    const created = await createPreference({ text, scope, roleId });
    setPrefs((prev) => [created, ...prev]);
  };

  const handleSave = async (id, patch) => {
    const updated = await updatePreference(id, patch);
    setPrefs((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  const handleDelete = async (id) => {
    await deletePreference(id);
    setPrefs((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto show-scrollbar">
      {/* Title bar — matches PrepTab style */}
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Me</h1>
        <p className="text-sm text-gray-400">
          Manage your AI preferences and account.
        </p>
      </div>

      <div className="px-8 pb-8 max-w-2xl flex flex-col gap-6">
        {/* My AI Preferences */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-1">My AI Preferences</h2>
          <p className="text-xs text-gray-400 mb-3">
            Style rules Bloom follows when chatting. Add them here or click
            "Remember this" next to a chat message.
          </p>

          <div className="flex flex-col gap-2">
            {loaded && prefs.length === 0 && (
              <p className="text-xs text-gray-300 text-center py-3">
                No preferences yet — add one below or save from a chat message.
              </p>
            )}
            {prefs.map((p) => (
              <PreferenceRow
                key={p.id}
                pref={p}
                roles={roles}
                onSave={handleSave}
                onDelete={handleDelete}
              />
            ))}
            <AddPreferenceForm roles={roles} onAdd={handleAdd} />
          </div>
        </section>

        {/* My Account */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">My Account</h2>

          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-xl font-bold text-orange-500">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{user?.name || "—"}</p>
                <p className="text-sm text-gray-400">{user?.email || "—"}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 text-sm text-gray-500">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-400">Name</span>
                <span className="font-medium text-gray-700">{user?.name || "—"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Email</span>
                <span className="font-medium text-gray-700">{user?.email || "—"}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-2.5 border border-red-200 text-red-400 rounded-xl text-sm hover:bg-red-50 hover:border-red-300 cursor-pointer transition-all"
          >
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
};

export default MePage;
