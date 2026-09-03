import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { EintragStatus, EintragTyp, Prioritaet, type AuthenticatedUser } from "@schichtbuch/shared";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  EINTRAG_DETAIL_INCLUDE,
  EINTRAG_LIST_INCLUDE,
  toDetail,
  toListItem,
} from "./eintrag.mapper";
import { CreateEintragDto } from "./dto/create-eintrag.dto";
import { UpdateEintragDto } from "./dto/update-eintrag.dto";
import { ListEintraegeQueryDto } from "./dto/list-eintraege.query.dto";
import { CreateKommentarDto } from "./dto/create-kommentar.dto";
import { toHistorieEintrag } from "./eintrag-historie.mapper";

@Injectable()
export class EintraegeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Gewerk-Sichtbarkeit als zusätzlicher Datenfilter (keine Mandantentrennung):
   * Ist für den Nutzer eine Sichtbarkeit konfiguriert, werden nur Einträge der
   * zugewiesenen Gewerke zurückgegeben. Leere Sichtbarkeit = keine Einschränkung
   * (sieht alle Gewerke, z.B. Administrator).
   */
  private gewerkVisibilityWhere(user: AuthenticatedUser): Prisma.SchichtbucheintragWhereInput {
    if (user.gewerkeSichtbarkeit.length === 0) {
      return {};
    }
    return { gewerk: { name: { in: user.gewerkeSichtbarkeit } } };
  }

  async list(user: AuthenticatedUser, query: ListEintraegeQueryDto) {
    const where = this.buildWhere(user, query);
    const q = query.q?.trim();

    // Ohne Suchbegriff: reine Filter-Query, chronologisch sortiert.
    if (!q) {
      const eintraege = await this.prisma.schichtbucheintrag.findMany({
        where,
        include: EINTRAG_LIST_INCLUDE,
        orderBy: { zeitpunkt: "desc" },
      });
      return eintraege.map((eintrag) => toListItem(eintrag));
    }

    // Mit Suchbegriff (P5.1): Volltext-Treffer (Beschreibung/SAP/TAG, inkl. Rang
    // + Highlight) UND Teiltreffer in verwandten Namensfeldern (Technischer
    // Platz, Gewerk, Fachbereich, Ersteller, Schicht), damit die Suchzeile auch
    // diese findet. Beides wird per OR kombiniert; Filter/Sichtbarkeit bleiben.
    const treffer = await this.volltextTreffer(q);
    const contains = { contains: q, mode: "insensitive" as const };
    const relatedOr: Prisma.SchichtbucheintragWhereInput[] = [
      { technischerPlatz: { bezeichnung: contains } },
      { technischerPlatz: { code: contains } },
      { gewerk: { name: contains } },
      { fachbereich: { name: contains } },
      { ersteller: { name: contains } },
      { schicht: { name: contains } },
      { sapIhAuftrag: contains },
      { easyFlowTag: contains },
    ];
    const orConditions =
      treffer.ids.length > 0 ? [{ id: { in: treffer.ids } }, ...relatedOr] : relatedOr;

    const eintraege = await this.prisma.schichtbucheintrag.findMany({
      where: { ...where, OR: orConditions },
      include: EINTRAG_LIST_INCLUDE,
    });

    return eintraege
      .map((eintrag) => toListItem(eintrag))
      .map((item) => ({ ...item, highlight: treffer.highlights.get(item.id) ?? null }))
      .sort((a, b) => {
        // Volltext-Treffer nach Rang zuerst, danach chronologisch.
        const rankDiff = (treffer.ranks.get(b.id) ?? 0) - (treffer.ranks.get(a.id) ?? 0);
        if (rankDiff !== 0) return rankDiff;
        return new Date(b.zeitpunkt).getTime() - new Date(a.zeitpunkt).getTime();
      });
  }

  /** Baut den Prisma-Filter aus Query-Parametern inkl. Gewerk-Sichtbarkeit. */
  private buildWhere(
    user: AuthenticatedUser,
    query: ListEintraegeQueryDto,
  ): Prisma.SchichtbucheintragWhereInput {
    const where: Prisma.SchichtbucheintragWhereInput = {
      deletedAt: null,
      ...this.gewerkVisibilityWhere(user),
    };
    if (query.status) where.status = query.status;
    if (query.prioritaet) where.prioritaet = query.prioritaet;
    if (query.gewerkId) where.gewerkId = query.gewerkId;
    if (query.fachbereichId) where.fachbereichId = query.fachbereichId;
    if (query.schichtId) where.schichtId = query.schichtId;
    if (query.technischerPlatzId) where.technischerPlatzId = query.technischerPlatzId;
    if (query.erstellerId) where.erstellerId = query.erstellerId;
    if (query.sapIhAuftrag) {
      where.sapIhAuftrag = { contains: query.sapIhAuftrag, mode: "insensitive" };
    }
    if (query.easyFlowTag) {
      where.easyFlowTag = { contains: query.easyFlowTag, mode: "insensitive" };
    }
    if (query.von || query.bis) {
      where.zeitpunkt = {
        ...(query.von ? { gte: new Date(query.von) } : {}),
        ...(query.bis ? { lte: bisGrenze(query.bis) } : {}),
      };
    }
    return where;
  }

  /**
   * Führt die Postgres-Volltextsuche aus und liefert Treffer-IDs, ihren Rang und
   * den hervorgehobenen Auszug. `websearch_to_tsquery` verarbeitet die
   * Nutzereingabe tolerant (Phrasen in Anführungszeichen, `-` für Ausschluss).
   */
  private async volltextTreffer(
    q: string,
  ): Promise<{ ids: string[]; ranks: Map<string, number>; highlights: Map<string, string> }> {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; rank: number; highlight: string }>
    >(Prisma.sql`
      SELECT "id"::text AS id,
             ts_rank("suchVektor", websearch_to_tsquery('german', ${q})) AS rank,
             ts_headline(
               'german', "beschreibung", websearch_to_tsquery('german', ${q}),
               'StartSel=⟦, StopSel=⟧, MaxFragments=2, MaxWords=18, MinWords=5, ShortWord=2'
             ) AS highlight
      FROM "schichtbucheintraege"
      WHERE "deletedAt" IS NULL
        AND "suchVektor" @@ websearch_to_tsquery('german', ${q})
    `);

    const ranks = new Map<string, number>();
    const highlights = new Map<string, string>();
    for (const row of rows) {
      ranks.set(row.id, Number(row.rank));
      highlights.set(row.id, row.highlight);
    }
    return { ids: rows.map((row) => row.id), ranks, highlights };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const eintrag = await this.prisma.schichtbucheintrag.findFirst({
      where: { id, deletedAt: null, ...this.gewerkVisibilityWhere(user) },
      include: EINTRAG_DETAIL_INCLUDE,
    });
    if (!eintrag) {
      throw new NotFoundException("Eintrag nicht gefunden.");
    }
    return toDetail(eintrag);
  }

  async create(user: AuthenticatedUser, dto: CreateEintragDto) {
    const stoerfelder = this.stoerfelder(dto.typ, {
      stoerung: dto.stoerung,
      ursache: dto.ursache,
      korrekturmassnahme: dto.korrekturmassnahme,
    });
    const data: Prisma.SchichtbucheintragCreateInput = {
      typ: dto.typ,
      zeitpunkt: new Date(dto.zeitpunkt),
      prioritaet: dto.prioritaet,
      status: dto.status,
      // Bei Störungen spiegelt „beschreibung" die Störung, damit Suche/Berichte/
      // Übergabe unverändert weiterarbeiten; sonst die Freitext-Beschreibung.
      beschreibung:
        dto.typ === EintragTyp.STOERUNG ? (dto.stoerung ?? "") : (dto.beschreibung ?? ""),
      stoerung: stoerfelder.stoerung,
      ursache: stoerfelder.ursache,
      korrekturmassnahme: stoerfelder.korrekturmassnahme,
      sapIhAuftrag: dto.sapIhAuftrag || null,
      easyFlowTag: dto.easyFlowTag || null,
      faelligkeitsdatum: dto.faelligkeitsdatum ? new Date(dto.faelligkeitsdatum) : null,
      ersteller: { connect: { id: user.id } },
      schicht: { connect: { id: dto.schichtId } },
      gewerk: { connect: { id: dto.gewerkId } },
      fachbereich: { connect: { id: dto.fachbereichId } },
      technischerPlatz: { connect: { id: dto.technischerPlatzId } },
      verantwortlicher: dto.verantwortlicherId
        ? { connect: { id: dto.verantwortlicherId } }
        : undefined,
      schlagwoerter: dto.schlagwortIds
        ? { connect: dto.schlagwortIds.map((sid) => ({ id: sid })) }
        : undefined,
    };

    const bearbeitung = this.berechneBearbeitung({
      status: dto.status,
      beginnRoh: dto.bearbeitungBeginn,
      endeRoh: dto.bearbeitungEnde,
    });
    data.bearbeitungBeginn = bearbeitung.beginn;
    data.bearbeitungEnde = bearbeitung.ende;

    const eintrag = await this.prisma.schichtbucheintrag.create({
      data,
      include: EINTRAG_DETAIL_INCLUDE,
    });

    // Benachrichtigung bei kritischen Einträgen (P8.5), asynchron/fire-and-forget.
    if (eintrag.prioritaet === Prioritaet.KRITISCH) {
      this.notifications.notifyKritischerEintrag({
        beschreibung: eintrag.beschreibung,
        gewerk: eintrag.gewerk.name,
        technischerPlatz: eintrag.technischerPlatz.bezeichnung,
        erstellerName: eintrag.ersteller.name,
      });
    }

    return toDetail(eintrag);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateEintragDto) {
    const existing = await this.prisma.schichtbucheintrag.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        erstellerId: true,
        status: true,
        typ: true,
        stoerung: true,
        ursache: true,
        korrekturmassnahme: true,
        beschreibung: true,
        bearbeitungBeginn: true,
        bearbeitungEnde: true,
        gewerk: { select: { name: true } },
      },
    });
    if (!existing || !this.isVisible(user, existing.gewerk.name)) {
      throw new NotFoundException("Eintrag nicht gefunden.");
    }

    // „Fremde Einträge bearbeiten" ist als Permission modelliert (über die
    // Rollenverwaltung zuweisbar); ohne sie darf nur der Ersteller bearbeiten.
    const mayEditAll = user.permissions.includes("eintraege:update:fremde");
    if (!mayEditAll && existing.erstellerId !== user.id) {
      throw new ForbiddenException(
        "Nur der Ersteller oder berechtigte Rollen dürfen diesen Eintrag bearbeiten.",
      );
    }

    const data = this.buildUpdateData(dto);
    if (dto.zeitpunkt !== undefined) data.zeitpunkt = new Date(dto.zeitpunkt);
    if (dto.prioritaet !== undefined) data.prioritaet = dto.prioritaet;
    if (dto.status !== undefined) data.status = dto.status;
    // Wird die Meldung erledigt, ist sie abgeschlossen – die „an Folgeschicht"-
    // Markierung wird dann automatisch zurückgesetzt.
    if (dto.status === EintragStatus.ERLEDIGT) {
      data.weitergegeben = false;
      data.weitergegebenAm = null;
    }
    if (dto.schlagwortIds !== undefined) {
      data.schlagwoerter = { set: dto.schlagwortIds.map((sid) => ({ id: sid })) };
    }

    // Typ, Störfelder und die gespiegelte Beschreibung konsistent fortschreiben.
    const effektiverTyp = (dto.typ ?? (existing.typ as EintragTyp)) as EintragTyp;
    if (dto.typ !== undefined) data.typ = dto.typ;
    if (effektiverTyp === EintragTyp.STOERUNG) {
      const stoerung = dto.stoerung ?? existing.stoerung ?? "";
      data.stoerung = stoerung;
      data.ursache = dto.ursache ?? existing.ursache ?? "";
      data.korrekturmassnahme = dto.korrekturmassnahme ?? existing.korrekturmassnahme ?? "";
      data.beschreibung = stoerung;
    } else {
      data.stoerung = null;
      data.ursache = null;
      data.korrekturmassnahme = null;
      if (dto.beschreibung !== undefined) data.beschreibung = dto.beschreibung;
    }

    const bearbeitung = this.berechneBearbeitung({
      status: dto.status ?? (existing.status as EintragStatus),
      vorherStatus: existing.status as EintragStatus,
      beginnRoh: dto.bearbeitungBeginn,
      endeRoh: dto.bearbeitungEnde,
      vorherBeginn: existing.bearbeitungBeginn,
      vorherEnde: existing.bearbeitungEnde,
    });
    data.bearbeitungBeginn = bearbeitung.beginn;
    data.bearbeitungEnde = bearbeitung.ende;

    const eintrag = await this.prisma.schichtbucheintrag.update({
      where: { id },
      data,
      include: EINTRAG_DETAIL_INCLUDE,
    });
    return toDetail(eintrag);
  }

  /**
   * Löscht einen Schichtbucheintrag per Soft-Delete (setzt `deletedAt`), um die
   * Referenzintegrität (Historie, Anhänge, Berichte) zu wahren. Gilt nur für
   * über die Gewerk-Sichtbarkeit erreichbare Einträge; die eigentliche
   * Berechtigung (eintraege:delete) prüft der Controller-Guard.
   */
  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const existing = await this.prisma.schichtbucheintrag.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, gewerk: { select: { name: true } } },
    });
    if (!existing || !this.isVisible(user, existing.gewerk.name)) {
      throw new NotFoundException("Eintrag nicht gefunden.");
    }
    await this.prisma.schichtbucheintrag.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Gibt einen schichtübergreifenden Eintrag an die Folgeschicht weiter: statt
   * eines neuen Eintrags wird derselbe Eintrag weiterbearbeitet. Es wird ein
   * nachvollziehbarer Kommentar hinterlegt (wer/wann) und ein offener Eintrag
   * auf „In Bearbeitung" gesetzt, damit er als laufende Arbeit sichtbar bleibt.
   * Erledigte Einträge können nicht weitergegeben werden.
   */
  async weitergabe(user: AuthenticatedUser, id: string) {
    const existing = await this.prisma.schichtbucheintrag.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true, gewerk: { select: { name: true } } },
    });
    if (!existing || !this.isVisible(user, existing.gewerk.name)) {
      throw new NotFoundException("Eintrag nicht gefunden.");
    }
    if (existing.status === EintragStatus.ERLEDIGT) {
      throw new BadRequestException(
        "Erledigte Meldungen können nicht an die Folgeschicht weitergegeben werden.",
      );
    }
    await this.prisma.eintragKommentar.create({
      data: {
        text: "🔁 An die Folgeschicht zur Weiterbearbeitung übergeben.",
        eintrag: { connect: { id } },
        autor: { connect: { id: user.id } },
      },
    });
    await this.prisma.schichtbucheintrag.update({
      where: { id },
      data: {
        weitergegeben: true,
        weitergegebenAm: new Date(),
        // Offene Meldung als laufend markieren (bleibt schichtübergreifend sichtbar).
        ...(existing.status === EintragStatus.OFFEN
          ? { status: EintragStatus.IN_BEARBEITUNG }
          : {}),
      },
    });
    return this.findOne(user, id);
  }

  /**
   * Bestimmt Bearbeitungsbeginn/-ende aus DTO-Eingaben und Status-Übergängen:
   * Beim Eintritt in IN_BEARBEITUNG wird der Beginn, beim Eintritt in ERLEDIGT
   * das Ende automatisch auf „jetzt" gesetzt – aber nur, wenn das jeweilige Feld
   * (nach Anwendung expliziter DTO-Werte) noch leer ist. Explizite Eingaben haben
   * immer Vorrang. Ein Ende vor dem Beginn wird abgelehnt.
   */
  private berechneBearbeitung(input: {
    status: EintragStatus;
    vorherStatus?: EintragStatus;
    beginnRoh?: string | null;
    endeRoh?: string | null;
    vorherBeginn?: Date | null;
    vorherEnde?: Date | null;
  }): { beginn: Date | null; ende: Date | null } {
    let beginn =
      input.beginnRoh !== undefined
        ? input.beginnRoh
          ? new Date(input.beginnRoh)
          : null
        : (input.vorherBeginn ?? null);
    let ende =
      input.endeRoh !== undefined
        ? input.endeRoh
          ? new Date(input.endeRoh)
          : null
        : (input.vorherEnde ?? null);

    const tratEin = (ziel: EintragStatus) => input.status === ziel && input.vorherStatus !== ziel;

    const jetzt = new Date();
    if (tratEin(EintragStatus.IN_BEARBEITUNG) && !beginn) beginn = jetzt;
    if (tratEin(EintragStatus.ERLEDIGT) && !ende) ende = jetzt;

    if (beginn && ende && ende.getTime() < beginn.getTime()) {
      throw new BadRequestException("Bearbeitungsende darf nicht vor dem Beginn liegen.");
    }
    return { beginn, ende };
  }

  /**
   * Änderungsverlauf eines Eintrags (P6.1) aus dem append-only Audit-Log.
   * Sichtbarkeit wird über findOne erzwungen (wirft 404, falls nicht sichtbar).
   */
  async historie(user: AuthenticatedUser, eintragId: string) {
    await this.findOne(user, eintragId);
    const logs = await this.prisma.auditLog.findMany({
      where: { entity: "Schichtbucheintrag", entityId: eintragId },
      orderBy: { createdAt: "desc" },
    });
    return logs.map(toHistorieEintrag);
  }

  async addKommentar(user: AuthenticatedUser, eintragId: string, dto: CreateKommentarDto) {
    // Sichtbarkeit erzwingen (wirft 404, falls nicht sichtbar).
    await this.findOne(user, eintragId);
    await this.prisma.eintragKommentar.create({
      data: {
        text: dto.text,
        eintrag: { connect: { id: eintragId } },
        autor: { connect: { id: user.id } },
      },
    });
    return this.findOne(user, eintragId);
  }

  /**
   * Liefert die Störfelder abhängig vom Typ: bei STOERUNG die übergebenen Werte,
   * sonst null (Schichtinformationen tragen keine strukturierten Störfelder).
   */
  private stoerfelder(
    typ: EintragTyp,
    werte: { stoerung?: string; ursache?: string; korrekturmassnahme?: string },
  ): { stoerung: string | null; ursache: string | null; korrekturmassnahme: string | null } {
    if (typ !== EintragTyp.STOERUNG) {
      return { stoerung: null, ursache: null, korrekturmassnahme: null };
    }
    return {
      stoerung: werte.stoerung ?? "",
      ursache: werte.ursache ?? "",
      korrekturmassnahme: werte.korrekturmassnahme ?? "",
    };
  }

  private isVisible(user: AuthenticatedUser, gewerkName: string): boolean {
    return user.gewerkeSichtbarkeit.length === 0 || user.gewerkeSichtbarkeit.includes(gewerkName);
  }

  /** Referenz-/Optionalfelder für update (nur gesetzte Felder werden verändert). */
  private buildUpdateData(dto: UpdateEintragDto): Prisma.SchichtbucheintragUpdateInput {
    const data: Prisma.SchichtbucheintragUpdateInput = {};
    if (dto.schichtId !== undefined) data.schicht = { connect: { id: dto.schichtId } };
    if (dto.gewerkId !== undefined) data.gewerk = { connect: { id: dto.gewerkId } };
    if (dto.fachbereichId !== undefined) data.fachbereich = { connect: { id: dto.fachbereichId } };
    if (dto.technischerPlatzId !== undefined) {
      data.technischerPlatz = { connect: { id: dto.technischerPlatzId } };
    }
    if (dto.sapIhAuftrag !== undefined) data.sapIhAuftrag = dto.sapIhAuftrag || null;
    if (dto.easyFlowTag !== undefined) data.easyFlowTag = dto.easyFlowTag || null;
    if (dto.faelligkeitsdatum !== undefined) {
      data.faelligkeitsdatum = dto.faelligkeitsdatum ? new Date(dto.faelligkeitsdatum) : null;
    }
    if (dto.verantwortlicherId !== undefined) {
      data.verantwortlicher = dto.verantwortlicherId
        ? { connect: { id: dto.verantwortlicherId } }
        : { disconnect: true };
    }
    return data;
  }
}

/**
 * Obergrenze für den Zeitraum-Filter. Ist nur ein Datum (YYYY-MM-DD) angegeben,
 * wird das Ende dieses Tages verwendet, damit der Tag inklusiv ist.
 */
function bisGrenze(bis: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(bis)) {
    return new Date(`${bis}T23:59:59.999`);
  }
  return new Date(bis);
}
