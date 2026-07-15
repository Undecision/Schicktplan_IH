import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { Audited } from "../audit/decorators/audited.decorator";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

interface AuditableRequest extends Request {
  auditBefore?: unknown;
}

@ApiTags("users")
@Controller("users")
@RequirePermissions("admin:benutzer:manage")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.list();
  }

  @Audited("User")
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Audited("User")
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @Req() request: AuditableRequest,
  ) {
    request.auditBefore = await this.usersService.findSummary(id);
    return this.usersService.update(id, dto);
  }

  @Audited("User")
  @Post(":id/deactivate")
  async deactivate(@Param("id") id: string, @Req() request: AuditableRequest) {
    request.auditBefore = await this.usersService.findSummary(id);
    return this.usersService.deactivate(id);
  }

  @Audited("User")
  @Post(":id/reset-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Param("id") id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto);
  }
}
