import { useState, useEffect } from "react";
import { LuX, LuArrowRight, LuUpload, LuCheck } from "react-icons/lu";

// Quick emoji palette for the role picker. Users get one click of common
// choices; a free-text emoji input would be nice but adds complexity.
const EMOJI_CHOICES = ["💼", "💻", "📊", "🛠️", "📈", "🎨", "🧪", "🚀", "⚙️", "🧠"];

const inputCls =
  "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-300 placeholder-gray-300";

// Multi-step add modal. Two entry modes:
//   - mode="role": Role → Position (optional) → File (optional)
//   - mode="position": Position → File (optional)
// Each step persists on click. Closing mid-wizard keeps anything saved so far.
const AddWizard = ({
  open,
  mode = "role",
  initialRoleId = "",
  roles = [],
  onAddRole,
  onAddPosition,
  onUploadFile,
  onClose,
}) => {
  const [step, setStep] = useState(mode === "role" ? "role" : "position");
  const [savedRole, setSavedRole] = useState(null);
  const [savedPosition, setSavedPosition] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // role form
  const [roleLabel, setRoleLabel] = useState("");
  const [roleEmoji, setRoleEmoji] = useState("💼");

  // position form
  const [posTitle, setPosTitle] = useState("");
  const [posCompany, setPosCompany] = useState("");
  const [posJD, setPosJD] = useState("");
  const [posRoleId, setPosRoleId] = useState(initialRoleId);

  // file form
  const [file, setFile] = useState(null);

  // Reset internal state whenever the wizard opens — keeps prior session's
  // half-typed text from leaking into a fresh open.
  useEffect(() => {
    if (!open) return;
    setStep(mode === "role" ? "role" : "position");
    setSavedRole(null);
    setSavedPosition(null);
    setSaving(false);
    setError("");
    setRoleLabel("");
    setRoleEmoji("💼");
    setPosTitle("");
    setPosCompany("");
    setPosJD("");
    setPosRoleId(initialRoleId);
    setFile(null);
  }, [open, mode, initialRoleId]);

  if (!open) return null;

  const handleSaveRole = async () => {
    const label = roleLabel.trim();
    if (!label) return;
    setSaving(true);
    setError("");
    try {
      const role = await onAddRole(label, roleEmoji);
      setSavedRole(role);
      setPosRoleId(role.id);
      setStep("position");
    } catch (e) {
      setError(e.message || "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePosition = async () => {
    const title = posTitle.trim();
    if (!title || !posRoleId) return;
    setSaving(true);
    setError("");
    try {
      const pos = await onAddPosition({
        roleId: posRoleId,
        title,
        company: posCompany.trim(),
        jd: posJD.trim(),
      });
      setSavedPosition(pos);
      setStep("file");
    } catch (e) {
      setError(e.message || "Failed to save position");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadFile = async () => {
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      await onUploadFile(file, {
        roleId: savedRole?.id || posRoleId || null,
        positionId: savedPosition?.id || null,
      });
      onClose();
    } catch (e) {
      setError(e.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const stepTitle =
    step === "role"
      ? "Add a new role"
      : step === "position"
      ? savedRole
        ? `Add a position for ${savedRole.label}`
        : "Add a new position"
      : `Attach a file${
          savedPosition ? ` to ${savedPosition.title}` : savedRole ? ` to ${savedRole.label}` : ""
        }`;

  const totalSteps = mode === "role" ? 3 : 2;
  const stepNum = step === "role" ? 1 : step === "position" ? (mode === "role" ? 2 : 1) : (mode === "role" ? 3 : 2);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-800">{stepTitle}</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Step {stepNum} of {totalSteps}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
            title="Close"
          >
            <LuX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-3">
          {step === "role" && (
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
          )}

          {step === "position" && (
            <>
              <label className="text-xs text-gray-500">Role</label>
              <select
                value={posRoleId}
                onChange={(e) => setPosRoleId(e.target.value)}
                disabled={!!savedRole}
                className={`${inputCls} cursor-pointer disabled:opacity-60 disabled:cursor-default`}
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
                autoFocus={!!savedRole}
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

          {step === "file" && (
            <>
              <p className="text-xs text-gray-500">
                Attach a file (resume, JD, cover letter) — it'll auto-link to{" "}
                {savedPosition ? (
                  <span className="font-medium text-gray-700">{savedPosition.title}</span>
                ) : savedRole ? (
                  <span className="font-medium text-gray-700">{savedRole.label}</span>
                ) : (
                  "this entry"
                )}
                .
              </p>
              <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-orange-300 hover:bg-orange-50/30">
                <LuUpload size={20} className="text-gray-400" />
                <span className="text-sm text-gray-500">
                  {file ? file.name : "Click to choose a file (.pdf, .docx, .txt)"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </>
          )}

          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
          {/* Left: skip / cancel */}
          {step === "role" ? (
            <button
              onClick={onClose}
              disabled={saving}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 cursor-pointer"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={onClose}
              disabled={saving}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 cursor-pointer"
            >
              {step === "file" ? "Skip & finish" : "Skip & finish"}
            </button>
          )}

          {/* Right: primary action */}
          {step === "role" && (
            <button
              onClick={handleSaveRole}
              disabled={saving || !roleLabel.trim()}
              className="text-xs px-4 py-1.5 bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? "Saving…" : "Save & continue"}
              {!saving && <LuArrowRight size={12} />}
            </button>
          )}
          {step === "position" && (
            <button
              onClick={handleSavePosition}
              disabled={saving || !posTitle.trim() || !posRoleId}
              className="text-xs px-4 py-1.5 bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? "Saving…" : "Save & continue"}
              {!saving && <LuArrowRight size={12} />}
            </button>
          )}
          {step === "file" && (
            <button
              onClick={handleUploadFile}
              disabled={saving || !file}
              className="text-xs px-4 py-1.5 bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? "Uploading…" : "Upload & finish"}
              {!saving && <LuCheck size={12} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddWizard;
