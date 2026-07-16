import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "@schichtbuch/shared";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Audited } from "../audit/decorators/audited.decorator";
import { BerichteService } from "./berichte.service";
import { GeneriereBerichtDto } from "./dto/generiere-bericht.dto";
import { UpdateBerichtDto } from "./dto/update-bericht.dto";
import { ListBerichteQueryDto } from "./dto/list-berichte.query.dto";

@ApiTags("berichte")
@Controller("berichte")
export class BerichteController {
  constructor(private readonly service: BerichteService) {}

  @RequirePermissions("berichte:read")
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListBerichteQueryDto) {
    return this.service.list(user, query);
  }

  @RequirePermissions("berichte:read")
  @Get(":id")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.findOne(user, id);
  }

  @Audited("Schichtbericht")
  @RequirePermissions("berichte:freigeben")
  @Post("generieren")
  generieren(@CurrentUser() user: AuthenticatedUser, @Body() dto: GeneriereBerichtDto) {
    return this.service.generieren(user, dto);
  }

  @Audited("Schichtbericht")
  @RequirePermissions("berichte:freigeben")
  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateBerichtDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Audited("Schichtbericht")
  @RequirePermissions("berichte:freigeben")
  @Post(":id/freigeben")
  freigeben(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.freigeben(user, id);
  }
}
