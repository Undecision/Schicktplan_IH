import type { PermissionKey, Rolle } from "@schichtbuch/shared";

export interface JwtAccessPayload {
  sub: string;
  email: string;
  name: string;
  rollen: Rolle[];
  permissions: PermissionKey[];
  gewerkeSichtbarkeit: string[];
}

export interface JwtRefreshPayload {
  sub: string;
}
