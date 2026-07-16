import { ConflictException, NotFoundException } from "@nestjs/common";

/**
 * Minimaler Ausschnitt eines Prisma-Model-Delegates, den die generische
 * Stammdaten-CRUD-Basis benötigt. Bewusst locker typisiert (`any`-Args), da
 * die konkreten Where/Data-Formen je Modell variieren; die konkreten Services
 * liefern typsichere Wrapper.
 */
export interface PrismaDelegateLike<TModel> {
  findMany(args?: unknown): Promise<TModel[]>;
  findUnique(args: unknown): Promise<TModel | null>;
  findFirst(args: unknown): Promise<TModel | null>;
  create(args: unknown): Promise<TModel>;
  update(args: unknown): Promise<TModel>;
}

export interface StammdatumCrudConfig {
  /** Fachlicher Entitätsname für Fehlermeldungen/Audit (z.B. "Fachbereich"). */
  entityName: string;
  /** Feld für Duplikatprüfung + Sortierung (z.B. "name" oder "code"). */
  uniqueField: string;
  orderBy: string;
}

interface BaseModel {
  id: string;
  aktiv: boolean;
  deletedAt: Date | null;
}

/**
 * Gemeinsame CRUD-Logik aller Stammdaten (P2.1/P2.2):
 * - Liste (optional inkl. inaktiver), sortiert
 * - Anlegen mit Duplikatprüfung
 * - Bearbeiten (inkl. aktiv-Toggle = "Deaktivieren statt Löschen")
 * - Kein Hard-Delete (Referenzintegrität); deletedAt bleibt für spätere
 *   DSGVO-/Bereinigungs-Jobs reserviert.
 */
export abstract class StammdatumCrudService<TModel extends BaseModel> {
  protected abstract readonly delegate: PrismaDelegateLike<TModel>;
  protected abstract readonly config: StammdatumCrudConfig;

  list(includeInactive = false): Promise<TModel[]> {
    return this.delegate.findMany({
      where: { deletedAt: null, ...(includeInactive ? {} : { aktiv: true }) },
      orderBy: { [this.config.orderBy]: "asc" },
    });
  }

  async findById(id: string): Promise<TModel> {
    const entity = await this.delegate.findUnique({ where: { id } });
    if (!entity || entity.deletedAt) {
      throw new NotFoundException(`${this.config.entityName} nicht gefunden.`);
    }
    return entity;
  }

  protected async ensureUnique(value: string, exceptId?: string): Promise<void> {
    const existing = await this.delegate.findFirst({
      where: { [this.config.uniqueField]: value, deletedAt: null },
    });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(
        `${this.config.entityName} mit ${this.config.uniqueField} "${value}" existiert bereits.`,
      );
    }
  }

  protected async createRecord(data: Record<string, unknown>): Promise<TModel> {
    const uniqueValue = data[this.config.uniqueField];
    if (typeof uniqueValue === "string") {
      await this.ensureUnique(uniqueValue);
    }
    return this.delegate.create({ data });
  }

  protected async updateRecord(id: string, data: Record<string, unknown>): Promise<TModel> {
    await this.findById(id);
    const uniqueValue = data[this.config.uniqueField];
    if (typeof uniqueValue === "string") {
      await this.ensureUnique(uniqueValue, id);
    }
    return this.delegate.update({ where: { id }, data });
  }
}
