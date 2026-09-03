import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { EasyFlowService } from "./easyflow.service";

@ApiTags("integration")
@Controller("integration")
export class IntegrationController {
  constructor(private readonly easyflow: EasyFlowService) {}

  /**
   * Liest einen EasyFlow-TAG server-seitig aus und liefert einen Vorschlag zum
   * Vorbefüllen einer Störung. Nur für Nutzer, die Einträge anlegen dürfen.
   */
  @RequirePermissions("eintraege:create")
  @Get("easyflow/:tag")
  holeEasyFlowTag(@Param("tag") tag: string) {
    return this.easyflow.holeTag(tag);
  }
}
