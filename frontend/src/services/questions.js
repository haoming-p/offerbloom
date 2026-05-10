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
