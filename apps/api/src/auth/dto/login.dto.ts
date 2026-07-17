import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({ description: "Anmeldename (Benutzername)." })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty()
  @IsNotEmpty()
  password!: string;
}
