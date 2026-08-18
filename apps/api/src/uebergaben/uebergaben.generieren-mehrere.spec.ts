import type { AuthenticatedUser } from "@schichtbuch/shared";
import { UebergabenService } from "./uebergaben.service";
import type { PrismaService } from "../prisma/prisma.service";

function payload(id: string, schichtId: string, gewerkId: string) {
  return {
    id,
    datum: new Date("2026-08-18T00:00:00.000Z"),
    schichtId,
    gewerkId,
    status: "ENTWURF",
    uebergebenVon: null,
    uebernommenVon: null,
    uebergebenAm: null,
    besondereHinweise: null,
    sicherheitshinweise: null,
    freischaltungen: null,
    arbeitsgenehmigungen: null,
    wichtigeTermine: null,
    createdAt: new Date("2026-08-18T00:00:00.000Z"),
    updatedAt: new Date("2026-08-18T00:00:00.000Z"),
    schicht: { id: schichtId, name: schichtId, startzeit: "06:00", endzeit: "14:00" },
    gewerk: { id: gewerkId, name: gewerkId },
  };
}

function makeService(options: { schichten: string[]; gewerke: string[] }) {
  const upsert = jest
    .fn()
    .mockImplementation(({ create }) =>
      Promise.resolve({ id: `${create.schichtId}:${create.gewerkId}` }),
    );
  let letzteIds: string[] = [];
  const findMany = jest
    .fn()
    .mockImplementation(({ where }: { where: { id: { in: string[] } } }) => {
      letzteIds = where.id.in;
      return Promise.resolve(
        where.id.in.map((id) => {
          const [schichtId, gewerkId] = id.split(":");
          return payload(id, schichtId!, gewerkId!);
        }),
      );
    });
  const prisma = {
    schichtDefinition: {
      findMany: jest.fn().mockResolvedValue(options.schichten.map((id) => ({ id }))),
    },
    gewerk: {
      findMany: jest.fn().mockResolvedValue(options.gewerke.map((id) => ({ id }))),
      findUnique: jest.fn(),
    },
    schichtuebergabe: { upsert, findMany },
    schichtbucheintrag: { count: jest.fn().mockResolvedValue(0) },
  } as unknown as PrismaService;
  return { service: new UebergabenService(prisma), upsert, getIds: () => letzteIds };
}

const user: AuthenticatedUser = {
  id: "u1",
  username: "admin",
  email: "a@b.de",
  name: "Admin",
  rollen: ["Administrator"],
  permissions: [],
  gewerkeSichtbarkeit: [],
};

describe("UebergabenService.generierenMehrere", () => {
  it("erzeugt das Kreuzprodukt aller aktiven Schichten × Gewerke bei 'Alle'", async () => {
    const { service, upsert } = makeService({
      schichten: ["S1", "S2"],
      gewerke: ["G1", "G2", "G3"],
    });
    const result = await service.generierenMehrere(user, { datum: "2026-08-18" });
    expect(upsert).toHaveBeenCalledTimes(6);
    expect(result.uebergaben).toHaveLength(6);
  });

  it("beschränkt auf die gewählte Schicht, wenn schichtId gesetzt ist", async () => {
    const { service, upsert } = makeService({ schichten: ["S1", "S2"], gewerke: ["G1", "G2"] });
    await service.generierenMehrere(user, { datum: "2026-08-18", schichtId: "S9" });
    // 1 Schicht × 2 Gewerke
    expect(upsert).toHaveBeenCalledTimes(2);
    for (const call of upsert.mock.calls) {
      expect(call[0].create.schichtId).toBe("S9");
    }
  });

  it("beschränkt auf ein Gewerk, wenn gewerkId gesetzt ist", async () => {
    const { service, upsert } = makeService({ schichten: ["S1", "S2"], gewerke: ["G1", "G2"] });
    await service.generierenMehrere(user, { datum: "2026-08-18", gewerkId: "G9" });
    // 2 Schichten × 1 Gewerk
    expect(upsert).toHaveBeenCalledTimes(2);
    for (const call of upsert.mock.calls) {
      expect(call[0].create.gewerkId).toBe("G9");
    }
  });
});
