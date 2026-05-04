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

export async function saveUserData({ roles, positions, statuses }) {
  const token = getToken();
  const res = await fetch(`${API_URL}/user-data/`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ roles, positions, statuses }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to save user data");
  return data;
}
