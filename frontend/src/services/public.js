const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchPublicRoles() {
  const res = await fetch(`${API_URL}/public/roles`);
  return res.json();
}

export async function fetchPublicCategories() {
  const res = await fetch(`${API_URL}/public/categories`);
  return res.json();
}

export async function fetchPublicQuestions({ roleId, categoryId, difficulty, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (roleId)     params.set("role_id", roleId);
  if (categoryId) params.set("category_id", categoryId);
  if (difficulty) params.set("difficulty", difficulty);
  params.set("limit", limit);
  const res = await fetch(`${API_URL}/public/questions?${params}`);
  return res.json();
}
