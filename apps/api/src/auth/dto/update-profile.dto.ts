import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

/** Eigene Stammdaten (Benutzername, Name, E-Mail) ändern. */
export class UpdateProfileDto {
  @ApiProperty({ description: "Anmeldename (eindeutig)." })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;
}
