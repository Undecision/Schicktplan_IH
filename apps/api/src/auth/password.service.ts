import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import type { AppConfig } from "../config/configuration";

@Injectable()
export class PasswordService {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async hash(password: string): Promise<string> {
    const { memoryCost, timeCost, parallelism } = this.configService.get("auth", {
      infer: true,
    }).argon2;
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost,
      timeCost,
      parallelism,
    });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}
