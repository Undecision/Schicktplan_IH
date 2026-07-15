import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";
import { LocalAuthProvider } from "./providers/local-auth.provider";
import { OidcAuthProvider } from "./providers/oidc-auth.provider";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { PermissionsGuard } from "./guards/permissions.guard";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    LocalAuthProvider,
    OidcAuthProvider,
    // Reihenfolge relevant: JwtAuthGuard befüllt request.user, PermissionsGuard liest es.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [AuthService, PasswordService],
})
export class AuthModule {}
