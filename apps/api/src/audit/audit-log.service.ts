import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuditAction } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface LogAuditParams {
  actorId: string | null;
  actorName: string | null;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  before?: unknown;
  after?: unknown;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Append-only Insert. Wirft absichtlich nicht bei Fehlern nach außen – ein
   * fehlgeschlagener Audit-Log-Eintrag darf die fachliche Operation nicht
   * blockieren, wird aber protokolliert. */
  async log(params: LogAuditParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          actorName: params.actorName,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          before: toJsonInput(params.before),
          after: toJsonInput(params.after),
        },
      });
    } catch (error) {
      this.logger.error(
        `Audit-Log-Eintrag fehlgeschlagen (entity=${params.entity}, action=${params.action}): ${(error as Error).message}`,
      );
    }
  }
}

function toJsonInput(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) {
    return Prisma.JsonNull;
  }
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
