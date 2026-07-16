import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, ValidateIf } from "class-validator";

export class UebergebenDto {
  @ApiPropertyOptional({ description: "Übernehmende Person der nächsten Schicht" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID("4")
  uebernommenVonId?: string | null;
}
