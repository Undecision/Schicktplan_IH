import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EintraegeController } from "./eintraege.controller";
import { EintraegeService } from "./eintraege.service";

@Module({
  imports: [AuthModule],
  controllers: [EintraegeController],
  providers: [EintraegeService],
})
export class EintraegeModule {}
