import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UebergabenController } from "./uebergaben.controller";
import { UebergabenService } from "./uebergaben.service";

@Module({
  imports: [AuthModule],
  controllers: [UebergabenController],
  providers: [UebergabenService],
})
export class UebergabenModule {}
