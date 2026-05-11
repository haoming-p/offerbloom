import { getToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  "Content-Type": "application/json",
});

export async function listPreferences() {
  const res = await fetch(`${API_URL}/preferences/`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to load preferences");
  return data; // [{ id, text, scope, role_id, created_at }]
}

// scope: "prep" | "files" | "all". role_id: null = applies to all roles.
export async function createPreference({ text, scope = "all", roleId = null }) {
  const res = await fetch(`${API_URL}/preferences/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ text, scope, role_id: roleId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to save preference");
  return data;
}

// Partial update. Pass only the fields you want to change. role_id="" widens
// scope to all roles; role_id=null leaves it unchanged.
export async function updatePreference(id, { text, scope, roleId } = {}) {
  const body = {};
  if (text !== undefined) body.text = text;
  if (scope !== undefined) body.scope = scope;
  if (roleId !== undefined) body.role_id = roleId;
  const res = await fetch(`${API_URL}/preferences/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to update preference");
  return data;
}

export async function deletePreference(id) {
  const res = await fetch(`${API_URL}/preferences/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to delete preference");
  }
}
