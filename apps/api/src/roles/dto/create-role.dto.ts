import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PERMISSIONS, type PermissionKey } from "@schichtbuch/shared";
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf } from "class-validator";

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  description?: string | null;

  @ApiProperty({ enum: PERMISSIONS, isArray: true })
  @IsArray()
  @IsIn(PERMISSIONS, { each: true })
  permissions!: PermissionKey[];
}
