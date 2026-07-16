import { SetMetadata } from "@nestjs/common";
import type { PermissionKey } from "@schichtbuch/shared";

export const PERMISSIONS_KEY = "permissions";
export const PERMISSIONS_ANY_KEY = "permissions:any";

/** Fordert ALLE angegebenen Permissions für den Endpunkt (siehe PermissionsGuard). */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Fordert MINDESTENS EINE der angegebenen Permissions (ODER-Verknüpfung). */
export const RequireAnyPermission = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_ANY_KEY, permissions);
