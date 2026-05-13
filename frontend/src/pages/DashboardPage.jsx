import { useState } from "react";
import { LuFileText, LuFileUser, LuArrowRight, LuPlus, LuTrash2, LuPencil } from "react-icons/lu";
import AddWizard from "../components/dashboardpage/AddWizard";
import EditDialog from "../components/dashboardpage/EditDialog";
import ConfirmDialog from "../components/ConfirmDialog";
import BloomAvatar from "../components/BloomAvatar";
import { uploadFile, updateFileLinks } from "../services/files";

const DashboardPage = ({
  data,
  user,
  onNavigateToPrep,
  onUpdatePositionsData,
  onDeleteRole,
  onDeletePosition,
}) => {
  const { roles = [], positions = [], files = [], statuses = [] } = data || {};
  const isDemoGuest = user?.is_demo_guest;

  const positionHasFile = (positionId) =>
    files.some((f) => f.linkedTo?.includes(`pos-${positionId}`));
  const roleHasFile = (roleId) =>
    files.some((f) => f.linkedTo?.includes(roleId));

  // Wizard state — null means closed; otherwise the entry mode + optional
  // role context (used when "+ Add position" is clicked on a specific role).
  const [wizardMode, setWizardMode] = useState(null);
  const [wizardInitialRoleId, setWizardInitialRoleId] = useState("");

  const openRoleWizard = () => {
    setWizardInitialRoleId("");
    setWizardMode("role");
  };
  const openPositionWizard = (roleId = "") => {
    setWizardInitialRoleId(roleId);
    setWizardMode("position");
  };
  const closeWizard = () => setWizardMode(null);

  // Wizard step handlers — each persists to backend via the shared
  // onUpdatePositionsData callback so the graph mirror + RAG stay in sync.
  const handleAddRole = async (label, emoji) => {
    const newRole = {
      id: `custom-${Date.now()}`,
      label,
      emoji,
      desc: "",
    };
    await onUpdatePositionsData?.({
      roles: [...roles, newRole],
      positions,
      statuses,
    });
    return newRole;
  };

  const handleAddPosition = async ({ roleId, title, company, jd }) => {
    const newPos = {
      id: `pos-${Date.now()}`,
      role: roleId,
      title,
      company,
      jd,
      status: "new",
      timeline: [],
    };
    await onUpdatePositionsData?.({
      roles,
      positions: [...positions, newPos],
      statuses,
    });
    return newPos;
  };

  const handleUploadFile = async (file, { roleId, positionId }) => {
    const uploaded = await uploadFile(file, "other");
    // Position ids are stored frontend-side with a "pos-" prefix; the file-links
    // endpoint expects raw ids (LibraryPage does the same stripping).
    const rawPositionId = positionId ? String(positionId).replace(/^pos-/, "") : null;
    await updateFileLinks(uploaded.id, {
      roleIds: roleId ? [roleId] : [],
      positionIds: rawPositionId ? [rawPositionId] : [],
    });
    return uploaded;
  };

  // --- Edit dialog state ---
  // `editTarget` shape: { mode: "role"|"position", entity } | null
  const [editTarget, setEditTarget] = useState(null);

  const requestEditRole = (role) => setEditTarget({ mode: "role", entity: role });
  const requestEditPosition = (pos) => setEditTarget({ mode: "position", entity: pos });

  const handleSaveEdit = async (updates) => {
    if (!editTarget) return;
    if (editTarget.mode === "role") {
      const next = roles.map((r) =>
        r.id === updates.id ? { ...r, label: updates.label, emoji: updates.emoji } : r
      );
      await onUpdatePositionsData?.({ roles: next, positions, statuses });
    } else {
      const next = positions.map((p) =>
        p.id === updates.id
          ? { ...p, title: updates.title, company: updates.company, jd: updates.jd, role: updates.roleId }
          : p
      );
      await onUpdatePositionsData?.({ roles, positions: next, statuses });
    }
  };

  // --- Delete with confirmation ---
  // `confirmDelete` shape: { type: "role"|"position", id, title, message } or null.
  const [confirmDelete, setConfirmDelete] = useState(null);

  const requestDeleteRole = (role) => {
    const posCount = positions.filter((p) => p.role === role.id).length;
    const posLine = posCount > 0
      ? `${posCount} ${posCount === 1 ? "position" : "positions"} under this role`
      : null;
    setConfirmDelete({
      type: "role",
      id: role.id,
      title: `Delete role "${role.label}"?`,
      message:
        "This will also delete:" +
        (posLine ? `\n• ${posLine}` : "") +
        "\n• All questions, answers, and practices under this role" +
        "\n• AI preferences scoped to this role" +
        "\n\nStories tagged to this role will be re-tagged to \"All roles\". Linked files will keep their content." +
        "\n\nThis cannot be undone.",
    });
  };

  const requestDeletePosition = (pos) => {
    setConfirmDelete({
      type: "position",
      id: pos.id,
      title: `Delete "${pos.title}"?`,
      message:
        "This will also delete all questions, answers, and practices under this position. " +
        "Linked files will keep their content.\n\nThis cannot be undone.",
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === "role") {
        await onDeleteRole?.(confirmDelete.id);
      } else if (confirmDelete.type === "position") {
        await onDeletePosition?.(confirmDelete.id);
      }
    } catch (err) {
      alert(err.message || "Failed to delete");
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {/* Bloom mascot — bigger than TopBar (48px vs 32px) and ring-less, so
              it reads as greeting rather than brand chrome. */}
          <BloomAvatar size={48} ring={false} />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              {isDemoGuest
                ? "Explore a sample dashboard"
                : `Welcome${user?.name ? `, ${user.name.split(" ")[0]}` : ""}! Ready to prep?`}
            </h1>
            <p className="text-sm text-gray-400">
              {isDemoGuest
                ? "Your updates clear in 24h. Save to account to keep them."
                : "Click a role or position to start practicing."}
            </p>
          </div>
        </div>
        <button
          onClick={openRoleWizard}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer flex-shrink-0"
        >
          <LuPlus size={14} /> Add role
        </button>
      </div>

      {roles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center flex flex-col items-center gap-4">
          <BloomAvatar size={64} ring={false} />
          <p className="text-sm text-gray-500">
            Bloom's waiting for your first role 🌱
          </p>
          <button
            onClick={openRoleWizard}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer"
          >
            <LuPlus size={14} /> Add your first role
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {roles.map((role) => {
            const rolePositions = positions.filter((p) => p.role === role.id);
            const hasResume = roleHasFile(role.id);

            return (
              <section
                key={role.id}
                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
              >
                {/* Role header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    {role.emoji && <span className="text-2xl">{role.emoji}</span>}
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">
                        {role.label}
                      </h2>
                      <p className="text-xs text-gray-400">
                        {rolePositions.length}{" "}
                        {rolePositions.length === 1 ? "position" : "positions"}
                        {hasResume && " · Resume linked"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => requestDeleteRole(role)}
                      title="Delete role"
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded cursor-pointer"
                    >
                      <LuTrash2 size={14} />
                    </button>
                    <button
                      onClick={() => requestEditRole(role)}
                      title="Edit role"
                      className="p-1.5 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded cursor-pointer"
                    >
                      <LuPencil size={14} />
                    </button>
                    <button
                      onClick={() => onNavigateToPrep?.(role.id)}
                      className="flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 cursor-pointer font-medium ml-1"
                    >
                      Practice questions
                      <LuArrowRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Position grid (or empty state) */}
                {rolePositions.length === 0 ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-300 italic">
                      No positions added yet for this role.
                    </span>
                    <button
                      onClick={() => openPositionWizard(role.id)}
                      className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 cursor-pointer font-medium"
                    >
                      <LuPlus size={12} /> Add position
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {rolePositions.map((pos) => {
                        const hasJD = !!pos.jd;
                        const hasFile = positionHasFile(pos.id);
                        return (
                          <div
                            key={pos.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onNavigateToPrep?.(role.id)}
                            onKeyDown={(e) => { if (e.key === "Enter") onNavigateToPrep?.(role.id); }}
                            className="group flex flex-col gap-3 p-4 bg-gray-50 hover:bg-orange-50 border border-transparent hover:border-orange-200 rounded-xl text-left cursor-pointer transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-gray-800 truncate">
                                  {pos.title}
                                </h3>
                                {pos.company && (
                                  <p className="text-xs text-gray-400 truncate">
                                    @ {pos.company}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); requestDeletePosition(pos); }}
                                  title="Delete position"
                                  className="p-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 rounded cursor-pointer transition-opacity"
                                >
                                  <LuTrash2 size={13} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); requestEditPosition(pos); }}
                                  title="Edit position"
                                  className="p-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-orange-500 hover:bg-orange-50 rounded cursor-pointer transition-opacity"
                                >
                                  <LuPencil size={13} />
                                </button>
                                <LuArrowRight
                                  size={16}
                                  className="text-gray-300 group-hover:text-orange-500 mt-0.5"
                                />
                              </div>
                            </div>

                            {(hasJD || hasFile) && (
                              <div className="flex flex-wrap gap-1.5">
                                {hasJD && (
                                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-500">
                                    <LuFileText size={11} />
                                    JD
                                  </span>
                                )}
                                {hasFile && (
                                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-500">
                                    <LuFileUser size={11} />
                                    Resume
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => openPositionWizard(role.id)}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-orange-500 cursor-pointer"
                      >
                        <LuPlus size={12} /> Add position
                      </button>
                    </div>
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}

      <AddWizard
        open={wizardMode !== null}
        mode={wizardMode || "role"}
        initialRoleId={wizardInitialRoleId}
        roles={roles}
        onAddRole={handleAddRole}
        onAddPosition={handleAddPosition}
        onUploadFile={handleUploadFile}
        onClose={closeWizard}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete?.title}
        message={confirmDelete?.message}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
      <EditDialog
        open={!!editTarget}
        mode={editTarget?.mode}
        entity={editTarget?.entity}
        roles={roles}
        onSave={handleSaveEdit}
        onClose={() => setEditTarget(null)}
      />
    </div>
  );
};

export default DashboardPage;
