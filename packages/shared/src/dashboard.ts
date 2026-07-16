import type { EintragStatus, Prioritaet, SchichtbucheintragListItem } from "./eintraege";

/**
 * Aggregierte Kennzahlen für das rollen-/gewerkabhängige Start-Dashboard (P9.1).
 * Alle Werte respektieren die Gewerk-Sichtbarkeit des angemeldeten Nutzers.
 */
export interface StatusVerteilung {
  status: EintragStatus;
  anzahl: number;
}

export interface PrioritaetVerteilung {
  prioritaet: Prioritaet;
  anzahl: number;
}

export interface AnlageKurz {
  id: string;
  name: string;
  /** Zeitpunkt der letzten Bearbeitung (ISO). */
  zuletzt: string;
}

export interface DashboardData {
  /** Einträge mit Status OFFEN. */
  offen: number;
  /** Einträge mit Status IN_BEARBEITUNG. */
  inBearbeitung: number;
  /** Nicht erledigte Einträge mit Priorität KRITISCH. */
  kritischeOffen: number;
  /** Heute (ab 00:00 Uhr) erfasste Einträge. */
  heuteErfasst: number;
  /** Anzahl distinct SAP-IH-Aufträge (nicht leer) mit Status ≠ ERLEDIGT. */
  offeneSapAuftraege: number;
  statusVerteilung: StatusVerteilung[];
  prioritaetVerteilung: PrioritaetVerteilung[];
  /** Die zuletzt erfassten Einträge (max. 5). */
  letzteEintraege: SchichtbucheintragListItem[];
  /** Zuletzt bearbeitete technische Plätze/Anlagen (max. 5). */
  zuletztAnlagen: AnlageKurz[];
}
