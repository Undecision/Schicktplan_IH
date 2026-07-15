export type HealthStatus = "ok" | "error";

export interface HealthCheckResult {
  status: HealthStatus;
  info?: Record<string, { status: HealthStatus }>;
  error?: Record<string, { status: HealthStatus; message?: string }>;
  details?: Record<string, { status: HealthStatus }>;
}
