import { ApiPropertyOptional } from "@nestjs/swagger";
import { SchichtberichtStatus } from "@schichtbuch/shared";
import { IsEnum, IsOptional, IsUUID, Matches } from "class-validator";

export class ListBerichteQueryDto {
  @ApiPropertyOptional({ description: "Berichtstag (YYYY-MM-DD)" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "datum muss YYYY-MM-DD sein" })
  datum?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  schichtId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  gewerkId?: string;

  @ApiPropertyOptional({ enum: SchichtberichtStatus })
  @IsOptional()
  @IsEnum(SchichtberichtStatus)
  status?: SchichtberichtStatus;
}
