import { useEffect, useState } from "react";
import {
  LuPencil, LuTrash2, LuPlus, LuCheck, LuX,
  LuChevronDown, LuChevronRight, LuChevronsLeft, LuChevronsRight,
  LuUser,
} from "react-icons/lu";
import {
  listPreferences,
  createPreference,
  updatePreference,
  deletePreference,
} from "../services/preferences";

const SCOPE_OPTIONS = [
  { value: "prep", label: "Prep AI" },
  { value: "files", label: "Library AI" },
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
// Defaults follow the currently-selected filter so adding from "Prep · PM"
// pre-fills scope=prep, role=pm without the user having to re-pick.
const AddPreferenceForm = ({ roles, onAdd, defaultScope = "all", defaultRoleId = "" }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [scope, setScope] = useState(defaultScope);
  const [roleId, setRoleId] = useState(defaultRoleId);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setText("");
    setScope(defaultScope);
    setRoleId(defaultRoleId);
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

// View id encodes the filter: "all" | "prep:null" | "prep:<roleId>" | "files"
// | "all-chats" | "account". A single string keeps state-management trivial.
const matchesView = (pref, view) => {
  switch (view) {
    case "all":
      return true;
    case "files":
      return pref.scope === "files";
    case "all-chats":
      return pref.scope === "all";
    case "prep:null":
      return pref.scope === "prep" && !pref.role_id;
    default:
      if (view.startsWith("prep:")) {
        const roleId = view.slice(5);
        return pref.scope === "prep" && pref.role_id === roleId;
      }
      return false;
  }
};

const viewDefaults = (view) => {
  if (view === "files") return { scope: "files", roleId: "" };
  if (view === "all-chats") return { scope: "all", roleId: "" };
  if (view === "prep:null") return { scope: "prep", roleId: "" };
  if (view.startsWith("prep:")) return { scope: "prep", roleId: view.slice(5) };
  return { scope: "all", roleId: "" };
};

const MePage = ({ user, roles = [], onLogout }) => {
  const isDemoGuest = user?.is_demo_guest;
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const [prefs, setPrefs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeView, setActiveView] = useState("all");

  // Left-nav UI state — match PrepNavigator's collapsible group + whole-nav
  // collapse so Me page reads visually as a peer of Prep page.
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [prefsGroupOpen, setPrefsGroupOpen] = useState(true);
  const [prepGroupOpen, setPrepGroupOpen] = useState(true);

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

  // Pre-compute counts so the left nav can show "(n)" without re-iterating.
  const countFor = (view) => prefs.filter((p) => matchesView(p, view)).length;

  // Right-panel header / sub-header lookups, keyed by view id.
  const headerForView = (view) => {
    if (view === "all") return { title: "All", sub: "Every saved rule." };
    if (view === "files") return { title: "Library AI", sub: "Apply in the Library AI chat." };
    if (view === "all-chats") return { title: "All chats", sub: "Apply to every chat (prep + files)." };
    if (view === "prep:null")
      return { title: "Prep AI · All roles", sub: "Apply when prepping for any role." };
    if (view.startsWith("prep:")) {
      const role = roles.find((r) => r.id === view.slice(5));
      const label = role?.label || view.slice(5);
      return { title: `Prep AI · ${label}`, sub: `Apply only when prepping for ${label}.` };
    }
    return { title: "", sub: "" };
  };

  const filteredPrefs =
    activeView === "account" ? [] : prefs.filter((p) => matchesView(p, activeView));
  const { scope: addDefaultScope, roleId: addDefaultRoleId } =
    activeView === "account" ? { scope: "all", roleId: "" } : viewDefaults(activeView);

  const renderRightHeader = () => {
    const { title, sub } = headerForView(activeView);
    if (!title) return null;
    return (
      <>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">{title}</h2>
        {sub && <p className="text-xs text-gray-400 mb-4">{sub}</p>}
      </>
    );
  };

  // Reusable nav button (leaf). Renders with the same active styling as
  // PrepNavigator: orange-50 bg + orange-400 left border.
  const NavLeaf = ({ view, label, indent }) => {
    const active = activeView === view;
    return (
      <button
        onClick={() => setActiveView(view)}
        className={`flex items-center justify-between gap-2 pr-4 py-2 text-sm cursor-pointer text-left transition-colors ${indent} ${
          active
            ? "bg-orange-50 text-orange-600 font-medium border-l-2 border-orange-400 -ml-px"
            : "text-gray-500 hover:bg-white/60 hover:text-gray-800"
        }`}
      >
        <span className="truncate">{label}</span>
        <span className={`text-[10px] ${active ? "text-orange-500" : "text-gray-300"}`}>
          {countFor(view)}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Title bar — matches PrepPage style */}
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          {isDemoGuest ? "Explore the demo account" : "Me"}
        </h1>
        <p className="text-sm text-gray-400">
          {isDemoGuest
            ? "Your updates clear in 24h. Save to account to keep them."
            : "Manage your AI preferences and account."}
        </p>
      </div>

      {/* Body: left nav + right panel */}
      <div className="flex flex-1 min-h-0 border-t border-gray-200">
        {/* Left nav — same shape as PrepNavigator (collapsible group + whole-nav collapse) */}
        {navCollapsed ? (
          <aside className="w-12 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-3 flex-shrink-0">
            <button
              onClick={() => setNavCollapsed(false)}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              title="Expand Me menu"
            >
              <LuChevronsRight size={16} />
            </button>
            <LuUser size={16} className="text-gray-400 mt-3" />
            <span className="text-[10px] text-gray-400 mt-2 [writing-mode:vertical-rl] tracking-wider">
              Me
            </span>
          </aside>
        ) : (
          <aside className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto show-scrollbar flex-shrink-0">
            {/* Header: title + collapse */}
            <div className="flex items-center justify-between pl-4 pr-2 py-3 border-b border-gray-200 sticky top-0 bg-gray-50 z-10">
              <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                Me
              </span>
              <button
                onClick={() => setNavCollapsed(true)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                title="Collapse"
              >
                <LuChevronsLeft size={16} />
              </button>
            </div>

            <div className="py-3">
              {/* My AI Preferences — top-level collapsible group */}
              <div className="mb-2">
                <button
                  onClick={() => setPrefsGroupOpen((v) => !v)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-white/60 cursor-pointer"
                >
                  {prefsGroupOpen ? (
                    <LuChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                  ) : (
                    <LuChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                  )}
                  <span className="truncate">My AI Preferences</span>
                </button>

                {prefsGroupOpen && (
                  <div className="flex flex-col">
                    <NavLeaf view="all" label="All" indent="pl-10" />

                    {/* Prep AI — nested collapsible sub-group */}
                    <button
                      onClick={() => setPrepGroupOpen((v) => !v)}
                      className="flex items-center gap-2 pl-10 pr-4 py-2 text-sm text-gray-600 hover:bg-white/60 hover:text-gray-800 cursor-pointer text-left transition-colors"
                    >
                      {prepGroupOpen ? (
                        <LuChevronDown size={13} className="text-gray-400 flex-shrink-0" />
                      ) : (
                        <LuChevronRight size={13} className="text-gray-400 flex-shrink-0" />
                      )}
                      <span className="truncate">Prep AI</span>
                    </button>
                    {prepGroupOpen && (
                      <div className="flex flex-col">
                        <NavLeaf view="prep:null" label="All roles" indent="pl-16" />
                        {roles.map((r) => (
                          <NavLeaf
                            key={r.id}
                            view={`prep:${r.id}`}
                            label={r.label}
                            indent="pl-16"
                          />
                        ))}
                      </div>
                    )}

                    <NavLeaf view="files" label="Library AI" indent="pl-10" />
                    <NavLeaf view="all-chats" label="All chats" indent="pl-10" />
                  </div>
                )}
              </div>

              {/* Account — flat item (no children, no chevron) */}
              <button
                onClick={() => setActiveView("account")}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium cursor-pointer text-left transition-colors ${
                  activeView === "account"
                    ? "bg-orange-50 text-orange-600 border-l-2 border-orange-400 -ml-px"
                    : "text-gray-700 hover:bg-white/60"
                }`}
              >
                {/* Spacer so this aligns with chevron-headed groups above */}
                <span className="w-[14px] flex-shrink-0" />
                <span className="truncate">Account</span>
              </button>
            </div>
          </aside>
        )}

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto show-scrollbar p-8">
          <div className="max-w-2xl">
            {activeView === "account" ? (
              <>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Account</h2>
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
              </>
            ) : (
              <>
                {renderRightHeader()}
                <div className="flex flex-col gap-2">
                  {loaded && filteredPrefs.length === 0 && (
                    <p className="text-xs text-gray-300 text-center py-3">
                      No preferences here yet — add one below or save from a chat message.
                    </p>
                  )}
                  {filteredPrefs.map((p) => (
                    <PreferenceRow
                      key={p.id}
                      pref={p}
                      roles={roles}
                      onSave={handleSave}
                      onDelete={handleDelete}
                    />
                  ))}
                  <AddPreferenceForm
                    key={activeView}
                    roles={roles}
                    onAdd={handleAdd}
                    defaultScope={addDefaultScope}
                    defaultRoleId={addDefaultRoleId}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MePage;
