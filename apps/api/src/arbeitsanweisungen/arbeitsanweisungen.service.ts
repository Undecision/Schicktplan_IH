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

  /** Ob der Nutzer ein Empfänger (Teammitglied) des Gewerks der Anweisung ist. */
  private istEmpfaenger(user: AuthenticatedUser, gewerkName: string): boolean {
    return user.gewerkeSichtbarkeit.includes(gewerkName);
  }

  /**
   * Anzahl aktiver Empfänger je Gewerk: aktive Nutzer, in deren Gewerk-
   * Sichtbarkeit das jeweilige Gewerk enthalten ist ("passend zum Gewerk").
   */
  private async empfaengerAnzahlProGewerk(gewerkIds: string[]): Promise<Map<string, number>> {
    const eindeutig = [...new Set(gewerkIds)];
    const paare = await Promise.all(
      eindeutig.map(async (gewerkId) => {
        const anzahl = await this.prisma.user.count({
          where: {
            status: "AKTIV",
            deletedAt: null,
            gewerkeSichtbarkeit: { some: { id: gewerkId } },
          },
        });
        return [gewerkId, anzahl] as const;
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

  /** Alle für den Nutzer sichtbaren Anweisungen inkl. eigenem Lesestatus. */
  async listForUser(user: AuthenticatedUser): Promise<ArbeitsanweisungListItem[]> {
    const anweisungen = await this.prisma.arbeitsanweisung.findMany({
      where: this.visibleWhere(user),
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
   * Ungelesene Anweisungen für das Anmelde-Popup: nur solche, für die der Nutzer
   * Empfänger (Teammitglied des Gewerks) ist und die er noch nicht quittiert hat.
   */
  async ungelesenForUser(user: AuthenticatedUser): Promise<ArbeitsanweisungListItem[]> {
    // Ohne konfigurierte Gewerk-Zugehörigkeit ist der Nutzer kein Empfänger
    // eines bestimmten Gewerks → keine Popup-Benachrichtigungen.
    if (user.gewerkeSichtbarkeit.length === 0) return [];
    const alle = await this.listForUser(user);
    return alle.filter((a) => !a.gelesen && this.istEmpfaenger(user, a.gewerk.name));
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
    const empfaenger = await this.prisma.user.findMany({
      where: {
        status: "AKTIV",
        deletedAt: null,
        gewerkeSichtbarkeit: { some: { id: anweisung.gewerkId } },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
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
