import { Injectable } from "@nestjs/common";
import type { Fachbereich } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  PrismaDelegateLike,
  StammdatumCrudConfig,
  StammdatumCrudService,
} from "./stammdatum-crud.service";
import { CreateNameStammdatumDto, UpdateNameStammdatumDto } from "./dto/name-stammdatum.dto";

@Injectable()
export class FachbereicheService extends StammdatumCrudService<Fachbereich> {
  protected readonly delegate: PrismaDelegateLike<Fachbereich>;
  protected readonly config: StammdatumCrudConfig = {
    entityName: "Fachbereich",
    uniqueField: "name",
    orderBy: "name",
  };

  constructor(prisma: PrismaService) {
    super();
    this.delegate = prisma.fachbereich as unknown as PrismaDelegateLike<Fachbereich>;
  }

  create(dto: CreateNameStammdatumDto) {
    return this.createRecord({ name: dto.name });
  }

  update(id: string, dto: UpdateNameStammdatumDto) {
    return this.updateRecord(id, { ...dto });
  }
}
