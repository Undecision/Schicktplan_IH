import type { AuditLog } from "@prisma/client";
import { baueHistorie, type HistorieFeld } from "./historie.util";

interface Snap {
  status?: string;
}
const FELDER: HistorieFeld<Snap>[] = [
  { feld: "status", label: "Status", get: (s) => s.status ?? null },
];

function log(partial: Partial<AuditLog>): AuditLog {
  return {
    id: "l1",
    createdAt: new Date("2026-08-18T10:00:00.000Z"),
    actorId: "u1",
    actorName: "Admin",
    action: "CREATE",
    entity: "Schichtuebergabe",
    entityId: "x",
    before: null,
    after: null,
    ...partial,
  } as AuditLog;
}

describe("baueHistorie", () => {
  it("behandelt echte Anlage (POST ohne before) als CREATE", () => {
    const [h] = baueHistorie([log({ action: "CREATE", before: null })], FELDER);
    expect(h!.action).toBe("CREATE");
    expect(h!.aenderungen).toEqual([]);
  });

  it("stuft POST-Aktionen mit before-Snapshot als UPDATE ein und diffed die Felder", () => {
    const [h] = baueHistorie(
      [
        log({
          action: "CREATE",
          before: { status: "ENTWURF" },
          after: { status: "UEBERGEBEN" },
        }),
      ],
      FELDER,
    );
    expect(h!.action).toBe("UPDATE");
    expect(h!.aenderungen).toEqual([
      { feld: "status", label: "Status", vorher: "ENTWURF", nachher: "UEBERGEBEN" },
    ]);
  });

  it("liefert bei PATCH ohne Änderung eine leere Diff-Liste", () => {
    const [h] = baueHistorie(
      [log({ action: "UPDATE", before: { status: "ENTWURF" }, after: { status: "ENTWURF" } })],
      FELDER,
    );
    expect(h!.action).toBe("UPDATE");
    expect(h!.aenderungen).toEqual([]);
  });
});
