import type {
  BerichtFilter,
  GeneriereBerichtRequest,
  HistorieEintrag,
  SchichtberichtDetail,
  SchichtberichtListItem,
  UpdateBerichtRequest,
} from "@schichtbuch/shared";
import { apiClient } from "@/lib/api-client";

export async function fetchBerichte(filter: BerichtFilter): Promise<SchichtberichtListItem[]> {
  const { data } = await apiClient.get<SchichtberichtListItem[]>("/berichte", { params: filter });
  return data;
}

export async function fetchBericht(id: string): Promise<SchichtberichtDetail> {
  const { data } = await apiClient.get<SchichtberichtDetail>(`/berichte/${id}`);
  return data;
}

export async function generiereBerichte(
  payload: GeneriereBerichtRequest,
): Promise<SchichtberichtListItem[]> {
  const { data } = await apiClient.post<SchichtberichtListItem[]>("/berichte/generieren", payload);
  return data;
}

export async function updateBericht(
  id: string,
  payload: UpdateBerichtRequest,
): Promise<SchichtberichtDetail> {
  const { data } = await apiClient.patch<SchichtberichtDetail>(`/berichte/${id}`, payload);
  return data;
}

export async function deleteBericht(id: string): Promise<void> {
  await apiClient.delete(`/berichte/${id}`);
}

export async function fetchBerichtHistorie(id: string): Promise<HistorieEintrag[]> {
  const { data } = await apiClient.get<HistorieEintrag[]>(`/berichte/${id}/historie`);
  return data;
}

export async function freigebenBericht(id: string): Promise<SchichtberichtDetail> {
  const { data } = await apiClient.post<SchichtberichtDetail>(`/berichte/${id}/freigeben`);
  return data;
}
