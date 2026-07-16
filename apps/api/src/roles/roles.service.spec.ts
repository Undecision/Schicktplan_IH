import { ConflictException, ForbiddenException } from "@nestjs/common";
import { RolesService } from "./roles.service";

function makePrisma() {
  return {
    role: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    permission: { findMany: jest.fn().mockResolvedValue([]) },
    rolePermission: { deleteMany: jest.fn() },
  };
}

const ROLE_RETURN = {
  id: "r1",
  name: "Testrolle",
  description: null,
  permissions: [],
  _count: { users: 0 },
};

describe("RolesService", () => {
  it("verhindert Umbenennen/Rechteänderung der Rolle Administrator", async () => {
    const prisma = makePrisma();
    prisma.role.findUnique.mockResolvedValue({ id: "a", name: "Administrator" });
    const service = new RolesService(prisma as never);
    await expect(service.update("a", { permissions: ["eintraege:read"] })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("verhindert Umbenennen einer Systemrolle, erlaubt aber Rechteänderung", async () => {
    const prisma = makePrisma();
    prisma.role.findUnique.mockResolvedValue({ id: "m", name: "Meister" });
    const service = new RolesService(prisma as never);
    await expect(service.update("m", { name: "Chef" })).rejects.toBeInstanceOf(ForbiddenException);

    prisma.permission.findMany.mockResolvedValue([{ id: "p1", key: "anweisungen:read" }]);
    prisma.role.update.mockResolvedValue({ ...ROLE_RETURN, name: "Meister" });
    await expect(service.update("m", { permissions: ["anweisungen:read"] })).resolves.toBeDefined();
  });

  it("verhindert Löschen von Systemrollen", async () => {
    const prisma = makePrisma();
    prisma.role.findUnique.mockResolvedValue({
      id: "s",
      name: "Schichtleiter",
      _count: { users: 0 },
    });
    const service = new RolesService(prisma as never);
    await expect(service.remove("s")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("verhindert Löschen einer noch zugewiesenen Rolle", async () => {
    const prisma = makePrisma();
    prisma.role.findUnique.mockResolvedValue({ id: "c", name: "Custom", _count: { users: 3 } });
    const service = new RolesService(prisma as never);
    await expect(service.remove("c")).rejects.toBeInstanceOf(ConflictException);
  });

  it("legt eine eigene Rolle mit Berechtigungen an", async () => {
    const prisma = makePrisma();
    prisma.role.findUnique.mockResolvedValue(null);
    prisma.permission.findMany.mockResolvedValue([{ id: "p1", key: "eintraege:read" }]);
    prisma.role.create.mockResolvedValue({
      ...ROLE_RETURN,
      name: "Auditor",
      permissions: [{ permission: { key: "eintraege:read" } }],
    });
    const service = new RolesService(prisma as never);
    const result = await service.create({ name: "Auditor", permissions: ["eintraege:read"] });
    expect(result.name).toBe("Auditor");
    expect(result.istSystemrolle).toBe(false);
    expect(result.permissions).toEqual(["eintraege:read"]);
  });
});
