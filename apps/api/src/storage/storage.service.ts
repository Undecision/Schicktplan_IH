import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "minio";
import { AppConfig } from "../config/configuration";

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    const s3 = this.configService.get("s3", { infer: true });
    this.bucket = s3.bucket;
    this.client = new Client({
      endPoint: s3.endpoint,
      port: s3.port,
      useSSL: s3.useSSL,
      accessKey: s3.accessKey,
      secretKey: s3.secretKey,
      region: s3.region,
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(
          this.bucket,
          this.configService.get("s3", { infer: true }).region,
        );
        this.logger.log(`Bucket "${this.bucket}" angelegt.`);
      }
    } catch (error) {
      this.logger.warn(`MinIO-Bucket-Prüfung fehlgeschlagen: ${(error as Error).message}`);
    }
  }

  getClient(): Client {
    return this.client;
  }

  getBucket(): string {
    return this.bucket;
  }

  async bucketExists(): Promise<boolean> {
    return this.client.bucketExists(this.bucket);
  }
}
