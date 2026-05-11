import { getToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  "Content-Type": "application/json",
});

export async function listStories() {
  const res = await fetch(`${API_URL}/stories/`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to load stories");
  return data; // [{ id, title, content, created_at, updated_at }]
}

export async function createStory({ title, content = "", roleId = null }) {
  const res = await fetch(`${API_URL}/stories/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ title, content, role_id: roleId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to create story");
  return data;
}

// Partial update — pass only changed fields. roleId="" widens to all roles.
export async function updateStory(id, { title, content, roleId } = {}) {
  const body = {};
  if (title !== undefined) body.title = title;
  if (content !== undefined) body.content = content;
  if (roleId !== undefined) body.role_id = roleId;
  const res = await fetch(`${API_URL}/stories/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to update story");
  return data;
}

export async function deleteStory(id) {
  const res = await fetch(`${API_URL}/stories/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to delete story");
  }
}
