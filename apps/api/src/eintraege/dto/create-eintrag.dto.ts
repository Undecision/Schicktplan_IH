import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  EASYFLOW_TAG_HINT,
  EASYFLOW_TAG_REGEX,
  EintragStatus,
  EintragTyp,
  Prioritaet,
  SAP_AUFTRAG_HINT,
  SAP_AUFTRAG_REGEX,
} from "@schichtbuch/shared";
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateIf,
} from "class-validator";

export class CreateEintragDto {
  @ApiProperty({ enum: EintragTyp })
  @IsEnum(EintragTyp)
  typ!: EintragTyp;

  @ApiProperty({ description: "Zeitpunkt (ISO-8601), kombiniert Datum + Uhrzeit." })
  @IsISO8601()
  zeitpunkt!: string;

  @ApiProperty()
  @IsUUID("4")
  schichtId!: string;

  @ApiProperty()
  @IsUUID("4")
  gewerkId!: string;

  @ApiProperty()
  @IsUUID("4")
  fachbereichId!: string;

  @ApiProperty()
  @IsUUID("4")
  technischerPlatzId!: string;

  @ApiProperty({ enum: Prioritaet })
  @IsEnum(Prioritaet)
  prioritaet!: Prioritaet;

  @ApiProperty({ enum: EintragStatus })
  @IsEnum(EintragStatus)
  status!: EintragStatus;

  @ApiPropertyOptional({ description: "Pflicht bei typ=SCHICHTINFORMATION." })
  @ValidateIf((o) => o.typ !== EintragTyp.STOERUNG)
  @IsString()
  @IsNotEmpty()
  beschreibung?: string;

  @ApiPropertyOptional({ description: "Pflicht bei typ=STOERUNG." })
  @ValidateIf((o) => o.typ === EintragTyp.STOERUNG)
  @IsString()
  @IsNotEmpty()
  stoerung?: string;

  @ApiPropertyOptional({ description: "Pflicht bei typ=STOERUNG." })
  @ValidateIf((o) => o.typ === EintragTyp.STOERUNG)
  @IsString()
  @IsNotEmpty()
  ursache?: string;

  @ApiPropertyOptional({ description: "Pflicht bei typ=STOERUNG." })
  @ValidateIf((o) => o.typ === EintragTyp.STOERUNG)
  @IsString()
  @IsNotEmpty()
  korrekturmassnahme?: string;

  @ApiPropertyOptional({ description: SAP_AUFTRAG_HINT })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== "")
  @Matches(SAP_AUFTRAG_REGEX, { message: SAP_AUFTRAG_HINT })
  sapIhAuftrag?: string | null;

  @ApiPropertyOptional({ description: EASYFLOW_TAG_HINT })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== "")
  @Matches(EASYFLOW_TAG_REGEX, { message: EASYFLOW_TAG_HINT })
  easyFlowTag?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID("4")
  verantwortlicherId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsISO8601()
  faelligkeitsdatum?: string | null;

  @ApiPropertyOptional({ description: "Beginn der Bearbeitung (ISO-8601)." })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsISO8601()
  bearbeitungBeginn?: string | null;

  @ApiPropertyOptional({ description: "Ende der Bearbeitung (ISO-8601)." })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsISO8601()
  bearbeitungEnde?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  schlagwortIds?: string[];
}
