import type { BaseEntity } from "./base";
import type { Rolle } from "./auth";

export type UserStatus = "AKTIV" | "DEAKTIVIERT";

export interface GewerkRef {
  id: string;
  name: string;
}

export interface UserSummary extends BaseEntity {
  email: string;
  name: string;
  status: UserStatus;
  rollen: Rolle[];
  gewerke: GewerkRef[];
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  rollen: Rolle[];
  gewerkeIds: string[];
}

export interface UpdateUserRequest {
  name?: string;
  rollen?: Rolle[];
  gewerkeIds?: string[];
  status?: UserStatus;
}

export interface ResetPasswordRequest {
  password: string;
}

/** Passwort-Policy (gilt für Erstpasswort, Reset und künftige Self-Service-Änderung). */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_POLICY_HINT = `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen, mit Groß-/Kleinbuchstaben und Ziffer oder Sonderzeichen.`;
