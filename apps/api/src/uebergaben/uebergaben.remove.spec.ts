import { NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "@schichtbuch/shared";
import { UebergabenService } from "./uebergaben.service";
import type { PrismaService } from "../prisma/prisma.service";

const user: AuthenticatedUser = {
  id: "u1",
  username: "admin",
  email: "a@b.de",
  name: "Admin",
  rollen: ["Administrator"],
  permissions: [],
  gewerkeSichtbarkeit: [],
};

function uebergabePayload() {
  return {
    id: "ueb1",
    datum: new Date("2026-08-18T00:00:00.000Z"),
    schichtId: "S1",
    gewerkId: "G1",
    status: "ENTWURF",
    besondereHinweise: null,
    sicherheitshinweise: null,
    freischaltungen: null,
    arbeitsgenehmigungen: null,
    wichtigeTermine: null,
    uebergebenVon: null,
    uebernommenVon: null,
    uebergebenAm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    schicht: { id: "S1", name: "Frühschicht", startzeit: "06:00", endzeit: "14:00" },
    gewerk: { id: "G1", name: "Infrastruktur" },
  };
}

describe("UebergabenService.remove", () => {
  it("löscht eine vorhandene Übergabe endgültig", async () => {
    const del = jest.fn().mockResolvedValue(uebergabePayload());
    const prisma = {
      schichtuebergabe: {
        findUnique: jest.fn().mockResolvedValue(uebergabePayload()),
        delete: del,
      },
    } as unknown as PrismaService;
    const service = new UebergabenService(prisma);

    await service.remove(user, "ueb1");

    expect(del).toHaveBeenCalledWith({ where: { id: "ueb1" } });
  });

  it("wirft NotFound, wenn die Übergabe nicht existiert", async () => {
    const del = jest.fn();
    const prisma = {
      schichtuebergabe: {
        findUnique: jest.fn().mockResolvedValue(null),
        delete: del,
      },
    } as unknown as PrismaService;
    const service = new UebergabenService(prisma);

    await expect(service.remove(user, "fehlt")).rejects.toBeInstanceOf(NotFoundException);
    expect(del).not.toHaveBeenCalled();
  });

  it("verweigert das Löschen bei fehlender Gewerk-Sichtbarkeit", async () => {
    const del = jest.fn();
    const prisma = {
      schichtuebergabe: {
        findUnique: jest.fn().mockResolvedValue(uebergabePayload()),
        delete: del,
      },
    } as unknown as PrismaService;
    const service = new UebergabenService(prisma);
    const eingeschraenkt: AuthenticatedUser = { ...user, gewerkeSichtbarkeit: ["Elektrotechnik"] };

    await expect(service.remove(eingeschraenkt, "ueb1")).rejects.toBeInstanceOf(NotFoundException);
    expect(del).not.toHaveBeenCalled();
  });
});
