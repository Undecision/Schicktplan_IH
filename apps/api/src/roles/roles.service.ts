import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Rolle, type PermissionKey, type RoleSummary } from "@schichtbuch/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { ROLE_INCLUDE, istSystemrolle, toRoleSummary } from "./roles.mapper";

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<RoleSummary[]> {
    const roles = await this.prisma.role.findMany({
      include: ROLE_INCLUDE,
      orderBy: { name: "asc" },
    });
    // Systemrollen zuerst (in definierter Reihenfolge), danach eigene alphabetisch.
    return roles
      .map(toRoleSummary)
      .sort((a, b) => rang(a) - rang(b) || a.name.localeCompare(b.name));
  }

  async create(dto: CreateRoleDto): Promise<RoleSummary> {
    const name = dto.name.trim();
    const existing = await this.prisma.role.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException("Eine Rolle mit diesem Namen existiert bereits.");
    }
    const role = await this.prisma.role.create({
      data: {
        name,
        description: dto.description?.trim() || null,
        permissions: { create: await this.permissionConnect(dto.permissions) },
      },
      include: ROLE_INCLUDE,
    });
    return toRoleSummary(role);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleSummary> {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException("Rolle nicht gefunden.");
    const system = istSystemrolle(role.name);
    const istAdmin = role.name === Rolle.ADMINISTRATOR;

    // Administrator ist gesperrt: behält immer alle Berechtigungen und den Namen.
    if (istAdmin && (dto.name !== undefined || dto.permissions !== undefined)) {
      throw new ForbiddenException(
        "Die Rolle Administrator kann nicht umbenannt oder in ihren Rechten geändert werden.",
      );
    }
    // Systemrollen können nicht umbenannt werden (Berechtigungen aber schon).
    if (system && dto.name !== undefined && dto.name.trim() !== role.name) {
      throw new ForbiddenException("Systemrollen können nicht umbenannt werden.");
    }

    const data: Parameters<typeof this.prisma.role.update>[0]["data"] = {};
    if (dto.name !== undefined && !system) {
      const name = dto.name.trim();
      const collision = await this.prisma.role.findFirst({
        where: { name, id: { not: id } },
        select: { id: true },
      });
      if (collision) throw new ConflictException("Eine Rolle mit diesem Namen existiert bereits.");
      data.name = name;
    }
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.permissions !== undefined) {
      data.permissions = {
        deleteMany: {},
        create: await this.permissionConnect(dto.permissions),
      };
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data,
      include: ROLE_INCLUDE,
    });
    return toRoleSummary(updated);
  }

  async remove(id: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException("Rolle nicht gefunden.");
    if (istSystemrolle(role.name)) {
      throw new ForbiddenException("Systemrollen können nicht gelöscht werden.");
    }
    if (role._count.users > 0) {
      throw new ConflictException(
        "Rolle ist noch Benutzern zugewiesen und kann nicht gelöscht werden.",
      );
    }
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });
  }

  /** Wandelt Permission-Keys in Verknüpfungs-Datensätze; wirft bei Unbekannten. */
  private async permissionConnect(keys: PermissionKey[]) {
    const eindeutig = [...new Set(keys)];
    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: eindeutig } },
    });
    if (permissions.length !== eindeutig.length) {
      throw new BadRequestException("Unbekannte Berechtigung angegeben.");
    }
    return permissions.map((permission) => ({ permissionId: permission.id }));
  }
}

/** Sortierrang: Systemrollen in Enum-Reihenfolge zuerst, eigene danach. */
function rang(role: RoleSummary): number {
  const idx = (Object.values(Rolle) as string[]).indexOf(role.name);
  return idx === -1 ? Object.values(Rolle).length : idx;
}
