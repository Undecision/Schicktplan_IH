import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { Audited } from "../audit/decorators/audited.decorator";
import { RolesService } from "./roles.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@ApiTags("roles")
@Controller("roles")
@RequirePermissions("admin:rollen:manage")
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Audited("Role")
  @Post()
  create(@Body() dto: CreateRoleDto) {
    return this.service.create(dto);
  }

  @Audited("Role")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateRoleDto) {
    return this.service.update(id, dto);
  }

  @Audited("Role")
  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
