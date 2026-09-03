import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EasyFlowTagVorschlag } from "@schichtbuch/shared";
import type { AppConfig } from "../config/configuration";

/**
 * Bildet die JSON-Antwort von EasyFlow auf einen Vorschlag zum Vorbefüllen einer
 * Störung ab. Reine Funktion (ohne Netz/Zustand) – so leicht testbar.
 */
export function mappeEasyFlowTag(tag: string, d: Record<string, unknown>): EasyFlowTagVorschlag {
  const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
  const reactOnRed = (d.reactOnRed ?? {}) as Record<string, unknown>;
  const akto = (d.aktoObject ?? {}) as Record<string, unknown>;
  return {
    tag,
    stoerung: text(d.eventText) ?? text(d.eventTitle),
    ursache: text(reactOnRed.rootCause),
    korrekturmassnahme: text(d.solutionText) ?? text(reactOnRed.correction),
    sapIhAuftrag: text(d.sapOrder),
    datum: text(d.eventDate),
    technischerPlatzCode:
      text(akto.functionalLocation) ?? text(akto.zrepMachine) ?? text(akto.costcentre),
    objektName: text(akto.name),
  };
}

/**
 * „Billige" Lese-Anbindung an EasyFlow: meldet sich server-seitig mit einem
 * Technik-Konto an (POST /api/unauthed/login/basic), merkt sich die Session
 * (Cookies session + session.sig) und liest einen TAG per
 * /api/public/saveTagEvent/getTagEvent/:id. Bei abgelaufener Session
 * (`expiredSession`) wird einmal neu angemeldet und erneut versucht.
 */
@Injectable()
export class EasyFlowService {
  private readonly logger = new Logger(EasyFlowService.name);
  private cookie: string | null = null;
  /** Ablauf der gemerkten Session (ms seit Epoch). */
  private cookieExp = 0;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  private cfg() {
    return this.configService.get("easyflow", { infer: true });
  }

  istKonfiguriert(): boolean {
    const c = this.cfg();
    return Boolean(c.baseUrl && c.username && c.password);
  }

  private basis(): string {
    return this.cfg().baseUrl.replace(/\/+$/, "");
  }

  async holeTag(tag: string): Promise<EasyFlowTagVorschlag> {
    if (!this.istKonfiguriert()) {
      throw new ServiceUnavailableException("EasyFlow-Anbindung ist nicht konfiguriert.");
    }
    if (!/^\d{1,12}$/.test(tag)) {
      throw new BadRequestException("Ungültige EasyFlow-TAG-Nummer.");
    }
    const daten = await this.fetchTag(tag);
    return mappeEasyFlowTag(tag, daten);
  }

  private async login(): Promise<void> {
    const c = this.cfg();
    let res: Response;
    try {
      res = await fetch(`${this.basis()}/api/unauthed/login/basic`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username: c.username, password: c.password }),
      });
    } catch (error) {
      this.logger.error(`EasyFlow nicht erreichbar: ${(error as Error).message}`);
      throw new ServiceUnavailableException("EasyFlow ist nicht erreichbar.");
    }
    if (!res.ok) {
      throw new ServiceUnavailableException("EasyFlow-Anmeldung fehlgeschlagen.");
    }
    const setCookies = (res.headers as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    const paare = setCookies
      .map((eintrag) => eintrag.split(";")[0]?.trim())
      .filter((p): p is string => Boolean(p) && /^(session|session\.sig)=/.test(p));
    if (paare.length === 0) {
      throw new ServiceUnavailableException("EasyFlow lieferte keine Session.");
    }
    this.cookie = paare.join("; ");
    this.cookieExp = this.leseExp(paare) ?? Date.now() + 30 * 60 * 1000;
  }

  /** Liest den `exp`-Zeitstempel aus dem base64-kodierten session-Cookie. */
  private leseExp(paare: string[]): number | null {
    const session = paare.find((p) => p.startsWith("session="));
    if (!session) return null;
    try {
      const b64 = session.slice("session=".length);
      const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as { exp?: number };
      return typeof json.exp === "number" ? json.exp : null;
    } catch {
      return null;
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.cookie && Date.now() < this.cookieExp - 60_000) return;
    await this.login();
  }

  private async fetchTag(tag: string): Promise<Record<string, unknown>> {
    await this.ensureSession();
    let { res, body } = await this.getTagRequest(tag);
    const abgelaufen = (body as { message?: string })?.message === "expiredSession";
    if (abgelaufen || res.status === 401) {
      await this.login();
      ({ res, body } = await this.getTagRequest(tag));
    }
    if (!res.ok || (body as { message?: string })?.message) {
      throw new BadRequestException(`EasyFlow-TAG ${tag} konnte nicht geladen werden.`);
    }
    return body;
  }

  private async getTagRequest(
    tag: string,
  ): Promise<{ res: Response; body: Record<string, unknown> }> {
    const res = await fetch(
      `${this.basis()}/api/public/saveTagEvent/getTagEvent/${encodeURIComponent(tag)}`,
      { headers: { Accept: "application/json", Cookie: this.cookie ?? "" } },
    );
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { res, body };
  }
}
