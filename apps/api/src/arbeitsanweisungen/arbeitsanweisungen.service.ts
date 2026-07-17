import { extname } from "node:path";
import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  ANWEISUNG_ANHANG_MAX_GROESSE_BYTES,
  ANWEISUNG_ANHANG_MIME_TYPES,
  type ArbeitsanweisungListItem,
  type ArbeitsanweisungQuittungen,
  type AuthenticatedUser,
} from "@schichtbuch/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import type { UploadedFileLike } from "../anhaenge/anhaenge.service";
import {
  ANWEISUNG_INCLUDE,
  toAnweisungListItem,
  type AnweisungPayload,
} from "./arbeitsanweisungen.mapper";
import { CreateArbeitsanweisungDto } from "./dto/create-arbeitsanweisung.dto";
import { ListArbeitsanweisungenQueryDto } from "./dto/list-arbeitsanweisungen.query.dto";

@Injectable()
export class ArbeitsanweisungenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Sichtbarkeitsfilter: Ist eine Gewerk-Sichtbarkeit gesetzt, sieht der Nutzer
   * nur Anweisungen seiner Gewerke. Leere Sichtbarkeit = alle (z.B. Administrator).
   */
  private visibleWhere(user: AuthenticatedUser): Prisma.ArbeitsanweisungWhereInput {
    if (user.gewerkeSichtbarkeit.length === 0) return {};
    return { gewerk: { name: { in: user.gewerkeSichtbarkeit } } };
  }

  /**
   * Empfänger einer Anweisung sind Mitarbeiter, die sie lesen/quittieren müssen:
   * aktive Nutzer mit der Berechtigung `anweisungen:read`, die NICHT selbst
   * verwalten (`anweisungen:manage`). Damit werden Meister und Administratoren
   * (Ersteller) nicht als „zu lesen" gezählt.
   */
  private istEmpfaengerNutzer(user: AuthenticatedUser): boolean {
    return (
      user.permissions.includes("anweisungen:read") &&
      !user.permissions.includes("anweisungen:manage")
    );
  }

  /** Aktive Empfänger (Leser, keine Verwalter) eines Gewerks. */
  private async empfaengerFuerGewerk(gewerkId: string): Promise<{ id: string; name: string }[]> {
    const users = await this.prisma.user.findMany({
      where: {
        status: "AKTIV",
        deletedAt: null,
        gewerkeSichtbarkeit: { some: { id: gewerkId } },
      },
      select: {
        id: true,
        name: true,
        roles: {
          select: {
            role: {
              select: { permissions: { select: { permission: { select: { key: true } } } } },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return users
      .filter((u) => {
        const keys = new Set(
          u.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key)),
        );
        return keys.has("anweisungen:read") && !keys.has("anweisungen:manage");
      })
      .map((u) => ({ id: u.id, name: u.name }));
  }

  /** Anzahl der Empfänger je Gewerk (für die Kennzahl „X von Y gelesen"). */
  private async empfaengerAnzahlProGewerk(gewerkIds: string[]): Promise<Map<string, number>> {
    const eindeutig = [...new Set(gewerkIds)];
    const paare = await Promise.all(
      eindeutig.map(async (gewerkId) => {
        const empfaenger = await this.empfaengerFuerGewerk(gewerkId);
        return [gewerkId, empfaenger.length] as const;
      }),
    );
    return new Map(paare);
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateArbeitsanweisungDto,
    file: UploadedFileLike | undefined,
  ): Promise<ArbeitsanweisungListItem> {
    const text = dto.text?.trim() || null;
    if (!text && !file) {
      throw new BadRequestException("Es muss ein Text oder ein Anhang angegeben werden.");
    }

    const gewerk = await this.prisma.gewerk.findFirst({
      where: { id: dto.gewerkId, deletedAt: null },
      select: { id: true },
    });
    if (!gewerk) throw new BadRequestException("Gewerk nicht gefunden.");

    if (dto.fachbereichId) {
      const fachbereich = await this.prisma.fachbereich.findFirst({
        where: { id: dto.fachbereichId, deletedAt: null },
        select: { id: true },
      });
      if (!fachbereich) throw new BadRequestException("Fachbereich nicht gefunden.");
    }

    if (dto.schichtId) {
      const schicht = await this.prisma.schichtDefinition.findFirst({
        where: { id: dto.schichtId, deletedAt: null },
        select: { id: true },
      });
      if (!schicht) throw new BadRequestException("Schicht nicht gefunden.");
    }

    let anhang: { objectKey: string; dateiname: string; mime: string; groesse: number } | null =
      null;
    if (file) {
      if (!ANWEISUNG_ANHANG_MIME_TYPES.includes(file.mimetype as never)) {
        throw new UnsupportedMediaTypeException(
          `Dateityp nicht erlaubt (nur Foto/PDF): ${file.mimetype}`,
        );
      }
      if (file.size > ANWEISUNG_ANHANG_MAX_GROESSE_BYTES) {
        throw new PayloadTooLargeException(
          `Datei zu groß (max. ${Math.floor(ANWEISUNG_ANHANG_MAX_GROESSE_BYTES / (1024 * 1024))} MB).`,
        );
      }
      const objectKey = `anweisungen/${dto.gewerkId}/${randomUUID()}${extname(file.originalname)}`;
      await this.storage.putObject(objectKey, file.buffer, file.size, file.mimetype);
      anhang = {
        objectKey,
        dateiname: file.originalname,
        mime: file.mimetype,
        groesse: file.size,
      };
    }

    try {
      const anweisung = await this.prisma.arbeitsanweisung.create({
        data: {
          titel: dto.titel,
          text,
          gewerk: { connect: { id: dto.gewerkId } },
          fachbereich: dto.fachbereichId ? { connect: { id: dto.fachbereichId } } : undefined,
          schicht: dto.schichtId ? { connect: { id: dto.schichtId } } : undefined,
          ersteller: { connect: { id: user.id } },
          anhangObjectKey: anhang?.objectKey ?? null,
          anhangDateiname: anhang?.dateiname ?? null,
          anhangMime: anhang?.mime ?? null,
          anhangGroesse: anhang?.groesse ?? null,
        },
        include: ANWEISUNG_INCLUDE,
      });
      const empfaenger = await this.empfaengerAnzahlProGewerk([anweisung.gewerkId]);
      return toAnweisungListItem(anweisung, null, empfaenger.get(anweisung.gewerkId) ?? 0, 0);
    } catch (error) {
      if (anhang) await this.storage.removeObject(anhang.objectKey).catch(() => undefined);
      throw error;
    }
  }

  /** Alle für den Nutzer sichtbaren Anweisungen inkl. eigenem Lesestatus (mit Filter/Suche). */
  async listForUser(
    user: AuthenticatedUser,
    filter: ListArbeitsanweisungenQueryDto = {},
  ): Promise<ArbeitsanweisungListItem[]> {
    const where: Prisma.ArbeitsanweisungWhereInput = { ...this.visibleWhere(user) };
    if (filter.gewerkId) where.gewerkId = filter.gewerkId;
    if (filter.fachbereichId) where.fachbereichId = filter.fachbereichId;
    if (filter.schichtId) where.schichtId = filter.schichtId;

    const q = filter.q?.trim();
    if (q) {
      const contains = { contains: q, mode: "insensitive" as const };
      where.OR = [
        { titel: contains },
        { text: contains },
        { ersteller: { name: contains } },
        { gewerk: { name: contains } },
        { fachbereich: { name: contains } },
        { schicht: { name: contains } },
      ];
    }
    // Lesestatus-Filter (nur Anweisungen mit/ohne Quittung des Nutzers).
    if (filter.gelesen === true) {
      where.quittungen = { some: { userId: user.id } };
    } else if (filter.gelesen === false) {
      where.quittungen = { none: { userId: user.id } };
    }

    const anweisungen = await this.prisma.arbeitsanweisung.findMany({
      where,
      include: {
        ...ANWEISUNG_INCLUDE,
        quittungen: { where: { userId: user.id }, select: { gelesenAm: true } },
        _count: { select: { quittungen: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const empfaenger = await this.empfaengerAnzahlProGewerk(anweisungen.map((a) => a.gewerkId));
    return anweisungen.map((a) =>
      toAnweisungListItem(
        a,
        a.quittungen[0]?.gelesenAm ?? null,
        empfaenger.get(a.gewerkId) ?? 0,
        a._count.quittungen,
      ),
    );
  }

  /**
   * Ungelesene Anweisungen für das Anmelde-Popup: nur für echte Empfänger
   * (Leseberechtigte ohne Verwaltungsrecht) und nur noch nicht quittierte.
   */
  async ungelesenForUser(user: AuthenticatedUser): Promise<ArbeitsanweisungListItem[]> {
    // Nur echte Empfänger (Leser ohne Verwaltungsrecht) und nur mit konfigurierten
    // Gewerken erhalten Popup-Benachrichtigungen.
    if (!this.istEmpfaengerNutzer(user) || user.gewerkeSichtbarkeit.length === 0) return [];
    return this.listForUser(user, { gelesen: false });
  }

  /** Quittiert eine Anweisung als gelesen (idempotent). */
  async quittieren(user: AuthenticatedUser, id: string): Promise<ArbeitsanweisungListItem> {
    await this.findVisibleOrThrow(user, id);
    await this.prisma.arbeitsanweisungQuittung.upsert({
      where: { arbeitsanweisungId_userId: { arbeitsanweisungId: id, userId: user.id } },
      create: { arbeitsanweisung: { connect: { id } }, user: { connect: { id: user.id } } },
      update: {},
    });
    return this.findOne(user, id);
  }

  /** Einzelne Anweisung inkl. eigenem Lesestatus. */
  async findOne(user: AuthenticatedUser, id: string): Promise<ArbeitsanweisungListItem> {
    const anweisung = await this.prisma.arbeitsanweisung.findFirst({
      where: { id, ...this.visibleWhere(user) },
      include: {
        ...ANWEISUNG_INCLUDE,
        quittungen: { where: { userId: user.id }, select: { gelesenAm: true } },
        _count: { select: { quittungen: true } },
      },
    });
    if (!anweisung) throw new NotFoundException("Arbeitsanweisung nicht gefunden.");
    const empfaenger = await this.empfaengerAnzahlProGewerk([anweisung.gewerkId]);
    return toAnweisungListItem(
      anweisung,
      anweisung.quittungen[0]?.gelesenAm ?? null,
      empfaenger.get(anweisung.gewerkId) ?? 0,
      anweisung._count.quittungen,
    );
  }

  /**
   * Lesestatus-Auswertung für Meister: alle aktiven Empfänger des Gewerks mit
   * ihrem Quittungs-Status (gelesen/ungelesen) plus Kennzahlen.
   */
  async quittungen(user: AuthenticatedUser, id: string): Promise<ArbeitsanweisungQuittungen> {
    const anweisung = await this.findVisibleOrThrow(user, id);
    const empfaenger = await this.empfaengerFuerGewerk(anweisung.gewerkId);
    const quittungen = await this.prisma.arbeitsanweisungQuittung.findMany({
      where: { arbeitsanweisungId: id },
      select: { userId: true, gelesenAm: true },
    });
    const gelesenMap = new Map(quittungen.map((q) => [q.userId, q.gelesenAm]));

    const status = empfaenger.map((e) => {
      const gelesenAm = gelesenMap.get(e.id) ?? null;
      return {
        user: { id: e.id, name: e.name },
        gelesen: gelesenAm !== null,
        gelesenAm: gelesenAm ? gelesenAm.toISOString() : null,
      };
    });
    const anzahlGelesen = status.filter((s) => s.gelesen).length;
    return { anzahlEmpfaenger: status.length, anzahlGelesen, empfaenger: status };
  }

  /** Anhang-Stream (RBAC-/Sichtbarkeits-geprüft). */
  async getAnhang(
    user: AuthenticatedUser,
    id: string,
  ): Promise<{
    dateiname: string;
    mime: string;
    groesse: number;
    stream: NodeJS.ReadableStream;
  }> {
    const anweisung = await this.findVisibleOrThrow(user, id);
    if (!anweisung.anhangObjectKey) {
      throw new NotFoundException("Diese Anweisung hat keinen Anhang.");
    }
    const stream = await this.storage.getObjectStream(anweisung.anhangObjectKey);
    return {
      dateiname: anweisung.anhangDateiname ?? "Anhang",
      mime: anweisung.anhangMime ?? "application/octet-stream",
      groesse: anweisung.anhangGroesse ?? 0,
      stream,
    };
  }

  /** Löscht eine Anweisung (inkl. Quittungen via Cascade) und ihren Anhang. */
  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const anweisung = await this.findVisibleOrThrow(user, id);
    await this.prisma.arbeitsanweisung.delete({ where: { id } });
    if (anweisung.anhangObjectKey) {
      await this.storage.removeObject(anweisung.anhangObjectKey).catch(() => undefined);
    }
  }

  private async findVisibleOrThrow(user: AuthenticatedUser, id: string): Promise<AnweisungPayload> {
    const anweisung = await this.prisma.arbeitsanweisung.findFirst({
      where: { id, ...this.visibleWhere(user) },
      include: ANWEISUNG_INCLUDE,
    });
    if (!anweisung) throw new NotFoundException("Arbeitsanweisung nicht gefunden.");
    return anweisung;
  }
}
