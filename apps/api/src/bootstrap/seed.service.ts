import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppConfig } from "../config/configuration";
import { PrismaService } from "../prisma/prisma.service";
import { PasswordService } from "../auth/password.service";
import { runSeed } from "./seed-data";

/**
 * Führt beim Anwendungsstart einen idempotenten Seed aus, wenn
 * SEED_ON_STARTUP=true gesetzt ist. Ideal für den ersten Container-Start
 * (Rollen/Permissions/Stammdaten/Bootstrap-Admin), ohne ts-node in Produktion.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const seedConfig = this.configService.get("seed", { infer: true });
    if (!seedConfig.onStartup) {
      return;
    }

    this.logger.log("SEED_ON_STARTUP aktiv – führe idempotenten Seed aus…");
    try {
      await runSeed(
        this.prisma,
        (plain) => this.passwordService.hash(plain),
        seedConfig.admin,
        (message) => this.logger.log(message),
      );
      this.logger.log("Seed abgeschlossen.");
    } catch (error) {
      this.logger.error(`Seed fehlgeschlagen: ${(error as Error).message}`);
    }
  }
}
