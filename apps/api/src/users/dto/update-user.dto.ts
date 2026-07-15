import { ApiPropertyOptional } from "@nestjs/swagger";
import { Rolle } from "@schichtbuch/shared";
import { IsArray, IsEnum, IsIn, IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ enum: Rolle, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Rolle, { each: true })
  rollen?: Rolle[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  gewerkeIds?: string[];

  @ApiPropertyOptional({ enum: ["AKTIV", "DEAKTIVIERT"] })
  @IsOptional()
  @IsIn(["AKTIV", "DEAKTIVIERT"])
  status?: "AKTIV" | "DEAKTIVIERT";
}
