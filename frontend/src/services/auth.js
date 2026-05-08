const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── API calls ──────────────────────────────────────────────────────────────

export async function register(name, email, password) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Registration failed");
  return data; // { access_token, token_type, user }
}

export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  return data; // { access_token, token_type, user }
}

export async function getMe(token) {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch user");
  return data; // { id, name, email }
}

export async function demoLogin() {
  const res = await fetch(`${API_URL}/auth/demo-login`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Demo unavailable");
  return data; // { access_token, token_type, user }
}

// ── Token helpers ──────────────────────────────────────────────────────────

export function saveToken(token) {
  localStorage.setItem("access_token", token);
}

export function getToken() {
  return localStorage.getItem("access_token");
}

export function removeToken() {
  localStorage.removeItem("access_token");
}

// ── Demo mode helpers ──────────────────────────────────────────────────────

export function setDemoMode() {
  localStorage.setItem("demo_mode", "true");
}

export function isDemoMode() {
  return localStorage.getItem("demo_mode") === "true";
}

export function clearDemoMode() {
  localStorage.removeItem("demo_mode");
}
