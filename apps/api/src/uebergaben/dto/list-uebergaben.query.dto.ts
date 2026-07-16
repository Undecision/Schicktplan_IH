import { ApiPropertyOptional } from "@nestjs/swagger";
import { UebergabeStatus } from "@schichtbuch/shared";
import { IsEnum, IsOptional, IsUUID, Matches } from "class-validator";

export class ListUebergabenQueryDto {
  @ApiPropertyOptional({ description: "Tag (YYYY-MM-DD)" })
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

  @ApiPropertyOptional({ enum: UebergabeStatus })
  @IsOptional()
  @IsEnum(UebergabeStatus)
  status?: UebergabeStatus;
}
