import type { PermissionKey } from "./permissions";

/**
 * Rolle mit ihren Berechtigungen (für die Rollenverwaltung). Systemrollen sind
 * die vordefinierten Startrollen; sie können in ihren Berechtigungen angepasst,
 * aber nicht umbenannt oder gelöscht werden. Die Rolle „Administrator" behält
 * stets alle Berechtigungen.
 */
export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  permissions: PermissionKey[];
  /** true = vordefinierte Systemrolle (nicht umbenennbar/löschbar). */
  istSystemrolle: boolean;
  /** Anzahl der Nutzer mit dieser Rolle. */
  anzahlBenutzer: number;
}

export interface CreateRoleRequest {
  name: string;
  description?: string | null;
  permissions: PermissionKey[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string | null;
  permissions?: PermissionKey[];
}
