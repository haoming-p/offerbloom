import { getToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function resetDemo() {
  const token = getToken();
  const res = await fetch(`${API_URL}/demo/reset`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Reset failed");
  return data; // { access_token, token_type, user } — same shape as login
}

export async function saveDemoToAccount(newUserToken, guestToken) {
  const res = await fetch(`${API_URL}/demo/save-to-account`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${newUserToken}`,
    },
    body: JSON.stringify({ guest_token: guestToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Save failed");
  return data;
}
