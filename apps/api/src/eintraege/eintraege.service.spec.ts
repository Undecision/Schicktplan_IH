import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { EintragStatus, Prioritaet, Rolle, type AuthenticatedUser } from "@schichtbuch/shared";
import { EintraegeService } from "./eintraege.service";

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "user-1",
    email: "u@example.com",
    name: "User",
    rollen: [Rolle.INSTANDHALTER],
    permissions: [],
    gewerkeSichtbarkeit: [],
    ...overrides,
  };
}

function makePrisma() {
  return {
    schichtbucheintrag: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    eintragKommentar: { create: jest.fn() },
  };
}

describe("EintraegeService – Gewerk-Sichtbarkeit", () => {
  it("filtert nicht, wenn keine Sichtbarkeit konfiguriert ist (sieht alles)", async () => {
    const prisma = makePrisma();
    const service = new EintraegeService(prisma as never);
    await service.list(makeUser({ gewerkeSichtbarkeit: [] }), {});
    const where = prisma.schichtbucheintrag.findMany.mock.calls[0][0].where;
    expect(where.gewerk).toBeUndefined();
  });

  it("filtert auf zugewiesene Gewerke, wenn Sichtbarkeit gesetzt ist", async () => {
    const prisma = makePrisma();
    const service = new EintraegeService(prisma as never);
    await service.list(makeUser({ gewerkeSichtbarkeit: ["Mechanik"] }), {});
    const where = prisma.schichtbucheintrag.findMany.mock.calls[0][0].where;
    expect(where.gewerk).toEqual({ name: { in: ["Mechanik"] } });
  });

  it("findOne wirft 404, wenn der Eintrag nicht sichtbar ist", async () => {
    const prisma = makePrisma();
    prisma.schichtbucheintrag.findFirst.mockResolvedValue(null);
    const service = new EintraegeService(prisma as never);
    await expect(service.findOne(makeUser(), "x")).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("EintraegeService – Bearbeitungsregel", () => {
  const detailReturn = {
    id: "e1",
    createdAt: new Date(),
    updatedAt: new Date(),
    zeitpunkt: new Date(),
    prioritaet: Prioritaet.NORMAL,
    status: EintragStatus.OFFEN,
    beschreibung: "x",
    sapIhAuftrag: null,
    easyFlowTag: null,
    faelligkeitsdatum: null,
    gewerk: { id: "g", name: "Mechanik" },
    fachbereich: { id: "f", name: "Druck" },
    technischerPlatz: { id: "t", bezeichnung: "TP" },
    schicht: { id: "s", name: "Früh" },
    ersteller: { id: "user-1", name: "User" },
    verantwortlicher: null,
    schlagwoerter: [],
    kommentare: [],
  };

  it("Ersteller darf eigenen Eintrag bearbeiten", async () => {
    const prisma = makePrisma();
    prisma.schichtbucheintrag.findFirst.mockResolvedValue({
      id: "e1",
      erstellerId: "user-1",
      gewerk: { name: "Mechanik" },
    });
    prisma.schichtbucheintrag.update.mockResolvedValue(detailReturn);
    const service = new EintraegeService(prisma as never);
    await expect(
      service.update(makeUser({ id: "user-1" }), "e1", { status: EintragStatus.ERLEDIGT }),
    ).resolves.toBeDefined();
  });

  it("Fremder Instandhalter darf fremden Eintrag NICHT bearbeiten (403)", async () => {
    const prisma = makePrisma();
    prisma.schichtbucheintrag.findFirst.mockResolvedValue({
      id: "e1",
      erstellerId: "someone-else",
      gewerk: { name: "Mechanik" },
    });
    const service = new EintraegeService(prisma as never);
    await expect(
      service.update(makeUser({ id: "user-1", rollen: [Rolle.INSTANDHALTER] }), "e1", {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("Meister/Schichtleiter darf fremden Eintrag bearbeiten", async () => {
    const prisma = makePrisma();
    prisma.schichtbucheintrag.findFirst.mockResolvedValue({
      id: "e1",
      erstellerId: "someone-else",
      gewerk: { name: "Mechanik" },
    });
    prisma.schichtbucheintrag.update.mockResolvedValue(detailReturn);
    const service = new EintraegeService(prisma as never);
    await expect(
      service.update(makeUser({ id: "user-1", rollen: [Rolle.MEISTER_SCHICHTLEITER] }), "e1", {}),
    ).resolves.toBeDefined();
  });
});
