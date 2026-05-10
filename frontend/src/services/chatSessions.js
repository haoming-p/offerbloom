import { getToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  "Content-Type": "application/json",
});

export async function listChatSessions(questionId, { limit = 10, offset = 0 } = {}) {
  const params = new URLSearchParams({
    question_id: questionId,
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(`${API_URL}/chat-sessions/?${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to list sessions");
  return data;
}

export async function createChatSession(questionId) {
  const res = await fetch(`${API_URL}/chat-sessions/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ question_id: questionId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to create session");
  return data;
}

export async function getSessionMessages(sessionId) {
  const res = await fetch(`${API_URL}/chat-sessions/${sessionId}/messages`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to load messages");
  return data;
}

export async function deleteChatSession(sessionId) {
  const res = await fetch(`${API_URL}/chat-sessions/${sessionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || "Failed to delete session");
  }
}
