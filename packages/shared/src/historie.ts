import type { AuditAction } from "./audit";

/**
 * Einsehbare Versionierung von Schichtbucheinträgen (P6.1). Leitet sich aus dem
 * append-only Audit-Log ab (DB-seitig gegen UPDATE/DELETE gesichert) und macht
 * je Änderung sichtbar: Wer? Wann? Was wurde von → auf geändert?
 */
export interface FeldAenderung {
  /** Technischer Feldname (z.B. "status"). */
  feld: string;
  /** Anzeigename (z.B. "Status"). */
  label: string;
  /** Wert vor der Änderung (bereits als Anzeigetext aufbereitet). */
  vorher: string | null;
  /** Wert nach der Änderung (bereits als Anzeigetext aufbereitet). */
  nachher: string | null;
}

export interface HistorieEintrag {
  id: string;
  /** Zeitpunkt der Änderung (ISO). */
  zeitpunkt: string;
  actorName: string | null;
  action: AuditAction;
  /** Geänderte Felder (leer bei CREATE). */
  aenderungen: FeldAenderung[];
}
