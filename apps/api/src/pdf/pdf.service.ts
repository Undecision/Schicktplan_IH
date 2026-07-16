import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { chromium, type Browser } from "playwright-core";
import { AppConfig } from "../config/configuration";

/**
 * Serverseitige PDF-Erzeugung via Chromium (playwright-core), Bauplan P8.2.
 * Der Browser wird lazily gestartet und für Folge-Renderings wiederverwendet.
 * Ist kein Chromium verfügbar, wird eine klare 503 statt eines 500 geliefert.
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private browserPromise: Promise<Browser> | null = null;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      const executablePath =
        this.configService.get("pdf", { infer: true }).chromiumPath || undefined;
      this.browserPromise = chromium
        .launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] })
        .catch((error) => {
          this.browserPromise = null;
          throw error;
        });
    }
    return this.browserPromise;
  }

  async renderPdf(html: string): Promise<Buffer> {
    let browser: Browser;
    try {
      browser = await this.getBrowser();
    } catch (error) {
      this.logger.error(`Chromium konnte nicht gestartet werden: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        "PDF-Erzeugung nicht verfügbar (Chromium fehlt oder startet nicht).",
      );
    }

    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "networkidle" });
      const pdf = await page.pdf({ format: "A4", printBackground: true });
      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise) {
      const browser = await this.browserPromise.catch(() => null);
      await browser?.close().catch(() => undefined);
    }
  }
}
