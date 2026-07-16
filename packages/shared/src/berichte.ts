import type { Referenz, SchichtbucheintragListItem } from "./eintraege";

/**
 * Automatische Schichtberichte je Schicht/Gewerk/Tag (P7.1). Kennzahlen und
 * Eintragslisten werden serverseitig aus den Schichtbucheinträgen abgeleitet;
 * der Bericht selbst trägt Metadaten, den verantwortlichen Schichtführer, den
 * Freitext für besondere Ereignisse und den Freigabe-Status.
 */
export enum SchichtberichtStatus {
  ENTWURF = "ENTWURF",
  FREIGEGEBEN = "FREIGEGEBEN",
}

export const SCHICHTBERICHT_STATUS_LABELS: Record<SchichtberichtStatus, string> = {
  [SchichtberichtStatus.ENTWURF]: "Entwurf",
  [SchichtberichtStatus.FREIGEGEBEN]: "Freigegeben",
};

export interface SchichtberichtListItem {
  id: string;
  /** Berichtstag (ISO-Datum). */
  datum: string;
  schicht: Referenz;
  gewerk: Referenz;
  /** Schichtbeginn/-ende aus der Schichtdefinition. */
  beginn: string;
  ende: string;
  verantwortlicher: Referenz | null;
  status: SchichtberichtStatus;
  freigegebenVon: Referenz | null;
  freigegebenAm: string | null;
  anzahlEintraege: number;
  offenePunkte: number;
  abgeschlosseneArbeiten: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchichtberichtDetail extends SchichtberichtListItem {
  besondereEreignisse: string | null;
  offeneEintraege: SchichtbucheintragListItem[];
  erledigteEintraege: SchichtbucheintragListItem[];
  /** Kritische/hohe Priorität – als „besondere Ereignisse" hervorgehoben. */
  kritischeEintraege: SchichtbucheintragListItem[];
}

export interface GeneriereBerichtRequest {
  /** Berichtstag (YYYY-MM-DD). */
  datum: string;
  schichtId: string;
  /** Optional – ohne Angabe werden alle sichtbaren Gewerke mit Einträgen erzeugt. */
  gewerkId?: string;
}

export interface UpdateBerichtRequest {
  verantwortlicherId?: string | null;
  besondereEreignisse?: string | null;
}

export interface BerichtFilter {
  datum?: string;
  schichtId?: string;
  gewerkId?: string;
  status?: SchichtberichtStatus;
}
