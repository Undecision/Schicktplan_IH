import type { Readable } from "node:stream";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
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
import { ANWEISUNG_ANHANG_MAX_GROESSE_BYTES, type AuthenticatedUser } from "@schichtbuch/shared";
import {
  RequireAnyPermission,
  RequirePermissions,
} from "../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Audited } from "../audit/decorators/audited.decorator";
import type { UploadedFileLike } from "../anhaenge/anhaenge.service";
import { ArbeitsanweisungenService } from "./arbeitsanweisungen.service";
import { CreateArbeitsanweisungDto } from "./dto/create-arbeitsanweisung.dto";
import { ListArbeitsanweisungenQueryDto } from "./dto/list-arbeitsanweisungen.query.dto";

@ApiTags("arbeitsanweisungen")
@Controller("arbeitsanweisungen")
export class ArbeitsanweisungenController {
  constructor(private readonly service: ArbeitsanweisungenService) {}

  // Ansehen ist für Empfänger (read) UND Ersteller/Meister (manage) möglich.
  @RequireAnyPermission("anweisungen:read", "anweisungen:manage")
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListArbeitsanweisungenQueryDto) {
    return this.service.listForUser(user, query);
  }

  @RequirePermissions("anweisungen:read")
  @Get("ungelesen")
  ungelesen(@CurrentUser() user: AuthenticatedUser) {
    return this.service.ungelesenForUser(user);
  }

  @Audited("Arbeitsanweisung")
  @RequirePermissions("anweisungen:manage")
  @ApiConsumes("multipart/form-data")
  @Post()
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: ANWEISUNG_ANHANG_MAX_GROESSE_BYTES } }),
  )
  create(
    @CurrentUser() user: AuthenticatedUser,
    // Body wird über die globale ValidationPipe geprüft (multipart-Textfelder).
    @Body() body: CreateArbeitsanweisungDto,
    @UploadedFile() file: UploadedFileLike | undefined,
  ) {
    return this.service.create(user, body, file);
  }

  @RequireAnyPermission("anweisungen:read", "anweisungen:manage")
  @Get(":id")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.findOne(user, id);
  }

  @Audited("Arbeitsanweisung")
  @RequirePermissions("anweisungen:read")
  @Post(":id/quittieren")
  quittieren(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.quittieren(user, id);
  }

  @RequirePermissions("anweisungen:manage")
  @Get(":id/quittungen")
  quittungen(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.quittungen(user, id);
  }

  @RequireAnyPermission("anweisungen:read", "anweisungen:manage")
  @Get(":id/anhang")
  async anhang(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { dateiname, mime, groesse, stream } = await this.service.getAnhang(user, id);
    res.set({
      "Content-Type": mime,
      "Content-Length": String(groesse),
      "Content-Disposition": `inline; filename="${sanitizeFilename(dateiname)}"`,
    });
    return new StreamableFile(stream as Readable);
  }

  @Audited("Arbeitsanweisung")
  @RequirePermissions("anweisungen:manage")
  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.remove(user, id);
  }
}

/** Entfernt Zeichen, die den Content-Disposition-Header aufbrechen könnten. */
function sanitizeFilename(name: string): string {
  return name.replace(/["\r\n]/g, "_");
}
