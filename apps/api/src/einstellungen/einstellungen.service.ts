import { Injectable } from "@nestjs/common";
import {
  SCHICHTBUCH_SPALTEN_STANDARD,
  normalisiereSpaltenReihenfolge,
  type SchichtbuchSpaltenConfig,
} from "@schichtbuch/shared";
import { PrismaService } from "../prisma/prisma.service";

const SPALTEN_KEY = "schichtbuch.spaltenReihenfolge";

@Injectable()
export class EinstellungenService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchichtbuchSpalten(): Promise<SchichtbuchSpaltenConfig> {
    const row = await this.prisma.appEinstellung.findUnique({ where: { key: SPALTEN_KEY } });
    const wert = (row?.wert ?? null) as { reihenfolge?: unknown } | null;
    const gespeichert = Array.isArray(wert?.reihenfolge)
      ? (wert.reihenfolge.filter((k): k is string => typeof k === "string") as string[])
      : [];
    return {
      reihenfolge:
        gespeichert.length > 0
          ? normalisiereSpaltenReihenfolge(gespeichert)
          : [...SCHICHTBUCH_SPALTEN_STANDARD],
    };
  }

  async setSchichtbuchSpalten(config: SchichtbuchSpaltenConfig): Promise<SchichtbuchSpaltenConfig> {
    const reihenfolge = normalisiereSpaltenReihenfolge(config.reihenfolge);
    await this.prisma.appEinstellung.upsert({
      where: { key: SPALTEN_KEY },
      create: { key: SPALTEN_KEY, wert: { reihenfolge } },
      update: { wert: { reihenfolge } },
    });
    return { reihenfolge };
  }
}
