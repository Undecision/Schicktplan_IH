import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiConsumes, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { Audited } from "../audit/decorators/audited.decorator";
import type { UploadedFileLike } from "../anhaenge/anhaenge.service";
import { IMPORT_MAX_GROESSE_BYTES, TechnischePlaetzeService } from "./technische-plaetze.service";
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

  @RequirePermissions("admin:stammdaten:manage")
  @Get("import/vorlage")
  async vorlage(@Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const buffer = await this.service.erzeugeVorlage();
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="technische-plaetze-vorlage.xlsx"',
    });
    return new StreamableFile(buffer);
  }

  @Audited("TechnischerPlatz")
  @RequirePermissions("admin:stammdaten:manage")
  @ApiConsumes("multipart/form-data")
  @Post("import")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: IMPORT_MAX_GROESSE_BYTES } }))
  importExcel(@UploadedFile() file: UploadedFileLike | undefined) {
    return this.service.importAusExcel(file);
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
