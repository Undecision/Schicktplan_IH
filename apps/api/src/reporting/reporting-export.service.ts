import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import {
  AUSWERTUNG_TYP_LABELS,
  PRIORITAET_LABELS,
  STATUS_LABELS,
  type AuswertungResult,
  type EintragStatus,
  type Prioritaet,
} from "@schichtbuch/shared";

/** Erzeugt eine Excel-Arbeitsmappe (XLSX) aus einer Auswertung (P10.2). */
@Injectable()
export class ReportingExportService {
  async toXlsx(result: AuswertungResult): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Schichtbuch";
    wb.created = new Date(result.erzeugtAm);

    // --- Übersicht ---
    const ws = wb.addWorksheet("Übersicht");
    ws.columns = [{ width: 28 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 12 }];
    titelZeile(ws, AUSWERTUNG_TYP_LABELS[result.typ]);
    ws.addRow([`Zeitraum: ${result.von} – ${result.bis}`]);
    ws.addRow([]);
    ws.addRow(["Einträge gesamt", result.kennzahlen.gesamt]);
    ws.addRow(["Offen", result.kennzahlen.offen]);
    ws.addRow(["Erledigt", result.kennzahlen.erledigt]);
    ws.addRow(["Kritisch", result.kennzahlen.kritisch]);
    ws.addRow([]);

    kopf(ws, ["Nach Status", "Anzahl"]);
    for (const v of result.statusVerteilung) {
      ws.addRow([STATUS_LABELS[v.status as EintragStatus], v.anzahl]);
    }
    ws.addRow([]);
    kopf(ws, ["Nach Priorität", "Anzahl"]);
    for (const v of result.prioritaetVerteilung) {
      ws.addRow([PRIORITAET_LABELS[v.prioritaet as Prioritaet], v.anzahl]);
    }

    // --- Aufschlüsselung ---
    const gws = wb.addWorksheet("Aufschlüsselung");
    gws.columns = [{ width: 34 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }];
    kopf(gws, ["Gruppe", "Einträge", "Offen", "Erledigt", "Kritisch"]);
    for (const g of result.gruppen) {
      gws.addRow([g.label, g.anzahl, g.offen, g.erledigt, g.kritisch]);
    }

    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out);
  }
}

function titelZeile(ws: ExcelJS.Worksheet, text: string): void {
  const row = ws.addRow([text]);
  row.font = { size: 14, bold: true, color: { argb: "FF1E3A5F" } };
}

function kopf(ws: ExcelJS.Worksheet, cols: string[]): void {
  const row = ws.addRow(cols);
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F3F7" } };
  });
}
