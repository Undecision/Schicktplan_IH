import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Rolle, type AuthenticatedUser } from "@schichtbuch/shared";
import { ArbeitsanweisungenService } from "./arbeitsanweisungen.service";

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "user-1",
    username: "u",
    email: "u@example.com",
    name: "User",
    rollen: [Rolle.INSTANDHALTER],
    permissions: [],
    gewerkeSichtbarkeit: ["Mechanik"],
    ...overrides,
  };
}

function makeAnweisung(overrides: Record<string, unknown> = {}) {
  return {
    id: "a1",
    createdAt: new Date(),
    updatedAt: new Date(),
    titel: "Hinweis",
    text: "Bitte beachten",
    gewerkId: "g1",
    fachbereichId: null,
    schichtId: null,
    erstellerId: "meister-1",
    anhangObjectKey: null,
    anhangDateiname: null,
    anhangMime: null,
    anhangGroesse: null,
    gewerk: { id: "g1", name: "Mechanik" },
    fachbereich: null,
    schicht: null,
    ersteller: { id: "meister-1", name: "Meister" },
    quittungen: [],
    _count: { quittungen: 0 },
    ...overrides,
  };
}

/** Empfänger-Nutzer (hat anweisungen:read, nicht :manage) für empfaengerFuerGewerk-Mocks. */
function empfaengerUser(id: string, name: string) {
  return {
    id,
    name,
    roles: [{ role: { permissions: [{ permission: { key: "anweisungen:read" } }] } }],
  };
}

function makePrisma() {
  return {
    arbeitsanweisung: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    arbeitsanweisungQuittung: {
      upsert: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: { count: jest.fn().mockResolvedValue(3), findMany: jest.fn().mockResolvedValue([]) },
    gewerk: { findFirst: jest.fn().mockResolvedValue({ id: "g1" }) },
    schichtDefinition: { findFirst: jest.fn() },
  };
}

function makeStorage() {
  return {
    putObject: jest.fn(),
    getObjectStream: jest.fn(),
    removeObject: jest.fn(),
  };
}

describe("ArbeitsanweisungenService", () => {
  it("lehnt Anlegen ohne Text und ohne Anhang ab (400)", async () => {
    const prisma = makePrisma();
    const service = new ArbeitsanweisungenService(prisma as never, makeStorage() as never);
    await expect(
      service.create(makeUser(), { titel: "x", gewerkId: "g1" }, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("legt Anweisung mit Text an und liefert Empfängerzahl", async () => {
    const prisma = makePrisma();
    prisma.arbeitsanweisung.create.mockResolvedValue(makeAnweisung());
    prisma.user.findMany.mockResolvedValue([
      empfaengerUser("u1", "Anna"),
      empfaengerUser("u2", "Bea"),
      empfaengerUser("u3", "Cem"),
      empfaengerUser("u4", "Dana"),
      empfaengerUser("u5", "Eda"),
    ]);
    const service = new ArbeitsanweisungenService(prisma as never, makeStorage() as never);
    const result = await service.create(
      makeUser({ rollen: [Rolle.MEISTER] }),
      { titel: "Hinweis", text: "Bitte beachten", gewerkId: "g1" },
      undefined,
    );
    expect(result.anzahlEmpfaenger).toBe(5);
    expect(result.anzahlGelesen).toBe(0);
    expect(result.gelesen).toBe(false);
  });

  it("zählt Meister/Verwalter NICHT als Empfänger", async () => {
    const prisma = makePrisma();
    prisma.arbeitsanweisung.create.mockResolvedValue(makeAnweisung());
    prisma.user.findMany.mockResolvedValue([
      empfaengerUser("u1", "Leser"),
      // Meister: hat read UND manage -> kein Empfänger
      {
        id: "m1",
        name: "Meister",
        roles: [
          {
            role: {
              permissions: [
                { permission: { key: "anweisungen:read" } },
                { permission: { key: "anweisungen:manage" } },
              ],
            },
          },
        ],
      },
    ]);
    const service = new ArbeitsanweisungenService(prisma as never, makeStorage() as never);
    const result = await service.create(
      makeUser({ rollen: [Rolle.MEISTER] }),
      { titel: "x", text: "y", gewerkId: "g1" },
      undefined,
    );
    expect(result.anzahlEmpfaenger).toBe(1);
  });

  it("ungelesen: Verwalter (kein Leserecht) erhält keine Popups", async () => {
    const prisma = makePrisma();
    const service = new ArbeitsanweisungenService(prisma as never, makeStorage() as never);
    // Meister: nur manage, kein read → kein Empfänger.
    const result = await service.ungelesenForUser(
      makeUser({ permissions: ["anweisungen:manage"] }),
    );
    expect(result).toEqual([]);
    expect(prisma.arbeitsanweisung.findMany).not.toHaveBeenCalled();
  });

  it("ungelesen: leere Gewerk-Sichtbarkeit ergibt keine Popups", async () => {
    const prisma = makePrisma();
    const service = new ArbeitsanweisungenService(prisma as never, makeStorage() as never);
    const result = await service.ungelesenForUser(
      makeUser({ permissions: ["anweisungen:read"], gewerkeSichtbarkeit: [] }),
    );
    expect(result).toEqual([]);
    expect(prisma.arbeitsanweisung.findMany).not.toHaveBeenCalled();
  });

  it("ungelesen: liefert die vom Server gefilterten ungelesenen Anweisungen", async () => {
    const prisma = makePrisma();
    // Der Lesestatus-Filter passiert per DB-Query; der Mock liefert nur Ungelesene.
    prisma.arbeitsanweisung.findMany.mockResolvedValue([
      makeAnweisung({ id: "ungelesen", quittungen: [], _count: { quittungen: 0 } }),
    ]);
    const service = new ArbeitsanweisungenService(prisma as never, makeStorage() as never);
    const result = await service.ungelesenForUser(makeUser({ permissions: ["anweisungen:read"] }));
    expect(result.map((a) => a.id)).toEqual(["ungelesen"]);
    // Die Query fordert nur nicht-quittierte Anweisungen an.
    expect(prisma.arbeitsanweisung.findMany.mock.calls[0][0].where.quittungen).toEqual({
      none: { userId: "user-1" },
    });
  });

  it("quittieren wirft 404, wenn Anweisung nicht sichtbar", async () => {
    const prisma = makePrisma();
    prisma.arbeitsanweisung.findFirst.mockResolvedValue(null);
    const service = new ArbeitsanweisungenService(prisma as never, makeStorage() as never);
    await expect(service.quittieren(makeUser(), "a1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("quittungen: markiert gelesene Empfänger korrekt", async () => {
    const prisma = makePrisma();
    prisma.arbeitsanweisung.findFirst.mockResolvedValue(makeAnweisung());
    prisma.user.findMany.mockResolvedValue([
      empfaengerUser("u1", "Anna"),
      empfaengerUser("u2", "Bea"),
    ]);
    prisma.arbeitsanweisungQuittung.findMany.mockResolvedValue([
      { userId: "u1", gelesenAm: new Date() },
    ]);
    const service = new ArbeitsanweisungenService(prisma as never, makeStorage() as never);
    const result = await service.quittungen(makeUser({ rollen: [Rolle.MEISTER] }), "a1");
    expect(result.anzahlEmpfaenger).toBe(2);
    expect(result.anzahlGelesen).toBe(1);
    expect(result.empfaenger.find((e) => e.user.id === "u1")?.gelesen).toBe(true);
    expect(result.empfaenger.find((e) => e.user.id === "u2")?.gelesen).toBe(false);
  });
});
