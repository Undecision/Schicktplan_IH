import type { SchichtbuchSpaltenConfig } from "@schichtbuch/shared";
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
