// Thin fetch wrapper for the mobile app. Reads the API base URL from
// EXPO_PUBLIC_API_URL (set in mobile/.env or .env.local) and attaches the
// saved JWT to every request. Throws on non-2xx with a parsed error message.

import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "auth.token";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.42:8000";

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
  // For endpoints that don't require auth (e.g. login/signup).
  noAuth?: boolean;
};

export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, noAuth = false } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (!noAuth) {
    const token = await getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 No Content has no body — return undefined for it.
  if (res.status === 204) return undefined as T;

  // Try to parse JSON, but tolerate plain-text errors.
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const detail =
      (data as { detail?: string })?.detail ||
      (typeof data === "string" ? data : `Request failed (${res.status})`);
    throw new Error(detail);
  }

  return data as T;
}
