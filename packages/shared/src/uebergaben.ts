import type { Referenz, SchichtbucheintragListItem } from "./eintraege";

/**
 * Digitale Schichtübergabe (P8.1). Offene Störungen und laufende Arbeiten werden
 * automatisch aus den Einträgen der Schicht übernommen; die weiteren Punkte
 * (Sicherheitshinweise, Freischaltungen, Arbeitsgenehmigungen, wichtige Termine,
 * besondere Hinweise) sind editierbare Freitextfelder. Vor der Übergabe ist die
 * Übergabe bearbeitbar; nach der Übergabe ist sie gesperrt.
 */
export enum UebergabeStatus {
  ENTWURF = "ENTWURF",
  UEBERGEBEN = "UEBERGEBEN",
}

export const UEBERGABE_STATUS_LABELS: Record<UebergabeStatus, string> = {
  [UebergabeStatus.ENTWURF]: "Entwurf",
  [UebergabeStatus.UEBERGEBEN]: "Übergeben",
};

export interface UebergabeListItem {
  id: string;
  datum: string;
  schicht: Referenz;
  gewerk: Referenz;
  beginn: string;
  ende: string;
  status: UebergabeStatus;
  uebergebenVon: Referenz | null;
  uebernommenVon: Referenz | null;
  uebergebenAm: string | null;
  offeneStoerungen: number;
  laufendeArbeiten: number;
  createdAt: string;
  updatedAt: string;
}

export interface UebergabeDetail extends UebergabeListItem {
  besondereHinweise: string | null;
  sicherheitshinweise: string | null;
  freischaltungen: string | null;
  arbeitsgenehmigungen: string | null;
  wichtigeTermine: string | null;
  /** Automatisch übernommen: offene Störungen (Status OFFEN). */
  offeneStoerungenListe: SchichtbucheintragListItem[];
  /** Automatisch übernommen: laufende Arbeiten (Status IN_BEARBEITUNG). */
  laufendeArbeitenListe: SchichtbucheintragListItem[];
}

export interface GeneriereUebergabeRequest {
  datum: string;
  schichtId: string;
  gewerkId: string;
}

export interface UpdateUebergabeRequest {
  besondereHinweise?: string | null;
  sicherheitshinweise?: string | null;
  freischaltungen?: string | null;
  arbeitsgenehmigungen?: string | null;
  wichtigeTermine?: string | null;
}

export interface UebergebenRequest {
  /** Übernehmende Person (nächste Schicht). */
  uebernommenVonId?: string | null;
}

export interface UebergabeFilter {
  datum?: string;
  schichtId?: string;
  gewerkId?: string;
  status?: UebergabeStatus;
}
