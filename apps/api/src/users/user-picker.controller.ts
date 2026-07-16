import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
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

  @Get("auswahl")
  auswahl() {
    return this.prisma.user.findMany({
      where: { status: "AKTIV", deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }
}
