import { Injectable } from "@nestjs/common";
import type { Schlagwort } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  PrismaDelegateLike,
  StammdatumCrudConfig,
  StammdatumCrudService,
} from "./stammdatum-crud.service";
import { CreateNameStammdatumDto, UpdateNameStammdatumDto } from "./dto/name-stammdatum.dto";

@Injectable()
export class SchlagwoerterService extends StammdatumCrudService<Schlagwort> {
  protected readonly delegate: PrismaDelegateLike<Schlagwort>;
  protected readonly config: StammdatumCrudConfig = {
    entityName: "Schlagwort",
    uniqueField: "name",
    orderBy: "name",
  };

  constructor(prisma: PrismaService) {
    super();
    this.delegate = prisma.schlagwort as unknown as PrismaDelegateLike<Schlagwort>;
  }

  create(dto: CreateNameStammdatumDto) {
    return this.createRecord({ name: dto.name });
  }

  update(id: string, dto: UpdateNameStammdatumDto) {
    return this.updateRecord(id, { ...dto });
  }
}
