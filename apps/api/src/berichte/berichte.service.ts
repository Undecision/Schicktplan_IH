import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  EintragStatus,
  SCHICHTBERICHT_STATUS_LABELS,
  SchichtberichtStatus,
  type AuthenticatedUser,
} from "@schichtbuch/shared";
import { PrismaService } from "../prisma/prisma.service";
import { baueHistorie, type HistorieFeld } from "../common/historie.util";
import { EINTRAG_LIST_INCLUDE, toListItem } from "../eintraege/eintrag.mapper";
import {
  BERICHT_INCLUDE,
  toBerichtDetail,
  toBerichtListItem,
  type BerichtKennzahlen,
  type BerichtPayload,
} from "./berichte.mapper";
import { GeneriereBerichtDto } from "./dto/generiere-bericht.dto";
import { UpdateBerichtDto } from "./dto/update-bericht.dto";
import { ListBerichteQueryDto } from "./dto/list-berichte.query.dto";

@Injectable()
export class BerichteService {
  constructor(private readonly prisma: PrismaService) {}

  private gewerkVisibilityWhere(user: AuthenticatedUser): Prisma.SchichtberichtWhereInput {
    if (user.gewerkeSichtbarkeit.length === 0) return {};
    return { gewerk: { name: { in: user.gewerkeSichtbarkeit } } };
  }

  private assertGewerkVisible(user: AuthenticatedUser, gewerkName: string): void {
    if (user.gewerkeSichtbarkeit.length > 0 && !user.gewerkeSichtbarkeit.includes(gewerkName)) {
      throw new NotFoundException("Bericht nicht gefunden.");
    }
  }

  async list(user: AuthenticatedUser, query: ListBerichteQueryDto) {
    const where: Prisma.SchichtberichtWhereInput = {
      ...this.gewerkVisibilityWhere(user),
      ...(query.datum ? { datum: new Date(query.datum) } : {}),
      ...(query.schichtId ? { schichtId: query.schichtId } : {}),
      ...(query.gewerkId ? { gewerkId: query.gewerkId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const berichte = await this.prisma.schichtbericht.findMany({
      where,
      include: BERICHT_INCLUDE,
      orderBy: [{ datum: "desc" }, { schicht: { name: "asc" } }, { gewerk: { name: "asc" } }],
    });
    return Promise.all(
      berichte.map(async (bericht) => toBerichtListItem(bericht, await this.kennzahlen(bericht))),
    );
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const bericht = await this.prisma.schichtbericht.findUnique({
      where: { id },
      include: BERICHT_INCLUDE,
    });
    if (!bericht) throw new NotFoundException("Bericht nicht gefunden.");
    this.assertGewerkVisible(user, bericht.gewerk.name);
    const eintraege = await this.eintraege(bericht);
    return toBerichtDetail(bericht, eintraege);
  }

  /** Änderungsverlauf (wer hat wann erstellt/geändert/freigegeben) aus dem Audit-Log. */
  async historie(user: AuthenticatedUser, id: string) {
    // Sichtbarkeit erzwingen (wirft 404, falls nicht sichtbar).
    await this.findOne(user, id);
    const logs = await this.prisma.auditLog.findMany({
      where: { entity: "Schichtbericht", entityId: id },
      orderBy: { createdAt: "desc" },
    });
    return baueHistorie(logs, BERICHT_HISTORIE_FELDER);
  }

  /**
   * Löscht einen Schichtbericht endgültig. Die abgeleiteten Eintragslisten
   * werden nicht persistiert; die zugrunde liegenden Schichtbucheinträge
   * bleiben unberührt. Die Berechtigung (berichte:delete) prüft der Guard.
   */
  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const bericht = await this.prisma.schichtbericht.findUnique({
      where: { id },
      select: { id: true, gewerk: { select: { name: true } } },
    });
    if (!bericht) throw new NotFoundException("Bericht nicht gefunden.");
    this.assertGewerkVisible(user, bericht.gewerk.name);
    await this.prisma.schichtbericht.delete({ where: { id } });
  }

  /** Erzeugt Berichte für einen Tag/Schicht idempotent (upsert je Gewerk). */
  async generieren(user: AuthenticatedUser, dto: GeneriereBerichtDto) {
    const datum = new Date(dto.datum);
    const schicht = await this.prisma.schichtDefinition.findUnique({
      where: { id: dto.schichtId },
    });
    if (!schicht) throw new BadRequestException("Schicht nicht gefunden.");

    const gewerkIds = await this.zielGewerke(user, dto, datum);
    if (gewerkIds.length === 0) {
      throw new BadRequestException(
        "Keine Einträge für Tag/Schicht gefunden – kein Bericht zu erzeugen.",
      );
    }

    const berichte: BerichtPayload[] = [];
    for (const gewerkId of gewerkIds) {
      const bericht = await this.prisma.schichtbericht.upsert({
        where: { datum_schichtId_gewerkId: { datum, schichtId: dto.schichtId, gewerkId } },
        create: { datum, schichtId: dto.schichtId, gewerkId },
        update: {}, // idempotent – bestehende Berichte bleiben unverändert
        include: BERICHT_INCLUDE,
      });
      berichte.push(bericht);
    }
    return Promise.all(
      berichte.map(async (bericht) => toBerichtListItem(bericht, await this.kennzahlen(bericht))),
    );
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateBerichtDto) {
    const bericht = await this.load(user, id);
    if (bericht.status === SchichtberichtStatus.FREIGEGEBEN) {
      throw new ConflictException("Freigegebene Berichte können nicht mehr bearbeitet werden.");
    }
    const data: Prisma.SchichtberichtUpdateInput = {};
    if (dto.besondereEreignisse !== undefined) {
      data.besondereEreignisse = dto.besondereEreignisse || null;
    }
    if (dto.verantwortlicherId !== undefined) {
      data.verantwortlicher = dto.verantwortlicherId
        ? { connect: { id: dto.verantwortlicherId } }
        : { disconnect: true };
    }
    await this.prisma.schichtbericht.update({ where: { id }, data });
    return this.findOne(user, id);
  }

  async freigeben(user: AuthenticatedUser, id: string) {
    const bericht = await this.load(user, id);
    if (bericht.status === SchichtberichtStatus.FREIGEGEBEN) {
      throw new ConflictException("Bericht ist bereits freigegeben.");
    }
    await this.prisma.schichtbericht.update({
      where: { id },
      data: {
        status: SchichtberichtStatus.FREIGEGEBEN,
        freigegebenVon: { connect: { id: user.id } },
        freigegebenAm: new Date(),
      },
    });
    return this.findOne(user, id);
  }

  // --- Helfer ---

  private async load(user: AuthenticatedUser, id: string): Promise<BerichtPayload> {
    const bericht = await this.prisma.schichtbericht.findUnique({
      where: { id },
      include: BERICHT_INCLUDE,
    });
    if (!bericht) throw new NotFoundException("Bericht nicht gefunden.");
    this.assertGewerkVisible(user, bericht.gewerk.name);
    return bericht;
  }

  /** Ermittelt die Ziel-Gewerke der Generierung (explizit oder alle mit Einträgen). */
  private async zielGewerke(
    user: AuthenticatedUser,
    dto: GeneriereBerichtDto,
    datum: Date,
  ): Promise<string[]> {
    const { start, end } = dayRange(datum);
    const baseWhere: Prisma.SchichtbucheintragWhereInput = {
      deletedAt: null,
      schichtId: dto.schichtId,
      zeitpunkt: { gte: start, lt: end },
      ...(user.gewerkeSichtbarkeit.length > 0
        ? { gewerk: { name: { in: user.gewerkeSichtbarkeit } } }
        : {}),
    };

    if (dto.gewerkId) {
      const treffer = await this.prisma.schichtbucheintrag.findFirst({
        where: { ...baseWhere, gewerkId: dto.gewerkId },
        select: { id: true },
      });
      return treffer ? [dto.gewerkId] : [];
    }

    const gruppen = await this.prisma.schichtbucheintrag.groupBy({
      by: ["gewerkId"],
      where: baseWhere,
    });
    return gruppen.map((g) => g.gewerkId);
  }

  private async eintraege(bericht: BerichtPayload) {
    const { start, end } = dayRange(bericht.datum);
    const eintraege = await this.prisma.schichtbucheintrag.findMany({
      where: {
        deletedAt: null,
        schichtId: bericht.schichtId,
        gewerkId: bericht.gewerkId,
        zeitpunkt: { gte: start, lt: end },
      },
      include: EINTRAG_LIST_INCLUDE,
      orderBy: { zeitpunkt: "asc" },
    });
    return eintraege.map((eintrag) => toListItem(eintrag));
  }

  private async kennzahlen(bericht: BerichtPayload): Promise<BerichtKennzahlen> {
    const { start, end } = dayRange(bericht.datum);
    const where: Prisma.SchichtbucheintragWhereInput = {
      deletedAt: null,
      schichtId: bericht.schichtId,
      gewerkId: bericht.gewerkId,
      zeitpunkt: { gte: start, lt: end },
    };
    const [anzahlEintraege, abgeschlosseneArbeiten] = await Promise.all([
      this.prisma.schichtbucheintrag.count({ where }),
      this.prisma.schichtbucheintrag.count({
        where: { ...where, status: EintragStatus.ERLEDIGT },
      }),
    ]);
    return {
      anzahlEintraege,
      abgeschlosseneArbeiten,
      offenePunkte: anzahlEintraege - abgeschlosseneArbeiten,
    };
  }
}

/** Tagesbereich [00:00, +1 Tag) in lokaler Zeit für ein @db.Date. */
function dayRange(datum: Date): { start: Date; end: Date } {
  const start = new Date(datum.getUTCFullYear(), datum.getUTCMonth(), datum.getUTCDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Für die Historie relevante Felder eines Bericht-Snapshots (before/after). */
interface BerichtSnapshot {
  status?: string;
  besondereEreignisse?: string | null;
  verantwortlicher?: { name: string } | null;
  freigegebenVon?: { name: string } | null;
}

const BERICHT_HISTORIE_FELDER: HistorieFeld<BerichtSnapshot>[] = [
  {
    feld: "status",
    label: "Status",
    get: (s) =>
      s.status
        ? (SCHICHTBERICHT_STATUS_LABELS[s.status as SchichtberichtStatus] ?? s.status)
        : null,
  },
  {
    feld: "verantwortlicher",
    label: "Verantwortlicher Schichtführer",
    get: (s) => s.verantwortlicher?.name ?? null,
  },
  {
    feld: "besondereEreignisse",
    label: "Besondere Ereignisse",
    get: (s) => s.besondereEreignisse ?? null,
  },
  {
    feld: "freigegebenVon",
    label: "Freigegeben von",
    get: (s) => s.freigegebenVon?.name ?? null,
  },
];
