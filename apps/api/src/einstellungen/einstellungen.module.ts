import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EinstellungenController } from "./einstellungen.controller";
import { EinstellungenService } from "./einstellungen.service";

@Module({
  imports: [AuthModule],
  controllers: [EinstellungenController],
  providers: [EinstellungenService],
})
export class EinstellungenModule {}
