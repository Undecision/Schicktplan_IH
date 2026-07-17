import type { BaseEntity } from "./base";

export type UserStatus = "AKTIV" | "DEAKTIVIERT";

export interface GewerkRef {
  id: string;
  name: string;
}

export interface UserSummary extends BaseEntity {
  /** Anmeldename (eindeutig). */
  username: string;
  email: string;
  name: string;
  status: UserStatus;
  /** Rollennamen (Systemrollen oder frei angelegte Rollen). */
  rollen: string[];
  gewerke: GewerkRef[];
}

export interface CreateUserRequest {
  username: string;
  email: string;
  name: string;
  password: string;
  rollen: string[];
  gewerkeIds: string[];
}

export interface UpdateUserRequest {
  username?: string;
  name?: string;
  rollen?: string[];
  gewerkeIds?: string[];
  status?: UserStatus;
}

export interface ResetPasswordRequest {
  password: string;
}

/** Passwort-Policy (gilt für Erstpasswort, Reset und künftige Self-Service-Änderung). */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_POLICY_HINT = `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen, mit Groß-/Kleinbuchstaben und Ziffer oder Sonderzeichen.`;
