import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  EintragStatus,
  Prioritaet,
  type AuthenticatedUser,
  type DashboardData,
} from "@schichtbuch/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EINTRAG_LIST_INCLUDE, toListItem } from "../eintraege/eintrag.mapper";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getData(user: AuthenticatedUser): Promise<DashboardData> {
    const base = this.baseWhere(user);
    const now = new Date();
    const startHeute = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      offen,
      inBearbeitung,
      kritischeOffen,
      heuteErfasst,
      sapGroups,
      statusGroups,
      prioritaetGroups,
      letzte,
      letzteAnlagenRoh,
    ] = await Promise.all([
      this.prisma.schichtbucheintrag.count({
        where: { ...base, status: EintragStatus.OFFEN },
      }),
      this.prisma.schichtbucheintrag.count({
        where: { ...base, status: EintragStatus.IN_BEARBEITUNG },
      }),
      this.prisma.schichtbucheintrag.count({
        where: {
          ...base,
          prioritaet: Prioritaet.KRITISCH,
          status: { not: EintragStatus.ERLEDIGT },
        },
      }),
      this.prisma.schichtbucheintrag.count({
        where: { ...base, zeitpunkt: { gte: startHeute } },
      }),
      this.prisma.schichtbucheintrag.groupBy({
        by: ["sapIhAuftrag"],
        where: { ...base, sapIhAuftrag: { not: null }, status: { not: EintragStatus.ERLEDIGT } },
      }),
      this.prisma.schichtbucheintrag.groupBy({
        by: ["status"],
        where: base,
        _count: { _all: true },
      }),
      this.prisma.schichtbucheintrag.groupBy({
        by: ["prioritaet"],
        where: base,
        _count: { _all: true },
      }),
      this.prisma.schichtbucheintrag.findMany({
        where: base,
        include: EINTRAG_LIST_INCLUDE,
        orderBy: { zeitpunkt: "desc" },
        take: 5,
      }),
      this.prisma.schichtbucheintrag.findMany({
        where: base,
        select: {
          updatedAt: true,
          technischerPlatz: { select: { id: true, bezeichnung: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 40,
      }),
    ]);

    return {
      offen,
      inBearbeitung,
      kritischeOffen,
      heuteErfasst,
      // Nur echte, nicht-leere SAP-Auftragsnummern zählen (robust gegen leere Strings).
      offeneSapAuftraege: sapGroups.filter((g) => (g.sapIhAuftrag ?? "").trim() !== "").length,
      statusVerteilung: statusGroups.map((g) => ({
        status: g.status as EintragStatus,
        anzahl: g._count._all,
      })),
      prioritaetVerteilung: prioritaetGroups.map((g) => ({
        prioritaet: g.prioritaet as Prioritaet,
        anzahl: g._count._all,
      })),
      letzteEintraege: letzte.map((eintrag) => toListItem(eintrag)),
      zuletztAnlagen: dedupeAnlagen(letzteAnlagenRoh),
    };
  }

  private baseWhere(user: AuthenticatedUser): Prisma.SchichtbucheintragWhereInput {
    if (user.gewerkeSichtbarkeit.length === 0) {
      return { deletedAt: null };
    }
    return { deletedAt: null, gewerk: { name: { in: user.gewerkeSichtbarkeit } } };
  }
}

/** Dedupliziert die zuletzt bearbeiteten technischen Plätze (max. 5, jüngste zuerst). */
function dedupeAnlagen(
  rows: Array<{ updatedAt: Date; technischerPlatz: { id: string; bezeichnung: string } }>,
): DashboardData["zuletztAnlagen"] {
  const gesehen = new Set<string>();
  const result: DashboardData["zuletztAnlagen"] = [];
  for (const row of rows) {
    if (gesehen.has(row.technischerPlatz.id)) continue;
    gesehen.add(row.technischerPlatz.id);
    result.push({
      id: row.technischerPlatz.id,
      name: row.technischerPlatz.bezeichnung,
      zuletzt: row.updatedAt.toISOString(),
    });
    if (result.length >= 5) break;
  }
  return result;
}
