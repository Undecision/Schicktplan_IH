import { Injectable } from "@nestjs/common";
import type { Gewerk } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  PrismaDelegateLike,
  StammdatumCrudConfig,
  StammdatumCrudService,
} from "./stammdatum-crud.service";
import { CreateNameStammdatumDto, UpdateNameStammdatumDto } from "./dto/name-stammdatum.dto";

@Injectable()
export class GewerkeService extends StammdatumCrudService<Gewerk> {
  protected readonly delegate: PrismaDelegateLike<Gewerk>;
  protected readonly config: StammdatumCrudConfig = {
    entityName: "Gewerk",
    uniqueField: "name",
    orderBy: "name",
  };

  constructor(prisma: PrismaService) {
    super();
    this.delegate = prisma.gewerk as unknown as PrismaDelegateLike<Gewerk>;
  }

  create(dto: CreateNameStammdatumDto) {
    return this.createRecord({ name: dto.name });
  }

  update(id: string, dto: UpdateNameStammdatumDto) {
    return this.updateRecord(id, { ...dto });
  }
}
