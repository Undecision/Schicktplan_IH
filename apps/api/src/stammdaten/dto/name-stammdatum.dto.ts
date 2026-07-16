import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

/** Anlegen eines namensbasierten Stammdatums (Gewerk, Fachbereich, Schlagwort). */
export class CreateNameStammdatumDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;
}

/** Bearbeiten inkl. aktiv-Toggle (Deaktivieren statt Löschen). */
export class UpdateNameStammdatumDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  aktiv?: boolean;
}
