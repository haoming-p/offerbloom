import React, { useState, useEffect, useRef } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { formatJobDescription } from "../services/aiTools";

// Session-storage key for the "I understand this uses AI credits" ack so we
// don't pester the user on every click.
const AI_ACK_KEY = "positions.jdFormat.aiAck";

// ============================================================
// DEFAULT STATUSES — customizable by user
// Each status has an id, label, and color scheme
// TODO: change for further development — persist custom statuses
// ============================================================
const DEFAULT_STATUSES = [
  { id: "new", label: "New", bg: "bg-green-50", text: "text-green-600", dot: "bg-green-400" },
  { id: "applied", label: "Applied", bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-400" },
  { id: "oa_completed", label: "OA Completed", bg: "bg-purple-50", text: "text-purple-600", dot: "bg-purple-400" },
  { id: "interviewing", label: "Interviewing", bg: "bg-orange-50", text: "text-orange-600", dot: "bg-orange-400" },
  { id: "offer", label: "Offer", bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400" },
  { id: "rejected", label: "Rejected", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400" },
  { id: "withdrawn", label: "Withdrawn", bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-400" },
  { id: "closed", label: "Closed", bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-300" },
];

// Color options for custom statuses
const CUSTOM_COLORS = [
  { bg: "bg-pink-50", text: "text-pink-600", dot: "bg-pink-400" },
  { bg: "bg-cyan-50", text: "text-cyan-600", dot: "bg-cyan-400" },
  { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-400" },
  { bg: "bg-teal-50", text: "text-teal-600", dot: "bg-teal-400" },
];

const PositionsPage = ({ data, user, onUpdatePositionsData, onDeleteRole, onDeletePosition }) => {
  const isDemoGuest = user?.is_demo_guest;
  const [roles, setRoles] = useState(data?.roles || []);
  const [positions, setPositions] = useState(
    (data?.positions || []).map((p) => ({
      ...p,
      status: p.status || "new",
      timeline: p.timeline || [],
    }))
  );
  const files = data?.files || [];
  const [statuses, setStatuses] = useState(
    data?.statuses?.length ? data.statuses : DEFAULT_STATUSES
  );

  // AI format-with-AI state. One position at a time; preview is inline.
  // status: idle | confirming | loading | preview | error
  const [jdAi, setJdAi] = useState({ posId: null, status: "idle", result: "", error: "" });

  const startJdFormat = (pos) => {
    if (!pos?.jd?.trim()) return;
    const acked = sessionStorage.getItem(AI_ACK_KEY) === "1";
    if (!acked) {
      setJdAi({ posId: pos.id, status: "confirming", result: "", error: "" });
      return;
    }
    runJdFormat(pos);
  };

  const runJdFormat = async (pos) => {
    setJdAi({ posId: pos.id, status: "loading", result: "", error: "" });
    try {
      const formatted = await formatJobDescription(pos.jd);
      setJdAi({ posId: pos.id, status: "preview", result: formatted, error: "" });
    } catch (err) {
      setJdAi({ posId: pos.id, status: "error", result: "", error: err.message });
    }
  };

  const applyJdFormat = (pos) => {
    if (jdAi.posId !== pos.id || jdAi.status !== "preview") return;
    updatePositions((prev) =>
      prev.map((p) => (p.id === pos.id ? { ...p, jd: jdAi.result } : p)),
    );
    setJdAi({ posId: null, status: "idle", result: "", error: "" });
  };

  const dismissJdFormat = () => {
    setJdAi({ posId: null, status: "idle", result: "", error: "" });
  };

  const confirmAiAndRun = (pos) => {
    sessionStorage.setItem(AI_ACK_KEY, "1");
    runJdFormat(pos);
  };

  // Debounced sync to backend
  const syncTimerRef = useRef(null);
  const syncToBackend = (newRoles, newPositions, newStatuses) => {
    if (!onUpdatePositionsData) return;
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      onUpdatePositionsData({ roles: newRoles, positions: newPositions, statuses: newStatuses });
    }, 800);
  };

  // Wrapped setters that also trigger sync
  const updateRoles = (next) => {
    const val = typeof next === "function" ? next(roles) : next;
    setRoles(val);
    syncToBackend(val, positions, statuses);
  };
  const updatePositions = (next) => {
    const val = typeof next === "function" ? next(positions) : next;
    setPositions(val);
    syncToBackend(roles, val, statuses);
  };
  const updateStatuses = (next) => {
    const val = typeof next === "function" ? next(statuses) : next;
    setStatuses(val);
    syncToBackend(roles, positions, val);
  };

  // --- Active filters ---
  const [activeRoleId, setActiveRoleId] = useState("all");
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");

  // --- Role management ---
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [newRoleEmoji, setNewRoleEmoji] = useState("💼");
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editRoleLabel, setEditRoleLabel] = useState("");
  const [editRoleEmoji, setEditRoleEmoji] = useState("");

  // --- Status management ---
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [editStatusLabel, setEditStatusLabel] = useState("");

  // --- Status dropdown per row ---
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState(null);

  // --- Add position form ---
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [newPosTitle, setNewPosTitle] = useState("");
  const [newPosCompany, setNewPosCompany] = useState("");
  const [newPosJd, setNewPosJd] = useState("");
  const [newPosRole, setNewPosRole] = useState("");

  // --- Edit position ---
  const [editingPosId, setEditingPosId] = useState(null);
  const [editPosTitle, setEditPosTitle] = useState("");
  const [editPosCompany, setEditPosCompany] = useState("");
  const [editPosJd, setEditPosJd] = useState("");

  // --- Expand toggles ---
  const [expandedJdId, setExpandedJdId] = useState(null);
  const [expandedTrackId, setExpandedTrackId] = useState(null);

  // --- Add timeline entry ---
  const [addingTimelineForId, setAddingTimelineForId] = useState(null);
  const [newTimelineDate, setNewTimelineDate] = useState("");
  const [newTimelineEvent, setNewTimelineEvent] = useState("");
  const [newTimelineNotes, setNewTimelineNotes] = useState("");

  // ============================================================
  // Derived
  // ============================================================

  // Filter positions
  const filteredPositions = positions.filter((p) => {
    const roleMatch = activeRoleId === "all" || p.role === activeRoleId;
    const statusMatch = activeStatusFilter === "all" || p.status === activeStatusFilter;
    return roleMatch && statusMatch;
  });

  // Counts for status bar
  const getStatusCount = (statusId) => {
    const roleFiltered = activeRoleId === "all"
      ? positions
      : positions.filter((p) => p.role === activeRoleId);
    if (statusId === "all") return roleFiltered.length;
    return roleFiltered.filter((p) => p.status === statusId).length;
  };

  const hasFile = (positionId) => files.some((f) => f.linkedTo.includes(`pos-${positionId}`));
  const getStatusObj = (statusId) => statuses.find((s) => s.id === statusId) || statuses[0];
  const getRoleObj = (roleId) => roles.find((r) => r.id === roleId);

  // ============================================================
  // Role handlers
  // ============================================================

  const handleAddRole = () => {
    if (!newRoleLabel.trim()) return;
    const newRole = {
      id: `custom-${Date.now()}`,
      label: newRoleLabel.trim(),
      emoji: newRoleEmoji || "💼",
      desc: "",
    };
    updateRoles([...roles, newRole]);
    setActiveRoleId(newRole.id);
    setNewRoleLabel("");
    setNewRoleEmoji("💼");
    setShowAddRole(false);
  };

  const handleAddRoleKeyDown = (e) => {
    if (e.key === "Enter") handleAddRole();
    if (e.key === "Escape") { setShowAddRole(false); setNewRoleLabel(""); }
  };

  const handleStartEditRole = (e, role) => {
    e.stopPropagation();
    setEditingRoleId(role.id);
    setEditRoleLabel(role.label);
    setEditRoleEmoji(role.emoji);
  };

  const handleSaveEditRole = () => {
    if (!editRoleLabel.trim()) return;
    updateRoles(roles.map((r) =>
      r.id === editingRoleId
        ? { ...r, label: editRoleLabel.trim(), emoji: editRoleEmoji || r.emoji }
        : r
    ));
    setEditingRoleId(null);
  };

  const handleEditRoleKeyDown = (e) => {
    if (e.key === "Enter") handleSaveEditRole();
    if (e.key === "Escape") setEditingRoleId(null);
  };

  // `confirmDelete` shape: { type: "role"|"position", id, title, message } or null.
  // We intercept delete clicks with this state, then commit on confirm.
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDeleteRole = (e, roleId) => {
    e.stopPropagation();
    const role = roles.find((r) => r.id === roleId);
    const posCount = positions.filter((p) => p.role === roleId).length;
    const posLine = posCount > 0
      ? `${posCount} ${posCount === 1 ? "position" : "positions"} under this role`
      : null;
    setConfirmDelete({
      type: "role",
      id: roleId,
      title: `Delete role "${role?.label || roleId}"?`,
      message:
        "This will also delete:" +
        (posLine ? `\n• ${posLine}` : "") +
        "\n• All questions, answers, and practices under this role" +
        "\n• AI preferences scoped to this role" +
        "\n\nStories tagged to this role will be re-tagged to \"All roles\". Linked files will keep their content." +
        "\n\nThis cannot be undone.",
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === "role") {
        const roleId = confirmDelete.id;
        await onDeleteRole?.(roleId);
        // Mirror App's appData update into our local mirror state, so the
        // page UI updates without a full reload. App-side appData is the
        // source of truth; the page's local copies stay derived from it.
        const newRoles = roles.filter((r) => r.id !== roleId);
        const newPositions = positions.filter((p) => p.role !== roleId);
        setRoles(newRoles);
        setPositions(newPositions);
        if (activeRoleId === roleId) setActiveRoleId("all");
      } else if (confirmDelete.type === "position") {
        await onDeletePosition?.(confirmDelete.id);
        setPositions(positions.filter((p) => p.id !== confirmDelete.id));
      }
    } catch (err) {
      alert(err.message || "Failed to delete");
    } finally {
      setConfirmDelete(null);
    }
  };

  // ============================================================
  // Status management handlers
  // ============================================================

  const handleAddStatus = () => {
    if (!newStatusLabel.trim()) return;
    const colorIndex = (statuses.length - DEFAULT_STATUSES.length) % CUSTOM_COLORS.length;
    const color = CUSTOM_COLORS[colorIndex];
    const newStatus = {
      id: `custom-${Date.now()}`,
      label: newStatusLabel.trim(),
      ...color,
    };
    updateStatuses([...statuses, newStatus]);
    setNewStatusLabel("");
    setShowAddStatus(false);
  };

  const handleAddStatusKeyDown = (e) => {
    if (e.key === "Enter") handleAddStatus();
    if (e.key === "Escape") { setShowAddStatus(false); setNewStatusLabel(""); }
  };

  const handleStartEditStatus = (e, status) => {
    e.stopPropagation();
    setEditingStatusId(status.id);
    setEditStatusLabel(status.label);
  };

  const handleSaveEditStatus = () => {
    if (!editStatusLabel.trim()) return;
    updateStatuses(statuses.map((s) =>
      s.id === editingStatusId ? { ...s, label: editStatusLabel.trim() } : s
    ));
    setEditingStatusId(null);
  };

  const handleEditStatusKeyDown = (e) => {
    if (e.key === "Enter") handleSaveEditStatus();
    if (e.key === "Escape") setEditingStatusId(null);
  };

  const handleDeleteStatus = (e, statusId) => {
    e.stopPropagation();
    // Move positions with this status to "new"
    const newPositions = positions.map((p) =>
      p.status === statusId ? { ...p, status: "new" } : p
    );
    const newStatuses = statuses.filter((s) => s.id !== statusId);
    setPositions(newPositions);
    setStatuses(newStatuses);
    syncToBackend(roles, newPositions, newStatuses);
    if (activeStatusFilter === statusId) setActiveStatusFilter("all");
  };

  // ============================================================
  // Position handlers
  // ============================================================

  const handleAddPosition = () => {
    if (!newPosTitle.trim()) return;
    const roleForPos = newPosRole || (activeRoleId !== "all" ? activeRoleId : roles[0]?.id);
    if (!roleForPos) return;
    const newPos = {
      id: `pos-${Date.now()}`,
      role: roleForPos,
      title: newPosTitle.trim(),
      company: newPosCompany.trim(),
      jd: newPosJd.trim(),
      status: "new",
      timeline: [],
    };
    updatePositions([...positions, newPos]);
    setNewPosTitle("");
    setNewPosCompany("");
    setNewPosJd("");
    setNewPosRole("");
    setShowAddPosition(false);
  };

  const handleStartEditPosition = (pos) => {
    setEditingPosId(pos.id);
    setEditPosTitle(pos.title);
    setEditPosCompany(pos.company || "");
    setEditPosJd(pos.jd || "");
    setExpandedJdId(null);
    setExpandedTrackId(null);
  };

  const handleSaveEditPosition = () => {
    if (!editPosTitle.trim()) return;
    updatePositions(positions.map((p) =>
      p.id === editingPosId
        ? { ...p, title: editPosTitle.trim(), company: editPosCompany.trim(), jd: editPosJd.trim() }
        : p
    ));
    setEditingPosId(null);
  };

  const handleDeletePosition = (posId) => {
    const pos = positions.find((p) => p.id === posId);
    setConfirmDelete({
      type: "position",
      id: posId,
      title: `Delete "${pos?.title || "this position"}"?`,
      message:
        "This will also delete all questions, answers, and practices under this position. " +
        "Linked files will keep their content.\n\nThis cannot be undone.",
    });
  };

  const handleChangeStatus = (posId, newStatusId) => {
    updatePositions(positions.map((p) =>
      p.id === posId ? { ...p, status: newStatusId } : p
    ));
    setOpenStatusDropdownId(null);
  };

  // ============================================================
  // Timeline handlers
  // ============================================================

  const handleAddTimelineEntry = (posId) => {
    if (!newTimelineEvent.trim()) return;
    const entry = {
      id: `tl-${Date.now()}`,
      date: newTimelineDate || new Date().toISOString().split("T")[0],
      event: newTimelineEvent.trim(),
      notes: newTimelineNotes.trim(),
    };
    updatePositions(positions.map((p) =>
      p.id === posId
        ? { ...p, timeline: [entry, ...(p.timeline || [])] }
        : p
    ));
    setNewTimelineDate("");
    setNewTimelineEvent("");
    setNewTimelineNotes("");
    setAddingTimelineForId(null);
  };

  const handleDeleteTimelineEntry = (posId, entryId) => {
    updatePositions(positions.map((p) =>
      p.id === posId
        ? { ...p, timeline: p.timeline.filter((t) => t.id !== entryId) }
        : p
    ));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Title bar — matches Prep / Library / Me */}
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          {isDemoGuest ? "Explore sample positions" : "My Positions"}
        </h1>
        <p className="text-sm text-gray-400">
          {isDemoGuest
            ? "Your updates clear in 24h. Save to account to keep them."
            : "Track the roles you're prepping for and positions under each."}
        </p>
      </div>

      {/* Fixed header area */}
      <div className="flex-shrink-0 px-8 pt-5 bg-white border-t border-gray-200">
        {/* Role tabs */}
        <div className="flex gap-2 items-center mb-4 flex-wrap">
          {/* All roles tab */}
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
            <div key={role.id} className="group relative">
              {editingRoleId === role.id ? (
                <div className="flex gap-1 items-center">
                  <input
                    type="text"
                    value={editRoleEmoji}
                    onChange={(e) => setEditRoleEmoji(e.target.value)}
                    className="w-10 border border-gray-200 rounded-lg px-1 py-2 text-sm text-center"
                  />
                  <input
                    type="text"
                    value={editRoleLabel}
                    onChange={(e) => setEditRoleLabel(e.target.value)}
                    onKeyDown={handleEditRoleKeyDown}
                    autoFocus
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-32"
                  />
                  <button onClick={handleSaveEditRole} className="text-orange-400 text-xs cursor-pointer">✓</button>
                  <button onClick={() => setEditingRoleId(null)} className="text-gray-400 text-xs cursor-pointer">✕</button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setActiveRoleId(role.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                      activeRoleId === role.id
                        ? "bg-orange-400 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {role.emoji} {role.label}
                  </button>
                  {/* Edit/delete on hover */}
                  <div className="hidden group-hover:flex absolute -top-2 -right-2 gap-0.5">
                    <button
                      onClick={(e) => handleStartEditRole(e, role)}
                      className="w-4 h-4 bg-white border border-gray-200 rounded-full flex items-center justify-center
                        text-gray-400 hover:text-gray-600 cursor-pointer"
                      style={{ fontSize: "8px" }}
                    >
                      ✎
                    </button>
                    <button
                      onClick={(e) => handleDeleteRole(e, role.id)}
                      className="w-4 h-4 bg-white border border-gray-200 rounded-full flex items-center justify-center
                        text-gray-400 hover:text-red-400 cursor-pointer"
                      style={{ fontSize: "8px" }}
                    >
                      ✕
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Add role */}
          {showAddRole ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newRoleEmoji}
                onChange={(e) => setNewRoleEmoji(e.target.value)}
                className="w-10 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center"
              />
              <input
                type="text"
                value={newRoleLabel}
                onChange={(e) => setNewRoleLabel(e.target.value)}
                onKeyDown={handleAddRoleKeyDown}
                placeholder="Role name..."
                autoFocus
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300 w-32"
              />
              <button onClick={handleAddRole} className="text-orange-400 text-sm cursor-pointer">Add</button>
              <button onClick={() => { setShowAddRole(false); setNewRoleLabel(""); }} className="text-gray-400 text-sm cursor-pointer">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRole(true)}
              className="px-3 py-2 rounded-lg text-sm border border-dashed border-gray-200
                text-gray-400 hover:border-gray-300 cursor-pointer"
            >
              + Add Role
            </button>
          )}
        </div>

        {/* Status pipeline bar */}
        <div className="flex gap-2 items-center mb-4 flex-wrap">
          <button
            onClick={() => setActiveStatusFilter("all")}
            className={`px-3 py-1 rounded-full text-xs cursor-pointer transition-all ${
              activeStatusFilter === "all"
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            All ({getStatusCount("all")})
          </button>

          {statuses.map((status) => {
            const count = getStatusCount(status.id);
            if (editingStatusId === status.id) {
              return (
                <div key={status.id} className="flex gap-1 items-center">
                  <input
                    type="text"
                    value={editStatusLabel}
                    onChange={(e) => setEditStatusLabel(e.target.value)}
                    onKeyDown={handleEditStatusKeyDown}
                    autoFocus
                    className="border border-gray-200 rounded-lg px-2 py-0.5 text-xs w-24"
                  />
                  <button onClick={handleSaveEditStatus} className="text-orange-400 text-xs cursor-pointer">✓</button>
                  <button onClick={() => setEditingStatusId(null)} className="text-gray-400 text-xs cursor-pointer">✕</button>
                </div>
              );
            }
            return (
              <div key={status.id} className="group relative">
                <button
                  onClick={() => setActiveStatusFilter(status.id)}
                  className={`px-3 py-1 rounded-full text-xs cursor-pointer transition-all ${
                    activeStatusFilter === status.id
                      ? `${status.bg} ${status.text} font-medium`
                      : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${status.dot} mr-1.5`} />
                  {status.label} ({count})
                </button>
                <div className="hidden group-hover:flex absolute -top-2 -right-2 gap-0.5">
                  <button
                    onClick={(e) => handleStartEditStatus(e, status)}
                    className="w-4 h-4 bg-white border border-gray-200 rounded-full flex items-center justify-center
                      text-gray-400 hover:text-gray-600 cursor-pointer"
                    style={{ fontSize: "8px" }}
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => handleDeleteStatus(e, status.id)}
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

          {/* Add status */}
          {showAddStatus ? (
            <div className="flex gap-1 items-center">
              <input
                type="text"
                value={newStatusLabel}
                onChange={(e) => setNewStatusLabel(e.target.value)}
                onKeyDown={handleAddStatusKeyDown}
                placeholder="Status name..."
                autoFocus
                className="border border-gray-200 rounded-lg px-2 py-0.5 text-xs placeholder-gray-300 w-24"
              />
              <button onClick={handleAddStatus} className="text-orange-400 text-xs cursor-pointer">Add</button>
              <button onClick={() => { setShowAddStatus(false); setNewStatusLabel(""); }} className="text-gray-400 text-xs cursor-pointer">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddStatus(true)}
              className="px-2 py-1 rounded-full text-xs border border-dashed border-gray-200
                text-gray-400 hover:border-gray-300 cursor-pointer"
            >
              +
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="border-b border-gray-200" />
      </div>

      {/* Table area — scrollable */}
      <div className="flex-1 overflow-y-auto show-scrollbar px-8 py-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Position</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Company</th>
              {activeRoleId === "all" && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tags</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Track</th>
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {filteredPositions.map((pos) => {
              const statusObj = getStatusObj(pos.status);
              const roleObj = getRoleObj(pos.role);
              const timelineCount = (pos.timeline || []).length;
              const isEditingThis = editingPosId === pos.id;

              return (
                <React.Fragment key={pos.id}>
                  {isEditingThis ? (
                    // Inline edit row
                    <tr className="border-b border-gray-100">
                      <td colSpan={activeRoleId === "all" ? 7 : 6} className="px-4 py-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={editPosTitle}
                              onChange={(e) => setEditPosTitle(e.target.value)}
                              placeholder="Position title"
                              autoFocus
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            />
                            <input
                              type="text"
                              value={editPosCompany}
                              onChange={(e) => setEditPosCompany(e.target.value)}
                              placeholder="Company"
                              className="w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            />
                          </div>
                          <textarea
                            value={editPosJd}
                            onChange={(e) => setEditPosJd(e.target.value)}
                            placeholder="Job description (paste raw text — AI formatting coming soon)"
                            rows={4}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300 resize-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingPosId(null)}
                              className="px-4 py-1.5 text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEditPosition}
                              className="px-4 py-1.5 bg-orange-400 text-white rounded-lg hover:bg-orange-500 text-sm cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    // Normal row
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      {/* Position — expandable for JD */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedJdId(expandedJdId === pos.id ? null : pos.id)}
                          className="text-sm font-medium text-gray-800 hover:text-orange-500 cursor-pointer text-left"
                        >
                          <span className="text-gray-400 mr-1 text-xs">
                            {expandedJdId === pos.id ? "▾" : "▸"}
                          </span>
                          {pos.title}
                        </button>
                      </td>

                      {/* Company */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-gray-700">
                          {pos.company || "—"}
                        </span>
                      </td>

                      {/* Role column — only when viewing "All Roles" */}
                      {activeRoleId === "all" && (
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-400">
                            {roleObj ? `${roleObj.emoji} ${roleObj.label}` : pos.role}
                          </span>
                        </td>
                      )}

                      {/* Status — clickable dropdown */}
                      <td className="px-4 py-3 relative">
                        <button
                          onClick={() => setOpenStatusDropdownId(
                            openStatusDropdownId === pos.id ? null : pos.id
                          )}
                          className={`text-xs px-2.5 py-1 rounded-full cursor-pointer ${statusObj.bg} ${statusObj.text}`}
                        >
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusObj.dot} mr-1`} />
                          {statusObj.label}
                        </button>
                        {/* Status dropdown */}
                        {openStatusDropdownId === pos.id && (
                          <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-40">
                            {statuses.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => handleChangeStatus(pos.id, s.id)}
                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer flex items-center gap-2 ${
                                  pos.status === s.id ? "font-medium" : ""
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                                {s.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Tags */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {pos.jd && (
                            <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-500 rounded-full">JD</span>
                          )}
                          {hasFile(pos.id) && (
                            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full">Resume</span>
                          )}
                        </div>
                      </td>

                      {/* Track — expandable for timeline */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedTrackId(expandedTrackId === pos.id ? null : pos.id)}
                          className="text-xs text-gray-500 hover:text-orange-500 cursor-pointer"
                        >
                          <span className="text-gray-400 mr-1">
                            {expandedTrackId === pos.id ? "▾" : "▸"}
                          </span>
                          {timelineCount} {timelineCount === 1 ? "entry" : "entries"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-2 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleStartEditPosition(pos)}
                            className="text-gray-300 hover:text-gray-600 text-xs cursor-pointer"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDeletePosition(pos.id)}
                            className="text-gray-300 hover:text-red-400 text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Expanded JD */}
                  {expandedJdId === pos.id && !isEditingThis && (
                    <tr className="border-b border-gray-100">
                      <td colSpan={activeRoleId === "all" ? 7 : 6} className="px-8 py-3">
                        {pos.jd ? (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-gray-500">Job Description</span>
                              {jdAi.posId === pos.id && jdAi.status === "loading" ? (
                                <span className="text-xs text-gray-400">✨ Formatting…</span>
                              ) : jdAi.posId === pos.id && jdAi.status === "preview" ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => applyJdFormat(pos)}
                                    className="text-xs px-2 py-0.5 rounded-md bg-orange-400 text-white hover:bg-orange-500 cursor-pointer"
                                  >
                                    Apply
                                  </button>
                                  <button
                                    onClick={dismissJdFormat}
                                    className="text-xs px-2 py-0.5 rounded-md text-gray-500 hover:text-gray-700 cursor-pointer"
                                  >
                                    Discard
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startJdFormat(pos)}
                                  className="text-xs text-orange-400 hover:text-orange-500 cursor-pointer"
                                >
                                  ✨ Format with AI
                                </button>
                              )}
                            </div>
                            {jdAi.posId === pos.id && jdAi.status === "preview" ? (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Original</div>
                                  <p className="text-sm text-gray-500 whitespace-pre-wrap max-h-64 overflow-y-auto show-scrollbar bg-white border border-gray-100 rounded p-2">
                                    {pos.jd}
                                  </p>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">AI-formatted</div>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto show-scrollbar bg-white border border-orange-200 rounded p-2">
                                    {jdAi.result}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 whitespace-pre-wrap max-h-48 overflow-y-auto show-scrollbar">
                                {pos.jd}
                              </p>
                            )}
                            {jdAi.posId === pos.id && jdAi.status === "error" && (
                              <div className="text-xs text-red-500 mt-2">
                                Format failed: {jdAi.error}
                                <button onClick={dismissJdFormat} className="ml-2 underline cursor-pointer">dismiss</button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-300 text-center py-2">
                            No JD added — click ✎ to add one
                          </p>
                        )}
                      </td>
                    </tr>
                  )}

                  {/* Expanded Timeline */}
                  {expandedTrackId === pos.id && !isEditingThis && (
                    <tr className="border-b border-gray-100">
                      <td colSpan={activeRoleId === "all" ? 7 : 6} className="px-8 py-3">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <span className="text-xs font-medium text-gray-500 block mb-3">Interview Timeline</span>

                          {/* Timeline entries */}
                          {(pos.timeline || []).length === 0 && addingTimelineForId !== pos.id ? (
                            <p className="text-sm text-gray-300 text-center py-2">
                              No entries yet
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2 mb-3">
                              {(pos.timeline || []).map((entry) => (
                                <div key={entry.id} className="flex items-start gap-3 bg-white rounded-lg px-3 py-2 border border-gray-100">
                                  <span className="text-xs text-gray-400 font-mono w-20 flex-shrink-0 pt-0.5">
                                    {entry.date}
                                  </span>
                                  <div className="flex-1">
                                    <span className="text-sm font-medium text-gray-700">
                                      {entry.event}
                                    </span>
                                    {entry.notes && (
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        {entry.notes}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleDeleteTimelineEntry(pos.id, entry.id)}
                                    className="text-gray-300 hover:text-red-400 text-xs cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add timeline entry */}
                          {addingTimelineForId === pos.id ? (
                            <div className="flex flex-col gap-2 bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex gap-2">
                                <input
                                  type="date"
                                  value={newTimelineDate}
                                  onChange={(e) => setNewTimelineDate(e.target.value)}
                                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-36"
                                />
                                <input
                                  type="text"
                                  value={newTimelineEvent}
                                  onChange={(e) => setNewTimelineEvent(e.target.value)}
                                  placeholder="Event (e.g. Phone Screen)"
                                  autoFocus
                                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs placeholder-gray-300"
                                />
                              </div>
                              <input
                                type="text"
                                value={newTimelineNotes}
                                onChange={(e) => setNewTimelineNotes(e.target.value)}
                                placeholder="Notes (optional)"
                                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs placeholder-gray-300"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => { setAddingTimelineForId(null); setNewTimelineEvent(""); setNewTimelineNotes(""); }}
                                  className="px-3 py-1 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleAddTimelineEntry(pos.id)}
                                  className="px-3 py-1 bg-orange-400 text-white rounded-lg hover:bg-orange-500 text-xs cursor-pointer"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddingTimelineForId(pos.id)}
                              className="w-full py-1.5 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400
                                hover:border-gray-300 cursor-pointer"
                            >
                              + Add entry
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Empty state */}
        {filteredPositions.length === 0 && (
          <div className="py-12 text-center text-gray-300 text-sm">
            {positions.length === 0 ? "No positions yet" : "No positions match current filters"}
          </div>
        )}

        {/* Add position */}
        <div className="mt-4">
          {showAddPosition ? (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="flex gap-3 mb-3">
                <input
                  type="text"
                  value={newPosTitle}
                  onChange={(e) => setNewPosTitle(e.target.value)}
                  placeholder="Position title"
                  autoFocus
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300"
                />
                <input
                  type="text"
                  value={newPosCompany}
                  onChange={(e) => setNewPosCompany(e.target.value)}
                  placeholder="Company"
                  className="w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300"
                />
                {/* Role selector — show when viewing All Roles */}
                {activeRoleId === "all" && (
                  <select
                    value={newPosRole}
                    onChange={(e) => setNewPosRole(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 w-40"
                  >
                    <option value="">Select role...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.emoji} {r.label}</option>
                    ))}
                  </select>
                )}
              </div>
              <textarea
                value={newPosJd}
                onChange={(e) => setNewPosJd(e.target.value)}
                placeholder="Job description — paste raw text (AI formatting coming soon)"
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300 resize-none mb-3"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowAddPosition(false); setNewPosTitle(""); setNewPosCompany(""); setNewPosJd(""); }}
                  className="px-4 py-1.5 text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPosition}
                  className="px-4 py-1.5 bg-orange-400 text-white rounded-lg hover:bg-orange-500 text-sm cursor-pointer"
                >
                  Add Position
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddPosition(true)}
              className="w-full py-2.5 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400
                hover:border-gray-300 hover:text-gray-500 cursor-pointer"
            >
              + Add Position
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete?.title}
        message={confirmDelete?.message}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={jdAi.status === "confirming"}
        title="Format with AI?"
        message="This calls Claude (~$0.002 per format) to reformat the JD as clean Markdown. You'll see a preview before anything is saved."
        confirmLabel="Format"
        onConfirm={() => {
          const pos = positions.find((p) => p.id === jdAi.posId);
          if (pos) confirmAiAndRun(pos);
        }}
        onCancel={dismissJdFormat}
      />
    </div>
  );
};

export default PositionsPage;