import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

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
}
