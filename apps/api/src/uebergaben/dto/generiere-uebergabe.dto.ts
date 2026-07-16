import { ApiProperty } from "@nestjs/swagger";
import { IsUUID, Matches } from "class-validator";

export class GeneriereUebergabeDto {
  @ApiProperty({ example: "2026-07-16" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "datum muss YYYY-MM-DD sein" })
  datum!: string;

  @ApiProperty()
  @IsUUID("4")
  schichtId!: string;

  @ApiProperty()
  @IsUUID("4")
  gewerkId!: string;
}
