import { PrismaClient } from "@prisma/client";

/**
 * Verifiziert die DB-seitige Unveränderlichkeit des Audit-Logs (P1.6).
 * Benötigt eine laufende PostgreSQL-Instanz mit angewendeten Migrationen
 * (siehe DATABASE_URL, README "Tests").
 */
describe("Audit-Log Unveränderlichkeit (e2e)", () => {
  const prisma = new PrismaClient();
  let entryId: string;

  beforeAll(async () => {
    const entry = await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "ImmutabilityTest",
        entityId: null,
        after: { test: true },
      },
    });
    entryId = entry.id;
  });

  afterAll(async () => {
    await prisma
      .$executeRawUnsafe(
        `DELETE FROM audit_log WHERE id = $1::uuid AND entity = 'ImmutabilityTest'`,
        entryId,
      )
      .catch(() => {
        // Erwartet: DELETE wird durch den DB-Trigger verweigert (siehe Test unten).
        // Testdaten bleiben bewusst bestehen – audit_log ist append-only per Design.
      });
    await prisma.$disconnect();
  });

  it("lehnt UPDATE auf audit_log ab", async () => {
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE audit_log SET entity = 'Manipuliert' WHERE id = $1::uuid`,
        entryId,
      ),
    ).rejects.toThrow(/append-only/);
  });

  it("lehnt DELETE auf audit_log ab", async () => {
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM audit_log WHERE id = $1::uuid`, entryId),
    ).rejects.toThrow(/append-only/);
  });

  it("der Eintrag ist nach den fehlgeschlagenen Mutationsversuchen weiterhin vorhanden (Vollständigkeit)", async () => {
    const entry = await prisma.auditLog.findUnique({ where: { id: entryId } });
    expect(entry).not.toBeNull();
    expect(entry?.entity).toBe("ImmutabilityTest");
  });
});
