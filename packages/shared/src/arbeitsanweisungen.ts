import type { Referenz } from "./eintraege";

/**
 * Arbeitsanweisungen: Meister/Schichtleiter stellen ihrem Team unregelmäßig
 * Hinweise bereit (z.B. eine Erkenntnis der Frühschicht für die Spätschicht).
 * Inhalt ist ein Freitext und/oder ein einzelner Anhang (Foto/PDF). Ziel ist
 * ein Gewerk und optional eine Schicht. Mitarbeiter müssen die Anweisung als
 * gelesen quittieren; Meister sehen den Lesestatus je Gewerk.
 */

/** Erlaubte Anhang-Typen einer Arbeitsanweisung (Foto oder PDF). */
export const ANWEISUNG_ANHANG_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

export const ANWEISUNG_ANHANG_ACCEPT_ATTRIBUTE = [
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".heif",
  ".pdf",
].join(",");

/** Maximale Dateigröße eines Anweisungs-Anhangs in Bytes (25 MB). */
export const ANWEISUNG_ANHANG_MAX_GROESSE_BYTES = 25 * 1024 * 1024;

/** Metadaten eines Anweisungs-Anhangs (ohne Binärdaten). */
export interface AnweisungAnhangMeta {
  dateiname: string;
  mime: string;
  groesse: number;
}

/** Listen-/Detaildarstellung einer Arbeitsanweisung inkl. eigenem Lesestatus. */
export interface ArbeitsanweisungListItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  titel: string;
  /** Freitext-Inhalt (optional, wenn ein Anhang vorhanden ist). */
  text: string | null;
  gewerk: Referenz;
  /** Fachbereich (optional; filter-/durchsuchbar). */
  fachbereich: Referenz | null;
  /** Ziel-Schicht (optional; nur informativer Kontext). */
  schicht: Referenz | null;
  ersteller: Referenz;
  /** Anhang-Metadaten, falls ein Foto/PDF hinterlegt ist. */
  anhang: AnweisungAnhangMeta | null;
  /** Hat der aktuelle Nutzer die Anweisung bereits quittiert? */
  gelesen: boolean;
  /** Zeitpunkt der Quittierung durch den aktuellen Nutzer (ISO) oder null. */
  gelesenAm: string | null;
  /** Gesamtzahl der Empfänger (Mitarbeiter des Gewerks). */
  anzahlEmpfaenger: number;
  /** Anzahl der Empfänger, die bereits quittiert haben. */
  anzahlGelesen: number;
}

export interface CreateArbeitsanweisungRequest {
  titel: string;
  text?: string | null;
  gewerkId: string;
  fachbereichId?: string | null;
  schichtId?: string | null;
}

/** Such-/Filterparameter für die Anweisungsübersicht. */
export interface ArbeitsanweisungFilter {
  /** Volltextartige Suche über Titel, Text, Ersteller, Gewerk, Fachbereich, Schicht. */
  q?: string;
  gewerkId?: string;
  fachbereichId?: string;
  schichtId?: string;
  /** Lesestatus des aktuellen Nutzers: nur gelesene bzw. nur ungelesene. */
  gelesen?: boolean;
}

/** Lesestatus eines einzelnen Empfängers (für die Meister-Auswertung). */
export interface ArbeitsanweisungLeserStatus {
  user: Referenz;
  gelesen: boolean;
  gelesenAm: string | null;
}

/** Auswertung des Lesestatus einer Anweisung (Meister-Sicht). */
export interface ArbeitsanweisungQuittungen {
  anzahlEmpfaenger: number;
  anzahlGelesen: number;
  empfaenger: ArbeitsanweisungLeserStatus[];
}
