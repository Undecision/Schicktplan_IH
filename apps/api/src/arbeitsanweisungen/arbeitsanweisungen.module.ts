import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ArbeitsanweisungenController } from "./arbeitsanweisungen.controller";
import { ArbeitsanweisungenService } from "./arbeitsanweisungen.service";

@Module({
  imports: [AuthModule],
  controllers: [ArbeitsanweisungenController],
  providers: [ArbeitsanweisungenService],
})
export class ArbeitsanweisungenModule {}
