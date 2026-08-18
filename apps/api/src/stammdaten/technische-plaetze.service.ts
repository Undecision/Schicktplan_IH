import { BadRequestException, Injectable } from "@nestjs/common";
import type { TechnischerPlatz } from "@prisma/client";
import ExcelJS from "exceljs";
import type {
  TechnischePlaetzeImportResult,
  TechnischePlaetzeImportZeilenfehler,
} from "@schichtbuch/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { UploadedFileLike } from "../anhaenge/anhaenge.service";
import {
  PrismaDelegateLike,
  StammdatumCrudConfig,
  StammdatumCrudService,
} from "./stammdatum-crud.service";
import { CreateTechnischerPlatzDto, UpdateTechnischerPlatzDto } from "./dto/technischer-platz.dto";

/** Max. Größe der Import-Datei (5 MB) – deckt sehr große Platzlisten ab. */
export const IMPORT_MAX_GROESSE_BYTES = 5 * 1024 * 1024;

/** Spaltenzuordnung nach normalisierten Kopfzeilen-Aliassen. */
const SPALTEN_ALIASE = {
  bezeichnung: ["bezeichnung", "beschreibung", "name", "benennung"],
  code: [
    "code",
    "technischerplatz",
    "technischerplatzcode",
    "tplnr",
    "saptechnischerplatz",
    "platz",
    "platzcode",
    "sapcode",
  ],
  fachbereich: ["fachbereich", "fachbereichname", "bereich"],
  sapSyncFaehig: [
    "sapsyncfaehig",
    "sapfaehig",
    "sapsync",
    "sapsynchronisierbar",
    "synchronisierbar",
    "sap",
    "sapsynchronisation",
  ],
} as const;

type SpaltenKey = keyof typeof SPALTEN_ALIASE;

function normalisiereHeader(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

function normalisiereName(value: string): string {
  return value.trim().toLowerCase();
}

function parseBoolean(value: string): boolean {
  return ["ja", "j", "x", "true", "wahr", "1", "yes", "y", "✓"].includes(
    value.trim().toLowerCase(),
  );
}

@Injectable()
export class TechnischePlaetzeService extends StammdatumCrudService<TechnischerPlatz> {
  protected readonly delegate: PrismaDelegateLike<TechnischerPlatz>;
  protected readonly config: StammdatumCrudConfig = {
    entityName: "Technischer Platz",
    uniqueField: "code",
    orderBy: "bezeichnung",
  };

  constructor(private readonly prisma: PrismaService) {
    super();
    this.delegate = prisma.technischerPlatz as unknown as PrismaDelegateLike<TechnischerPlatz>;
  }

  create(dto: CreateTechnischerPlatzDto) {
    return this.createRecord({ ...dto });
  }

  update(id: string, dto: UpdateTechnischerPlatzDto) {
    return this.updateRecord(id, { ...dto });
  }

  /**
   * Importiert technische Plätze aus einer Excel-Datei (.xlsx). Es wird per
   * `code` upsertet (Anlegen oder Aktualisieren); ein optionaler Fachbereich
   * wird über seinen Namen aufgelöst. Fehlerhafte Zeilen werden übersprungen
   * und einzeln zurückgemeldet, ohne den Gesamt-Import abzubrechen.
   */
  async importAusExcel(file: UploadedFileLike | undefined): Promise<TechnischePlaetzeImportResult> {
    if (!file) {
      throw new BadRequestException("Keine Datei übermittelt (Feld 'file').");
    }
    if (!file.originalname.toLowerCase().endsWith(".xlsx")) {
      throw new BadRequestException("Nur Excel-Dateien im Format .xlsx werden unterstützt.");
    }

    const workbook = new ExcelJS.Workbook();
    try {
      // Cast der Methode: aktuelle @types/node typisieren Buffer generisch
      // (Buffer<ArrayBufferLike>), exceljs erwartet den älteren Buffer-Typ –
      // laufzeitseitig identisch, daher überbrücken wir die Signatur.
      const load = workbook.xlsx.load.bind(workbook.xlsx) as (
        data: Buffer,
      ) => Promise<ExcelJS.Workbook>;
      await load(file.buffer);
    } catch {
      throw new BadRequestException(
        "Die Datei konnte nicht als Excel-Arbeitsmappe gelesen werden.",
      );
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException("Die Arbeitsmappe enthält kein Tabellenblatt.");
    }

    const spalten = this.ermittleSpalten(sheet);
    if (spalten.bezeichnung === undefined || spalten.code === undefined) {
      throw new BadRequestException(
        'Die Kopfzeile muss mindestens die Spalten "Bezeichnung" und "Code" enthalten.',
      );
    }

    // Fachbereiche einmalig laden (Name → Id), Groß-/Kleinschreibung ignorierend.
    const fachbereichNachName = new Map<string, string>();
    const fachbereiche = await this.prisma.fachbereich.findMany({ where: { deletedAt: null } });
    for (const fb of fachbereiche) {
      fachbereichNachName.set(normalisiereName(fb.name), fb.id);
    }

    const result: TechnischePlaetzeImportResult = {
      verarbeitet: 0,
      angelegt: 0,
      aktualisiert: 0,
      uebersprungen: 0,
      fehler: [],
    };

    const addFehler = (fehler: TechnischePlaetzeImportZeilenfehler) => {
      result.fehler.push(fehler);
      result.uebersprungen += 1;
    };

    const zeilenText = (row: ExcelJS.Row, col: number | undefined): string =>
      col === undefined ? "" : String(row.getCell(col).text ?? "").trim();

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const bezeichnung = zeilenText(row, spalten.bezeichnung);
      const code = zeilenText(row, spalten.code);
      const fachbereichName = zeilenText(row, spalten.fachbereich);
      const sapText = zeilenText(row, spalten.sapSyncFaehig);

      // Vollständig leere Zeilen überspringen (nicht als Fehler werten).
      if (!bezeichnung && !code && !fachbereichName && !sapText) {
        continue;
      }

      result.verarbeitet += 1;

      if (!code) {
        addFehler({ zeile: rowNumber, code: null, meldung: "Code fehlt." });
        continue;
      }
      if (!bezeichnung) {
        addFehler({ zeile: rowNumber, code, meldung: "Bezeichnung fehlt." });
        continue;
      }

      let fachbereichId: string | null | undefined;
      if (spalten.fachbereich !== undefined) {
        if (fachbereichName) {
          const gefunden = fachbereichNachName.get(normalisiereName(fachbereichName));
          if (!gefunden) {
            addFehler({
              zeile: rowNumber,
              code,
              meldung: `Fachbereich "${fachbereichName}" wurde nicht gefunden.`,
            });
            continue;
          }
          fachbereichId = gefunden;
        } else {
          fachbereichId = null;
        }
      }

      const sapSyncFaehig = spalten.sapSyncFaehig !== undefined ? parseBoolean(sapText) : undefined;

      try {
        const existing = await this.delegate.findFirst({ where: { code, deletedAt: null } });
        if (existing) {
          const data: Record<string, unknown> = { bezeichnung };
          if (sapSyncFaehig !== undefined) data.sapSyncFaehig = sapSyncFaehig;
          if (fachbereichId !== undefined) data.fachbereichId = fachbereichId;
          await this.delegate.update({ where: { id: existing.id }, data });
          result.aktualisiert += 1;
        } else {
          await this.delegate.create({
            data: {
              bezeichnung,
              code,
              sapSyncFaehig: sapSyncFaehig ?? false,
              fachbereichId: fachbereichId ?? null,
            },
          });
          result.angelegt += 1;
        }
      } catch {
        addFehler({ zeile: rowNumber, code, meldung: "Zeile konnte nicht gespeichert werden." });
      }
    }

    return result;
  }

  /** Erzeugt eine Excel-Vorlage mit Kopfzeile und einer Beispielzeile. */
  async erzeugeVorlage(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Technische Plätze");
    sheet.columns = [
      { header: "Bezeichnung", key: "bezeichnung", width: 40 },
      { header: "Code", key: "code", width: 24 },
      { header: "Fachbereich", key: "fachbereich", width: 24 },
      { header: "SAP-synchronisierbar", key: "sapSyncFaehig", width: 22 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.addRow({
      bezeichnung: "Beispiel: Abfüllanlage Linie 1",
      code: "PW4-M-1023",
      fachbereich: "Mechanik",
      sapSyncFaehig: "Ja",
    });
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private ermittleSpalten(sheet: ExcelJS.Worksheet): Partial<Record<SpaltenKey, number>> {
    const spalten: Partial<Record<SpaltenKey, number>> = {};
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const normalisiert = normalisiereHeader(String(cell.text ?? ""));
      if (!normalisiert) return;
      for (const key of Object.keys(SPALTEN_ALIASE) as SpaltenKey[]) {
        if (spalten[key] !== undefined) continue;
        if ((SPALTEN_ALIASE[key] as readonly string[]).includes(normalisiert)) {
          spalten[key] = colNumber;
          break;
        }
      }
    });
    return spalten;
  }
}
