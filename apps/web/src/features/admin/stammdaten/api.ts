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
