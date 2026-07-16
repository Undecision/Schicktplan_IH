import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ReportingController } from "./reporting.controller";
import { ReportingService } from "./reporting.service";
import { ReportingExportService } from "./reporting-export.service";

@Module({
  imports: [AuthModule],
  controllers: [ReportingController],
  providers: [ReportingService, ReportingExportService],
})
export class ReportingModule {}
