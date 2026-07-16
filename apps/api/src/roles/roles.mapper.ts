import type { Prisma } from "@prisma/client";
import { ROLLEN, type PermissionKey, type RoleSummary } from "@schichtbuch/shared";

export const ROLE_INCLUDE = {
  permissions: { include: { permission: true } },
  _count: { select: { users: true } },
} satisfies Prisma.RoleInclude;

export type RolePayload = Prisma.RoleGetPayload<{ include: typeof ROLE_INCLUDE }>;

const SYSTEM_ROLLEN = new Set<string>(ROLLEN);

export function istSystemrolle(name: string): boolean {
  return SYSTEM_ROLLEN.has(name);
}

export function toRoleSummary(role: RolePayload): RoleSummary {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions.map((rp) => rp.permission.key as PermissionKey),
    istSystemrolle: istSystemrolle(role.name),
    anzahlBenutzer: role._count.users,
  };
}
