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
import { EintraegeService } from "./eintraege.service";
import { CreateEintragDto } from "./dto/create-eintrag.dto";
import { UpdateEintragDto } from "./dto/update-eintrag.dto";
import { ListEintraegeQueryDto } from "./dto/list-eintraege.query.dto";
import { CreateKommentarDto } from "./dto/create-kommentar.dto";

interface AuditableRequest extends Request {
  auditBefore?: unknown;
}

@ApiTags("eintraege")
@Controller("eintraege")
export class EintraegeController {
  constructor(private readonly service: EintraegeService) {}

  @RequirePermissions("eintraege:read")
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListEintraegeQueryDto) {
    return this.service.list(user, query);
  }

  @RequirePermissions("eintraege:read")
  @Get(":id")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.findOne(user, id);
  }

  @RequirePermissions("eintraege:read")
  @Get(":id/historie")
  historie(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.historie(user, id);
  }

  @Audited("Schichtbucheintrag")
  @RequirePermissions("eintraege:create")
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEintragDto) {
    return this.service.create(user, dto);
  }

  @Audited("Schichtbucheintrag")
  @RequirePermissions("eintraege:update")
  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateEintragDto,
    @Req() request: AuditableRequest,
  ) {
    request.auditBefore = await this.service.findOne(user, id).catch(() => undefined);
    return this.service.update(user, id, dto);
  }

  @Audited("EintragKommentar")
  @RequirePermissions("eintraege:comment")
  @Post(":id/kommentare")
  addKommentar(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateKommentarDto,
  ) {
    return this.service.addKommentar(user, id, dto);
  }

  @Audited("Schichtbucheintrag")
  @RequirePermissions("eintraege:delete")
  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.remove(user, id);
  }
}
