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
  ANHANG_ERLAUBTE_MIME_TYPES,
  ANHANG_MAX_GROESSE_BYTES,
  type Anhang,
  type AuthenticatedUser,
} from "@schichtbuch/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { VirusScanService } from "./virus-scan.service";

/** Von multer bereitgestellte Felder eines Uploads (Teilmenge ohne @types/multer). */
export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const ANHANG_INCLUDE = {
  hochgeladenVon: { select: { id: true, name: true } },
} satisfies Prisma.AnhangInclude;

type AnhangPayload = Prisma.AnhangGetPayload<{ include: typeof ANHANG_INCLUDE }>;

@Injectable()
export class AnhaengeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly virusScan: VirusScanService,
  ) {}

  /**
   * Stellt sicher, dass der Eintrag existiert und für den Nutzer sichtbar ist
   * (Gewerk-Sichtbarkeit als Datenfilter). Wirft 404, sonst still.
   */
  private async assertEintragVisible(user: AuthenticatedUser, eintragId: string): Promise<void> {
    const gewerkFilter: Prisma.SchichtbucheintragWhereInput =
      user.gewerkeSichtbarkeit.length === 0
        ? {}
        : { gewerk: { name: { in: user.gewerkeSichtbarkeit } } };

    const eintrag = await this.prisma.schichtbucheintrag.findFirst({
      where: { id: eintragId, deletedAt: null, ...gewerkFilter },
      select: { id: true },
    });
    if (!eintrag) {
      throw new NotFoundException("Eintrag nicht gefunden.");
    }
  }

  async list(user: AuthenticatedUser, eintragId: string): Promise<Anhang[]> {
    await this.assertEintragVisible(user, eintragId);
    const anhaenge = await this.prisma.anhang.findMany({
      where: { eintragId },
      include: ANHANG_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
    return anhaenge.map(toAnhang);
  }

  async upload(
    user: AuthenticatedUser,
    eintragId: string,
    file: UploadedFileLike | undefined,
  ): Promise<Anhang> {
    await this.assertEintragVisible(user, eintragId);

    if (!file) {
      throw new BadRequestException("Keine Datei übermittelt (Feld 'file').");
    }
    if (!ANHANG_ERLAUBTE_MIME_TYPES.includes(file.mimetype as never)) {
      throw new UnsupportedMediaTypeException(`Dateityp nicht erlaubt: ${file.mimetype}`);
    }
    if (file.size > ANHANG_MAX_GROESSE_BYTES) {
      throw new PayloadTooLargeException(
        `Datei zu groß (max. ${Math.floor(ANHANG_MAX_GROESSE_BYTES / (1024 * 1024))} MB).`,
      );
    }

    // Virenscan-Hook (v1: Platzhalter). Wirft bei Fund und bricht den Upload ab.
    await this.virusScan.scan(file.originalname, file.buffer);

    const objectKey = `eintraege/${eintragId}/${randomUUID()}${extname(file.originalname)}`;
    await this.storage.putObject(objectKey, file.buffer, file.size, file.mimetype);

    try {
      const anhang = await this.prisma.anhang.create({
        data: {
          dateiname: file.originalname,
          mime: file.mimetype,
          groesse: file.size,
          objectKey,
          eintrag: { connect: { id: eintragId } },
          hochgeladenVon: { connect: { id: user.id } },
        },
        include: ANHANG_INCLUDE,
      });
      return toAnhang(anhang);
    } catch (error) {
      // DB-Persistenz fehlgeschlagen → verwaistes Objekt in MinIO aufräumen.
      await this.storage.removeObject(objectKey).catch(() => undefined);
      throw error;
    }
  }

  /** Metadaten + Lese-Stream für den Download (RBAC-/Sichtbarkeits-geprüft). */
  async getDownload(
    user: AuthenticatedUser,
    eintragId: string,
    anhangId: string,
  ): Promise<{ anhang: AnhangPayload; stream: NodeJS.ReadableStream }> {
    const anhang = await this.findOwnedAnhang(user, eintragId, anhangId);
    const stream = await this.storage.getObjectStream(anhang.objectKey);
    return { anhang, stream };
  }

  async remove(user: AuthenticatedUser, eintragId: string, anhangId: string): Promise<void> {
    const anhang = await this.findOwnedAnhang(user, eintragId, anhangId);
    await this.prisma.anhang.delete({ where: { id: anhang.id } });
    // Objekt erst nach erfolgreichem DB-Delete entfernen (kein verwaister Verweis).
    await this.storage.removeObject(anhang.objectKey).catch(() => undefined);
  }

  private async findOwnedAnhang(
    user: AuthenticatedUser,
    eintragId: string,
    anhangId: string,
  ): Promise<AnhangPayload> {
    await this.assertEintragVisible(user, eintragId);
    const anhang = await this.prisma.anhang.findFirst({
      where: { id: anhangId, eintragId },
      include: ANHANG_INCLUDE,
    });
    if (!anhang) {
      throw new NotFoundException("Anhang nicht gefunden.");
    }
    return anhang;
  }
}

function toAnhang(anhang: AnhangPayload): Anhang {
  return {
    id: anhang.id,
    eintragId: anhang.eintragId,
    dateiname: anhang.dateiname,
    mime: anhang.mime,
    groesse: anhang.groesse,
    hochgeladenVon: { id: anhang.hochgeladenVon.id, name: anhang.hochgeladenVon.name },
    createdAt: anhang.createdAt.toISOString(),
  };
}
