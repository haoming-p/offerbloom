import { apiFetch } from "./client";

export type FileLink = { kind: "role" | "position"; id: string; label?: string };

export type FileItem = {
  id: string;
  name: string;
  type?: string;             // file | url
  file_type?: string;        // resume | jd | other
  content_type?: string;     // MIME
  size?: number;
  url?: string;
  text_content?: string;     // extracted text (PDF/DOCX/TXT)
  uploaded_at?: number;
  links?: FileLink[];
};

export async function listFiles(): Promise<FileItem[]> {
  return apiFetch<FileItem[]>("/files/");
}
