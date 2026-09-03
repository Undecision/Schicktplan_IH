import { Injectable } from "@nestjs/common";
import {
  SCHICHTBUCH_SPALTEN_STANDARD,
  normalisiereSpaltenReihenfolge,
  type IntegrationLinksConfig,
  type SchichtbuchSpaltenConfig,
} from "@schichtbuch/shared";
import { PrismaService } from "../prisma/prisma.service";

const SPALTEN_KEY = "schichtbuch.spaltenReihenfolge";
const INTEGRATION_KEY = "integration.links";

function trimOderNull(wert: unknown): string | null {
  return typeof wert === "string" && wert.trim() ? wert.trim() : null;
}

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

  async getIntegrationLinks(): Promise<IntegrationLinksConfig> {
    const row = await this.prisma.appEinstellung.findUnique({ where: { key: INTEGRATION_KEY } });
    const wert = (row?.wert ?? null) as Partial<IntegrationLinksConfig> | null;
    return {
      sapUrlTemplate: trimOderNull(wert?.sapUrlTemplate),
      easyFlowUrlTemplate: trimOderNull(wert?.easyFlowUrlTemplate),
    };
  }

  async setIntegrationLinks(config: IntegrationLinksConfig): Promise<IntegrationLinksConfig> {
    const sapUrlTemplate = trimOderNull(config.sapUrlTemplate);
    const easyFlowUrlTemplate = trimOderNull(config.easyFlowUrlTemplate);
    const wert = { sapUrlTemplate, easyFlowUrlTemplate };
    await this.prisma.appEinstellung.upsert({
      where: { key: INTEGRATION_KEY },
      create: { key: INTEGRATION_KEY, wert },
      update: { wert },
    });
    return { sapUrlTemplate, easyFlowUrlTemplate };
  }
}
