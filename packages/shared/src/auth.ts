/** Rollen gemäß Lastenheft §0 (RBAC). Feingranulare Permissions folgen in Phase 1. */
export enum Rolle {
  ADMINISTRATOR = "Administrator",
  MEISTER_SCHICHTLEITER = "Meister/Schichtleiter",
  INSTANDHALTER = "Instandhalter",
  LESEBERECHTIGTE = "Leseberechtigte",
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  rollen: Rolle[];
  gewerkeSichtbarkeit: string[];
}
