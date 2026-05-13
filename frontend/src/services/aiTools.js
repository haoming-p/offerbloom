import { getToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function formatJobDescription(text) {
  const token = getToken();
  const res = await fetch(`${API_URL}/ai/format-jd`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to format JD");
  return data.formatted;
}
