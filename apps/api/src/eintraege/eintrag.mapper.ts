import type { Prisma } from "@prisma/client";
import type {
  EintragKommentar,
  EintragTyp,
  Prioritaet,
  Referenz,
  SchichtbucheintragDetail,
  SchichtbucheintragListItem,
  EintragStatus,
} from "@schichtbuch/shared";

export const EINTRAG_LIST_INCLUDE = {
  gewerk: { select: { id: true, name: true } },
  fachbereich: { select: { id: true, name: true } },
  technischerPlatz: { select: { id: true, bezeichnung: true, code: true } },
  schicht: { select: { id: true, name: true } },
  ersteller: { select: { id: true, name: true } },
  verantwortlicher: { select: { id: true, name: true } },
  schlagwoerter: { select: { id: true, name: true } },
  _count: { select: { anhaenge: true } },
} satisfies Prisma.SchichtbucheintragInclude;

export const EINTRAG_DETAIL_INCLUDE = {
  ...EINTRAG_LIST_INCLUDE,
  kommentare: {
    include: { autor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.SchichtbucheintragInclude;

type EintragListPayload = Prisma.SchichtbucheintragGetPayload<{
  include: typeof EINTRAG_LIST_INCLUDE;
}>;
type EintragDetailPayload = Prisma.SchichtbucheintragGetPayload<{
  include: typeof EINTRAG_DETAIL_INCLUDE;
}>;

function ref(entity: { id: string; name: string }): Referenz {
  return { id: entity.id, name: entity.name };
}

export function toListItem(eintrag: EintragListPayload): SchichtbucheintragListItem {
  return {
    id: eintrag.id,
    createdAt: eintrag.createdAt.toISOString(),
    updatedAt: eintrag.updatedAt.toISOString(),
    typ: eintrag.typ as EintragTyp,
    zeitpunkt: eintrag.zeitpunkt.toISOString(),
    prioritaet: eintrag.prioritaet as Prioritaet,
    status: eintrag.status as EintragStatus,
    beschreibung: eintrag.beschreibung,
    stoerung: eintrag.stoerung,
    ursache: eintrag.ursache,
    korrekturmassnahme: eintrag.korrekturmassnahme,
    gewerk: ref(eintrag.gewerk),
    fachbereich: ref(eintrag.fachbereich),
    technischerPlatz: {
      id: eintrag.technischerPlatz.id,
      name: eintrag.technischerPlatz.bezeichnung,
      code: eintrag.technischerPlatz.code,
    },
    schicht: ref(eintrag.schicht),
    ersteller: ref(eintrag.ersteller),
    verantwortlicher: eintrag.verantwortlicher ? ref(eintrag.verantwortlicher) : null,
    sapIhAuftrag: eintrag.sapIhAuftrag,
    easyFlowTag: eintrag.easyFlowTag,
    schlagwoerter: eintrag.schlagwoerter.map(ref),
    bearbeitungBeginn: eintrag.bearbeitungBeginn ? eintrag.bearbeitungBeginn.toISOString() : null,
    bearbeitungEnde: eintrag.bearbeitungEnde ? eintrag.bearbeitungEnde.toISOString() : null,
    bearbeitungsdauerMinuten: dauerMinuten(eintrag.bearbeitungBeginn, eintrag.bearbeitungEnde),
    anzahlAnhaenge: eintrag._count.anhaenge,
  };
}

/** Bearbeitungsdauer in ganzen Minuten (nur wenn Beginn und Ende gesetzt und plausibel). */
function dauerMinuten(beginn: Date | null, ende: Date | null): number | null {
  if (!beginn || !ende) return null;
  const diff = ende.getTime() - beginn.getTime();
  return diff >= 0 ? Math.round(diff / 60000) : null;
}

export function toDetail(eintrag: EintragDetailPayload): SchichtbucheintragDetail {
  const kommentare: EintragKommentar[] = eintrag.kommentare.map((kommentar) => ({
    id: kommentar.id,
    createdAt: kommentar.createdAt.toISOString(),
    updatedAt: kommentar.updatedAt.toISOString(),
    text: kommentar.text,
    autor: ref(kommentar.autor),
  }));

  return {
    ...toListItem(eintrag),
    faelligkeitsdatum: eintrag.faelligkeitsdatum ? eintrag.faelligkeitsdatum.toISOString() : null,
    kommentare,
  };
}
