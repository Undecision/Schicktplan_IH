import { PartialType } from "@nestjs/swagger";
import { CreateEintragDto } from "./create-eintrag.dto";

export class UpdateEintragDto extends PartialType(CreateEintragDto) {}
