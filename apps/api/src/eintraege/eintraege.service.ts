import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Rolle, type AuthenticatedUser } from "@schichtbuch/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  EINTRAG_DETAIL_INCLUDE,
  EINTRAG_LIST_INCLUDE,
  toDetail,
  toListItem,
} from "./eintrag.mapper";
import { CreateEintragDto } from "./dto/create-eintrag.dto";
import { UpdateEintragDto } from "./dto/update-eintrag.dto";
import { ListEintraegeQueryDto } from "./dto/list-eintraege.query.dto";
import { CreateKommentarDto } from "./dto/create-kommentar.dto";

/**
 * Rollen mit uneingeschränktem Bearbeitungsrecht (dürfen fremde Einträge
 * bearbeiten). Andere Rollen mit `eintraege:update` dürfen nur eigene Einträge
 * ändern (Lastenheft P3.2: "Meister/Schichtleiter+ bzw. Ersteller nach Regel").
 */
const BROAD_EDIT_ROLES: readonly Rolle[] = [Rolle.ADMINISTRATOR, Rolle.MEISTER_SCHICHTLEITER];

@Injectable()
export class EintraegeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gewerk-Sichtbarkeit als zusätzlicher Datenfilter (keine Mandantentrennung):
   * Ist für den Nutzer eine Sichtbarkeit konfiguriert, werden nur Einträge der
   * zugewiesenen Gewerke zurückgegeben. Leere Sichtbarkeit = keine Einschränkung
   * (sieht alle Gewerke, z.B. Administrator).
   */
  private gewerkVisibilityWhere(user: AuthenticatedUser): Prisma.SchichtbucheintragWhereInput {
    if (user.gewerkeSichtbarkeit.length === 0) {
      return {};
    }
    return { gewerk: { name: { in: user.gewerkeSichtbarkeit } } };
  }

  async list(user: AuthenticatedUser, query: ListEintraegeQueryDto) {
    const where = this.buildWhere(user, query);
    const q = query.q?.trim();

    // Ohne Suchbegriff: reine Filter-Query, chronologisch sortiert.
    if (!q) {
      const eintraege = await this.prisma.schichtbucheintrag.findMany({
        where,
        include: EINTRAG_LIST_INCLUDE,
        orderBy: { zeitpunkt: "desc" },
      });
      return eintraege.map((eintrag) => toListItem(eintrag));
    }

    // Mit Suchbegriff (P5.1): Volltext-Treffer inkl. Rang + Highlight bestimmen,
    // dann die Filter/Sichtbarkeit über die IDs erzwingen und nach Rang sortieren.
    const treffer = await this.volltextTreffer(q);
    if (treffer.ids.length === 0) {
      return [];
    }

    const eintraege = await this.prisma.schichtbucheintrag.findMany({
      where: { ...where, id: { in: treffer.ids } },
      include: EINTRAG_LIST_INCLUDE,
    });

    return eintraege
      .map((eintrag) => toListItem(eintrag))
      .map((item) => ({ ...item, highlight: treffer.highlights.get(item.id) ?? null }))
      .sort((a, b) => (treffer.ranks.get(b.id) ?? 0) - (treffer.ranks.get(a.id) ?? 0));
  }

  /** Baut den Prisma-Filter aus Query-Parametern inkl. Gewerk-Sichtbarkeit. */
  private buildWhere(
    user: AuthenticatedUser,
    query: ListEintraegeQueryDto,
  ): Prisma.SchichtbucheintragWhereInput {
    const where: Prisma.SchichtbucheintragWhereInput = {
      deletedAt: null,
      ...this.gewerkVisibilityWhere(user),
    };
    if (query.status) where.status = query.status;
    if (query.prioritaet) where.prioritaet = query.prioritaet;
    if (query.gewerkId) where.gewerkId = query.gewerkId;
    if (query.fachbereichId) where.fachbereichId = query.fachbereichId;
    if (query.schichtId) where.schichtId = query.schichtId;
    if (query.technischerPlatzId) where.technischerPlatzId = query.technischerPlatzId;
    if (query.erstellerId) where.erstellerId = query.erstellerId;
    if (query.sapIhAuftrag) {
      where.sapIhAuftrag = { contains: query.sapIhAuftrag, mode: "insensitive" };
    }
    if (query.easyFlowTag) {
      where.easyFlowTag = { contains: query.easyFlowTag, mode: "insensitive" };
    }
    if (query.von || query.bis) {
      where.zeitpunkt = {
        ...(query.von ? { gte: new Date(query.von) } : {}),
        ...(query.bis ? { lte: bisGrenze(query.bis) } : {}),
      };
    }
    return where;
  }

  /**
   * Führt die Postgres-Volltextsuche aus und liefert Treffer-IDs, ihren Rang und
   * den hervorgehobenen Auszug. `websearch_to_tsquery` verarbeitet die
   * Nutzereingabe tolerant (Phrasen in Anführungszeichen, `-` für Ausschluss).
   */
  private async volltextTreffer(
    q: string,
  ): Promise<{ ids: string[]; ranks: Map<string, number>; highlights: Map<string, string> }> {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; rank: number; highlight: string }>
    >(Prisma.sql`
      SELECT "id"::text AS id,
             ts_rank("suchVektor", websearch_to_tsquery('german', ${q})) AS rank,
             ts_headline(
               'german', "beschreibung", websearch_to_tsquery('german', ${q}),
               'StartSel=⟦, StopSel=⟧, MaxFragments=2, MaxWords=18, MinWords=5, ShortWord=2'
             ) AS highlight
      FROM "schichtbucheintraege"
      WHERE "deletedAt" IS NULL
        AND "suchVektor" @@ websearch_to_tsquery('german', ${q})
    `);

    const ranks = new Map<string, number>();
    const highlights = new Map<string, string>();
    for (const row of rows) {
      ranks.set(row.id, Number(row.rank));
      highlights.set(row.id, row.highlight);
    }
    return { ids: rows.map((row) => row.id), ranks, highlights };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const eintrag = await this.prisma.schichtbucheintrag.findFirst({
      where: { id, deletedAt: null, ...this.gewerkVisibilityWhere(user) },
      include: EINTRAG_DETAIL_INCLUDE,
    });
    if (!eintrag) {
      throw new NotFoundException("Eintrag nicht gefunden.");
    }
    return toDetail(eintrag);
  }

  async create(user: AuthenticatedUser, dto: CreateEintragDto) {
    const data: Prisma.SchichtbucheintragCreateInput = {
      zeitpunkt: new Date(dto.zeitpunkt),
      prioritaet: dto.prioritaet,
      status: dto.status,
      beschreibung: dto.beschreibung,
      sapIhAuftrag: dto.sapIhAuftrag || null,
      easyFlowTag: dto.easyFlowTag || null,
      faelligkeitsdatum: dto.faelligkeitsdatum ? new Date(dto.faelligkeitsdatum) : null,
      ersteller: { connect: { id: user.id } },
      schicht: { connect: { id: dto.schichtId } },
      gewerk: { connect: { id: dto.gewerkId } },
      fachbereich: { connect: { id: dto.fachbereichId } },
      technischerPlatz: { connect: { id: dto.technischerPlatzId } },
      verantwortlicher: dto.verantwortlicherId
        ? { connect: { id: dto.verantwortlicherId } }
        : undefined,
      schlagwoerter: dto.schlagwortIds
        ? { connect: dto.schlagwortIds.map((sid) => ({ id: sid })) }
        : undefined,
    };

    const eintrag = await this.prisma.schichtbucheintrag.create({
      data,
      include: EINTRAG_DETAIL_INCLUDE,
    });
    return toDetail(eintrag);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateEintragDto) {
    const existing = await this.prisma.schichtbucheintrag.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, erstellerId: true, gewerk: { select: { name: true } } },
    });
    if (!existing || !this.isVisible(user, existing.gewerk.name)) {
      throw new NotFoundException("Eintrag nicht gefunden.");
    }

    const mayEditAll = user.rollen.some((rolle) => BROAD_EDIT_ROLES.includes(rolle));
    if (!mayEditAll && existing.erstellerId !== user.id) {
      throw new ForbiddenException(
        "Nur der Ersteller oder Meister/Schichtleiter dürfen bearbeiten.",
      );
    }

    const data = this.buildUpdateData(dto);
    if (dto.zeitpunkt !== undefined) data.zeitpunkt = new Date(dto.zeitpunkt);
    if (dto.prioritaet !== undefined) data.prioritaet = dto.prioritaet;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.beschreibung !== undefined) data.beschreibung = dto.beschreibung;
    if (dto.schlagwortIds !== undefined) {
      data.schlagwoerter = { set: dto.schlagwortIds.map((sid) => ({ id: sid })) };
    }

    const eintrag = await this.prisma.schichtbucheintrag.update({
      where: { id },
      data,
      include: EINTRAG_DETAIL_INCLUDE,
    });
    return toDetail(eintrag);
  }

  async addKommentar(user: AuthenticatedUser, eintragId: string, dto: CreateKommentarDto) {
    // Sichtbarkeit erzwingen (wirft 404, falls nicht sichtbar).
    await this.findOne(user, eintragId);
    await this.prisma.eintragKommentar.create({
      data: {
        text: dto.text,
        eintrag: { connect: { id: eintragId } },
        autor: { connect: { id: user.id } },
      },
    });
    return this.findOne(user, eintragId);
  }

  private isVisible(user: AuthenticatedUser, gewerkName: string): boolean {
    return user.gewerkeSichtbarkeit.length === 0 || user.gewerkeSichtbarkeit.includes(gewerkName);
  }

  /** Referenz-/Optionalfelder für update (nur gesetzte Felder werden verändert). */
  private buildUpdateData(dto: UpdateEintragDto): Prisma.SchichtbucheintragUpdateInput {
    const data: Prisma.SchichtbucheintragUpdateInput = {};
    if (dto.schichtId !== undefined) data.schicht = { connect: { id: dto.schichtId } };
    if (dto.gewerkId !== undefined) data.gewerk = { connect: { id: dto.gewerkId } };
    if (dto.fachbereichId !== undefined) data.fachbereich = { connect: { id: dto.fachbereichId } };
    if (dto.technischerPlatzId !== undefined) {
      data.technischerPlatz = { connect: { id: dto.technischerPlatzId } };
    }
    if (dto.sapIhAuftrag !== undefined) data.sapIhAuftrag = dto.sapIhAuftrag || null;
    if (dto.easyFlowTag !== undefined) data.easyFlowTag = dto.easyFlowTag || null;
    if (dto.faelligkeitsdatum !== undefined) {
      data.faelligkeitsdatum = dto.faelligkeitsdatum ? new Date(dto.faelligkeitsdatum) : null;
    }
    if (dto.verantwortlicherId !== undefined) {
      data.verantwortlicher = dto.verantwortlicherId
        ? { connect: { id: dto.verantwortlicherId } }
        : { disconnect: true };
    }
    return data;
  }
}

/**
 * Obergrenze für den Zeitraum-Filter. Ist nur ein Datum (YYYY-MM-DD) angegeben,
 * wird das Ende dieses Tages verwendet, damit der Tag inklusiv ist.
 */
function bisGrenze(bis: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(bis)) {
    return new Date(`${bis}T23:59:59.999`);
  }
  return new Date(bis);
}
