import type { Prisma } from "@prisma/client";
import type {
  EintragKommentar,
  Prioritaet,
  Referenz,
  SchichtbucheintragDetail,
  SchichtbucheintragListItem,
  EintragStatus,
} from "@schichtbuch/shared";

export const EINTRAG_LIST_INCLUDE = {
  gewerk: { select: { id: true, name: true } },
  fachbereich: { select: { id: true, name: true } },
  technischerPlatz: { select: { id: true, bezeichnung: true } },
  schicht: { select: { id: true, name: true } },
  ersteller: { select: { id: true, name: true } },
  verantwortlicher: { select: { id: true, name: true } },
  schlagwoerter: { select: { id: true, name: true } },
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
    zeitpunkt: eintrag.zeitpunkt.toISOString(),
    prioritaet: eintrag.prioritaet as Prioritaet,
    status: eintrag.status as EintragStatus,
    beschreibung: eintrag.beschreibung,
    gewerk: ref(eintrag.gewerk),
    fachbereich: ref(eintrag.fachbereich),
    technischerPlatz: {
      id: eintrag.technischerPlatz.id,
      name: eintrag.technischerPlatz.bezeichnung,
    },
    schicht: ref(eintrag.schicht),
    ersteller: ref(eintrag.ersteller),
    verantwortlicher: eintrag.verantwortlicher ? ref(eintrag.verantwortlicher) : null,
    sapIhAuftrag: eintrag.sapIhAuftrag,
    easyFlowTag: eintrag.easyFlowTag,
    schlagwoerter: eintrag.schlagwoerter.map(ref),
  };
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
