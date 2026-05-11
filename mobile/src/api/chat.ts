import { apiFetch } from "./client";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatBody = {
  message: string;
  context?: string;
  context_data?: unknown;
  question_id?: string | null;
  session_id?: string | null;
  selected_answer_id?: string | null;
  selected_practice_id?: string | null;
  history?: ChatMessage[];
};

export async function sendChat({
  message,
  context = "answer_draft",
  contextData = null,
  questionId = null,
  sessionId = null,
  history = [],
}: {
  message: string;
  context?: string;
  contextData?: unknown;
  questionId?: string | null;
  sessionId?: string | null;
  history?: ChatMessage[];
}): Promise<string> {
  const body: ChatBody = {
    message,
    context,
    context_data: contextData,
    question_id: questionId,
    session_id: sessionId,
    history,
  };
  const data = await apiFetch<{ reply: string }>("/chat/", {
    method: "POST",
    body,
  });
  return data.reply;
}

export type ChatSession = {
  id: string;
  question_id: string;
  title: string;
  last_used_at: number;
  message_count: number;
};

export async function createSession(questionId: string): Promise<ChatSession> {
  return apiFetch<ChatSession>("/chat-sessions/", {
    method: "POST",
    body: { question_id: questionId },
  });
}
