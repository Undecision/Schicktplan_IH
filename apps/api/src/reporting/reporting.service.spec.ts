import {
  AuswertungTyp,
  EintragStatus,
  Prioritaet,
  Rolle,
  type AuthenticatedUser,
} from "@schichtbuch/shared";
import { ReportingService } from "./reporting.service";

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "u1",
    username: "u",
    email: "u@e.de",
    name: "U",
    rollen: [Rolle.MEISTER],
    permissions: [],
    gewerkeSichtbarkeit: [],
    ...overrides,
  };
}

function row(
  zeitpunkt: string,
  status: EintragStatus,
  prioritaet: Prioritaet,
  fb = "Druck",
  tp = "Förderband 2",
  sap: string | null = null,
) {
  return {
    zeitpunkt: new Date(zeitpunkt),
    status,
    prioritaet,
    sapIhAuftrag: sap,
    fachbereich: { id: `fb-${fb}`, name: fb },
    technischerPlatz: { id: `tp-${tp}`, bezeichnung: tp },
  };
}

function makePrisma(rows: ReturnType<typeof row>[]) {
  return { schichtbucheintrag: { findMany: jest.fn().mockResolvedValue(rows) } };
}

const ROWS = [
  row("2026-07-01T08:00:00", EintragStatus.OFFEN, Prioritaet.KRITISCH, "Druck", "Förderband 2"),
  row("2026-07-01T09:00:00", EintragStatus.ERLEDIGT, Prioritaet.NORMAL, "Druck", "Pumpe 5"),
  row(
    "2026-07-02T08:00:00",
    EintragStatus.IN_BEARBEITUNG,
    Prioritaet.HOCH,
    "Logistik",
    "Förderband 2",
  ),
];

describe("ReportingService", () => {
  it("berechnet Kennzahlen korrekt", async () => {
    const prisma = makePrisma(ROWS);
    const service = new ReportingService(prisma as never);
    const res = await service.auswertung(makeUser(), {
      typ: AuswertungTyp.TAGES,
      von: "2026-07-01",
      bis: "2026-07-31",
    });
    expect(res.kennzahlen).toEqual({ gesamt: 3, offen: 2, erledigt: 1, kritisch: 1 });
  });

  it("gruppiert TAGES nach Tag chronologisch", async () => {
    const prisma = makePrisma(ROWS);
    const service = new ReportingService(prisma as never);
    const res = await service.auswertung(makeUser(), {
      typ: AuswertungTyp.TAGES,
      von: "2026-07-01",
      bis: "2026-07-31",
    });
    expect(res.gruppen.map((g) => g.schluessel)).toEqual(["2026-07-01", "2026-07-02"]);
    expect(res.gruppen[0]).toMatchObject({ anzahl: 2, offen: 1, erledigt: 1, kritisch: 1 });
  });

  it("gruppiert nach Technischem Platz nach Häufigkeit", async () => {
    const prisma = makePrisma(ROWS);
    const service = new ReportingService(prisma as never);
    const res = await service.auswertung(makeUser(), {
      typ: AuswertungTyp.TECHNISCHER_PLATZ,
      von: "2026-07-01",
      bis: "2026-07-31",
    });
    expect(res.gruppen[0].label).toBe("Förderband 2"); // 2x → zuerst
    expect(res.gruppen[0].anzahl).toBe(2);
  });

  it("erzwingt Gewerk-Sichtbarkeit im Filter", async () => {
    const prisma = makePrisma([]);
    const service = new ReportingService(prisma as never);
    await service.auswertung(makeUser({ gewerkeSichtbarkeit: ["Mechanik"] }), {
      typ: AuswertungTyp.MONATS,
      von: "2026-07-01",
      bis: "2026-07-31",
    });
    const where = prisma.schichtbucheintrag.findMany.mock.calls[0][0].where;
    expect(where.gewerk).toEqual({ name: { in: ["Mechanik"] } });
  });
});
