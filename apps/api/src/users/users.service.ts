import { ConflictException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { UserSummary } from "@schichtbuch/shared";
import { PrismaService } from "../prisma/prisma.service";
import { PasswordService } from "../auth/password.service";
import { USER_WITH_ACCESS_INCLUDE, toUserSummary } from "../common/mappers/user.mapper";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async list(): Promise<UserSummary[]> {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: USER_WITH_ACCESS_INCLUDE,
      orderBy: { name: "asc" },
    });
    return users.map(toUserSummary);
  }

  async findSummary(id: string): Promise<UserSummary> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: USER_WITH_ACCESS_INCLUDE,
    });
    return toUserSummary(user);
  }

  async create(dto: CreateUserDto): Promise<UserSummary> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Diese E-Mail-Adresse ist bereits vergeben.");
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const roles = await this.prisma.role.findMany({ where: { name: { in: dto.rollen } } });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        roles: { create: roles.map((role) => ({ roleId: role.id })) },
        gewerkeSichtbarkeit: { connect: dto.gewerkeIds.map((id) => ({ id })) },
      },
      include: USER_WITH_ACCESS_INCLUDE,
    });
    return toUserSummary(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserSummary> {
    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.status !== undefined) data.status = dto.status;

    if (dto.rollen !== undefined) {
      const roles = await this.prisma.role.findMany({ where: { name: { in: dto.rollen } } });
      data.roles = {
        deleteMany: {},
        create: roles.map((role) => ({ roleId: role.id })),
      };
    }

    if (dto.gewerkeIds !== undefined) {
      data.gewerkeSichtbarkeit = { set: dto.gewerkeIds.map((gewerkId) => ({ id: gewerkId })) };
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: USER_WITH_ACCESS_INCLUDE,
    });
    return toUserSummary(user);
  }

  async deactivate(id: string): Promise<UserSummary> {
    return this.update(id, { status: "DEAKTIVIERT" });
  }

  async resetPassword(id: string, dto: ResetPasswordDto): Promise<void> {
    const passwordHash = await this.passwordService.hash(dto.password);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    });
  }
}
