import type { Prisma } from "@prisma/client";
import type { ArbeitsanweisungListItem } from "@schichtbuch/shared";

export const ANWEISUNG_INCLUDE = {
  gewerk: { select: { id: true, name: true } },
  schicht: { select: { id: true, name: true } },
  ersteller: { select: { id: true, name: true } },
} satisfies Prisma.ArbeitsanweisungInclude;

export type AnweisungPayload = Prisma.ArbeitsanweisungGetPayload<{
  include: typeof ANWEISUNG_INCLUDE;
}>;

/**
 * Bildet eine Arbeitsanweisung auf das API-Listenformat ab. Der eigene
 * Lesestatus (`gelesenAm`) sowie die Lesezahlen werden separat übergeben, weil
 * sie nutzerabhängig bzw. aggregiert sind.
 */
export function toAnweisungListItem(
  anweisung: AnweisungPayload,
  gelesenAm: Date | null,
  anzahlEmpfaenger: number,
  anzahlGelesen: number,
): ArbeitsanweisungListItem {
  return {
    id: anweisung.id,
    createdAt: anweisung.createdAt.toISOString(),
    updatedAt: anweisung.updatedAt.toISOString(),
    titel: anweisung.titel,
    text: anweisung.text,
    gewerk: { id: anweisung.gewerk.id, name: anweisung.gewerk.name },
    schicht: anweisung.schicht ? { id: anweisung.schicht.id, name: anweisung.schicht.name } : null,
    ersteller: { id: anweisung.ersteller.id, name: anweisung.ersteller.name },
    anhang: anweisung.anhangObjectKey
      ? {
          dateiname: anweisung.anhangDateiname ?? "Anhang",
          mime: anweisung.anhangMime ?? "application/octet-stream",
          groesse: anweisung.anhangGroesse ?? 0,
        }
      : null,
    gelesen: gelesenAm !== null,
    gelesenAm: gelesenAm ? gelesenAm.toISOString() : null,
    anzahlEmpfaenger,
    anzahlGelesen,
  };
}
