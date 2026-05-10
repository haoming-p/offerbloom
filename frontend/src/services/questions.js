import { getToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchQuestions(roleId, categoryId, positionKey = "general") {
  const token = getToken();
  const params = new URLSearchParams({ role_id: roleId, category_id: categoryId, position_key: positionKey });
  const res = await fetch(`${API_URL}/questions/?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch questions");
  return data; // [{ id, text, role_id, category_id, position_key, order }]
}

export async function addQuestion(roleId, categoryId, positionKey = "general", text) {
  const token = getToken();
  const res = await fetch(`${API_URL}/questions/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role_id: roleId, category_id: categoryId, position_key: positionKey, text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to add question");
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
