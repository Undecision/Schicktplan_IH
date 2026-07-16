import { EintragStatus, Prioritaet, Rolle, type AuthenticatedUser } from "@schichtbuch/shared";
import { DashboardService } from "./dashboard.service";

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "user-1",
    email: "u@example.com",
    name: "User",
    rollen: [Rolle.ADMINISTRATOR],
    permissions: [],
    gewerkeSichtbarkeit: [],
    ...overrides,
  };
}

function makePrisma() {
  return {
    schichtbucheintrag: {
      count: jest
        .fn()
        .mockResolvedValueOnce(3) // offen
        .mockResolvedValueOnce(1) // inBearbeitung
        .mockResolvedValueOnce(2) // kritischeOffen
        .mockResolvedValueOnce(6), // heuteErfasst
      groupBy: jest
        .fn()
        // enthält einen leeren Wert, der NICHT gezählt werden darf:
        .mockResolvedValueOnce([
          { sapIhAuftrag: "700111" },
          { sapIhAuftrag: "700222" },
          { sapIhAuftrag: "" },
        ]) // sap
        .mockResolvedValueOnce([{ status: "OFFEN", _count: { _all: 4 } }]) // status
        .mockResolvedValueOnce([{ prioritaet: "KRITISCH", _count: { _all: 2 } }]), // prioritaet
      findMany: jest
        .fn()
        .mockResolvedValueOnce([]) // letzteEintraege
        .mockResolvedValueOnce([
          { updatedAt: new Date(), technischerPlatz: { id: "t1", bezeichnung: "Förderband 2" } },
          { updatedAt: new Date(), technischerPlatz: { id: "t1", bezeichnung: "Förderband 2" } },
          { updatedAt: new Date(), technischerPlatz: { id: "t2", bezeichnung: "Pumpe 5" } },
        ]),
    },
  };
}

describe("DashboardService", () => {
  it("aggregiert Kennzahlen und dedupliziert Anlagen", async () => {
    const prisma = makePrisma();
    const service = new DashboardService(prisma as never);

    const data = await service.getData(makeUser());

    expect(data.offen).toBe(3);
    expect(data.inBearbeitung).toBe(1);
    expect(data.kritischeOffen).toBe(2);
    expect(data.heuteErfasst).toBe(6);
    // Leerer SAP-Wert wird ignoriert → 2 statt 3.
    expect(data.offeneSapAuftraege).toBe(2);
    expect(data.statusVerteilung).toEqual([{ status: EintragStatus.OFFEN, anzahl: 4 }]);
    expect(data.prioritaetVerteilung).toEqual([{ prioritaet: Prioritaet.KRITISCH, anzahl: 2 }]);
    // t1 kommt doppelt vor → nur einmal, jüngste zuerst.
    expect(data.zuletztAnlagen.map((a) => a.id)).toEqual(["t1", "t2"]);
  });

  it("erzwingt Gewerk-Sichtbarkeit im Basis-Filter", async () => {
    const prisma = makePrisma();
    const service = new DashboardService(prisma as never);
    await service.getData(makeUser({ gewerkeSichtbarkeit: ["Mechanik"] }));
    const where = prisma.schichtbucheintrag.count.mock.calls[0][0].where;
    expect(where.gewerk).toEqual({ name: { in: ["Mechanik"] } });
  });
});
