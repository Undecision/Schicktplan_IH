import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsEmail, IsNotEmpty, IsString, IsUUID } from "class-validator";
import { IsStrongPassword } from "../../common/validators/is-strong-password.validator";

export class CreateUserDto {
  @ApiProperty({ description: "Anmeldename (eindeutig)." })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: "Mindestens 12 Zeichen, Groß-/Kleinbuchstaben, Ziffer/Sonderzeichen.",
  })
  @IsStrongPassword()
  password!: string;

  @ApiProperty({ type: [String], description: "Rollennamen (müssen existieren)." })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  rollen!: string[];

  @ApiProperty({ type: [String], description: "Gewerk-IDs (Sichtbarkeitsdimension)" })
  @IsArray()
  @IsUUID("4", { each: true })
  gewerkeIds!: string[];
}
