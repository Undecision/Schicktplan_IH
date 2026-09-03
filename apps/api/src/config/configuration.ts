import { EnvConfig } from "./env.schema";

export function buildConfiguration(env: EnvConfig) {
  return {
    nodeEnv: env.NODE_ENV,
    api: {
      port: env.API_PORT,
      host: env.API_HOST,
      globalPrefix: env.API_GLOBAL_PREFIX,
    },
    database: {
      url: env.DATABASE_URL,
    },
    s3: {
      endpoint: env.S3_ENDPOINT,
      port: env.S3_PORT,
      useSSL: env.S3_USE_SSL,
      accessKey: env.S3_ACCESS_KEY,
      secretKey: env.S3_SECRET_KEY,
      bucket: env.S3_BUCKET,
      region: env.S3_REGION,
    },
    auth: {
      jwtAccessSecret: env.AUTH_JWT_ACCESS_SECRET,
      jwtRefreshSecret: env.AUTH_JWT_REFRESH_SECRET,
      jwtAccessTtl: env.AUTH_JWT_ACCESS_TTL,
      jwtRefreshTtl: env.AUTH_JWT_REFRESH_TTL,
      argon2: {
        memoryCost: env.AUTH_ARGON2_MEMORY_COST,
        timeCost: env.AUTH_ARGON2_TIME_COST,
        parallelism: env.AUTH_ARGON2_PARALLELISM,
      },
      lockout: {
        maxAttempts: env.AUTH_LOCKOUT_MAX_ATTEMPTS,
        windowMinutes: env.AUTH_LOCKOUT_WINDOW_MINUTES,
      },
      oidc: {
        enabled: env.AUTH_OIDC_ENABLED,
        issuer: env.AUTH_OIDC_ISSUER,
        clientId: env.AUTH_OIDC_CLIENT_ID,
        clientSecret: env.AUTH_OIDC_CLIENT_SECRET,
        redirectUri: env.AUTH_OIDC_REDIRECT_URI,
      },
    },
    cors: {
      origin: env.CORS_ORIGIN,
    },
    log: {
      level: env.LOG_LEVEL,
    },
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
      from: env.SMTP_FROM,
    },
    teams: {
      webhookEnabled: env.TEAMS_WEBHOOK_ENABLED,
      webhookUrl: env.TEAMS_WEBHOOK_URL,
    },
    notify: {
      roles: env.NOTIFY_ROLES.split(",")
        .map((r) => r.trim())
        .filter(Boolean),
    },
    pdf: {
      chromiumPath: env.PDF_CHROMIUM_PATH,
    },
    easyflow: {
      baseUrl: env.EASYFLOW_BASE_URL,
      username: env.EASYFLOW_USERNAME,
      password: env.EASYFLOW_PASSWORD,
    },
    seed: {
      onStartup: env.SEED_ON_STARTUP,
      admin: {
        email: env.BOOTSTRAP_ADMIN_EMAIL,
        password: env.BOOTSTRAP_ADMIN_PASSWORD,
        name: env.BOOTSTRAP_ADMIN_NAME,
        username: env.BOOTSTRAP_ADMIN_USERNAME,
      },
    },
  } as const;
}

export type AppConfig = ReturnType<typeof buildConfiguration>;
