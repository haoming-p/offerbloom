import { useState, useEffect } from "react";
import { LuX, LuCheck } from "react-icons/lu";

const EMOJI_CHOICES = ["💼", "💻", "📊", "🛠️", "📈", "🎨", "🧪", "🚀", "⚙️", "🧠"];

const inputCls =
  "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-300 placeholder-gray-300";

// Inline edit for either a role (label+emoji) or a position (title/company/jd/role).
// Mutates the entity by id — linked questions/answers/practices/stories/preferences
// reference by id, not label, so this is safe and non-destructive.
const EditDialog = ({
  open,
  mode,        // "role" | "position"
  entity,      // current role or position object
  roles = [],  // for position role picker
  onSave,      // (updates) => Promise<void>
  onClose,
}) => {
  // Role fields
  const [roleLabel, setRoleLabel] = useState("");
  const [roleEmoji, setRoleEmoji] = useState("💼");
  // Position fields
  const [posTitle, setPosTitle] = useState("");
  const [posCompany, setPosCompany] = useState("");
  const [posJD, setPosJD] = useState("");
  const [posRoleId, setPosRoleId] = useState("");
  // Common
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !entity) return;
    if (mode === "role") {
      setRoleLabel(entity.label || "");
      setRoleEmoji(entity.emoji || "💼");
    } else {
      setPosTitle(entity.title || "");
      setPosCompany(entity.company || "");
      setPosJD(entity.jd || "");
      setPosRoleId(entity.role || "");
    }
    setError("");
    setSaving(false);
  }, [open, mode, entity]);

  if (!open || !entity) return null;

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      if (mode === "role") {
        const label = roleLabel.trim();
        if (!label) return;
        await onSave({ id: entity.id, label, emoji: roleEmoji });
      } else {
        const title = posTitle.trim();
        if (!title || !posRoleId) return;
        await onSave({
          id: entity.id,
          title,
          company: posCompany.trim(),
          jd: posJD.trim(),
          roleId: posRoleId,
        });
      }
      onClose();
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "role" ? "Edit role" : "Edit position";
  const canSave = mode === "role" ? !!roleLabel.trim() : !!posTitle.trim() && !!posRoleId;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer" title="Close">
            <LuX size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          {mode === "role" ? (
            <>
              <label className="text-xs text-gray-500">Role name</label>
              <input
                autoFocus
                type="text"
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
                placeholder="e.g. Software Engineer"
                className={inputCls}
              />
              <label className="text-xs text-gray-500">Emoji</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_CHOICES.map((e) => (
                  <button
                    key={e}
                    onClick={() => setRoleEmoji(e)}
                    className={`text-lg w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer ${
                      roleEmoji === e
                        ? "bg-orange-100 ring-2 ring-orange-300"
                        : "hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <label className="text-xs text-gray-500">Role</label>
              <select
                value={posRoleId}
                onChange={(e) => setPosRoleId(e.target.value)}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="">Select a role…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.emoji} {r.label}
                  </option>
                ))}
              </select>
              <label className="text-xs text-gray-500">Position title</label>
              <input
                autoFocus
                type="text"
                value={posTitle}
                onChange={(e) => setPosTitle(e.target.value)}
                placeholder="e.g. Senior PM"
                className={inputCls}
              />
              <label className="text-xs text-gray-500">Company</label>
              <input
                type="text"
                value={posCompany}
                onChange={(e) => setPosCompany(e.target.value)}
                placeholder="e.g. Apple"
                className={inputCls}
              />
              <label className="text-xs text-gray-500">Job description (optional)</label>
              <textarea
                value={posJD}
                onChange={(e) => setPosJD(e.target.value)}
                rows={4}
                placeholder="Paste the JD or notes about the role…"
                className={inputCls}
              />
            </>
          )}

          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="text-xs px-4 py-1.5 bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <LuCheck size={12} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditDialog;
