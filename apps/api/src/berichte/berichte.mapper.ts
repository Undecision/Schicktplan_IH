import type { Prisma } from "@prisma/client";
import {
  EintragStatus,
  SchichtberichtStatus,
  type Referenz,
  type SchichtbucheintragListItem,
  type SchichtberichtDetail,
  type SchichtberichtListItem,
} from "@schichtbuch/shared";

export const BERICHT_INCLUDE = {
  schicht: { select: { id: true, name: true, startzeit: true, endzeit: true } },
  gewerk: { select: { id: true, name: true } },
  verantwortlicher: { select: { id: true, name: true } },
  freigegebenVon: { select: { id: true, name: true } },
} satisfies Prisma.SchichtberichtInclude;

export type BerichtPayload = Prisma.SchichtberichtGetPayload<{ include: typeof BERICHT_INCLUDE }>;

export interface BerichtKennzahlen {
  anzahlEintraege: number;
  offenePunkte: number;
  abgeschlosseneArbeiten: number;
}

function ref(entity: { id: string; name: string } | null): Referenz | null {
  return entity ? { id: entity.id, name: entity.name } : null;
}

export function toBerichtListItem(
  bericht: BerichtPayload,
  kennzahlen: BerichtKennzahlen,
): SchichtberichtListItem {
  return {
    id: bericht.id,
    datum: bericht.datum.toISOString(),
    schicht: { id: bericht.schicht.id, name: bericht.schicht.name },
    gewerk: { id: bericht.gewerk.id, name: bericht.gewerk.name },
    beginn: bericht.schicht.startzeit,
    ende: bericht.schicht.endzeit,
    verantwortlicher: ref(bericht.verantwortlicher),
    status: bericht.status as SchichtberichtStatus,
    freigegebenVon: ref(bericht.freigegebenVon),
    freigegebenAm: bericht.freigegebenAm ? bericht.freigegebenAm.toISOString() : null,
    anzahlEintraege: kennzahlen.anzahlEintraege,
    offenePunkte: kennzahlen.offenePunkte,
    abgeschlosseneArbeiten: kennzahlen.abgeschlosseneArbeiten,
    createdAt: bericht.createdAt.toISOString(),
    updatedAt: bericht.updatedAt.toISOString(),
  };
}

export function toBerichtDetail(
  bericht: BerichtPayload,
  eintraege: SchichtbucheintragListItem[],
): SchichtberichtDetail {
  const erledigte = eintraege.filter((e) => e.status === EintragStatus.ERLEDIGT);
  const offene = eintraege.filter((e) => e.status !== EintragStatus.ERLEDIGT);
  const kritische = eintraege.filter((e) => e.prioritaet === "KRITISCH" || e.prioritaet === "HOCH");

  return {
    ...toBerichtListItem(bericht, {
      anzahlEintraege: eintraege.length,
      offenePunkte: offene.length,
      abgeschlosseneArbeiten: erledigte.length,
    }),
    besondereEreignisse: bericht.besondereEreignisse,
    offeneEintraege: offene,
    erledigteEintraege: erledigte,
    kritischeEintraege: kritische,
  };
}
