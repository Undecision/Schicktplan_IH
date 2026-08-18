import type { TechnischePlaetzeImportResult } from "@schichtbuch/shared";
import { apiClient } from "@/lib/api-client";

export interface StammdatumRow {
  id: string;
  aktiv: boolean;
  [key: string]: unknown;
}

export async function fetchStammdaten(
  endpoint: string,
  includeInactive: boolean,
): Promise<StammdatumRow[]> {
  const { data } = await apiClient.get<StammdatumRow[]>(`/${endpoint}`, {
    params: { includeInactive },
  });
  return data;
}

export async function createStammdatum(
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<StammdatumRow> {
  const { data } = await apiClient.post<StammdatumRow>(`/${endpoint}`, payload);
  return data;
}

export async function updateStammdatum(
  endpoint: string,
  id: string,
  payload: Record<string, unknown>,
): Promise<StammdatumRow> {
  const { data } = await apiClient.patch<StammdatumRow>(`/${endpoint}/${id}`, payload);
  return data;
}

/** Lädt technische Plätze aus einer Excel-Datei (.xlsx) hoch. */
export async function importTechnischePlaetze(file: File): Promise<TechnischePlaetzeImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<TechnischePlaetzeImportResult>(
    "/technische-plaetze/import",
    formData,
  );
  return data;
}

/** Lädt die Excel-Vorlage für den Import technischer Plätze herunter. */
export async function ladeTechnischePlaetzeVorlage(): Promise<void> {
  const response = await apiClient.get("/technische-plaetze/import/vorlage", {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data as Blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "technische-plaetze-vorlage.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
