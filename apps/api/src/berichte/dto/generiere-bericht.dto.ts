import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, Matches } from "class-validator";

export class GeneriereBerichtDto {
  @ApiProperty({ description: "Berichtstag (YYYY-MM-DD)", example: "2026-07-16" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "datum muss YYYY-MM-DD sein" })
  datum!: string;

  @ApiProperty()
  @IsUUID("4")
  schichtId!: string;

  @ApiPropertyOptional({ description: "Ohne Angabe: alle sichtbaren Gewerke mit Einträgen" })
  @IsOptional()
  @IsUUID("4")
  gewerkId?: string;
}
