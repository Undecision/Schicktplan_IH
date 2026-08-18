import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsString } from "class-validator";

export class UpdateSchichtbuchSpaltenDto {
  @ApiProperty({
    description: "Sichtbare Spalten in Anzeige-Reihenfolge (Spaltenschlüssel).",
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  reihenfolge!: string[];
}
