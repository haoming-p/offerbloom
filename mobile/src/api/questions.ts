import { apiFetch } from "./client";

export type Answer = { id: string; label: string; content: string };

export type Question = {
  id: string;
  text: string;
  role_id: string;
  category_id: string;
  position_key: string;
  order: number;
  difficulty?: string;
  experience?: string;
  ideal_answer?: string;
  answers: Answer[];
};

// List questions for a role + position. category_id omitted = all categories.
// position_key defaults to "general" (matches desktop convention).
export async function fetchQuestions(
  roleId: string,
  categoryId?: string | null,
  positionKey: string = "general"
): Promise<Question[]> {
  const params = new URLSearchParams({ role_id: roleId, position_key: positionKey });
  if (categoryId) params.append("category_id", categoryId);
  return apiFetch<Question[]>(`/questions/?${params.toString()}`);
}
