import { ApiPropertyOptional } from "@nestjs/swagger";
import { EintragStatus, Prioritaet } from "@schichtbuch/shared";
import { IsEnum, IsOptional, IsUUID } from "class-validator";

export class ListEintraegeQueryDto {
  @ApiPropertyOptional({ enum: EintragStatus })
  @IsOptional()
  @IsEnum(EintragStatus)
  status?: EintragStatus;

  @ApiPropertyOptional({ enum: Prioritaet })
  @IsOptional()
  @IsEnum(Prioritaet)
  prioritaet?: Prioritaet;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  gewerkId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  fachbereichId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  schichtId?: string;
}
