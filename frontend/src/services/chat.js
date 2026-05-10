import { getToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function sendChatMessage({
  message,
  context = "general",
  contextData = null,
  fileId = null,
  questionId = null,        // when set, backend pulls saved answers/practices/files for this question (RAG)
  sessionId = null,         // when set, backend appends this turn to the session as :Message nodes
  selectedAnswerId = null,  // RAG marks this answer as [FOCUS] so the model knows what "this answer" means
  selectedPracticeId = null, // same as above for practice
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
      selected_answer_id: selectedAnswerId,
      selected_practice_id: selectedPracticeId,
      history: history.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text })),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Chat request failed");
  return data.reply;
}
