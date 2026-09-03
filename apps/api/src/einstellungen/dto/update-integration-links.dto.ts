import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateIntegrationLinksDto {
  @ApiPropertyOptional({
    description: "URL-Vorlage für SAP-IH-Aufträge; {nummer} wird ersetzt. Leer = kein Link.",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sapUrlTemplate?: string | null;

  @ApiPropertyOptional({
    description: "URL-Vorlage für EasyFlow-TAGs; {nummer} wird ersetzt. Leer = kein Link.",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  easyFlowUrlTemplate?: string | null;
}
