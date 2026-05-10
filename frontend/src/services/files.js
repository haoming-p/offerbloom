import { getToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function uploadFile(file, fileType = "other") {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("file_type", fileType);

  const res = await fetch(`${API_URL}/files/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Upload failed");
  return data; // { id, name, file_type, content_type, size, url, uploaded_at }
}

export async function listFiles() {
  const token = getToken();
  const res = await fetch(`${API_URL}/files/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch files");
  return data;
}

export async function deleteFile(fileId) {
  const token = getToken();
  const res = await fetch(`${API_URL}/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || "Delete failed");
  }
}

export async function updateFileLinks(fileId, { roleIds = [], positionIds = [] }) {
  const token = getToken();
  const res = await fetch(`${API_URL}/files/${fileId}/links`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role_ids: roleIds, position_ids: positionIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Update links failed");
  return data; // [{ kind, id, label }]
}
