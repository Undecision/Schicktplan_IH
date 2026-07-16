import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuditAction } from "@prisma/client";
import type { Request } from "express";
import { Observable, tap } from "rxjs";
import { AuditLogService } from "./audit-log.service";
import { AUDITED_ENTITY_KEY } from "./decorators/audited.decorator";

interface AuditableRequest extends Request {
  user?: { id?: string; name?: string };
  auditBefore?: unknown;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLog: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const entity = this.reflector.get<string | undefined>(AUDITED_ENTITY_KEY, context.getHandler());
    if (context.getType() !== "http" || !entity) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuditableRequest>();
    const action = mapMethodToAction(request.method);
    if (!action) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((result: unknown) => {
        // Bevorzugt die spezifischste Ressourcen-ID der Route; fällt sonst auf
        // die ID der Antwort zurück (z.B. bei POST/Create ohne Pfad-ID).
        const rawParamId = request.params?.anhangId ?? request.params?.id;
        const paramId = typeof rawParamId === "string" ? rawParamId : undefined;
        const entityId = paramId ?? (result as { id?: string } | undefined)?.id ?? null;

        void this.auditLog.log({
          actorId: request.user?.id ?? null,
          actorName: request.user?.name ?? null,
          action,
          entity,
          entityId,
          before: request.auditBefore,
          after: action === "DELETE" ? undefined : result,
        });
      }),
    );
  }
}

function mapMethodToAction(method: string): AuditAction | null {
  switch (method) {
    case "POST":
      return "CREATE";
    case "PUT":
    case "PATCH":
      return "UPDATE";
    case "DELETE":
      return "DELETE";
    default:
      return null;
  }
}
