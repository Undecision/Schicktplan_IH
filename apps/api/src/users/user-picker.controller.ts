import { Controller, Get, Query } from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Leichte Benutzer-Auswahlliste (id + name) für Zuweisungs-Picker
 * (z.B. Verantwortlicher am Schichtbucheintrag). Für alle Authentifizierten
 * zugänglich – im Gegensatz zur vollen Benutzerverwaltung (admin:benutzer:manage).
 */
@ApiTags("users")
@Controller("users")
export class UserPickerController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiQuery({ name: "gewerkId", required: false })
  @Get("auswahl")
  auswahl(@Query("gewerkId") gewerkId?: string) {
    return this.prisma.user.findMany({
      where: {
        status: "AKTIV",
        deletedAt: null,
        // Optional auf ein Gewerk einschränken (nur Mitarbeiter dieses Gewerks).
        ...(gewerkId ? { gewerkeSichtbarkeit: { some: { id: gewerkId } } } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }
}
