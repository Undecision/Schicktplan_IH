import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { Audited } from "../audit/decorators/audited.decorator";
import { FachbereicheService } from "./fachbereiche.service";
import { CreateNameStammdatumDto, UpdateNameStammdatumDto } from "./dto/name-stammdatum.dto";
import { ListStammdatenQueryDto } from "./dto/list-query.dto";

@ApiTags("stammdaten")
@Controller("fachbereiche")
export class FachbereicheController {
  constructor(private readonly service: FachbereicheService) {}

  @Get()
  list(@Query() query: ListStammdatenQueryDto) {
    return this.service.list(query.includeInactive);
  }

  @Audited("Fachbereich")
  @RequirePermissions("admin:stammdaten:manage")
  @Post()
  create(@Body() dto: CreateNameStammdatumDto) {
    return this.service.create(dto);
  }

  @Audited("Fachbereich")
  @RequirePermissions("admin:stammdaten:manage")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateNameStammdatumDto) {
    return this.service.update(id, dto);
  }
}
