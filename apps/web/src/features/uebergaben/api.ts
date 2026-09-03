import type {
  GeneriereUebergabeRequest,
  GeneriereUebergabenMehrereRequest,
  GeneriereUebergabenMehrereResult,
  HistorieEintrag,
  Referenz,
  UebergabeDetail,
  UebergabeFilter,
  UebergabeListItem,
  UpdateUebergabeRequest,
} from "@schichtbuch/shared";
import { apiClient } from "@/lib/api-client";

/** Aktive Mitarbeiter, optional auf ein Gewerk eingeschränkt (für die Übernehmenden-Auswahl). */
export async function fetchBenutzerFuerGewerk(gewerkId?: string): Promise<Referenz[]> {
  const { data } = await apiClient.get<Referenz[]>("/users/auswahl", {
    params: gewerkId ? { gewerkId } : {},
  });
  return data;
}

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

export async function generiereUebergabenMehrere(
  payload: GeneriereUebergabenMehrereRequest,
): Promise<GeneriereUebergabenMehrereResult> {
  const { data } = await apiClient.post<GeneriereUebergabenMehrereResult>(
    "/uebergaben/generieren-mehrere",
    payload,
  );
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

export async function deleteUebergabe(id: string): Promise<void> {
  await apiClient.delete(`/uebergaben/${id}`);
}

export async function fetchUebergabeHistorie(id: string): Promise<HistorieEintrag[]> {
  const { data } = await apiClient.get<HistorieEintrag[]>(`/uebergaben/${id}/historie`);
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
