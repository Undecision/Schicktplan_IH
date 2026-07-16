import type { Readable } from "node:stream";
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiConsumes, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { ANHANG_MAX_GROESSE_BYTES, type AuthenticatedUser } from "@schichtbuch/shared";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Audited } from "../audit/decorators/audited.decorator";
import { AnhaengeService, type UploadedFileLike } from "./anhaenge.service";

@ApiTags("anhaenge")
@Controller("eintraege/:eintragId/anhaenge")
export class AnhaengeController {
  constructor(private readonly service: AnhaengeService) {}

  @RequirePermissions("eintraege:read")
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param("eintragId") eintragId: string) {
    return this.service.list(user, eintragId);
  }

  @Audited("Anhang")
  @RequirePermissions("eintraege:attach")
  @ApiConsumes("multipart/form-data")
  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: ANHANG_MAX_GROESSE_BYTES } }))
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eintragId") eintragId: string,
    @UploadedFile() file: UploadedFileLike | undefined,
  ) {
    return this.service.upload(user, eintragId, file);
  }

  @RequirePermissions("eintraege:read")
  @Get(":anhangId")
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eintragId") eintragId: string,
    @Param("anhangId") anhangId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { anhang, stream } = await this.service.getDownload(user, eintragId, anhangId);
    res.set({
      "Content-Type": anhang.mime,
      "Content-Length": String(anhang.groesse),
      // inline: erlaubt Browser-Vorschau (Bilder/PDF); Download erzwingt das
      // Frontend bei Bedarf über das anchor-download-Attribut.
      "Content-Disposition": `inline; filename="${sanitizeFilename(anhang.dateiname)}"`,
    });
    return new StreamableFile(stream as Readable);
  }

  @Audited("Anhang")
  @RequirePermissions("eintraege:attach")
  @Delete(":anhangId")
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("eintragId") eintragId: string,
    @Param("anhangId") anhangId: string,
  ) {
    return this.service.remove(user, eintragId, anhangId);
  }
}

/** Entfernt Zeichen, die den Content-Disposition-Header aufbrechen könnten. */
function sanitizeFilename(name: string): string {
  return name.replace(/["\r\n]/g, "_");
}
