import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BerichteController } from "./berichte.controller";
import { BerichteService } from "./berichte.service";

@Module({
  imports: [AuthModule],
  controllers: [BerichteController],
  providers: [BerichteService],
})
export class BerichteModule {}
