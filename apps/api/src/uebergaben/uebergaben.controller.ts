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
  Res,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import type { AuthenticatedUser } from "@schichtbuch/shared";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Audited } from "../audit/decorators/audited.decorator";
import { UebergabenService } from "./uebergaben.service";
import { PdfService } from "../pdf/pdf.service";
import { renderUebergabeHtml } from "./uebergabe-pdf.template";
import { GeneriereUebergabeDto } from "./dto/generiere-uebergabe.dto";
import { GeneriereUebergabenMehrereDto } from "./dto/generiere-uebergaben-mehrere.dto";
import { UpdateUebergabeDto } from "./dto/update-uebergabe.dto";
import { UebergebenDto } from "./dto/uebergeben.dto";
import { ListUebergabenQueryDto } from "./dto/list-uebergaben.query.dto";

interface AuditableRequest extends Request {
  auditBefore?: unknown;
}

@ApiTags("uebergaben")
@Controller("uebergaben")
export class UebergabenController {
  constructor(
    private readonly service: UebergabenService,
    private readonly pdf: PdfService,
  ) {}

  @RequirePermissions("uebergaben:manage")
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListUebergabenQueryDto) {
    return this.service.list(user, query);
  }

  @RequirePermissions("uebergaben:manage")
  @Get(":id")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.findOne(user, id);
  }

  @RequirePermissions("uebergaben:manage")
  @Get(":id/historie")
  historie(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.historie(user, id);
  }

  @Audited("Schichtuebergabe")
  @RequirePermissions("uebergaben:manage")
  @Post("generieren")
  generieren(@CurrentUser() user: AuthenticatedUser, @Body() dto: GeneriereUebergabeDto) {
    return this.service.generieren(user, dto);
  }

  @Audited("Schichtuebergabe")
  @RequirePermissions("uebergaben:manage")
  @Post("generieren-mehrere")
  generierenMehrere(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GeneriereUebergabenMehrereDto,
  ) {
    return this.service.generierenMehrere(user, dto);
  }

  @Audited("Schichtuebergabe")
  @RequirePermissions("uebergaben:manage")
  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateUebergabeDto,
    @Req() request: AuditableRequest,
  ) {
    request.auditBefore = await this.service.findOne(user, id).catch(() => undefined);
    return this.service.update(user, id, dto);
  }

  @Audited("Schichtuebergabe")
  @RequirePermissions("uebergaben:manage")
  @Post(":id/uebergeben")
  async uebergeben(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UebergebenDto,
    @Req() request: AuditableRequest,
  ) {
    request.auditBefore = await this.service.findOne(user, id).catch(() => undefined);
    return this.service.uebergeben(user, id, dto);
  }

  @Audited("Schichtuebergabe")
  @RequirePermissions("uebergaben:delete")
  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.remove(user, id);
  }

  @RequirePermissions("uebergaben:manage")
  @Get(":id/pdf")
  async pdfExport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Res() res: Response,
  ): Promise<void> {
    const uebergabe = await this.service.findOne(user, id);
    const html = renderUebergabeHtml(uebergabe, "Schichtbuch");
    const pdf = await this.pdf.renderPdf(html);
    const rohName = `Schichtuebergabe_${uebergabe.datum.slice(0, 10)}_${uebergabe.gewerk.name}`;
    const dateiname = `${rohName.replace(/[^\w.-]+/g, "_")}.pdf`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${dateiname}"`,
      "Content-Length": String(pdf.length),
    });
    res.end(pdf);
  }
}
