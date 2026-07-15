import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Issuer, type Client } from "openid-client";
import type { AppConfig } from "../../config/configuration";

/**
 * OIDC-Adapter-Gerüst für Microsoft Entra ID (P1.3). Per Env aktivierbar
 * (AUTH_OIDC_ENABLED + AUTH_OIDC_ISSUER/CLIENT_ID/CLIENT_SECRET/REDIRECT_URI),
 * im Test deaktiviert (AUTH_OIDC_ENABLED=false).
 *
 * Noch NICHT an einen Controller-Endpunkt angebunden – das Login-Formular
 * nutzt aktuell ausschließlich LocalAuthProvider. Sobald ein Entra-ID-Tenant
 * zur Verfügung steht, ergänzt ein `/auth/oidc/login` (Redirect zu
 * `getAuthorizationUrl()`) und `/auth/oidc/callback` (ruft `handleCallback()`
 * auf) den Login-Flow.
 *
 * User-Provisioning (Platzhalter, noch nicht implementiert): beim ersten
 * OIDC-Login wird per E-Mail-Claim ein bestehender lokaler User gesucht bzw.
 * angelegt; Rollen werden NICHT automatisch aus OIDC-Gruppen-Claims
 * übernommen, sondern bleiben lokal administrierbar (siehe P1.5) – vermeidet
 * unbeabsichtigte Rechteausweitung durch AAD-Gruppenmitgliedschaft.
 */
@Injectable()
export class OidcAuthProvider {
  readonly name = "oidc";
  private readonly logger = new Logger(OidcAuthProvider.name);
  private client: Client | null = null;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  isEnabled(): boolean {
    return this.configService.get("auth", { infer: true }).oidc.enabled;
  }

  private async getClient(): Promise<Client> {
    if (this.client) {
      return this.client;
    }

    const oidcConfig = this.configService.get("auth", { infer: true }).oidc;
    if (!oidcConfig.enabled) {
      throw new Error("OIDC ist deaktiviert (AUTH_OIDC_ENABLED=false).");
    }
    if (!oidcConfig.issuer || !oidcConfig.clientId || !oidcConfig.clientSecret) {
      throw new Error("OIDC ist aktiviert, aber AUTH_OIDC_ISSUER/CLIENT_ID/CLIENT_SECRET fehlen.");
    }

    const issuer = await Issuer.discover(oidcConfig.issuer);
    this.client = new issuer.Client({
      client_id: oidcConfig.clientId,
      client_secret: oidcConfig.clientSecret,
      redirect_uris: [oidcConfig.redirectUri],
      response_types: ["code"],
    });
    return this.client;
  }

  async getAuthorizationUrl(state: string): Promise<string> {
    const client = await this.getClient();
    return client.authorizationUrl({ scope: "openid profile email", state });
  }

  /** Platzhalter – Tausch des Authorization Code gegen Claims (id_token). */
  async handleCallback(callbackParams: Record<string, string>, state: string) {
    const client = await this.getClient();
    const oidcConfig = this.configService.get("auth", { infer: true }).oidc;
    const tokenSet = await client.callback(oidcConfig.redirectUri, callbackParams, { state });
    const claims = tokenSet.claims();
    this.logger.log(`OIDC-Login erfolgreich für Claim-Subject ${claims.sub}`);
    // TODO (nach Tenant-Anbindung): Claims -> lokalen User auflösen/anlegen (siehe Klassenkommentar).
    return claims;
  }
}
