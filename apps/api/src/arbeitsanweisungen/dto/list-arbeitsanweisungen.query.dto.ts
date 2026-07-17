import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString, IsUUID } from "class-validator";

export class ListArbeitsanweisungenQueryDto {
  @ApiPropertyOptional({ description: "Suche über Titel, Text, Ersteller, Gewerk, Fachbereich." })
  @IsOptional()
  @IsString()
  q?: string;

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

  @ApiPropertyOptional({ description: "true = nur gelesene, false = nur ungelesene." })
  @IsOptional()
  @Transform(({ value }) => (value === "true" ? true : value === "false" ? false : value))
  @IsBoolean()
  gelesen?: boolean;
}
