import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";
import { PrismaHealthIndicator } from "./indicators/prisma.health";
import { MinioHealthIndicator } from "./indicators/minio.health";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly minioHealth: MinioHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.isHealthy("database"),
      () => this.minioHealth.isHealthy("storage"),
    ]);
  }
}
