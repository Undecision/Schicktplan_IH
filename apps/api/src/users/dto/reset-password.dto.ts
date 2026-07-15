import { ApiProperty } from "@nestjs/swagger";
import { IsStrongPassword } from "../../common/validators/is-strong-password.validator";

export class ResetPasswordDto {
  @ApiProperty({
    description: "Mindestens 12 Zeichen, Groß-/Kleinbuchstaben, Ziffer/Sonderzeichen.",
  })
  @IsStrongPassword()
  password!: string;
}
