import type {
  GeneriereUebergabeRequest,
  UebergabeDetail,
  UebergabeFilter,
  UebergabeListItem,
  UpdateUebergabeRequest,
} from "@schichtbuch/shared";
import { apiClient } from "@/lib/api-client";

export async function fetchUebergaben(filter: UebergabeFilter): Promise<UebergabeListItem[]> {
  const { data } = await apiClient.get<UebergabeListItem[]>("/uebergaben", { params: filter });
  return data;
}

export async function fetchUebergabe(id: string): Promise<UebergabeDetail> {
  const { data } = await apiClient.get<UebergabeDetail>(`/uebergaben/${id}`);
  return data;
}

export async function generiereUebergabe(
  payload: GeneriereUebergabeRequest,
): Promise<UebergabeDetail> {
  const { data } = await apiClient.post<UebergabeDetail>("/uebergaben/generieren", payload);
  return data;
}

export async function updateUebergabe(
  id: string,
  payload: UpdateUebergabeRequest,
): Promise<UebergabeDetail> {
  const { data } = await apiClient.patch<UebergabeDetail>(`/uebergaben/${id}`, payload);
  return data;
}

export async function uebergebenUebergabe(
  id: string,
  uebernommenVonId: string | null,
): Promise<UebergabeDetail> {
  const { data } = await apiClient.post<UebergabeDetail>(`/uebergaben/${id}/uebergeben`, {
    uebernommenVonId,
  });
  return data;
}

/** Lädt das Übergabe-PDF (RBAC-geschützt) als Blob und öffnet es im neuen Tab. */
export async function oeffneUebergabePdf(id: string): Promise<void> {
  const { data } = await apiClient.get<Blob>(`/uebergaben/${id}/pdf`, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  window.open(url, "_blank", "noopener");
  // Object-URL nach kurzer Zeit freigeben (Tab hat es bis dahin geladen).
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
