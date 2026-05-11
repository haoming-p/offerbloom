import { apiFetch, API_URL, getToken } from "./client";

export type Practice = {
  id: string;
  tag: string;
  duration: number;
  transcript: string;
  ai_feedback?: any;
  created_at: number;
};

export async function listPracticesForQuestion(questionId: string): Promise<Practice[]> {
  const params = new URLSearchParams({ question_id: questionId });
  return apiFetch<Practice[]>(`/practices/?${params.toString()}`);
}

export async function addPractice(
  questionId: string,
  tag: string,
  duration: number,
  transcript: string,
): Promise<Practice> {
  return apiFetch<Practice>("/practices/", {
    method: "POST",
    body: { question_id: questionId, tag, duration, transcript },
  });
}

// Upload audio to /transcribe and get the transcript back. Uses raw fetch
// because apiFetch is JSON-only; this needs multipart/form-data.
export async function transcribeAudio(audioUri: string): Promise<string> {
  const token = await getToken();
  const form = new FormData();
  // React Native FormData accepts {uri, name, type} for file blobs.
  // 'audio' is the field name the backend looks for.
  form.append("audio", {
    uri: audioUri,
    name: "practice.m4a",
    type: "audio/m4a",
  } as any);

  const res = await fetch(`${API_URL}/transcribe/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type — RN fills in the multipart boundary.
    },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Transcription failed");
  return data.text as string;
}
