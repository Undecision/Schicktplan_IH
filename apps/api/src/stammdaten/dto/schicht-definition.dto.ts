import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import { ZEIT_REGEX } from "@schichtbuch/shared";

const ZEIT_MESSAGE = 'Zeit muss im Format "HH:MM" (24h) angegeben werden.';

export class CreateSchichtDefinitionDto {
  @ApiProperty({ example: "Frühschicht" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: "06:00" })
  @Matches(ZEIT_REGEX, { message: ZEIT_MESSAGE })
  startzeit!: string;

  @ApiProperty({ example: "14:00" })
  @Matches(ZEIT_REGEX, { message: ZEIT_MESSAGE })
  endzeit!: string;
}

export class UpdateSchichtDefinitionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: "06:00" })
  @IsOptional()
  @Matches(ZEIT_REGEX, { message: ZEIT_MESSAGE })
  startzeit?: string;

  @ApiPropertyOptional({ example: "14:00" })
  @IsOptional()
  @Matches(ZEIT_REGEX, { message: ZEIT_MESSAGE })
  endzeit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  aktiv?: boolean;
}
