import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { AuthenticatedUser } from "@schichtbuch/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../audit/audit-log.service";
import type { AppConfig } from "../config/configuration";
import { USER_WITH_ACCESS_INCLUDE, toAuthenticatedUser } from "../common/mappers/user.mapper";
import { PasswordService } from "./password.service";
import { LocalAuthProvider } from "./providers/local-auth.provider";
import type { JwtAccessPayload, JwtRefreshPayload } from "./jwt-payload.interface";

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

const GENERIC_LOGIN_ERROR = "E-Mail oder Passwort ist falsch.";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly localAuthProvider: LocalAuthProvider,
    private readonly passwordService: PasswordService,
    private readonly auditLog: AuditLogService,
  ) {}

  async login(username: string, password: string): Promise<LoginResult> {
    const lockoutConfig = this.configService.get("auth", { infer: true }).lockout;
    const existingUser = await this.prisma.user.findUnique({ where: { username } });

    if (existingUser?.lockedUntil && existingUser.lockedUntil > new Date()) {
      await this.auditLog.log({
        actorId: existingUser.id,
        actorName: existingUser.name,
        action: "LOGIN_FAILURE",
        entity: "User",
        entityId: existingUser.id,
        after: { reason: "locked" },
      });
      throw new UnauthorizedException(
        "Konto ist vorübergehend gesperrt. Bitte später erneut versuchen.",
      );
    }

    const validated = await this.localAuthProvider.validateCredentials(username, password);

    if (!validated) {
      if (existingUser) {
        const failedAttempts = existingUser.failedLoginAttempts + 1;
        const shouldLock = failedAttempts >= lockoutConfig.maxAttempts;
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            failedLoginAttempts: failedAttempts,
            lockedUntil: shouldLock
              ? new Date(Date.now() + lockoutConfig.windowMinutes * 60_000)
              : null,
          },
        });
        await this.auditLog.log({
          actorId: existingUser.id,
          actorName: existingUser.name,
          action: "LOGIN_FAILURE",
          entity: "User",
          entityId: existingUser.id,
          after: { failedAttempts, locked: shouldLock },
        });
      }
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    await this.prisma.user.update({
      where: { id: validated.userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: validated.userId },
      include: USER_WITH_ACCESS_INCLUDE,
    });
    const authenticatedUser = toAuthenticatedUser(user);

    await this.auditLog.log({
      actorId: user.id,
      actorName: user.name,
      action: "LOGIN_SUCCESS",
      entity: "User",
      entityId: user.id,
    });

    return {
      accessToken: this.signAccessToken(authenticatedUser),
      refreshToken: this.signRefreshToken(user.id),
      user: authenticatedUser,
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const authConfig = this.configService.get("auth", { infer: true });
    let payload: JwtRefreshPayload;
    try {
      payload = this.jwtService.verify<JwtRefreshPayload>(refreshToken, {
        secret: authConfig.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException("Ungültiges oder abgelaufenes Refresh-Token.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: USER_WITH_ACCESS_INCLUDE,
    });
    if (!user || user.status !== "AKTIV" || user.deletedAt) {
      throw new UnauthorizedException("Benutzer nicht mehr aktiv.");
    }

    return { accessToken: this.signAccessToken(toAuthenticatedUser(user)) };
  }

  async me(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: USER_WITH_ACCESS_INCLUDE,
    });
    return toAuthenticatedUser(user);
  }

  /** Eigene Stammdaten (Name, E-Mail) ändern. E-Mail muss eindeutig bleiben. */
  async updateProfile(
    userId: string,
    input: { username: string; name: string; email: string },
  ): Promise<AuthenticatedUser> {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim();
    const emailKollision = await this.prisma.user.findFirst({
      where: { email, id: { not: userId }, deletedAt: null },
      select: { id: true },
    });
    if (emailKollision) {
      throw new ConflictException("Diese E-Mail-Adresse wird bereits verwendet.");
    }
    const nameKollision = await this.prisma.user.findFirst({
      where: { username, id: { not: userId }, deletedAt: null },
      select: { id: true },
    });
    if (nameKollision) {
      throw new ConflictException("Dieser Benutzername wird bereits verwendet.");
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { username, name: input.name.trim(), email },
      include: USER_WITH_ACCESS_INCLUDE,
    });
    await this.auditLog.log({
      actorId: userId,
      actorName: user.name,
      action: "UPDATE",
      entity: "User",
      entityId: userId,
      after: { name: user.name, email: user.email, self: true },
    });
    return toAuthenticatedUser(user);
  }

  /** Eigenes Passwort ändern; das aktuelle Passwort muss stimmen. */
  async changePassword(
    userId: string,
    input: { currentPassword: string; newPassword: string },
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash) {
      throw new BadRequestException(
        "Für dieses Konto ist kein lokales Passwort gesetzt (SSO-Anmeldung).",
      );
    }
    const gueltig = await this.passwordService.verify(user.passwordHash, input.currentPassword);
    if (!gueltig) {
      throw new BadRequestException("Das aktuelle Passwort ist nicht korrekt.");
    }
    const passwordHash = await this.passwordService.hash(input.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    });
    await this.auditLog.log({
      actorId: userId,
      actorName: user.name,
      action: "UPDATE",
      entity: "User",
      entityId: userId,
      after: { passwordChanged: true, self: true },
    });
  }

  private signAccessToken(user: AuthenticatedUser): string {
    const authConfig = this.configService.get("auth", { infer: true });
    const payload: JwtAccessPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      rollen: user.rollen,
      permissions: user.permissions,
      gewerkeSichtbarkeit: user.gewerkeSichtbarkeit,
    };
    return this.jwtService.sign(payload, {
      secret: authConfig.jwtAccessSecret,
      expiresIn: authConfig.jwtAccessTtl,
    });
  }

  private signRefreshToken(userId: string): string {
    const authConfig = this.configService.get("auth", { infer: true });
    const payload: JwtRefreshPayload = { sub: userId };
    return this.jwtService.sign(payload, {
      secret: authConfig.jwtRefreshSecret,
      expiresIn: authConfig.jwtRefreshTtl,
    });
  }
}
