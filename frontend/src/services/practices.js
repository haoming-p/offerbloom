import { getToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function addPractice(questionId, tag, duration, transcript = "") {
  const token = getToken();
  const res = await fetch(`${API_URL}/practices/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ question_id: questionId, tag, duration, transcript }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to save practice");
  return data; // { id, tag, duration, transcript, ai_feedback, created_at }
}

export async function requestFeedback(practiceId) {
  const token = getToken();
  const res = await fetch(`${API_URL}/practices/${practiceId}/feedback`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to get feedback");
  return data; // full PracticeOut with ai_feedback populated
}

export async function deletePractice(practiceId) {
  const token = getToken();
  const res = await fetch(`${API_URL}/practices/${practiceId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || "Failed to delete practice");
  }
}
