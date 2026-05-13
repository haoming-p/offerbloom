const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Static reference data — no auth required.
export async function fetchPublicCategories() {
  const res = await fetch(`${API_URL}/public/categories`);
  if (!res.ok) throw new Error("Failed to fetch public categories");
  return res.json(); // [{ id, label }]
}

export async function fetchPublicRoles() {
  const res = await fetch(`${API_URL}/public/roles`);
  if (!res.ok) throw new Error("Failed to fetch public roles");
  return res.json();
}
