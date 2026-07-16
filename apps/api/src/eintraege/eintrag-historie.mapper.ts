import {
  PRIORITAET_LABELS,
  STATUS_LABELS,
  type FeldAenderung,
  type HistorieEintrag,
  type Prioritaet,
  type EintragStatus,
} from "@schichtbuch/shared";
import type { AuditAction, AuditLog } from "@prisma/client";

/**
 * Ein Eintrags-Snapshot, wie ihn der AuditInterceptor als before/after ablegt
 * (entspricht SchichtbucheintragDetail). Nur die für die Historie relevanten
 * Felder sind hier typisiert.
 */
interface EintragSnapshot {
  beschreibung?: string;
  prioritaet?: Prioritaet;
  status?: EintragStatus;
  sapIhAuftrag?: string | null;
  easyFlowTag?: string | null;
  faelligkeitsdatum?: string | null;
  bearbeitungBeginn?: string | null;
  bearbeitungEnde?: string | null;
  zeitpunkt?: string;
  verantwortlicher?: { name: string } | null;
  schicht?: { name: string };
  gewerk?: { name: string };
  fachbereich?: { name: string };
  technischerPlatz?: { name: string };
  schlagwoerter?: { name: string }[];
}

type FeldExtractor = (snap: EintragSnapshot) => string | null;

/** Nachverfolgte Felder mit Anzeigename und Wert-Extraktion (als Anzeigetext). */
const FELDER: { feld: string; label: string; get: FeldExtractor }[] = [
  { feld: "beschreibung", label: "Beschreibung", get: (s) => s.beschreibung ?? null },
  {
    feld: "prioritaet",
    label: "Priorität",
    get: (s) => (s.prioritaet ? PRIORITAET_LABELS[s.prioritaet] : null),
  },
  { feld: "status", label: "Status", get: (s) => (s.status ? STATUS_LABELS[s.status] : null) },
  { feld: "sapIhAuftrag", label: "SAP-IH-Auftrag", get: (s) => s.sapIhAuftrag ?? null },
  { feld: "easyFlowTag", label: "EasyFlow-TAG", get: (s) => s.easyFlowTag ?? null },
  {
    feld: "faelligkeitsdatum",
    label: "Fälligkeit",
    get: (s) => (s.faelligkeitsdatum ? formatDate(s.faelligkeitsdatum) : null),
  },
  {
    feld: "zeitpunkt",
    label: "Zeitpunkt",
    get: (s) => (s.zeitpunkt ? formatDate(s.zeitpunkt) : null),
  },
  {
    feld: "bearbeitungBeginn",
    label: "Bearbeitungsbeginn",
    get: (s) => (s.bearbeitungBeginn ? formatDate(s.bearbeitungBeginn) : null),
  },
  {
    feld: "bearbeitungEnde",
    label: "Bearbeitungsende",
    get: (s) => (s.bearbeitungEnde ? formatDate(s.bearbeitungEnde) : null),
  },
  {
    feld: "verantwortlicher",
    label: "Verantwortlicher",
    get: (s) => s.verantwortlicher?.name ?? null,
  },
  { feld: "schicht", label: "Schicht", get: (s) => s.schicht?.name ?? null },
  { feld: "gewerk", label: "Gewerk", get: (s) => s.gewerk?.name ?? null },
  { feld: "fachbereich", label: "Fachbereich", get: (s) => s.fachbereich?.name ?? null },
  {
    feld: "technischerPlatz",
    label: "Technischer Platz",
    get: (s) => s.technischerPlatz?.name ?? null,
  },
  {
    feld: "schlagwoerter",
    label: "Schlagwörter",
    get: (s) => (s.schlagwoerter ? s.schlagwoerter.map((w) => w.name).join(", ") : null),
  },
];

export function toHistorieEintrag(log: AuditLog): HistorieEintrag {
  return {
    id: log.id,
    zeitpunkt: log.createdAt.toISOString(),
    actorName: log.actorName,
    action: log.action as AuditAction,
    aenderungen: log.action === "UPDATE" ? diff(log.before, log.after) : [],
  };
}

/** Vergleicht zwei Snapshots und liefert die geänderten Felder. */
function diff(beforeRaw: unknown, afterRaw: unknown): FeldAenderung[] {
  const before = (beforeRaw ?? {}) as EintragSnapshot;
  const after = (afterRaw ?? {}) as EintragSnapshot;
  const aenderungen: FeldAenderung[] = [];
  for (const { feld, label, get } of FELDER) {
    const vorher = get(before);
    const nachher = get(after);
    if (vorher !== nachher) {
      aenderungen.push({ feld, label, vorher, nachher });
    }
  }
  return aenderungen;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
