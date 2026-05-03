import { getToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function saveOnboarding({ roles, positions }) {
  const token = getToken();
  const res = await fetch(`${API_URL}/onboarding/save`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ roles, positions }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to save onboarding data");
  return data;
}
