import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { IsStrongPassword } from "../../common/validators/is-strong-password.validator";

/** Eigenes Passwort ändern; das aktuelle Passwort muss bestätigt werden. */
export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    description: "Mindestens 12 Zeichen, Groß-/Kleinbuchstaben, Ziffer/Sonderzeichen.",
  })
  @IsStrongPassword()
  newPassword!: string;
}
