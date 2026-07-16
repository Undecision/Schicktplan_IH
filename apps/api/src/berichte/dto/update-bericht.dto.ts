import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from "class-validator";

export class UpdateBerichtDto {
  @ApiPropertyOptional({ description: "Verantwortlicher Schichtführer (null zum Entfernen)" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID("4")
  verantwortlicherId?: string | null;

  @ApiPropertyOptional({ description: "Besondere Ereignisse (Freitext)" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  besondereEreignisse?: string | null;
}
