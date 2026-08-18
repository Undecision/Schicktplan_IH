import { BadRequestException } from "@nestjs/common";
import ExcelJS from "exceljs";
import { TechnischePlaetzeService } from "./technische-plaetze.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { UploadedFileLike } from "../anhaenge/anhaenge.service";

/** Baut eine .xlsx-Datei mit Kopfzeile + Datenzeilen als UploadedFileLike. */
async function makeXlsx(
  header: string[],
  rows: (string | number)[][],
  originalname = "import.xlsx",
): Promise<UploadedFileLike> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Blatt1");
  ws.addRow(header);
  rows.forEach((r) => ws.addRow(r));
  const arrayBuffer = await wb.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return {
    originalname,
    mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: buffer.length,
    buffer,
  };
}

function makePrisma(options: {
  fachbereiche?: { id: string; name: string }[];
  existierendeCodes?: string[];
}) {
  const fachbereiche = options.fachbereiche ?? [];
  const existierendeCodes = new Set(options.existierendeCodes ?? []);
  const create = jest
    .fn()
    .mockImplementation(({ data }) => Promise.resolve({ id: "neu", ...data }));
  const update = jest
    .fn()
    .mockImplementation(({ data }) => Promise.resolve({ id: "vorhanden", ...data }));
  const findFirst = jest
    .fn()
    .mockImplementation(({ where }: { where: { code: string } }) =>
      Promise.resolve(
        existierendeCodes.has(where.code) ? { id: "vorhanden", code: where.code } : null,
      ),
    );
  const prisma = {
    technischerPlatz: { findFirst, create, update },
    fachbereich: { findMany: jest.fn().mockResolvedValue(fachbereiche) },
  } as unknown as PrismaService;
  return { prisma, create, update, findFirst };
}

describe("TechnischePlaetzeService.importAusExcel", () => {
  it("wirft BadRequest ohne Datei", async () => {
    const { prisma } = makePrisma({});
    const service = new TechnischePlaetzeService(prisma);
    await expect(service.importAusExcel(undefined)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("wirft BadRequest bei falscher Dateiendung", async () => {
    const { prisma } = makePrisma({});
    const service = new TechnischePlaetzeService(prisma);
    const file = await makeXlsx(["Bezeichnung", "Code"], [["A", "C1"]], "daten.csv");
    await expect(service.importAusExcel(file)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("wirft BadRequest, wenn Pflichtspalten fehlen", async () => {
    const { prisma } = makePrisma({});
    const service = new TechnischePlaetzeService(prisma);
    const file = await makeXlsx(["Bezeichnung", "Fachbereich"], [["A", "Mechanik"]]);
    await expect(service.importAusExcel(file)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("legt neue Plätze an und aktualisiert bestehende (Upsert per Code)", async () => {
    const { prisma, create, update } = makePrisma({ existierendeCodes: ["C-VORHANDEN"] });
    const service = new TechnischePlaetzeService(prisma);
    const file = await makeXlsx(
      ["Bezeichnung", "Code", "SAP-synchronisierbar"],
      [
        ["Neuer Platz", "C-NEU", "Ja"],
        ["Aktualisiert", "C-VORHANDEN", "nein"],
      ],
    );
    const result = await service.importAusExcel(file);
    expect(result.verarbeitet).toBe(2);
    expect(result.angelegt).toBe(1);
    expect(result.aktualisiert).toBe(1);
    expect(result.uebersprungen).toBe(0);
    expect(create).toHaveBeenCalledWith({
      data: { bezeichnung: "Neuer Platz", code: "C-NEU", sapSyncFaehig: true, fachbereichId: null },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "vorhanden" },
      data: { bezeichnung: "Aktualisiert", sapSyncFaehig: false },
    });
  });

  it("löst Fachbereich per Name auf (Groß-/Kleinschreibung egal)", async () => {
    const { prisma, create } = makePrisma({
      fachbereiche: [{ id: "fb-1", name: "Mechanik" }],
    });
    const service = new TechnischePlaetzeService(prisma);
    const file = await makeXlsx(
      ["Bezeichnung", "Code", "Fachbereich"],
      [["A", "C1", "  mechanik  "]],
    );
    const result = await service.importAusExcel(file);
    expect(result.angelegt).toBe(1);
    expect(create).toHaveBeenCalledWith({
      data: { bezeichnung: "A", code: "C1", sapSyncFaehig: false, fachbereichId: "fb-1" },
    });
  });

  it("überspringt Zeilen mit unbekanntem Fachbereich oder fehlenden Pflichtfeldern", async () => {
    const { prisma, create } = makePrisma({ fachbereiche: [] });
    const service = new TechnischePlaetzeService(prisma);
    const file = await makeXlsx(
      ["Bezeichnung", "Code", "Fachbereich"],
      [
        ["Ohne Code", "", ""],
        ["Mit unbekanntem FB", "C2", "Gibt es nicht"],
        ["", "C3", ""],
      ],
    );
    const result = await service.importAusExcel(file);
    expect(result.verarbeitet).toBe(3);
    expect(result.angelegt).toBe(0);
    expect(result.uebersprungen).toBe(3);
    expect(result.fehler).toHaveLength(3);
    expect(create).not.toHaveBeenCalled();
  });

  it("ignoriert vollständig leere Zeilen", async () => {
    const { prisma } = makePrisma({});
    const service = new TechnischePlaetzeService(prisma);
    const file = await makeXlsx(
      ["Bezeichnung", "Code"],
      [
        ["A", "C1"],
        ["", ""],
        ["B", "C2"],
      ],
    );
    const result = await service.importAusExcel(file);
    expect(result.verarbeitet).toBe(2);
    expect(result.angelegt).toBe(2);
  });
});
