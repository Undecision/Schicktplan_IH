import { ApiPropertyOptional } from "@nestjs/swagger";
import { PERMISSIONS, type PermissionKey } from "@schichtbuch/shared";
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf } from "class-validator";

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ enum: PERMISSIONS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(PERMISSIONS, { each: true })
  permissions?: PermissionKey[];
}
