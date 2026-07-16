import { Controller, Get, Query, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { AUSWERTUNG_TYP_LABELS, type AuthenticatedUser } from "@schichtbuch/shared";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { PdfService } from "../pdf/pdf.service";
import { ReportingService } from "./reporting.service";
import { ReportingExportService } from "./reporting-export.service";
import { renderAuswertungHtml } from "./reporting-pdf.template";
import { AuswertungExportQueryDto, AuswertungQueryDto } from "./dto/auswertung.query.dto";

@ApiTags("reporting")
@Controller("reporting")
export class ReportingController {
  constructor(
    private readonly service: ReportingService,
    private readonly exportService: ReportingExportService,
    private readonly pdf: PdfService,
  ) {}

  @RequirePermissions("berichte:read")
  @Get("auswertung")
  auswertung(@CurrentUser() user: AuthenticatedUser, @Query() query: AuswertungQueryDto) {
    return this.service.auswertung(user, query);
  }

  @RequirePermissions("berichte:read")
  @Get("export")
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AuswertungExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.service.auswertung(user, query);
    const basis = `${AUSWERTUNG_TYP_LABELS[result.typ]}_${result.von}_${result.bis}`.replace(
      /[^\w.-]+/g,
      "_",
    );

    if (query.format === "xlsx") {
      const xlsx = await this.exportService.toXlsx(result);
      res.set({
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${basis}.xlsx"`,
        "Content-Length": String(xlsx.length),
      });
      res.end(xlsx);
      return;
    }

    const pdf = await this.pdf.renderPdf(renderAuswertungHtml(result, "Schichtbuch"));
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${basis}.pdf"`,
      "Content-Length": String(pdf.length),
    });
    res.end(pdf);
  }
}
