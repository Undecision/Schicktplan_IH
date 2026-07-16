import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "@schichtbuch/shared";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Audited } from "../audit/decorators/audited.decorator";
import { DsgvoService } from "./dsgvo.service";

@ApiTags("dsgvo")
@Controller("admin/dsgvo")
@RequirePermissions("admin:benutzer:manage")
export class DsgvoController {
  constructor(private readonly service: DsgvoService) {}

  @Get(":userId/export")
  export(@Param("userId") userId: string) {
    return this.service.exportPerson(userId);
  }

  @Audited("User")
  @Post(":userId/anonymisieren")
  anonymisieren(@CurrentUser() user: AuthenticatedUser, @Param("userId") userId: string) {
    return this.service.anonymisieren(user, userId);
  }
}
