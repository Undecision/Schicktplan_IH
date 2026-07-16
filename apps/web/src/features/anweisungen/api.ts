import type {
  ArbeitsanweisungListItem,
  ArbeitsanweisungQuittungen,
  CreateArbeitsanweisungRequest,
} from "@schichtbuch/shared";
import { apiClient } from "@/lib/api-client";

const BASE = "/arbeitsanweisungen";

export async function fetchAnweisungen(): Promise<ArbeitsanweisungListItem[]> {
  const { data } = await apiClient.get<ArbeitsanweisungListItem[]>(BASE);
  return data;
}

export async function fetchUngelesen(): Promise<ArbeitsanweisungListItem[]> {
  const { data } = await apiClient.get<ArbeitsanweisungListItem[]>(`${BASE}/ungelesen`);
  return data;
}

export async function createAnweisung(
  payload: CreateArbeitsanweisungRequest,
  file: File | null,
): Promise<ArbeitsanweisungListItem> {
  const form = new FormData();
  form.append("titel", payload.titel);
  if (payload.text) form.append("text", payload.text);
  form.append("gewerkId", payload.gewerkId);
  if (payload.schichtId) form.append("schichtId", payload.schichtId);
  if (file) form.append("file", file);
  const { data } = await apiClient.post<ArbeitsanweisungListItem>(BASE, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function quittiereAnweisung(id: string): Promise<ArbeitsanweisungListItem> {
  const { data } = await apiClient.post<ArbeitsanweisungListItem>(`${BASE}/${id}/quittieren`);
  return data;
}

export async function fetchQuittungen(id: string): Promise<ArbeitsanweisungQuittungen> {
  const { data } = await apiClient.get<ArbeitsanweisungQuittungen>(`${BASE}/${id}/quittungen`);
  return data;
}

export async function deleteAnweisung(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

/** Lädt den Anhang einer Anweisung (RBAC-geschützter Stream) als Blob. */
export async function fetchAnweisungAnhangBlob(id: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`${BASE}/${id}/anhang`, { responseType: "blob" });
  return data;
}
