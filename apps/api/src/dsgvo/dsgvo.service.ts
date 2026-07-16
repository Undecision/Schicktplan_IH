import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { AnonymisierenResult, AuthenticatedUser, PersonExport } from "@schichtbuch/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DsgvoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Auskunft/Export aller personenbezogenen Daten einer Person (Art. 15/20 DSGVO). */
  async exportPerson(userId: string): Promise<PersonExport> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException("Person nicht gefunden.");

    const [eintraege, kommentare, auditEintraege] = await Promise.all([
      this.prisma.schichtbucheintrag.findMany({
        where: { erstellerId: userId },
        select: {
          id: true,
          zeitpunkt: true,
          beschreibung: true,
          status: true,
          gewerk: { select: { name: true } },
        },
        orderBy: { zeitpunkt: "desc" },
      }),
      this.prisma.eintragKommentar.findMany({
        where: { autorId: userId },
        select: { id: true, text: true, createdAt: true, eintragId: true },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.findMany({
        where: { actorId: userId },
        select: { id: true, action: true, entity: true, entityId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
    ]);

    return {
      erzeugtAm: new Date().toISOString(),
      person: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        rollen: user.roles.map((r) => r.role.name),
        createdAt: user.createdAt.toISOString(),
      },
      eintraege: eintraege.map((e) => ({
        id: e.id,
        zeitpunkt: e.zeitpunkt.toISOString(),
        beschreibung: e.beschreibung,
        status: e.status,
        gewerk: e.gewerk.name,
      })),
      kommentare: kommentare.map((k) => ({
        id: k.id,
        text: k.text,
        createdAt: k.createdAt.toISOString(),
        eintragId: k.eintragId,
      })),
      auditEintraege: auditEintraege.map((a) => ({
        id: a.id,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Anonymisiert eine Person (Art. 17 DSGVO): Name/E-Mail werden pseudonymisiert
   * und das Konto deaktiviert. Fachliche Einträge und das revisionssichere
   * Audit-Log bleiben erhalten (Aufbewahrungspflicht), verlieren aber den
   * Personenbezug.
   */
  async anonymisieren(current: AuthenticatedUser, userId: string): Promise<AnonymisierenResult> {
    if (current.id === userId) {
      throw new BadRequestException("Das eigene Konto kann nicht anonymisiert werden.");
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Person nicht gefunden.");

    const kurz = userId.slice(0, 8);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: `Anonymisiert #${kurz}`,
        email: `anonymisiert+${userId}@geloescht.local`,
        status: "DEAKTIVIERT",
        passwordHash: null,
      },
    });
    return { id: userId, anonymisiert: true };
  }
}
