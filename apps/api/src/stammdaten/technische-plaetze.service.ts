import { Injectable } from "@nestjs/common";
import type { TechnischerPlatz } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  PrismaDelegateLike,
  StammdatumCrudConfig,
  StammdatumCrudService,
} from "./stammdatum-crud.service";
import { CreateTechnischerPlatzDto, UpdateTechnischerPlatzDto } from "./dto/technischer-platz.dto";

@Injectable()
export class TechnischePlaetzeService extends StammdatumCrudService<TechnischerPlatz> {
  protected readonly delegate: PrismaDelegateLike<TechnischerPlatz>;
  protected readonly config: StammdatumCrudConfig = {
    entityName: "Technischer Platz",
    uniqueField: "code",
    orderBy: "bezeichnung",
  };

  constructor(prisma: PrismaService) {
    super();
    this.delegate = prisma.technischerPlatz as unknown as PrismaDelegateLike<TechnischerPlatz>;
  }

  create(dto: CreateTechnischerPlatzDto) {
    return this.createRecord({ ...dto });
  }

  update(id: string, dto: UpdateTechnischerPlatzDto) {
    return this.updateRecord(id, { ...dto });
  }
}
