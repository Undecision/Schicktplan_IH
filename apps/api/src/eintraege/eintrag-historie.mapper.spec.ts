import type { AuditLog } from "@prisma/client";
import { EintragStatus, Prioritaet } from "@schichtbuch/shared";
import { toHistorieEintrag } from "./eintrag-historie.mapper";

function makeLog(overrides: Partial<AuditLog>): AuditLog {
  return {
    id: "log-1",
    actorId: "u1",
    actorName: "Max Muster",
    action: "UPDATE",
    entity: "Schichtbucheintrag",
    entityId: "e1",
    before: null,
    after: null,
    createdAt: new Date("2026-07-16T10:00:00Z"),
    updatedAt: new Date("2026-07-16T10:00:00Z"),
    ...overrides,
  } as AuditLog;
}

describe("toHistorieEintrag", () => {
  it("bildet CREATE ohne Feldänderungen ab", () => {
    const result = toHistorieEintrag(makeLog({ action: "CREATE", after: { beschreibung: "neu" } }));
    expect(result.action).toBe("CREATE");
    expect(result.aenderungen).toEqual([]);
    expect(result.actorName).toBe("Max Muster");
  });

  it("erkennt geänderte Felder mit Labels und Vorher/Nachher", () => {
    const result = toHistorieEintrag(
      makeLog({
        action: "UPDATE",
        before: { status: EintragStatus.OFFEN, prioritaet: Prioritaet.NORMAL, beschreibung: "x" },
        after: { status: EintragStatus.ERLEDIGT, prioritaet: Prioritaet.NORMAL, beschreibung: "x" },
      }),
    );
    expect(result.aenderungen).toEqual([
      { feld: "status", label: "Status", vorher: "Offen", nachher: "Erledigt" },
    ]);
  });

  it("erkennt Referenz-Änderungen (Verantwortlicher) über den Namen", () => {
    const result = toHistorieEintrag(
      makeLog({
        before: { verantwortlicher: null },
        after: { verantwortlicher: { name: "Anna Neu" } },
      }),
    );
    expect(result.aenderungen).toEqual([
      { feld: "verantwortlicher", label: "Verantwortlicher", vorher: null, nachher: "Anna Neu" },
    ]);
  });

  it("meldet keine Änderung, wenn Werte gleich bleiben", () => {
    const result = toHistorieEintrag(
      makeLog({ before: { beschreibung: "gleich" }, after: { beschreibung: "gleich" } }),
    );
    expect(result.aenderungen).toEqual([]);
  });
});
