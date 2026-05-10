import { getToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function sendChatMessage({
  message,
  context = "general",
  contextData = null,
  fileId = null,
  questionId = null,  // when set, backend pulls saved answers/practices/files for this question (RAG)
  sessionId = null,   // when set, backend appends this turn to the session as :Message nodes
  history = [],
}) {
  const token = getToken();
  const res = await fetch(`${API_URL}/chat/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      context,
      context_data: contextData,
      file_id: fileId,
      question_id: questionId,
      session_id: sessionId,
      history: history.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text })),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Chat request failed");
  return data.reply;
}
