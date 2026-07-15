import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { AuthenticatedUser, PermissionKey } from "@schichtbuch/shared";
import { PERMISSIONS_KEY } from "../decorators/require-permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== "http") {
      return true;
    }

    const required = this.reflector.getAllAndOverride<PermissionKey[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const userPermissions = request.user?.permissions ?? [];
    const hasAll = required.every((permission) => userPermissions.includes(permission));

    if (!hasAll) {
      throw new ForbiddenException("Keine Berechtigung für diese Operation.");
    }
    return true;
  }
}
