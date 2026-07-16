import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  AuswertungTyp,
  EintragStatus,
  Prioritaet,
  type AuswertungFilter,
  type AuswertungGruppe,
  type AuswertungResult,
  type AuthenticatedUser,
} from "@schichtbuch/shared";
import { PrismaService } from "../prisma/prisma.service";

/** Obergrenze der berücksichtigten Einträge je Auswertung (Schutz vor Übergröße). */
const MAX_EINTRAEGE = 20000;

const REPORT_SELECT = {
  zeitpunkt: true,
  status: true,
  prioritaet: true,
  sapIhAuftrag: true,
  fachbereich: { select: { id: true, name: true } },
  technischerPlatz: { select: { id: true, bezeichnung: true } },
} satisfies Prisma.SchichtbucheintragSelect;

type ReportRow = Prisma.SchichtbucheintragGetPayload<{ select: typeof REPORT_SELECT }>;

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async auswertung(user: AuthenticatedUser, filter: AuswertungFilter): Promise<AuswertungResult> {
    const rows = await this.prisma.schichtbucheintrag.findMany({
      where: this.buildWhere(user, filter),
      select: REPORT_SELECT,
      orderBy: { zeitpunkt: "asc" },
      take: MAX_EINTRAEGE,
    });

    const kennzahlen = {
      gesamt: rows.length,
      offen: rows.filter((r) => r.status !== EintragStatus.ERLEDIGT).length,
      erledigt: rows.filter((r) => r.status === EintragStatus.ERLEDIGT).length,
      kritisch: rows.filter((r) => r.prioritaet === Prioritaet.KRITISCH).length,
    };

    return {
      typ: filter.typ,
      von: filter.von,
      bis: filter.bis,
      erzeugtAm: new Date().toISOString(),
      kennzahlen,
      statusVerteilung: this.verteilung(rows, "status").map((v) => ({
        status: v.key as EintragStatus,
        anzahl: v.anzahl,
      })),
      prioritaetVerteilung: this.verteilung(rows, "prioritaet").map((v) => ({
        prioritaet: v.key as Prioritaet,
        anzahl: v.anzahl,
      })),
      gruppen: this.gruppieren(rows, filter.typ),
    };
  }

  private buildWhere(
    user: AuthenticatedUser,
    filter: AuswertungFilter,
  ): Prisma.SchichtbucheintragWhereInput {
    const where: Prisma.SchichtbucheintragWhereInput = {
      deletedAt: null,
      zeitpunkt: { gte: new Date(filter.von), lt: exklusivesEnde(filter.bis) },
    };
    if (user.gewerkeSichtbarkeit.length > 0) {
      where.gewerk = { name: { in: user.gewerkeSichtbarkeit } };
    }
    if (filter.gewerkId) where.gewerkId = filter.gewerkId;
    if (filter.fachbereichId) where.fachbereichId = filter.fachbereichId;
    if (filter.technischerPlatzId) where.technischerPlatzId = filter.technischerPlatzId;
    if (filter.schichtId) where.schichtId = filter.schichtId;
    if (filter.status) where.status = filter.status;
    if (filter.prioritaet) where.prioritaet = filter.prioritaet;
    return where;
  }

  private verteilung(rows: ReportRow[], key: "status" | "prioritaet") {
    const map = new Map<string, number>();
    for (const row of rows) map.set(row[key], (map.get(row[key]) ?? 0) + 1);
    return [...map.entries()].map(([k, anzahl]) => ({ key: k, anzahl }));
  }

  private gruppieren(rows: ReportRow[], typ: AuswertungTyp): AuswertungGruppe[] {
    const gruppen = new Map<string, AuswertungGruppe>();
    for (const row of rows) {
      const { schluessel, label } = gruppenSchluessel(row, typ);
      let g = gruppen.get(schluessel);
      if (!g) {
        g = { schluessel, label, anzahl: 0, offen: 0, erledigt: 0, kritisch: 0 };
        gruppen.set(schluessel, g);
      }
      g.anzahl++;
      if (row.status === EintragStatus.ERLEDIGT) g.erledigt++;
      else g.offen++;
      if (row.prioritaet === Prioritaet.KRITISCH) g.kritisch++;
    }
    const liste = [...gruppen.values()];
    const zeitlich = [AuswertungTyp.TAGES, AuswertungTyp.WOCHEN, AuswertungTyp.MONATS];
    // Zeit-Dimensionen chronologisch, Entitäts-Dimensionen nach Häufigkeit.
    return zeitlich.includes(typ)
      ? liste.sort((a, b) => a.schluessel.localeCompare(b.schluessel))
      : liste.sort((a, b) => b.anzahl - a.anzahl || a.label.localeCompare(b.label));
  }
}

function gruppenSchluessel(
  row: ReportRow,
  typ: AuswertungTyp,
): { schluessel: string; label: string } {
  switch (typ) {
    case AuswertungTyp.TAGES: {
      const key = tagesSchluessel(row.zeitpunkt);
      return { schluessel: key, label: formatTag(row.zeitpunkt) };
    }
    case AuswertungTyp.WOCHEN: {
      const { jahr, woche } = isoWoche(row.zeitpunkt);
      const key = `${jahr}-W${String(woche).padStart(2, "0")}`;
      return { schluessel: key, label: `KW ${woche}/${jahr}` };
    }
    case AuswertungTyp.MONATS: {
      const key = `${row.zeitpunkt.getFullYear()}-${String(row.zeitpunkt.getMonth() + 1).padStart(2, "0")}`;
      return { schluessel: key, label: key };
    }
    case AuswertungTyp.FACHBEREICH:
      return { schluessel: row.fachbereich.id, label: row.fachbereich.name };
    case AuswertungTyp.TECHNISCHER_PLATZ:
      return { schluessel: row.technischerPlatz.id, label: row.technischerPlatz.bezeichnung };
    case AuswertungTyp.SAP_AUFTRAG: {
      const sap = row.sapIhAuftrag ?? "";
      return { schluessel: sap || "__ohne__", label: sap || "(ohne SAP-Auftrag)" };
    }
  }
}

function tagesSchluessel(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTag(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** ISO-8601-Kalenderwoche (Woche 1 = Woche mit dem ersten Donnerstag). */
function isoWoche(date: Date): { jahr: number; woche: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const tag = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - tag);
  const jahrStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const woche = Math.ceil(((d.getTime() - jahrStart.getTime()) / 86400000 + 1) / 7);
  return { jahr: d.getUTCFullYear(), woche };
}

/** Exklusives Bereichsende: Tag `bis` inklusiv → +1 Tag. */
function exklusivesEnde(bis: string): Date {
  const d = new Date(bis);
  d.setDate(d.getDate() + 1);
  return d;
}
