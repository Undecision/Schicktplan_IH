import type {
  EasyFlowTagVorschlag,
  IntegrationLinksConfig,
  SchichtbuchSpaltenConfig,
} from "@schichtbuch/shared";
import { apiClient } from "@/lib/api-client";

export async function fetchSchichtbuchSpalten(): Promise<SchichtbuchSpaltenConfig> {
  const { data } = await apiClient.get<SchichtbuchSpaltenConfig>(
    "/einstellungen/schichtbuch-spalten",
  );
  return data;
}

export async function updateSchichtbuchSpalten(
  reihenfolge: string[],
): Promise<SchichtbuchSpaltenConfig> {
  const { data } = await apiClient.put<SchichtbuchSpaltenConfig>(
    "/einstellungen/schichtbuch-spalten",
    { reihenfolge },
  );
  return data;
}

export async function fetchIntegrationLinks(): Promise<IntegrationLinksConfig> {
  const { data } = await apiClient.get<IntegrationLinksConfig>("/einstellungen/integration-links");
  return data;
}

export async function updateIntegrationLinks(
  config: IntegrationLinksConfig,
): Promise<IntegrationLinksConfig> {
  const { data } = await apiClient.put<IntegrationLinksConfig>(
    "/einstellungen/integration-links",
    config,
  );
  return data;
}

/** Liest einen EasyFlow-TAG server-seitig aus (Vorschlag zum Vorbefüllen einer Störung). */
export async function fetchEasyFlowTag(tag: string): Promise<EasyFlowTagVorschlag> {
  const { data } = await apiClient.get<EasyFlowTagVorschlag>(
    `/integration/easyflow/${encodeURIComponent(tag)}`,
  );
  return data;
}
