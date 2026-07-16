import { z } from "zod";

const boolFromString = z.enum(["true", "false"]).transform((v) => v === "true");

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  API_PORT: z.coerce.number().int().positive().default(3000),
  API_HOST: z.string().default("0.0.0.0"),
  API_GLOBAL_PREFIX: z.string().default("api"),

  DATABASE_URL: z.string().url(),

  S3_ENDPOINT: z.string().default("minio"),
  S3_PORT: z.coerce.number().int().positive().default(9000),
  S3_USE_SSL: boolFromString.default("false"),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().default("eu-central-1"),

  AUTH_JWT_ACCESS_SECRET: z.string().min(16),
  AUTH_JWT_REFRESH_SECRET: z.string().min(16),
  AUTH_JWT_ACCESS_TTL: z.string().default("15m"),
  AUTH_JWT_REFRESH_TTL: z.string().default("7d"),
  AUTH_ARGON2_MEMORY_COST: z.coerce.number().int().positive().default(19456),
  AUTH_ARGON2_TIME_COST: z.coerce.number().int().positive().default(2),
  AUTH_ARGON2_PARALLELISM: z.coerce.number().int().positive().default(1),
  AUTH_LOCKOUT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  AUTH_LOCKOUT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),

  AUTH_OIDC_ENABLED: boolFromString.default("false"),
  AUTH_OIDC_ISSUER: z.string().optional().default(""),
  AUTH_OIDC_CLIENT_ID: z.string().optional().default(""),
  AUTH_OIDC_CLIENT_SECRET: z.string().optional().default(""),
  AUTH_OIDC_REDIRECT_URI: z.string().optional().default(""),

  CORS_ORIGIN: z.string().default("*"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default(""),
  TEAMS_WEBHOOK_ENABLED: boolFromString.default("false"),
  TEAMS_WEBHOOK_URL: z.string().optional().default(""),

  // Automatischer Seed beim Start (Rollen/Stammdaten/Bootstrap-Admin), idempotent.
  SEED_ON_STARTUP: boolFromString.default("false"),
  BOOTSTRAP_ADMIN_EMAIL: z.string().optional().default(""),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().optional().default(""),
  BOOTSTRAP_ADMIN_NAME: z.string().optional().default("Administrator"),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Ungültige Umgebungsvariablen:\n${formatted}`);
  }
  return result.data;
}
