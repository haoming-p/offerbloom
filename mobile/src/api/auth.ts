import { apiFetch, setToken, clearToken } from "./client";

export type User = {
  id: string;
  email: string;
  name?: string;
  is_demo_guest?: boolean;
};

type AuthResponse = {
  access_token: string;
  user: User;
};

export async function login(email: string, password: string): Promise<User> {
  const data = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    noAuth: true,
    body: { email, password },
  });
  await setToken(data.access_token);
  return data.user;
}

export async function signup(name: string, email: string, password: string): Promise<User> {
  const data = await apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    noAuth: true,
    body: { name, email, password },
  });
  await setToken(data.access_token);
  return data.user;
}

// Creates a fresh :DemoGuest cloned from the admin's data. No credentials.
export async function demoLogin(): Promise<User> {
  const data = await apiFetch<AuthResponse>("/auth/demo-login", {
    method: "POST",
    noAuth: true,
    body: {},
  });
  await setToken(data.access_token);
  return data.user;
}

export async function getMe(): Promise<User> {
  return apiFetch<User>("/auth/me");
}

export async function logout(): Promise<void> {
  await clearToken();
}
