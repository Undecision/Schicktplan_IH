import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { AuthenticatedUser } from "@schichtbuch/shared";
import type { AppConfig } from "../../config/configuration";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { JwtAccessPayload } from "../jwt-payload.interface";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== "http") {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException("Kein Zugriffstoken vorhanden.");
    }

    try {
      const payload = this.jwtService.verify<JwtAccessPayload>(token, {
        secret: this.configService.get("auth", { infer: true }).jwtAccessSecret,
      });
      request.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        rollen: payload.rollen,
        permissions: payload.permissions,
        gewerkeSichtbarkeit: payload.gewerkeSichtbarkeit,
      };
      return true;
    } catch {
      throw new UnauthorizedException("Ungültiges oder abgelaufenes Zugriffstoken.");
    }
  }
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length);
}
