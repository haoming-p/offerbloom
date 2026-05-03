import { getToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function addAnswer(questionId, label, content) {
  const token = getToken();
  const res = await fetch(`${API_URL}/answers/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ question_id: questionId, label, content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to add answer");
  return data; // { id, label, content }
}

export async function updateAnswer(answerId, label, content) {
  const token = getToken();
  const res = await fetch(`${API_URL}/answers/${answerId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ label, content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to update answer");
  return data;
}

export async function deleteAnswer(answerId) {
  const token = getToken();
  const res = await fetch(`${API_URL}/answers/${answerId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || "Failed to delete answer");
  }
}
