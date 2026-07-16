import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { Audited } from "../audit/decorators/audited.decorator";
import { TechnischePlaetzeService } from "./technische-plaetze.service";
import { CreateTechnischerPlatzDto, UpdateTechnischerPlatzDto } from "./dto/technischer-platz.dto";
import { ListStammdatenQueryDto } from "./dto/list-query.dto";

@ApiTags("stammdaten")
@Controller("technische-plaetze")
export class TechnischePlaetzeController {
  constructor(private readonly service: TechnischePlaetzeService) {}

  @Get()
  list(@Query() query: ListStammdatenQueryDto) {
    return this.service.list(query.includeInactive);
  }

  @Audited("TechnischerPlatz")
  @RequirePermissions("admin:stammdaten:manage")
  @Post()
  create(@Body() dto: CreateTechnischerPlatzDto) {
    return this.service.create(dto);
  }

  @Audited("TechnischerPlatz")
  @RequirePermissions("admin:stammdaten:manage")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTechnischerPlatzDto) {
    return this.service.update(id, dto);
  }
}
