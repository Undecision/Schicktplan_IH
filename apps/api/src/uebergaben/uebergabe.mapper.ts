import type { Prisma } from "@prisma/client";
import {
  UebergabeStatus,
  type Referenz,
  type SchichtbucheintragListItem,
  type UebergabeDetail,
  type UebergabeListItem,
} from "@schichtbuch/shared";

export const UEBERGABE_INCLUDE = {
  schicht: { select: { id: true, name: true, startzeit: true, endzeit: true } },
  gewerk: { select: { id: true, name: true } },
  uebergebenVon: { select: { id: true, name: true } },
  uebernommenVon: { select: { id: true, name: true } },
} satisfies Prisma.SchichtuebergabeInclude;

export type UebergabePayload = Prisma.SchichtuebergabeGetPayload<{
  include: typeof UEBERGABE_INCLUDE;
}>;

function ref(entity: { id: string; name: string } | null): Referenz | null {
  return entity ? { id: entity.id, name: entity.name } : null;
}

export function toUebergabeListItem(
  uebergabe: UebergabePayload,
  kennzahlen: { offeneStoerungen: number; laufendeArbeiten: number },
): UebergabeListItem {
  return {
    id: uebergabe.id,
    datum: uebergabe.datum.toISOString(),
    schicht: { id: uebergabe.schicht.id, name: uebergabe.schicht.name },
    gewerk: { id: uebergabe.gewerk.id, name: uebergabe.gewerk.name },
    beginn: uebergabe.schicht.startzeit,
    ende: uebergabe.schicht.endzeit,
    status: uebergabe.status as UebergabeStatus,
    uebergebenVon: ref(uebergabe.uebergebenVon),
    uebernommenVon: ref(uebergabe.uebernommenVon),
    uebergebenAm: uebergabe.uebergebenAm ? uebergabe.uebergebenAm.toISOString() : null,
    offeneStoerungen: kennzahlen.offeneStoerungen,
    laufendeArbeiten: kennzahlen.laufendeArbeiten,
    createdAt: uebergabe.createdAt.toISOString(),
    updatedAt: uebergabe.updatedAt.toISOString(),
  };
}

export function toUebergabeDetail(
  uebergabe: UebergabePayload,
  offeneStoerungenListe: SchichtbucheintragListItem[],
  laufendeArbeitenListe: SchichtbucheintragListItem[],
): UebergabeDetail {
  return {
    ...toUebergabeListItem(uebergabe, {
      offeneStoerungen: offeneStoerungenListe.length,
      laufendeArbeiten: laufendeArbeitenListe.length,
    }),
    besondereHinweise: uebergabe.besondereHinweise,
    sicherheitshinweise: uebergabe.sicherheitshinweise,
    freischaltungen: uebergabe.freischaltungen,
    arbeitsgenehmigungen: uebergabe.arbeitsgenehmigungen,
    wichtigeTermine: uebergabe.wichtigeTermine,
    offeneStoerungenListe,
    laufendeArbeitenListe,
  };
}
