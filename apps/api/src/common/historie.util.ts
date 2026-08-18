import type { AuditAction, AuditLog } from "@prisma/client";
import type { FeldAenderung, HistorieEintrag } from "@schichtbuch/shared";

/**
 * Ein nachverfolgtes Feld: technischer Name, Anzeigename und Extraktion des
 * Anzeigewerts aus einem before/after-Snapshot des Audit-Logs.
 */
export interface HistorieFeld<S> {
  feld: string;
  label: string;
  get: (snap: S) => string | null;
}

/**
 * Baut aus Audit-Log-Einträgen die einsehbare Änderungshistorie einer Entität.
 * POST-Aktionen, die fachlich eine Änderung sind (z.B. Übergeben/Freigeben) und
 * daher einen before-Snapshot tragen, werden als UPDATE dargestellt – echte
 * Anlagevorgänge (ohne before) bleiben CREATE.
 */
export function baueHistorie<S>(logs: AuditLog[], felder: HistorieFeld<S>[]): HistorieEintrag[] {
  return logs.map((log) => {
    const hatBefore = log.before !== null && log.before !== undefined;
    const action = (log.action === "CREATE" && hatBefore ? "UPDATE" : log.action) as AuditAction;
    return {
      id: log.id,
      zeitpunkt: log.createdAt.toISOString(),
      actorName: log.actorName,
      action,
      aenderungen: action === "UPDATE" ? diff(log.before, log.after, felder) : [],
    };
  });
}

function diff<S>(
  beforeRaw: unknown,
  afterRaw: unknown,
  felder: HistorieFeld<S>[],
): FeldAenderung[] {
  const before = (beforeRaw ?? {}) as S;
  const after = (afterRaw ?? {}) as S;
  const aenderungen: FeldAenderung[] = [];
  for (const { feld, label, get } of felder) {
    const vorher = get(before);
    const nachher = get(after);
    if (vorher !== nachher) {
      aenderungen.push({ feld, label, vorher, nachher });
    }
  }
  return aenderungen;
}

/** Formatiert einen ISO-Zeitstempel als Anzeigetext (TT.MM.JJJJ HH:MM). */
export function formatHistorieDatum(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
