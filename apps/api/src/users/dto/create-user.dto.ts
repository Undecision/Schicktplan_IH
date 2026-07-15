import { ApiProperty } from "@nestjs/swagger";
import { Rolle } from "@schichtbuch/shared";
import { ArrayNotEmpty, IsArray, IsEmail, IsEnum, IsNotEmpty, IsUUID } from "class-validator";
import { IsStrongPassword } from "../../common/validators/is-strong-password.validator";

export class CreateUserDto {
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

  @ApiProperty({ enum: Rolle, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Rolle, { each: true })
  rollen!: Rolle[];

  @ApiProperty({ type: [String], description: "Gewerk-IDs (Sichtbarkeitsdimension)" })
  @IsArray()
  @IsUUID("4", { each: true })
  gewerkeIds!: string[];
}
