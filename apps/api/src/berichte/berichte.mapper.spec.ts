import { EintragStatus, EintragTyp, Prioritaet, SchichtberichtStatus } from "@schichtbuch/shared";
import type { SchichtbucheintragListItem } from "@schichtbuch/shared";
import { toBerichtDetail, type BerichtPayload } from "./berichte.mapper";

function makeBericht(): BerichtPayload {
  return {
    id: "b1",
    datum: new Date("2026-07-16T00:00:00Z"),
    schichtId: "s1",
    gewerkId: "g1",
    verantwortlicherId: null,
    status: "ENTWURF",
    besondereEreignisse: "Notaus getestet",
    freigegebenVonId: null,
    freigegebenAm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    schicht: { id: "s1", name: "Frühschicht", startzeit: "06:00", endzeit: "14:00" },
    gewerk: { id: "g1", name: "Mechanik" },
    verantwortlicher: null,
    freigegebenVon: null,
  } as BerichtPayload;
}

function eintrag(
  id: string,
  status: EintragStatus,
  prioritaet: Prioritaet,
): SchichtbucheintragListItem {
  return {
    id,
    createdAt: "2026-07-16T08:00:00.000Z",
    updatedAt: "2026-07-16T08:00:00.000Z",
    zeitpunkt: "2026-07-16T08:00:00.000Z",
    typ: EintragTyp.SCHICHTINFORMATION,
    prioritaet,
    status,
    beschreibung: "x",
    stoerung: null,
    ursache: null,
    korrekturmassnahme: null,
    gewerk: { id: "g1", name: "Mechanik" },
    fachbereich: { id: "f1", name: "Druck" },
    technischerPlatz: { id: "t1", name: "TP" },
    schicht: { id: "s1", name: "Frühschicht" },
    ersteller: { id: "u1", name: "U" },
    verantwortlicher: null,
    sapIhAuftrag: null,
    easyFlowTag: null,
    bearbeitungBeginn: null,
    bearbeitungEnde: null,
    bearbeitungsdauerMinuten: null,
    anzahlAnhaenge: 0,
    schlagwoerter: [],
  };
}

describe("toBerichtDetail", () => {
  it("teilt Einträge in offen/erledigt/kritisch und zählt korrekt", () => {
    const eintraege = [
      eintrag("a", EintragStatus.OFFEN, Prioritaet.KRITISCH),
      eintrag("b", EintragStatus.IN_BEARBEITUNG, Prioritaet.HOCH),
      eintrag("c", EintragStatus.ERLEDIGT, Prioritaet.NORMAL),
      eintrag("d", EintragStatus.VERSCHOBEN, Prioritaet.NIEDRIG),
    ];
    const detail = toBerichtDetail(makeBericht(), eintraege);

    expect(detail.anzahlEintraege).toBe(4);
    expect(detail.abgeschlosseneArbeiten).toBe(1);
    expect(detail.offenePunkte).toBe(3);
    expect(detail.offeneEintraege.map((e) => e.id)).toEqual(["a", "b", "d"]);
    expect(detail.erledigteEintraege.map((e) => e.id)).toEqual(["c"]);
    // KRITISCH + HOCH gelten als besondere Ereignisse.
    expect(detail.kritischeEintraege.map((e) => e.id)).toEqual(["a", "b"]);
    expect(detail.status).toBe(SchichtberichtStatus.ENTWURF);
    expect(detail.beginn).toBe("06:00");
    expect(detail.besondereEreignisse).toBe("Notaus getestet");
  });
});
