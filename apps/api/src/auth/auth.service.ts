import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { AuthenticatedUser } from "@schichtbuch/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../audit/audit-log.service";
import type { AppConfig } from "../config/configuration";
import { USER_WITH_ACCESS_INCLUDE, toAuthenticatedUser } from "../common/mappers/user.mapper";
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
    private readonly auditLog: AuditLogService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const lockoutConfig = this.configService.get("auth", { infer: true }).lockout;
    const existingUser = await this.prisma.user.findUnique({ where: { email } });

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

    const validated = await this.localAuthProvider.validateCredentials(email, password);

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

  private signAccessToken(user: AuthenticatedUser): string {
    const authConfig = this.configService.get("auth", { infer: true });
    const payload: JwtAccessPayload = {
      sub: user.id,
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
