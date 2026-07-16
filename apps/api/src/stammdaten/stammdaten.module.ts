import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { GewerkeController } from "./gewerke.controller";
import { GewerkeService } from "./gewerke.service";
import { FachbereicheController } from "./fachbereiche.controller";
import { FachbereicheService } from "./fachbereiche.service";
import { SchlagwoerterController } from "./schlagwoerter.controller";
import { SchlagwoerterService } from "./schlagwoerter.service";
import { TechnischePlaetzeController } from "./technische-plaetze.controller";
import { TechnischePlaetzeService } from "./technische-plaetze.service";
import { SchichtDefinitionenController } from "./schicht-definitionen.controller";
import { SchichtDefinitionenService } from "./schicht-definitionen.service";

@Module({
  imports: [AuthModule],
  controllers: [
    GewerkeController,
    FachbereicheController,
    SchlagwoerterController,
    TechnischePlaetzeController,
    SchichtDefinitionenController,
  ],
  providers: [
    GewerkeService,
    FachbereicheService,
    SchlagwoerterService,
    TechnischePlaetzeService,
    SchichtDefinitionenService,
  ],
})
export class StammdatenModule {}
