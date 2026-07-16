import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
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
    const where: Prisma.SchichtbucheintragWhereInput = {
      deletedAt: null,
      ...this.gewerkVisibilityWhere(user),
      ...(query.status ? { status: query.status } : {}),
      ...(query.prioritaet ? { prioritaet: query.prioritaet } : {}),
      ...(query.gewerkId ? { gewerkId: query.gewerkId } : {}),
      ...(query.fachbereichId ? { fachbereichId: query.fachbereichId } : {}),
      ...(query.schichtId ? { schichtId: query.schichtId } : {}),
    };

    const eintraege = await this.prisma.schichtbucheintrag.findMany({
      where,
      include: EINTRAG_LIST_INCLUDE,
      orderBy: { zeitpunkt: "desc" },
    });
    return eintraege.map(toListItem);
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
