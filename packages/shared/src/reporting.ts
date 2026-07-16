import type { EintragStatus, Prioritaet } from "./eintraege";

/**
 * Auswertungen/Berichte über Zeiträume und Dimensionen (Phase 10). Serverseitig
 * aggregiert, als PDF und Excel exportierbar.
 */
export enum AuswertungTyp {
  TAGES = "TAGES",
  WOCHEN = "WOCHEN",
  MONATS = "MONATS",
  FACHBEREICH = "FACHBEREICH",
  TECHNISCHER_PLATZ = "TECHNISCHER_PLATZ",
  SAP_AUFTRAG = "SAP_AUFTRAG",
}

export const AUSWERTUNG_TYP_LABELS: Record<AuswertungTyp, string> = {
  [AuswertungTyp.TAGES]: "Tagesbericht",
  [AuswertungTyp.WOCHEN]: "Wochenbericht",
  [AuswertungTyp.MONATS]: "Monatsbericht",
  [AuswertungTyp.FACHBEREICH]: "Nach Fachbereich",
  [AuswertungTyp.TECHNISCHER_PLATZ]: "Nach Technischem Platz",
  [AuswertungTyp.SAP_AUFTRAG]: "Nach SAP-Auftrag",
};

export const AUSWERTUNG_TYPEN = [
  AuswertungTyp.TAGES,
  AuswertungTyp.WOCHEN,
  AuswertungTyp.MONATS,
  AuswertungTyp.FACHBEREICH,
  AuswertungTyp.TECHNISCHER_PLATZ,
  AuswertungTyp.SAP_AUFTRAG,
] as const;

export interface AuswertungFilter {
  typ: AuswertungTyp;
  /** Zeitraum-Start (YYYY-MM-DD, inklusive). */
  von: string;
  /** Zeitraum-Ende (YYYY-MM-DD, inklusive). */
  bis: string;
  gewerkId?: string;
  fachbereichId?: string;
  technischerPlatzId?: string;
  schichtId?: string;
  status?: EintragStatus;
  prioritaet?: Prioritaet;
}

export interface AuswertungGruppe {
  /** Stabiler Schlüssel (Datum/ISO-Woche/Monat oder Entitätsname). */
  schluessel: string;
  label: string;
  anzahl: number;
  offen: number;
  erledigt: number;
  kritisch: number;
}

export interface AuswertungKennzahlen {
  gesamt: number;
  offen: number;
  erledigt: number;
  kritisch: number;
}

export interface AuswertungResult {
  typ: AuswertungTyp;
  von: string;
  bis: string;
  erzeugtAm: string;
  kennzahlen: AuswertungKennzahlen;
  statusVerteilung: { status: EintragStatus; anzahl: number }[];
  prioritaetVerteilung: { prioritaet: Prioritaet; anzahl: number }[];
  gruppen: AuswertungGruppe[];
}

export type ExportFormat = "pdf" | "xlsx";
