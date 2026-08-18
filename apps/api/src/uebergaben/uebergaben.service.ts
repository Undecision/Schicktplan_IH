import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  EintragStatus,
  UEBERGABE_STATUS_LABELS,
  UebergabeStatus,
  type AuthenticatedUser,
} from "@schichtbuch/shared";
import { PrismaService } from "../prisma/prisma.service";
import { baueHistorie, formatHistorieDatum, type HistorieFeld } from "../common/historie.util";
import { EINTRAG_LIST_INCLUDE, toListItem } from "../eintraege/eintrag.mapper";
import {
  UEBERGABE_INCLUDE,
  toUebergabeDetail,
  toUebergabeListItem,
  type UebergabePayload,
} from "./uebergabe.mapper";
import { GeneriereUebergabeDto } from "./dto/generiere-uebergabe.dto";
import { GeneriereUebergabenMehrereDto } from "./dto/generiere-uebergaben-mehrere.dto";
import { UpdateUebergabeDto } from "./dto/update-uebergabe.dto";
import { UebergebenDto } from "./dto/uebergeben.dto";
import { ListUebergabenQueryDto } from "./dto/list-uebergaben.query.dto";

@Injectable()
export class UebergabenService {
  constructor(private readonly prisma: PrismaService) {}

  private gewerkVisibilityWhere(user: AuthenticatedUser): Prisma.SchichtuebergabeWhereInput {
    if (user.gewerkeSichtbarkeit.length === 0) return {};
    return { gewerk: { name: { in: user.gewerkeSichtbarkeit } } };
  }

  private assertGewerkVisible(user: AuthenticatedUser, gewerkName: string): void {
    if (user.gewerkeSichtbarkeit.length > 0 && !user.gewerkeSichtbarkeit.includes(gewerkName)) {
      throw new NotFoundException("Übergabe nicht gefunden.");
    }
  }

  async list(user: AuthenticatedUser, query: ListUebergabenQueryDto) {
    const where: Prisma.SchichtuebergabeWhereInput = {
      ...this.gewerkVisibilityWhere(user),
      ...(query.datum ? { datum: new Date(query.datum) } : {}),
      ...(query.schichtId ? { schichtId: query.schichtId } : {}),
      ...(query.gewerkId ? { gewerkId: query.gewerkId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const uebergaben = await this.prisma.schichtuebergabe.findMany({
      where,
      include: UEBERGABE_INCLUDE,
      orderBy: [{ datum: "desc" }, { schicht: { name: "asc" } }, { gewerk: { name: "asc" } }],
    });
    return Promise.all(
      uebergaben.map(async (u) => toUebergabeListItem(u, await this.kennzahlen(u))),
    );
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const uebergabe = await this.load(user, id);
    const { offene, laufende, abgeschlossen } = await this.eintraege(uebergabe);
    return toUebergabeDetail(uebergabe, offene, laufende, abgeschlossen);
  }

  /** Erzeugt (oder liefert) die Übergabe für Tag/Schicht/Gewerk idempotent. */
  async generieren(user: AuthenticatedUser, dto: GeneriereUebergabeDto) {
    this.assertGewerkVisibleById(user, dto.gewerkId);
    const datum = new Date(dto.datum);
    const uebergabe = await this.prisma.schichtuebergabe.upsert({
      where: {
        datum_schichtId_gewerkId: { datum, schichtId: dto.schichtId, gewerkId: dto.gewerkId },
      },
      create: { datum, schichtId: dto.schichtId, gewerkId: dto.gewerkId },
      update: {},
      include: UEBERGABE_INCLUDE,
    });
    return this.findOne(user, uebergabe.id);
  }

  /**
   * Sammel-Erzeugung: leere schichtId/gewerkId werden zu "Alle" expandiert
   * (alle aktiven Schichten des Tages bzw. alle für den Nutzer sichtbaren
   * Gewerke). Jede Kombination wird idempotent per upsert erzeugt.
   */
  async generierenMehrere(user: AuthenticatedUser, dto: GeneriereUebergabenMehrereDto) {
    const datum = new Date(dto.datum);

    const schichtIds = dto.schichtId
      ? [dto.schichtId]
      : (
          await this.prisma.schichtDefinition.findMany({
            where: { deletedAt: null, aktiv: true },
            select: { id: true },
          })
        ).map((s) => s.id);

    let gewerkIds: string[];
    if (dto.gewerkId) {
      await this.assertGewerkVisibleById(user, dto.gewerkId);
      gewerkIds = [dto.gewerkId];
    } else {
      const gewerke = await this.prisma.gewerk.findMany({
        where: {
          deletedAt: null,
          aktiv: true,
          ...(user.gewerkeSichtbarkeit.length > 0
            ? { name: { in: user.gewerkeSichtbarkeit } }
            : {}),
        },
        select: { id: true },
      });
      gewerkIds = gewerke.map((g) => g.id);
    }

    const ids: string[] = [];
    for (const schichtId of schichtIds) {
      for (const gewerkId of gewerkIds) {
        const uebergabe = await this.prisma.schichtuebergabe.upsert({
          where: { datum_schichtId_gewerkId: { datum, schichtId, gewerkId } },
          create: { datum, schichtId, gewerkId },
          update: {},
          select: { id: true },
        });
        ids.push(uebergabe.id);
      }
    }

    const uebergaben = await this.prisma.schichtuebergabe.findMany({
      where: { id: { in: ids } },
      include: UEBERGABE_INCLUDE,
      orderBy: [{ schicht: { name: "asc" } }, { gewerk: { name: "asc" } }],
    });
    return {
      uebergaben: await Promise.all(
        uebergaben.map(async (u) => toUebergabeListItem(u, await this.kennzahlen(u))),
      ),
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateUebergabeDto) {
    const uebergabe = await this.load(user, id);
    this.assertEntwurf(uebergabe);
    const data: Prisma.SchichtuebergabeUpdateInput = {};
    for (const feld of [
      "besondereHinweise",
      "sicherheitshinweise",
      "freischaltungen",
      "arbeitsgenehmigungen",
      "wichtigeTermine",
    ] as const) {
      if (dto[feld] !== undefined) data[feld] = dto[feld] || null;
    }
    await this.prisma.schichtuebergabe.update({ where: { id }, data });
    return this.findOne(user, id);
  }

  async uebergeben(user: AuthenticatedUser, id: string, dto: UebergebenDto) {
    const uebergabe = await this.load(user, id);
    this.assertEntwurf(uebergabe);
    await this.prisma.schichtuebergabe.update({
      where: { id },
      data: {
        status: UebergabeStatus.UEBERGEBEN,
        uebergebenVon: { connect: { id: user.id } },
        uebergebenAm: new Date(),
        uebernommenVon: dto.uebernommenVonId
          ? { connect: { id: dto.uebernommenVonId } }
          : undefined,
      },
    });
    return this.findOne(user, id);
  }

  /** Lädt die Übergabe inkl. abgeleiteter Eintragslisten (für PDF/Detail). */
  async loadDetail(user: AuthenticatedUser, id: string) {
    return this.findOne(user, id);
  }

  /** Änderungsverlauf (wer hat wann erstellt/geändert/übergeben) aus dem Audit-Log. */
  async historie(user: AuthenticatedUser, id: string) {
    await this.load(user, id);
    const logs = await this.prisma.auditLog.findMany({
      where: { entity: "Schichtuebergabe", entityId: id },
      orderBy: { createdAt: "desc" },
    });
    return baueHistorie(logs, UEBERGABE_HISTORIE_FELDER);
  }

  /**
   * Löscht eine Schichtübergabe endgültig. Die abgeleiteten Eintragslisten
   * werden nicht persistiert, daher hat das Löschen keine Auswirkung auf die
   * zugrunde liegenden Schichtbucheinträge – nur das Übergabe-Dokument selbst
   * (Freitextfelder, Status, Unterschriften) wird entfernt.
   */
  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    await this.load(user, id);
    await this.prisma.schichtuebergabe.delete({ where: { id } });
  }

  // --- Helfer ---

  private async load(user: AuthenticatedUser, id: string): Promise<UebergabePayload> {
    const uebergabe = await this.prisma.schichtuebergabe.findUnique({
      where: { id },
      include: UEBERGABE_INCLUDE,
    });
    if (!uebergabe) throw new NotFoundException("Übergabe nicht gefunden.");
    this.assertGewerkVisible(user, uebergabe.gewerk.name);
    return uebergabe;
  }

  private assertEntwurf(uebergabe: UebergabePayload): void {
    if (uebergabe.status === UebergabeStatus.UEBERGEBEN) {
      throw new ConflictException("Übergebene Schichtübergaben können nicht mehr geändert werden.");
    }
  }

  private async assertGewerkVisibleById(user: AuthenticatedUser, gewerkId: string): Promise<void> {
    if (user.gewerkeSichtbarkeit.length === 0) return;
    const gewerk = await this.prisma.gewerk.findUnique({
      where: { id: gewerkId },
      select: { name: true },
    });
    if (!gewerk || !user.gewerkeSichtbarkeit.includes(gewerk.name)) {
      throw new NotFoundException("Gewerk nicht sichtbar.");
    }
  }

  private async eintraege(uebergabe: UebergabePayload) {
    const { start, end } = dayRange(uebergabe.datum);
    const eintraege = await this.prisma.schichtbucheintrag.findMany({
      where: {
        deletedAt: null,
        schichtId: uebergabe.schichtId,
        gewerkId: uebergabe.gewerkId,
        zeitpunkt: { gte: start, lt: end },
        // Alle relevanten Status: offen/laufend werden übernommen, erledigt/
        // verschoben zur Dokumentation mitgeführt (dürfen nicht "wegfallen").
        status: {
          in: [
            EintragStatus.OFFEN,
            EintragStatus.IN_BEARBEITUNG,
            EintragStatus.ERLEDIGT,
            EintragStatus.VERSCHOBEN,
          ],
        },
      },
      include: EINTRAG_LIST_INCLUDE,
      orderBy: [{ prioritaet: "desc" }, { zeitpunkt: "asc" }],
    });
    const list = eintraege.map((e) => toListItem(e));
    return {
      offene: list.filter((e) => e.status === EintragStatus.OFFEN),
      laufende: list.filter((e) => e.status === EintragStatus.IN_BEARBEITUNG),
      abgeschlossen: list.filter(
        (e) => e.status === EintragStatus.ERLEDIGT || e.status === EintragStatus.VERSCHOBEN,
      ),
    };
  }

  private async kennzahlen(uebergabe: UebergabePayload) {
    const { start, end } = dayRange(uebergabe.datum);
    const where: Prisma.SchichtbucheintragWhereInput = {
      deletedAt: null,
      schichtId: uebergabe.schichtId,
      gewerkId: uebergabe.gewerkId,
      zeitpunkt: { gte: start, lt: end },
    };
    const [offeneStoerungen, laufendeArbeiten, abgeschlosseneEintraege] = await Promise.all([
      this.prisma.schichtbucheintrag.count({ where: { ...where, status: EintragStatus.OFFEN } }),
      this.prisma.schichtbucheintrag.count({
        where: { ...where, status: EintragStatus.IN_BEARBEITUNG },
      }),
      this.prisma.schichtbucheintrag.count({
        where: {
          ...where,
          status: { in: [EintragStatus.ERLEDIGT, EintragStatus.VERSCHOBEN] },
        },
      }),
    ]);
    return { offeneStoerungen, laufendeArbeiten, abgeschlosseneEintraege };
  }
}

function dayRange(datum: Date): { start: Date; end: Date } {
  const start = new Date(datum.getUTCFullYear(), datum.getUTCMonth(), datum.getUTCDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Für die Historie relevante Felder eines Übergabe-Snapshots (before/after). */
interface UebergabeSnapshot {
  status?: string;
  besondereHinweise?: string | null;
  sicherheitshinweise?: string | null;
  freischaltungen?: string | null;
  arbeitsgenehmigungen?: string | null;
  wichtigeTermine?: string | null;
  uebergebenVon?: { name: string } | null;
  uebernommenVon?: { name: string } | null;
  uebergebenAm?: string | null;
}

const UEBERGABE_HISTORIE_FELDER: HistorieFeld<UebergabeSnapshot>[] = [
  {
    feld: "status",
    label: "Status",
    get: (s) =>
      s.status ? (UEBERGABE_STATUS_LABELS[s.status as UebergabeStatus] ?? s.status) : null,
  },
  {
    feld: "sicherheitshinweise",
    label: "Sicherheitsinformationen",
    get: (s) => s.sicherheitshinweise ?? null,
  },
  { feld: "freischaltungen", label: "Freischaltungen", get: (s) => s.freischaltungen ?? null },
  {
    feld: "arbeitsgenehmigungen",
    label: "Arbeitsgenehmigungen",
    get: (s) => s.arbeitsgenehmigungen ?? null,
  },
  { feld: "wichtigeTermine", label: "Wichtige Termine", get: (s) => s.wichtigeTermine ?? null },
  {
    feld: "besondereHinweise",
    label: "Besondere Hinweise",
    get: (s) => s.besondereHinweise ?? null,
  },
  { feld: "uebergebenVon", label: "Übergebende Person", get: (s) => s.uebergebenVon?.name ?? null },
  {
    feld: "uebernommenVon",
    label: "Übernehmende Person",
    get: (s) => s.uebernommenVon?.name ?? null,
  },
  {
    feld: "uebergebenAm",
    label: "Übergeben am",
    get: (s) => formatHistorieDatum(s.uebergebenAm ?? null),
  },
];
