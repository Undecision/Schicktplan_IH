import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { Audited } from "../audit/decorators/audited.decorator";
import { SchichtDefinitionenService } from "./schicht-definitionen.service";
import {
  CreateSchichtDefinitionDto,
  UpdateSchichtDefinitionDto,
} from "./dto/schicht-definition.dto";
import { ListStammdatenQueryDto } from "./dto/list-query.dto";

@ApiTags("stammdaten")
@Controller("schicht-definitionen")
export class SchichtDefinitionenController {
  constructor(private readonly service: SchichtDefinitionenService) {}

  @Get()
  list(@Query() query: ListStammdatenQueryDto) {
    return this.service.list(query.includeInactive);
  }

  @Audited("SchichtDefinition")
  @RequirePermissions("admin:stammdaten:manage")
  @Post()
  create(@Body() dto: CreateSchichtDefinitionDto) {
    return this.service.create(dto);
  }

  @Audited("SchichtDefinition")
  @RequirePermissions("admin:stammdaten:manage")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateSchichtDefinitionDto) {
    return this.service.update(id, dto);
  }
}
