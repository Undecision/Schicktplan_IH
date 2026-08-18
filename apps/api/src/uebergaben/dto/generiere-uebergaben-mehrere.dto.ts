import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, Matches, ValidateIf } from "class-validator";

/**
 * Sammel-Erzeugung von Schichtübergaben. Leere schichtId bzw. gewerkId bedeutet
 * "Alle" (alle aktiven Schichten des Tages bzw. alle sichtbaren Gewerke).
 */
export class GeneriereUebergabenMehrereDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "datum muss YYYY-MM-DD sein" })
  datum!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== "" && value !== null && value !== undefined)
  @IsUUID("4")
  schichtId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== "" && value !== null && value !== undefined)
  @IsUUID("4")
  gewerkId?: string;
}
