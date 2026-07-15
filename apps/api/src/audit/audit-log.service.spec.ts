import { AuditLogService } from "./audit-log.service";

describe("AuditLogService", () => {
  it("legt einen Audit-Log-Eintrag mit den übergebenen Feldern an", async () => {
    const create = jest.fn().mockResolvedValue({});
    const prisma = { auditLog: { create } } as never;
    const service = new AuditLogService(prisma);

    await service.log({
      actorId: "user-1",
      actorName: "Test User",
      action: "CREATE",
      entity: "User",
      entityId: "entity-1",
      before: undefined,
      after: { name: "Test" },
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "user-1",
        actorName: "Test User",
        action: "CREATE",
        entity: "User",
        entityId: "entity-1",
        after: { name: "Test" },
      }),
    });
  });

  it("wirft nicht nach außen, wenn das Schreiben fehlschlägt", async () => {
    const create = jest.fn().mockRejectedValue(new Error("db down"));
    const prisma = { auditLog: { create } } as never;
    const service = new AuditLogService(prisma);

    await expect(
      service.log({
        actorId: null,
        actorName: null,
        action: "LOGIN_FAILURE",
        entity: "User",
        entityId: null,
      }),
    ).resolves.toBeUndefined();
  });
});
