import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EasyFlowService } from "./easyflow.service";
import { IntegrationController } from "./integration.controller";

@Module({
  imports: [AuthModule],
  controllers: [IntegrationController],
  providers: [EasyFlowService],
})
export class IntegrationModule {}
