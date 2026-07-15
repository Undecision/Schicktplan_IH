import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { PrismaHealthIndicator } from "./indicators/prisma.health";
import { MinioHealthIndicator } from "./indicators/minio.health";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, MinioHealthIndicator],
})
export class HealthModule {}
