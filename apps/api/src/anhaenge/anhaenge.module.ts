import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AnhaengeController } from "./anhaenge.controller";
import { AnhaengeService } from "./anhaenge.service";
import { VirusScanService } from "./virus-scan.service";

@Module({
  imports: [AuthModule],
  controllers: [AnhaengeController],
  providers: [AnhaengeService, VirusScanService],
})
export class AnhaengeModule {}
