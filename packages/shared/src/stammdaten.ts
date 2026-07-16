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
