import { getToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Pass categoryId = null (or omit) to get questions across ALL categories — used by the "All" tab.
export async function fetchQuestions(roleId, categoryId, positionKey = "general") {
  const token = getToken();
  const params = new URLSearchParams({ role_id: roleId, position_key: positionKey });
  if (categoryId) params.set("category_id", categoryId);
  const res = await fetch(`${API_URL}/questions/?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch questions");
  return data; // [{ id, text, role_id, category_id, position_key, order }]
}

// categoryId can be null/empty for "no tag"
export async function addQuestion(roleId, categoryId, positionKey = "general", text) {
  const token = getToken();
  const body = { role_id: roleId, position_key: positionKey, text };
  if (categoryId) body.category_id = categoryId;
  const res = await fetch(`${API_URL}/questions/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to add question");
  return data;
}

export async function updateQuestion(questionId, text) {
  const token = getToken();
  const res = await fetch(`${API_URL}/questions/${questionId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to update question");
  return data;
}

export async function deleteQuestion(questionId) {
  const token = getToken();
  const res = await fetch(`${API_URL}/questions/${questionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || "Failed to delete question");
  }
}

// Fetch PreloadedQuestion pool for picker UI. categoryId optional.
export async function fetchPreloadedQuestions(roleId, categoryId, { limit = 100 } = {}) {
  const token = getToken();
  const params = new URLSearchParams({ role_id: roleId, limit: String(limit) });
  if (categoryId) params.set("category_id", categoryId);
  const res = await fetch(`${API_URL}/questions/preloaded?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch preloaded questions");
  return data;
}

// Bulk-copy selected preloaded questions into user-owned Question nodes.
// categoryIdOverride optional — apply same category to all (e.g. retag on import).
export async function copyPreloadedQuestions(preloadedIds, roleId, positionKey = "general", categoryIdOverride = null) {
  const token = getToken();
  const body = {
    preloaded_ids: preloadedIds,
    role_id: roleId,
    position_key: positionKey,
  };
  if (categoryIdOverride) body.category_id_override = categoryIdOverride;
  const res = await fetch(`${API_URL}/questions/preloaded/copy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to copy preloaded questions");
  return data;
}

export async function reorderQuestions(roleId, categoryId, positionKey, orderedIds) {
  const token = getToken();
  const res = await fetch(`${API_URL}/questions/reorder`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      role_id: roleId,
      category_id: categoryId,
      position_key: positionKey,
      ordered_ids: orderedIds,
    }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || "Failed to reorder questions");
  }
}
