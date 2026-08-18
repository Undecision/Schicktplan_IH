import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import type { AuthenticatedUser } from "@schichtbuch/shared";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Audited } from "../audit/decorators/audited.decorator";
import { BerichteService } from "./berichte.service";
import { GeneriereBerichtDto } from "./dto/generiere-bericht.dto";
import { UpdateBerichtDto } from "./dto/update-bericht.dto";
import { ListBerichteQueryDto } from "./dto/list-berichte.query.dto";

interface AuditableRequest extends Request {
  auditBefore?: unknown;
}

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

  @RequirePermissions("berichte:read")
  @Get(":id/historie")
  historie(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.historie(user, id);
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
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateBerichtDto,
    @Req() request: AuditableRequest,
  ) {
    request.auditBefore = await this.service.findOne(user, id).catch(() => undefined);
    return this.service.update(user, id, dto);
  }

  @Audited("Schichtbericht")
  @RequirePermissions("berichte:freigeben")
  @Post(":id/freigeben")
  async freigeben(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() request: AuditableRequest,
  ) {
    request.auditBefore = await this.service.findOne(user, id).catch(() => undefined);
    return this.service.freigeben(user, id);
  }

  @Audited("Schichtbericht")
  @RequirePermissions("berichte:delete")
  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.remove(user, id);
  }
}
