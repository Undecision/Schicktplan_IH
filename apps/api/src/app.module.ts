import { randomUUID } from "node:crypto";
import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { validateEnv } from "./config/env.schema";
import { buildConfiguration, AppConfig } from "./config/configuration";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageModule } from "./storage/storage.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

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
    PrismaModule,
    StorageModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
