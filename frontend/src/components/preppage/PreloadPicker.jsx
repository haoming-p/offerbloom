import { useEffect, useMemo, useState } from "react";
import { LuSearch, LuX } from "react-icons/lu";
import { fetchPreloadedQuestions, copyPreloadedQuestions } from "../../services/questions";

const DIFFICULTY_STYLES = {
  Easy:   "bg-green-50 text-green-600",
  Medium: "bg-yellow-50 text-yellow-600",
  Hard:   "bg-red-50 text-red-500",
};

const PreloadPicker = ({
  roleId,
  roleLabel,
  positions = [],          // [{ id, title, company }]
  defaultPositionKey = "general",
  categories = [],         // [{ id, label }]
  initialCategoryId = null,
  onClose,
  onCopied,                // (newQuestions) => void
}) => {
  const [pool, setPool] = useState([]);
  // Unfiltered pool — the source of truth for available tag chips. Re-fetched
  // only when the role changes, not on every tag filter click.
  const [fullPool, setFullPool] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tagFilter, setTagFilter] = useState(initialCategoryId);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [targetPosition, setTargetPosition] = useState(String(defaultPositionKey));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchPreloadedQuestions(roleId, tagFilter, { limit: 500 })
      .then((data) => { if (!cancelled) setPool(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [roleId, tagFilter]);

  // Separate one-shot fetch for chip derivation — full pool for this role.
  useEffect(() => {
    let cancelled = false;
    fetchPreloadedQuestions(roleId, null, { limit: 1000 })
      .then((data) => { if (!cancelled) setFullPool(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [roleId]);

  const labelById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.label])),
    [categories],
  );

  // Title-case category ids we don't have a friendly label for, so newly
  // ingested tags (ml_theory, nlp, frontend) render readable without needing
  // updates in DEFAULT_CATEGORIES_BY_ROLE.
  const prettifyId = (id) =>
    id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Tag chips = union of (a) categories the user already has for this role
  // (preferred labels) and (b) any category_id present in the pool. Pool-only
  // ids get a prettified fallback label.
  const tagChips = useMemo(() => {
    const seen = new Map();
    categories.forEach((c) => seen.set(c.id, c.label));
    fullPool.forEach((p) => {
      if (p.category_id && !seen.has(p.category_id)) {
        seen.set(p.category_id, prettifyId(p.category_id));
      }
    });
    return Array.from(seen, ([id, label]) => ({ id, label }));
  }, [categories, fullPool]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((p) => (p.text || "").toLowerCase().includes(q));
  }, [pool, search]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    const visibleIds = filtered.map((p) => p.id);
    const allSelected = visibleIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      const created = await copyPreloadedQuestions(
        Array.from(selected),
        roleId,
        targetPosition,
      );
      onCopied?.(created);
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Browse preloaded questions</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {roleLabel || roleId} · pick from curated pool, add to your list
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
            aria-label="Close"
          >
            <LuX size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-400">Tag:</span>
          <button
            onClick={() => setTagFilter(null)}
            className={`px-2.5 py-1 rounded-full text-xs cursor-pointer ${
              !tagFilter
                ? "bg-orange-50 text-orange-600 border border-orange-300"
                : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300"
            }`}
          >
            All
          </button>
          {tagChips.map((c) => (
            <button
              key={c.id}
              onClick={() => setTagFilter(c.id)}
              className={`px-2.5 py-1 rounded-full text-xs cursor-pointer ${
                tagFilter === c.id
                  ? "bg-orange-50 text-orange-600 border border-orange-300"
                  : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search + select all */}
        <div className="px-6 py-2 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1">
            <LuSearch size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded-md placeholder-gray-300 focus:outline-none focus:border-orange-300"
            />
          </div>
          <button
            onClick={toggleAllVisible}
            disabled={filtered.length === 0}
            className="text-xs text-gray-500 hover:text-orange-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {filtered.every((p) => selected.has(p.id)) && filtered.length > 0
              ? "Deselect all"
              : "Select all"}
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading && <div className="text-center text-sm text-gray-300 py-12">Loading…</div>}
          {!loading && error && <div className="text-center text-sm text-red-400 py-12">{error}</div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-center text-sm text-gray-300 py-12">
              No preloaded questions for this filter.
            </div>
          )}
          {!loading && !error && filtered.map((p) => {
            const isSel = selected.has(p.id);
            return (
              <label
                key={p.id}
                className={`flex items-start gap-3 p-3 mb-1.5 rounded-lg cursor-pointer border ${
                  isSel ? "bg-orange-50/40 border-orange-200" : "bg-white border-gray-100 hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => toggle(p.id)}
                  className="mt-1 accent-orange-500 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700">{p.text}</div>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {p.category_id && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                        {labelById[p.category_id] || prettifyId(p.category_id)}
                      </span>
                    )}
                    {p.difficulty && (
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${DIFFICULTY_STYLES[p.difficulty] || "bg-gray-100 text-gray-400"}`}>
                        {p.difficulty}
                      </span>
                    )}
                    {p.experience && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-100">
                        {p.experience}
                      </span>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Add to:</span>
            <select
              value={targetPosition}
              onChange={(e) => setTargetPosition(e.target.value)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white cursor-pointer"
            >
              <option value="general">General</option>
              {positions.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.title}{p.company ? ` @ ${p.company}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selected.size === 0 || submitting}
            className="px-4 py-1.5 text-sm bg-orange-400 text-white rounded-lg hover:bg-orange-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Adding…" : `Add ${selected.size || ""} selected`.trim()}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreloadPicker;
