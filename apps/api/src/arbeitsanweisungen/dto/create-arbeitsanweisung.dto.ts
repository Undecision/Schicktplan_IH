import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from "class-validator";

/**
 * Anlegen einer Arbeitsanweisung (multipart/form-data). Der optionale Anhang
 * wird als Datei-Feld `file` übertragen; die Pflicht „Text ODER Anhang" wird im
 * Service geprüft (hier nicht abbildbar, da die Datei außerhalb des DTO liegt).
 */
export class CreateArbeitsanweisungDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  titel!: string;

  @ApiPropertyOptional({ description: "Freitext-Inhalt (Pflicht, wenn kein Anhang)." })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== "")
  @IsString()
  text?: string | null;

  @ApiProperty()
  @IsUUID("4")
  gewerkId!: string;

  @ApiPropertyOptional({ description: "Optionaler Fachbereich." })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== "")
  @IsUUID("4")
  fachbereichId?: string | null;

  @ApiPropertyOptional({ description: "Optionale Ziel-Schicht." })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== "")
  @IsUUID("4")
  schichtId?: string | null;
}
