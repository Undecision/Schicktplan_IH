import { BadRequestException, NotFoundException } from "@nestjs/common";
import { EintragStatus, type AuthenticatedUser } from "@schichtbuch/shared";
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

describe("EintraegeService.weitergabe", () => {
  it("wirft NotFound, wenn der Eintrag fehlt", async () => {
    const create = jest.fn();
    const prisma = {
      schichtbucheintrag: { findFirst: jest.fn().mockResolvedValue(null) },
      eintragKommentar: { create },
    } as unknown as PrismaService;

    await expect(
      new EintraegeService(prisma, notifications).weitergabe(user, "x"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(create).not.toHaveBeenCalled();
  });

  it("lehnt die Weitergabe erledigter Meldungen ab", async () => {
    const create = jest.fn();
    const prisma = {
      schichtbucheintrag: {
        findFirst: jest.fn().mockResolvedValue({
          id: "e1",
          status: EintragStatus.ERLEDIGT,
          gewerk: { name: "Infrastruktur" },
        }),
      },
      eintragKommentar: { create },
    } as unknown as PrismaService;

    await expect(
      new EintraegeService(prisma, notifications).weitergabe(user, "e1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });
});
