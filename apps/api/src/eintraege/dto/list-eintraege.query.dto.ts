import { ApiPropertyOptional } from "@nestjs/swagger";
import { EintragStatus, Prioritaet } from "@schichtbuch/shared";
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class ListEintraegeQueryDto {
  @ApiPropertyOptional({ description: "Volltextsuche (Beschreibung, SAP, TAG)" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ enum: EintragStatus })
  @IsOptional()
  @IsEnum(EintragStatus)
  status?: EintragStatus;

  @ApiPropertyOptional({ enum: Prioritaet })
  @IsOptional()
  @IsEnum(Prioritaet)
  prioritaet?: Prioritaet;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  gewerkId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  fachbereichId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  schichtId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  technischerPlatzId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  erstellerId?: string;

  @ApiPropertyOptional({ description: "SAP-IH-Auftrag (Teiltreffer)" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sapIhAuftrag?: string;

  @ApiPropertyOptional({ description: "EasyFlow-TAG (Teiltreffer)" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  easyFlowTag?: string;

  @ApiPropertyOptional({ description: "Zeitraum-Untergrenze (ISO-8601) auf zeitpunkt" })
  @IsOptional()
  @IsISO8601()
  von?: string;

  @ApiPropertyOptional({ description: "Zeitraum-Obergrenze (ISO-8601) auf zeitpunkt" })
  @IsOptional()
  @IsISO8601()
  bis?: string;
}
