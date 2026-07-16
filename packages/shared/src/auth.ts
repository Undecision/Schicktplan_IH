import type { PermissionKey } from "./permissions";

/** Rollen gemäß Lastenheft §0 (RBAC). */
export enum Rolle {
  ADMINISTRATOR = "Administrator",
  MEISTER_SCHICHTLEITER = "Meister/Schichtleiter",
  INSTANDHALTER = "Instandhalter",
  LESEBERECHTIGTE = "Leseberechtigte",
}

export const ROLLEN = [
  Rolle.ADMINISTRATOR,
  Rolle.MEISTER_SCHICHTLEITER,
  Rolle.INSTANDHALTER,
  Rolle.LESEBERECHTIGTE,
] as const;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  rollen: Rolle[];
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
