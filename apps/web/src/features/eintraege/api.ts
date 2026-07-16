import type {
  CreateEintragRequest,
  CreateKommentarRequest,
  EintragFilter,
  Referenz,
  SchichtbucheintragDetail,
  SchichtbucheintragListItem,
  UpdateEintragRequest,
} from "@schichtbuch/shared";
import { apiClient } from "@/lib/api-client";

export async function fetchEintraege(filter: EintragFilter): Promise<SchichtbucheintragListItem[]> {
  const { data } = await apiClient.get<SchichtbucheintragListItem[]>("/eintraege", {
    params: filter,
  });
  return data;
}

export async function fetchEintrag(id: string): Promise<SchichtbucheintragDetail> {
  const { data } = await apiClient.get<SchichtbucheintragDetail>(`/eintraege/${id}`);
  return data;
}

export async function createEintrag(
  payload: CreateEintragRequest,
): Promise<SchichtbucheintragDetail> {
  const { data } = await apiClient.post<SchichtbucheintragDetail>("/eintraege", payload);
  return data;
}

export async function updateEintrag(
  id: string,
  payload: UpdateEintragRequest,
): Promise<SchichtbucheintragDetail> {
  const { data } = await apiClient.patch<SchichtbucheintragDetail>(`/eintraege/${id}`, payload);
  return data;
}

export async function addKommentar(
  id: string,
  payload: CreateKommentarRequest,
): Promise<SchichtbucheintragDetail> {
  const { data } = await apiClient.post<SchichtbucheintragDetail>(
    `/eintraege/${id}/kommentare`,
    payload,
  );
  return data;
}

// --- Auswahllisten für das Formular ---

interface RawStammdatum {
  id: string;
  name?: string;
  bezeichnung?: string;
}

async function fetchRefList(
  endpoint: string,
  labelKey: "name" | "bezeichnung",
): Promise<Referenz[]> {
  const { data } = await apiClient.get<RawStammdatum[]>(`/${endpoint}`);
  return data.map((item) => ({ id: item.id, name: item[labelKey] ?? "" }));
}

export interface EintragFormOptions {
  gewerke: Referenz[];
  fachbereiche: Referenz[];
  technischePlaetze: Referenz[];
  schichten: Referenz[];
  schlagwoerter: Referenz[];
  benutzer: Referenz[];
}

export async function fetchFormOptions(): Promise<EintragFormOptions> {
  const [gewerke, fachbereiche, technischePlaetze, schichten, schlagwoerter, benutzer] =
    await Promise.all([
      fetchRefList("gewerke", "name"),
      fetchRefList("fachbereiche", "name"),
      fetchRefList("technische-plaetze", "bezeichnung"),
      fetchRefList("schicht-definitionen", "name"),
      fetchRefList("schlagwoerter", "name"),
      fetchRefList("users/auswahl", "name"),
    ]);
  return { gewerke, fachbereiche, technischePlaetze, schichten, schlagwoerter, benutzer };
}
