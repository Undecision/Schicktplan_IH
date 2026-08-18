/**
 * Katalog der Schichtbuch-Tabellenspalten und die (global konfigurierbare)
 * Anzeige-Reihenfolge. Einzige Quelle der Wahrheit für die Tabelle und die
 * Administration (Reihenfolge/Ein-/Ausblenden). Der „Technische Platz" ist in
 * Code („Techn. Platz") und Bezeichnung („Beschreibung (Techn. Platz)")
 * aufgeteilt.
 */
export interface SchichtbuchSpalte {
  key: string;
  label: string;
}

export const SCHICHTBUCH_SPALTEN: readonly SchichtbuchSpalte[] = [
  { key: "technischerPlatzCode", label: "Techn. Platz" },
  { key: "technischerPlatzBezeichnung", label: "Beschreibung (Techn. Platz)" },
  { key: "sapIhAuftrag", label: "SAP-Auftrag" },
  { key: "beschreibung", label: "Beschreibung" },
  { key: "prioritaet", label: "Priorität" },
  { key: "status", label: "Status" },
  { key: "gewerk", label: "Gewerk" },
  { key: "schicht", label: "Schicht" },
  { key: "zeitpunkt", label: "Datum/Uhrzeit" },
  { key: "dauer", label: "Dauer" },
  { key: "typ", label: "Typ" },
] as const;

/** Alle gültigen Spaltenschlüssel. */
export const SCHICHTBUCH_SPALTEN_KEYS = SCHICHTBUCH_SPALTEN.map((s) => s.key);

/**
 * Standard-Reihenfolge (und Sichtbarkeit) der Spalten. „Typ" ist standardmäßig
 * ausgeblendet; die Administration kann es wieder einblenden.
 */
export const SCHICHTBUCH_SPALTEN_STANDARD: string[] = [
  "technischerPlatzCode",
  "technischerPlatzBezeichnung",
  "sapIhAuftrag",
  "beschreibung",
  "prioritaet",
  "status",
  "gewerk",
  "schicht",
  "zeitpunkt",
  "dauer",
];

/** Konfiguration der Schichtbuch-Spalten (global, in der Administration pflegbar). */
export interface SchichtbuchSpaltenConfig {
  /** Sichtbare Spalten in Anzeige-Reihenfolge (Teilmenge von SCHICHTBUCH_SPALTEN_KEYS). */
  reihenfolge: string[];
}

/**
 * Bereinigt eine gespeicherte Reihenfolge: entfernt unbekannte/doppelte Keys.
 * Fehlende Keys werden NICHT automatisch ergänzt (Ausblenden ist gewollt).
 */
export function normalisiereSpaltenReihenfolge(reihenfolge: string[]): string[] {
  const gesehen = new Set<string>();
  const gueltig: string[] = [];
  for (const key of reihenfolge) {
    if (SCHICHTBUCH_SPALTEN_KEYS.includes(key) && !gesehen.has(key)) {
      gesehen.add(key);
      gueltig.push(key);
    }
  }
  return gueltig.length > 0 ? gueltig : [...SCHICHTBUCH_SPALTEN_STANDARD];
}
