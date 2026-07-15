import { validateEnv } from "./env.schema";

const validEnv = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  S3_ACCESS_KEY: "access",
  S3_SECRET_KEY: "secret",
  S3_BUCKET: "bucket",
  AUTH_JWT_ACCESS_SECRET: "a".repeat(16),
  AUTH_JWT_REFRESH_SECRET: "b".repeat(16),
};

describe("validateEnv", () => {
  it("akzeptiert eine gültige Konfiguration und wendet Defaults an", () => {
    const result = validateEnv(validEnv);
    expect(result.API_PORT).toBe(3000);
    expect(result.NODE_ENV).toBe("development");
    expect(result.S3_USE_SSL).toBe(false);
  });

  it("wirft bei fehlender DATABASE_URL", () => {
    const { DATABASE_URL: _omit, ...rest } = validEnv;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it("wirft bei zu kurzem JWT-Secret", () => {
    expect(() => validateEnv({ ...validEnv, AUTH_JWT_ACCESS_SECRET: "short" })).toThrow();
  });
});
