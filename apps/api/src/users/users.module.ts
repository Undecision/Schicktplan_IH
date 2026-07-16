import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersController } from "./users.controller";
import { UserPickerController } from "./user-picker.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [AuthModule],
  controllers: [UsersController, UserPickerController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
