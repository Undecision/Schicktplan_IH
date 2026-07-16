import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { AppConfig } from "../config/configuration";
import { PrismaService } from "../prisma/prisma.service";

export interface Benachrichtigung {
  betreff: string;
  text: string;
}

/**
 * Benachrichtigungen (P8.5) über E-Mail (SMTP) und Microsoft Teams (eingehender
 * Webhook). Beide Kanäle sind per Config aktivierbar und bei fehlender
 * Konfiguration ein No-Op. Der Versand erfolgt asynchron (fire-and-forget) mit
 * einfachem Retry und blockiert die auslösende Operation nicht.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private mailTransport: Transporter | null = null;

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  /** Auslöser: neuer kritischer Eintrag. Startet den Versand ohne zu blockieren. */
  notifyKritischerEintrag(input: {
    beschreibung: string;
    gewerk: string;
    technischerPlatz: string;
    erstellerName: string;
  }): void {
    const nachricht: Benachrichtigung = {
      betreff: `[Schichtbuch] Kritischer Eintrag – ${input.gewerk}`,
      text:
        `Neuer kritischer Schichtbucheintrag:\n\n` +
        `Beschreibung: ${input.beschreibung}\n` +
        `Gewerk: ${input.gewerk}\n` +
        `Technischer Platz: ${input.technischerPlatz}\n` +
        `Erfasst von: ${input.erstellerName}`,
    };
    void this.dispatch(nachricht);
  }

  /** Versendet über alle aktiven Kanäle mit Retry; Fehler werden nur geloggt. */
  async dispatch(nachricht: Benachrichtigung): Promise<void> {
    await Promise.all([
      this.withRetry("E-Mail", () => this.sendEmail(nachricht)),
      this.withRetry("Teams", () => this.sendTeams(nachricht)),
    ]);
  }

  private async sendEmail(nachricht: Benachrichtigung): Promise<void> {
    const smtp = this.configService.get("smtp", { infer: true });
    if (!smtp.host) return; // nicht konfiguriert → No-Op

    const empfaenger = await this.resolveEmpfaenger();
    if (empfaenger.length === 0) return;

    const transport = this.getMailTransport(smtp);
    await transport.sendMail({
      from: smtp.from || "schichtbuch@example.com",
      to: empfaenger.join(", "),
      subject: nachricht.betreff,
      text: nachricht.text,
    });
    this.logger.log(`E-Mail-Benachrichtigung an ${empfaenger.length} Empfänger versendet.`);
  }

  private async sendTeams(nachricht: Benachrichtigung): Promise<void> {
    const teams = this.configService.get("teams", { infer: true });
    if (!teams.webhookEnabled || !teams.webhookUrl) return; // nicht konfiguriert → No-Op

    const response = await fetch(teams.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: nachricht.betreff, text: nachricht.text }),
    });
    if (!response.ok) {
      throw new Error(`Teams-Webhook HTTP ${response.status}`);
    }
    this.logger.log("Teams-Benachrichtigung versendet.");
  }

  private getMailTransport(smtp: AppConfig["smtp"]): Transporter {
    if (!this.mailTransport) {
      this.mailTransport = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
      });
    }
    return this.mailTransport;
  }

  /** Empfänger = aktive Nutzer mit einer der konfigurierten Rollen (NOTIFY_ROLES). */
  private async resolveEmpfaenger(): Promise<string[]> {
    const rollen = this.configService.get("notify", { infer: true }).roles;
    if (rollen.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: "AKTIV",
        roles: { some: { role: { name: { in: rollen } } } },
      },
      select: { email: true },
    });
    return users.map((u) => u.email).filter(Boolean);
  }

  private async withRetry(kanal: string, fn: () => Promise<void>, versuche = 3): Promise<void> {
    for (let i = 1; i <= versuche; i++) {
      try {
        await fn();
        return;
      } catch (error) {
        const last = i === versuche;
        this.logger.warn(
          `${kanal}-Benachrichtigung Versuch ${i}/${versuche} fehlgeschlagen: ${(error as Error).message}`,
        );
        if (last) return;
        await sleep(500 * 2 ** (i - 1));
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
