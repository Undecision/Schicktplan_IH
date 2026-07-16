import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SeedService } from "./seed.service";

@Module({
  imports: [AuthModule],
  providers: [SeedService],
})
export class BootstrapModule {}
