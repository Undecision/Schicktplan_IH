import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AuswertungTyp, EintragStatus, Prioritaet } from "@schichtbuch/shared";
import { IsEnum, IsIn, IsOptional, IsUUID, Matches } from "class-validator";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class AuswertungQueryDto {
  @ApiProperty({ enum: AuswertungTyp })
  @IsEnum(AuswertungTyp)
  typ!: AuswertungTyp;

  @ApiProperty({ example: "2026-07-01" })
  @Matches(DATE, { message: "von muss YYYY-MM-DD sein" })
  von!: string;

  @ApiProperty({ example: "2026-07-31" })
  @Matches(DATE, { message: "bis muss YYYY-MM-DD sein" })
  bis!: string;

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
  technischerPlatzId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  schichtId?: string;

  @ApiPropertyOptional({ enum: EintragStatus })
  @IsOptional()
  @IsEnum(EintragStatus)
  status?: EintragStatus;

  @ApiPropertyOptional({ enum: Prioritaet })
  @IsOptional()
  @IsEnum(Prioritaet)
  prioritaet?: Prioritaet;
}

export class AuswertungExportQueryDto extends AuswertungQueryDto {
  @ApiProperty({ enum: ["pdf", "xlsx"] })
  @IsIn(["pdf", "xlsx"])
  format!: "pdf" | "xlsx";
}
