import { getToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function getUserData() {
  const token = getToken();
  const res = await fetch(`${API_URL}/user-data/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch user data");
  return data; // { roles, positions, statuses }
}

export async function saveUserData({ roles, positions, statuses, categories }) {
  const token = getToken();
  const res = await fetch(`${API_URL}/user-data/`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ roles, positions, statuses, categories: categories || {} }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to save user data");
  return data;
}

// Cascade delete a role — removes role, its positions, child questions
// (+ answers/practices), preferences scoped to it. Stories tagged to it are
// re-tagged to '' (preserved). Returns updated UserDataOut.
export async function deleteRoleCascade(roleId) {
  const token = getToken();
  const res = await fetch(`${API_URL}/user-data/roles/${encodeURIComponent(roleId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to delete role");
  return data; // { roles, positions, statuses, categories }
}

// Cascade delete a single position — removes position + child questions
// (+ answers/practices). File links to the position are auto-stripped.
export async function deletePositionCascade(positionId) {
  const token = getToken();
  const res = await fetch(`${API_URL}/user-data/positions/${encodeURIComponent(positionId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to delete position");
  return data;
}
