import { NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "@schichtbuch/shared";
import { EintraegeService } from "./eintraege.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { NotificationsService } from "../notifications/notifications.service";

const notifications = {} as unknown as NotificationsService;

const user: AuthenticatedUser = {
  id: "u1",
  username: "admin",
  email: "a@b.de",
  name: "Admin",
  rollen: ["Administrator"],
  permissions: [],
  gewerkeSichtbarkeit: [],
};

describe("EintraegeService.remove", () => {
  it("löscht per Soft-Delete (setzt deletedAt)", async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      schichtbucheintrag: {
        findFirst: jest.fn().mockResolvedValue({ id: "e1", gewerk: { name: "Infrastruktur" } }),
        update,
      },
    } as unknown as PrismaService;

    await new EintraegeService(prisma, notifications).remove(user, "e1");

    expect(update).toHaveBeenCalledTimes(1);
    const arg = update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "e1" });
    expect(arg.data.deletedAt).toBeInstanceOf(Date);
  });

  it("wirft NotFound, wenn der Eintrag fehlt", async () => {
    const update = jest.fn();
    const prisma = {
      schichtbucheintrag: { findFirst: jest.fn().mockResolvedValue(null), update },
    } as unknown as PrismaService;

    await expect(
      new EintraegeService(prisma, notifications).remove(user, "x"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it("verweigert das Löschen bei fehlender Gewerk-Sichtbarkeit", async () => {
    const update = jest.fn();
    const prisma = {
      schichtbucheintrag: {
        findFirst: jest.fn().mockResolvedValue({ id: "e1", gewerk: { name: "Infrastruktur" } }),
        update,
      },
    } as unknown as PrismaService;
    const eingeschraenkt: AuthenticatedUser = { ...user, gewerkeSichtbarkeit: ["Elektrotechnik"] };

    await expect(
      new EintraegeService(prisma, notifications).remove(eingeschraenkt, "e1"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });
});
