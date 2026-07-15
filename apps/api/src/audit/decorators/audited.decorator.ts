import { SetMetadata } from "@nestjs/common";

export const AUDITED_ENTITY_KEY = "audited_entity";

/**
 * Markiert einen Controller-Handler zur automatischen Protokollierung durch
 * den AuditInterceptor. `entity` ist der fachliche Entitätsname (z.B. "User").
 *
 * Für vollständige Vorher-/Nachher-Stände kann der Handler vor der Mutation
 * `request.auditBefore = <vorherigerStand>` setzen; der Interceptor liest
 * das nach Abschluss der Operation aus.
 */
export const Audited = (entity: string) => SetMetadata(AUDITED_ENTITY_KEY, entity);
