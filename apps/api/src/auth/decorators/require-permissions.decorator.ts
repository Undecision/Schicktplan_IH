import { SetMetadata } from "@nestjs/common";
import type { PermissionKey } from "@schichtbuch/shared";

export const PERMISSIONS_KEY = "permissions";

/** Fordert eine oder mehrere Permissions für den Endpunkt (siehe PermissionsGuard). */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
