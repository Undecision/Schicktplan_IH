import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ type: [String], description: "Rollennamen (müssen existieren)." })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rollen?: string[];

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
