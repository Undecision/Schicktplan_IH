import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DsgvoController } from "./dsgvo.controller";
import { DsgvoService } from "./dsgvo.service";

@Module({
  imports: [AuthModule],
  controllers: [DsgvoController],
  providers: [DsgvoService],
})
export class DsgvoModule {}
