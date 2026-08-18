import { NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "@schichtbuch/shared";
import { BerichteService } from "./berichte.service";
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

describe("BerichteService.remove", () => {
  it("löscht einen vorhandenen Bericht", async () => {
    const del = jest.fn().mockResolvedValue({});
    const prisma = {
      schichtbericht: {
        findUnique: jest.fn().mockResolvedValue({ id: "b1", gewerk: { name: "Infrastruktur" } }),
        delete: del,
      },
    } as unknown as PrismaService;

    await new BerichteService(prisma).remove(user, "b1");

    expect(del).toHaveBeenCalledWith({ where: { id: "b1" } });
  });

  it("wirft NotFound, wenn der Bericht fehlt", async () => {
    const del = jest.fn();
    const prisma = {
      schichtbericht: { findUnique: jest.fn().mockResolvedValue(null), delete: del },
    } as unknown as PrismaService;

    await expect(new BerichteService(prisma).remove(user, "x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(del).not.toHaveBeenCalled();
  });

  it("verweigert das Löschen bei fehlender Gewerk-Sichtbarkeit", async () => {
    const del = jest.fn();
    const prisma = {
      schichtbericht: {
        findUnique: jest.fn().mockResolvedValue({ id: "b1", gewerk: { name: "Infrastruktur" } }),
        delete: del,
      },
    } as unknown as PrismaService;
    const eingeschraenkt: AuthenticatedUser = { ...user, gewerkeSichtbarkeit: ["Elektrotechnik"] };

    await expect(new BerichteService(prisma).remove(eingeschraenkt, "b1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(del).not.toHaveBeenCalled();
  });
});
