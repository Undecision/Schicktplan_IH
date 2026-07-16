import type { Anhang } from "@schichtbuch/shared";
import { apiClient } from "@/lib/api-client";

function basePath(eintragId: string): string {
  return `/eintraege/${eintragId}/anhaenge`;
}

export async function fetchAnhaenge(eintragId: string): Promise<Anhang[]> {
  const { data } = await apiClient.get<Anhang[]>(basePath(eintragId));
  return data;
}

export async function uploadAnhang(
  eintragId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<Anhang> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<Anhang>(basePath(eintragId), form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });
  return data;
}

export async function deleteAnhang(eintragId: string, anhangId: string): Promise<void> {
  await apiClient.delete(`${basePath(eintragId)}/${anhangId}`);
}

/** Lädt den Binärinhalt eines Anhangs (RBAC-geschützter Stream) als Blob. */
export async function fetchAnhangBlob(eintragId: string, anhangId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`${basePath(eintragId)}/${anhangId}`, {
    responseType: "blob",
  });
  return data;
}
