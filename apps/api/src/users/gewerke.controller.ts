import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Nur lesender Minimal-Endpunkt für die Gewerk-Zuweisung im Benutzerformular
 * (P1.5). Volle CRUD-Verwaltung der Gewerke folgt in Phase 2 (P2.1/P2.2).
 */
@ApiTags("gewerke")
@Controller("gewerke")
export class GewerkeController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermissions("admin:benutzer:manage")
  @Get()
  async list() {
    return this.prisma.gewerk.findMany({
      where: { aktiv: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }
}
