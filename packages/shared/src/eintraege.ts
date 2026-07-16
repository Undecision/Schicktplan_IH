import type { BaseEntity } from "./base";

export enum Prioritaet {
  NIEDRIG = "NIEDRIG",
  NORMAL = "NORMAL",
  HOCH = "HOCH",
  KRITISCH = "KRITISCH",
}

export enum EintragStatus {
  OFFEN = "OFFEN",
  IN_BEARBEITUNG = "IN_BEARBEITUNG",
  ERLEDIGT = "ERLEDIGT",
  VERSCHOBEN = "VERSCHOBEN",
}

export const PRIORITAETEN = [
  Prioritaet.NIEDRIG,
  Prioritaet.NORMAL,
  Prioritaet.HOCH,
  Prioritaet.KRITISCH,
] as const;

export const EINTRAG_STATUS = [
  EintragStatus.OFFEN,
  EintragStatus.IN_BEARBEITUNG,
  EintragStatus.ERLEDIGT,
  EintragStatus.VERSCHOBEN,
] as const;

export const PRIORITAET_LABELS: Record<Prioritaet, string> = {
  [Prioritaet.NIEDRIG]: "Niedrig",
  [Prioritaet.NORMAL]: "Normal",
  [Prioritaet.HOCH]: "Hoch",
  [Prioritaet.KRITISCH]: "Kritisch",
};

export const STATUS_LABELS: Record<EintragStatus, string> = {
  [EintragStatus.OFFEN]: "Offen",
  [EintragStatus.IN_BEARBEITUNG]: "In Bearbeitung",
  [EintragStatus.ERLEDIGT]: "Erledigt",
  [EintragStatus.VERSCHOBEN]: "Verschoben",
};

/**
 * Format-Validierung der Referenzfelder (v1: manuelle Eingabe, siehe
 * Entscheidungs-Log §0). Bewusst tolerant, aber strukturiert.
 */
// SAP-IH-Auftrag, z.B. 700123456 (6–12 Ziffern).
export const SAP_AUFTRAG_REGEX = /^\d{6,12}$/;
export const SAP_AUFTRAG_HINT = "SAP-IH-Auftrag: 6–12 Ziffern (z.B. 700123456).";
// EasyFlow-TAG, z.B. PW4-M-1023.
export const EASYFLOW_TAG_REGEX = /^[A-Z0-9]+-[A-Z]+-\d+$/i;
export const EASYFLOW_TAG_HINT = "EasyFlow-TAG-Format, z.B. PW4-M-1023.";

export interface Referenz {
  id: string;
  name: string;
}

export interface EintragKommentar extends BaseEntity {
  text: string;
  autor: Referenz;
}

export interface SchichtbucheintragListItem extends BaseEntity {
  zeitpunkt: string;
  prioritaet: Prioritaet;
  status: EintragStatus;
  beschreibung: string;
  gewerk: Referenz;
  fachbereich: Referenz;
  technischerPlatz: Referenz;
  schicht: Referenz;
  ersteller: Referenz;
  verantwortlicher: Referenz | null;
  sapIhAuftrag: string | null;
  easyFlowTag: string | null;
  schlagwoerter: Referenz[];
  /**
   * Optionaler Treffer-Auszug der Volltextsuche (P5.1). Enthält die Marker
   * `⟦…⟧` um die gefundenen Begriffe; das Frontend rendert diese als Hervorhebung.
   * Nur gesetzt, wenn die Liste über eine Suchanfrage (`q`) geladen wurde.
   */
  highlight?: string | null;
}

/** Marker, mit denen die Volltextsuche Treffer im Highlight-Auszug umschließt. */
export const HIGHLIGHT_START = "⟦";
export const HIGHLIGHT_END = "⟧";

export interface SchichtbucheintragDetail extends SchichtbucheintragListItem {
  faelligkeitsdatum: string | null;
  kommentare: EintragKommentar[];
}

export interface CreateEintragRequest {
  zeitpunkt: string;
  schichtId: string;
  gewerkId: string;
  fachbereichId: string;
  technischerPlatzId: string;
  prioritaet: Prioritaet;
  status: EintragStatus;
  beschreibung: string;
  sapIhAuftrag?: string | null;
  easyFlowTag?: string | null;
  verantwortlicherId?: string | null;
  faelligkeitsdatum?: string | null;
  schlagwortIds?: string[];
}

export type UpdateEintragRequest = Partial<CreateEintragRequest>;

export interface CreateKommentarRequest {
  text: string;
}

export interface EintragFilter {
  /** Volltextsuche (P5.1) über Beschreibung, SAP-Auftrag und EasyFlow-TAG. */
  q?: string;
  status?: EintragStatus;
  prioritaet?: Prioritaet;
  gewerkId?: string;
  fachbereichId?: string;
  schichtId?: string;
  technischerPlatzId?: string;
  erstellerId?: string;
  /** SAP-IH-Auftrag (Teiltreffer). */
  sapIhAuftrag?: string;
  /** EasyFlow-TAG (Teiltreffer). */
  easyFlowTag?: string;
  /** Zeitraum-Untergrenze (ISO-Datum, inklusive) auf `zeitpunkt`. */
  von?: string;
  /** Zeitraum-Obergrenze (ISO-Datum, inklusive) auf `zeitpunkt`. */
  bis?: string;
}
