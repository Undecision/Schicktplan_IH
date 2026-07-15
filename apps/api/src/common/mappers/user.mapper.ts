import type { Prisma } from "@prisma/client";
import type { AuthenticatedUser, PermissionKey, Rolle, UserSummary } from "@schichtbuch/shared";

export const USER_WITH_ACCESS_INCLUDE = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
  gewerkeSichtbarkeit: true,
} satisfies Prisma.UserInclude;

export type UserWithAccess = Prisma.UserGetPayload<{ include: typeof USER_WITH_ACCESS_INCLUDE }>;

export function toAuthenticatedUser(user: UserWithAccess): AuthenticatedUser {
  const rollen = user.roles.map((userRole) => userRole.role.name as Rolle);
  const permissions = new Set<PermissionKey>();
  for (const userRole of user.roles) {
    for (const rolePermission of userRole.role.permissions) {
      permissions.add(rolePermission.permission.key as PermissionKey);
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    rollen,
    permissions: [...permissions],
    gewerkeSichtbarkeit: user.gewerkeSichtbarkeit.map((gewerk) => gewerk.name),
  };
}

export function toUserSummary(user: UserWithAccess): UserSummary {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    rollen: user.roles.map((userRole) => userRole.role.name as Rolle),
    gewerke: user.gewerkeSichtbarkeit.map((gewerk) => ({ id: gewerk.id, name: gewerk.name })),
  };
}
