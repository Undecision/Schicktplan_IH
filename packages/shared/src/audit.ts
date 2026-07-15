import type { BaseEntity } from "./base";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN_SUCCESS" | "LOGIN_FAILURE";

export interface AuditLogEntry extends BaseEntity {
  actorId: string | null;
  actorName: string | null;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
}
