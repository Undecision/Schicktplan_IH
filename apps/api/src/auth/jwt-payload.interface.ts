import type { PermissionKey } from "@schichtbuch/shared";

export interface JwtAccessPayload {
  sub: string;
  email: string;
  name: string;
  rollen: string[];
  permissions: PermissionKey[];
  gewerkeSichtbarkeit: string[];
}

export interface JwtRefreshPayload {
  sub: string;
}
