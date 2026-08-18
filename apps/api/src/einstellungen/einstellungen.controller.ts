import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { Audited } from "../audit/decorators/audited.decorator";
import { EinstellungenService } from "./einstellungen.service";
import { UpdateSchichtbuchSpaltenDto } from "./dto/update-schichtbuch-spalten.dto";

@ApiTags("einstellungen")
@Controller("einstellungen")
export class EinstellungenController {
  constructor(private readonly service: EinstellungenService) {}

  /** Spalten-Reihenfolge lesen – für alle angemeldeten Nutzer (Tabelle rendert danach). */
  @Get("schichtbuch-spalten")
  getSchichtbuchSpalten() {
    return this.service.getSchichtbuchSpalten();
  }

  /** Spalten-Reihenfolge setzen – nur Administration (Stammdaten-Verwaltung). */
  @Audited("AppEinstellung")
  @RequirePermissions("admin:stammdaten:manage")
  @Put("schichtbuch-spalten")
  setSchichtbuchSpalten(@Body() dto: UpdateSchichtbuchSpaltenDto) {
    return this.service.setSchichtbuchSpalten(dto);
  }
}
