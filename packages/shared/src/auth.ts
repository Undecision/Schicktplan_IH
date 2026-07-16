import type { PermissionKey } from "./permissions";

/**
 * Systemrollen (Startwerte, siehe Seed). Meister und Schichtleiter sind bewusst
 * getrennt: Meister erstellen Arbeitsanweisungen, Schichtleiter lesen/quittieren
 * sie (wie die Instandhalter, je nach Gewerk). Zusätzliche Rollen können über die
 * Rollenverwaltung angelegt werden – Rollen sind daher generell frei (String),
 * dieses Enum bildet nur die vordefinierten Systemrollen ab.
 */
export enum Rolle {
  ADMINISTRATOR = "Administrator",
  MEISTER = "Meister",
  SCHICHTLEITER = "Schichtleiter",
  INSTANDHALTER = "Instandhalter",
  LESEBERECHTIGTE = "Leseberechtigte",
}

export const ROLLEN = [
  Rolle.ADMINISTRATOR,
  Rolle.MEISTER,
  Rolle.SCHICHTLEITER,
  Rolle.INSTANDHALTER,
  Rolle.LESEBERECHTIGTE,
] as const;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  /** Rollennamen (Systemrollen oder frei angelegte Rollen). */
  rollen: string[];
  permissions: PermissionKey[];
  gewerkeSichtbarkeit: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

/** Selbstverwaltung: eigene Stammdaten ändern (eingeloggter Nutzer). */
export interface UpdateProfileRequest {
  name: string;
  email: string;
}

/** Selbstverwaltung: eigenes Passwort ändern (aktuelles Passwort erforderlich). */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
