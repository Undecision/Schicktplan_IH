import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersController } from "./users.controller";
import { GewerkeController } from "./gewerke.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [AuthModule],
  controllers: [UsersController, GewerkeController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
