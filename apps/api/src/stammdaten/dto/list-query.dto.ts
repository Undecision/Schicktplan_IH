import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class ListStammdatenQueryDto {
  @ApiPropertyOptional({
    description: "Auch deaktivierte Einträge zurückgeben (nur Verwaltung).",
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  includeInactive?: boolean;
}
