import { mappeEasyFlowTag } from "./easyflow.service";

describe("mappeEasyFlowTag", () => {
  it("mappt die relevanten Felder aus der EasyFlow-Antwort", () => {
    const antwort = {
      eventTitle: "Antrieb defekt",
      eventText: "Motor läuft heiß und schaltet ab",
      solutionText: "Motor getauscht",
      sapOrder: "700123456",
      eventDate: "2026-09-01",
      reactOnRed: { rootCause: "Lager verschlissen", correction: "Lager erneuert" },
      aktoObject: { name: "Füller 1", functionalLocation: "7161-ABC" },
    };

    expect(mappeEasyFlowTag("195630", antwort)).toEqual({
      tag: "195630",
      stoerung: "Motor läuft heiß und schaltet ab",
      ursache: "Lager verschlissen",
      korrekturmassnahme: "Motor getauscht",
      sapIhAuftrag: "700123456",
      datum: "2026-09-01",
      technischerPlatzCode: "7161-ABC",
      objektName: "Füller 1",
    });
  });

  it("fällt bei fehlendem eventText auf eventTitle und bei fehlendem solutionText auf die Korrektur zurück", () => {
    const antwort = {
      eventTitle: "Kurzstörung",
      reactOnRed: { correction: "Reset durchgeführt" },
      aktoObject: { zrepMachine: "M-42" },
    };

    const v = mappeEasyFlowTag("1", antwort);
    expect(v.stoerung).toBe("Kurzstörung");
    expect(v.korrekturmassnahme).toBe("Reset durchgeführt");
    expect(v.technischerPlatzCode).toBe("M-42");
  });

  it("liefert null für leere oder fehlende Felder", () => {
    const v = mappeEasyFlowTag("2", { eventText: "   ", aktoObject: {} });
    expect(v.stoerung).toBeNull();
    expect(v.ursache).toBeNull();
    expect(v.korrekturmassnahme).toBeNull();
    expect(v.sapIhAuftrag).toBeNull();
    expect(v.datum).toBeNull();
    expect(v.technischerPlatzCode).toBeNull();
    expect(v.objektName).toBeNull();
  });
});
