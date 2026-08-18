import type { BaseEntity } from "./base";

/** Gemeinsame Basis aller deaktivierbaren Stammdaten (Deaktivieren statt Löschen). */
export interface StammdatumBase extends BaseEntity {
  aktiv: boolean;
}

export interface Gewerk extends StammdatumBase {
  name: string;
}

export interface Fachbereich extends StammdatumBase {
  name: string;
}

export interface TechnischerPlatz extends StammdatumBase {
  bezeichnung: string;
  code: string;
  sapSyncFaehig: boolean;
}

export interface Schlagwort extends StammdatumBase {
  name: string;
}

export interface SchichtDefinition extends StammdatumBase {
  name: string;
  startzeit: string;
  endzeit: string;
}

// --- Request-DTOs ---

export interface NameStammdatumInput {
  name: string;
}

export type CreateGewerkRequest = NameStammdatumInput;
export type CreateFachbereichRequest = NameStammdatumInput;
export type CreateSchlagwortRequest = NameStammdatumInput;

export interface CreateTechnischerPlatzRequest {
  bezeichnung: string;
  code: string;
  sapSyncFaehig: boolean;
}

export interface CreateSchichtDefinitionRequest {
  name: string;
  startzeit: string;
  endzeit: string;
}

/** Zeitformat "HH:MM" (24h) für Schicht-Definitionen. */
export const ZEIT_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// --- Excel-Import Technische Plätze (P2.1) ---

/** Ein Fehler bezogen auf eine einzelne Zeile der Import-Datei. */
export interface TechnischePlaetzeImportZeilenfehler {
  /** 1-basierte Zeilennummer in der Excel-Datei (inkl. Kopfzeile). */
  zeile: number;
  /** Der Code der Zeile, sofern vorhanden. */
  code: string | null;
  meldung: string;
}

/** Ergebnis eines Excel-Imports technischer Plätze. */
export interface TechnischePlaetzeImportResult {
  /** Anzahl der geprüften Datenzeilen (ohne leere Zeilen). */
  verarbeitet: number;
  angelegt: number;
  aktualisiert: number;
  /** Zeilen, die wegen eines Fehlers übersprungen wurden. */
  uebersprungen: number;
  fehler: TechnischePlaetzeImportZeilenfehler[];
}

/** Erwartete Spaltenüberschriften der Import-Vorlage (für Frontend-Hinweise). */
export const TECHNISCHE_PLAETZE_IMPORT_SPALTEN = [
  "Bezeichnung",
  "Code",
  "Fachbereich",
  "SAP-synchronisierbar",
] as const;
