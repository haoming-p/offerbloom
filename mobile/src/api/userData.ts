import { apiFetch } from "./client";

export type Role = {
  id: string;
  label: string;
  emoji?: string;
  desc?: string;
};

export type Position = {
  id: string;
  role: string;
  title: string;
  company?: string;
  jd?: string;
};

export type UserData = {
  roles: Role[];
  positions: Position[];
  statuses?: any[];
  categories?: Record<string, any>;
};

export async function getUserData(): Promise<UserData> {
  return apiFetch<UserData>("/user-data/");
}
