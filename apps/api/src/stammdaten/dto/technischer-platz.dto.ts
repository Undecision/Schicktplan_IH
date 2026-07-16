import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from "class-validator";

export class CreateTechnischerPlatzDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bezeichnung!: string;

  @ApiProperty({ description: "Eindeutiger Code (z.B. SAP-Technischer-Platz)." })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ description: "Kann mit SAP PM synchronisiert werden (Vorbereitung Phase 12)." })
  @IsBoolean()
  sapSyncFaehig!: boolean;

  @ApiPropertyOptional({ description: "Optionaler Fachbereich für die Vorbelegung im Formular." })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID("4")
  fachbereichId?: string | null;
}

export class UpdateTechnischerPlatzDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  bezeichnung?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sapSyncFaehig?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  aktiv?: boolean;

  @ApiPropertyOptional({ description: "Fachbereich (null zum Entfernen)." })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID("4")
  fachbereichId?: string | null;
}
