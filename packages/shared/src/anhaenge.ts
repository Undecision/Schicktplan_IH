import type { Referenz } from "./eintraege";

/**
 * Dateianhänge an Schichtbucheinträgen (Phase 4).
 *
 * Erlaubte Typen laut Bauplan P4.1: Bilder (JPG/PNG/HEIC), Dokumente
 * (PDF/DOCX/XLSX/TXT) und optional Video (MP4). Die Whitelist ist bewusst die
 * einzige Quelle der Wahrheit – Backend (Validierung) und Frontend (Dateiauswahl-
 * Filter, Fehlermeldungen) leiten sich daraus ab.
 */

/** Erlaubte MIME-Typen für Anhänge (Server-seitig erzwungen). */
export const ANHANG_ERLAUBTE_MIME_TYPES = [
  // Bilder
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  // Dokumente
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
  "text/plain",
  // Video (optional)
  "video/mp4",
] as const;

export type AnhangMimeType = (typeof ANHANG_ERLAUBTE_MIME_TYPES)[number];

/** Maximale Dateigröße je Anhang in Bytes (25 MB). */
export const ANHANG_MAX_GROESSE_BYTES = 25 * 1024 * 1024;

/** Passende Dateiendungen für den `accept`-Filter des Datei-Dialogs. */
export const ANHANG_ACCEPT_ATTRIBUTE = [
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".heif",
  ".pdf",
  ".docx",
  ".xlsx",
  ".txt",
  ".mp4",
].join(",");

export function istBildMime(mime: string): boolean {
  return mime.startsWith("image/");
}

/** Anhang-Metadaten, wie sie das Backend an den Client liefert (ohne Binärdaten). */
export interface Anhang {
  id: string;
  eintragId: string;
  dateiname: string;
  mime: string;
  groesse: number;
  hochgeladenVon: Referenz;
  createdAt: string;
}
