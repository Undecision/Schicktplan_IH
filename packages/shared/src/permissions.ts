/**
 * Granulare Permissions (RBAC). Einzige Quelle der Wahrheit für Backend-Guards
 * (@RequirePermissions) und Frontend-Gating (<RequirePermission>).
 */
export const PERMISSIONS = [
  "eintraege:create",
  "eintraege:read",
  "eintraege:update",
  "eintraege:comment",
  "eintraege:attach",
  "anweisungen:read",
  "anweisungen:manage",
  "uebergaben:manage",
  "berichte:read",
  "berichte:freigeben",
  "admin:benutzer:manage",
  "admin:stammdaten:manage",
  "audit:read",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];
