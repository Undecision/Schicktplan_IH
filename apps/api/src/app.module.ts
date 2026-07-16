import { randomUUID } from "node:crypto";
import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { validateEnv } from "./config/env.schema";
import { buildConfiguration, AppConfig } from "./config/configuration";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageModule } from "./storage/storage.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { AuditModule } from "./audit/audit.module";
import { AuditInterceptor } from "./audit/audit.interceptor";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { StammdatenModule } from "./stammdaten/stammdaten.module";
import { EintraegeModule } from "./eintraege/eintraege.module";
import { AnhaengeModule } from "./anhaenge/anhaenge.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { BerichteModule } from "./berichte/berichte.module";
import { BootstrapModule } from "./bootstrap/bootstrap.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [() => buildConfiguration(validateEnv(process.env))],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const isProduction = configService.get("nodeEnv", { infer: true }) === "production";
        return {
          pinoHttp: {
            level: configService.get("log", { infer: true }).level,
            genReqId: (req: { headers: Record<string, unknown> }) =>
              (req.headers["x-request-id"] as string) ?? randomUUID(),
            transport: isProduction ? undefined : { target: "pino-pretty" },
            redact: ["req.headers.authorization", "req.headers.cookie"],
          },
        };
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),
    PrismaModule,
    StorageModule,
    AuditModule,
    AuthModule,
    UsersModule,
    StammdatenModule,
    EintraegeModule,
    AnhaengeModule,
    DashboardModule,
    BerichteModule,
    BootstrapModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
