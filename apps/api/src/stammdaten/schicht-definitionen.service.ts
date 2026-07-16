import { Injectable } from "@nestjs/common";
import type { SchichtDefinition } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  PrismaDelegateLike,
  StammdatumCrudConfig,
  StammdatumCrudService,
} from "./stammdatum-crud.service";
import {
  CreateSchichtDefinitionDto,
  UpdateSchichtDefinitionDto,
} from "./dto/schicht-definition.dto";

@Injectable()
export class SchichtDefinitionenService extends StammdatumCrudService<SchichtDefinition> {
  protected readonly delegate: PrismaDelegateLike<SchichtDefinition>;
  protected readonly config: StammdatumCrudConfig = {
    entityName: "Schicht-Definition",
    uniqueField: "name",
    orderBy: "startzeit",
  };

  constructor(prisma: PrismaService) {
    super();
    this.delegate = prisma.schichtDefinition as unknown as PrismaDelegateLike<SchichtDefinition>;
  }

  create(dto: CreateSchichtDefinitionDto) {
    return this.createRecord({ ...dto });
  }

  update(id: string, dto: UpdateSchichtDefinitionDto) {
    return this.updateRecord(id, { ...dto });
  }
}
