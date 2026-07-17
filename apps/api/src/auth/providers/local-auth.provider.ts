import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PasswordService } from "../password.service";
import type { AuthProvider, ValidatedCredentials } from "./auth-provider.interface";

@Injectable()
export class LocalAuthProvider implements AuthProvider {
  readonly name = "local";

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async validateCredentials(
    username: string,
    password: string,
  ): Promise<ValidatedCredentials | null> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.passwordHash || user.status !== "AKTIV" || user.deletedAt) {
      return null;
    }

    const isValid = await this.passwordService.verify(user.passwordHash, password);
    if (!isValid) {
      return null;
    }

    return { userId: user.id };
  }
}
