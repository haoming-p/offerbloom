import { apiFetch } from "./client";

export type Story = {
  id: string;
  title: string;
  content: string;     // TipTap HTML
  role_id: string | null;
  created_at: number;
  updated_at: number;
};

export async function listStories(): Promise<Story[]> {
  return apiFetch<Story[]>("/stories/");
}
