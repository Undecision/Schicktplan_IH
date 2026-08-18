import type {
  CreateEintragRequest,
  CreateKommentarRequest,
  EintragFilter,
  HistorieEintrag,
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

export async function fetchHistorie(id: string): Promise<HistorieEintrag[]> {
  const { data } = await apiClient.get<HistorieEintrag[]>(`/eintraege/${id}/historie`);
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

/** Technischer Platz inkl. Code und optionaler Fachbereich-Zuordnung (für Vorbelegung). */
export interface TechPlatzOption extends Referenz {
  code: string;
  fachbereichId: string | null;
}

/** Schicht inkl. Zeiten (für die automatische Schichtermittlung). */
export interface SchichtOption extends Referenz {
  startzeit: string;
  endzeit: string;
}

export interface EintragFormOptions {
  gewerke: Referenz[];
  fachbereiche: Referenz[];
  technischePlaetze: TechPlatzOption[];
  schichten: SchichtOption[];
  schlagwoerter: Referenz[];
  benutzer: Referenz[];
}

export async function fetchFormOptions(): Promise<EintragFormOptions> {
  const [gewerke, fachbereiche, technischePlaetzeRaw, schichtenRaw, schlagwoerter, benutzer] =
    await Promise.all([
      fetchRefList("gewerke", "name"),
      fetchRefList("fachbereiche", "name"),
      apiClient.get<
        { id: string; bezeichnung: string; code: string; fachbereichId: string | null }[]
      >("/technische-plaetze"),
      apiClient.get<{ id: string; name: string; startzeit: string; endzeit: string }[]>(
        "/schicht-definitionen",
      ),
      fetchRefList("schlagwoerter", "name"),
      fetchRefList("users/auswahl", "name"),
    ]);
  const technischePlaetze: TechPlatzOption[] = technischePlaetzeRaw.data.map((t) => ({
    id: t.id,
    name: t.bezeichnung,
    code: t.code,
    fachbereichId: t.fachbereichId,
  }));
  const schichten: SchichtOption[] = schichtenRaw.data.map((s) => ({
    id: s.id,
    name: s.name,
    startzeit: s.startzeit,
    endzeit: s.endzeit,
  }));
  return { gewerke, fachbereiche, technischePlaetze, schichten, schlagwoerter, benutzer };
}
