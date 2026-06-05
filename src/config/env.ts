import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  DB_POOL_CONNECTION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30000),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  // Socket-level inactivity timeout — fires faster than the OS TCP retransmit
  // timeout (~19 s) to detect silently-dropped connections (NAT/firewall).
  DB_SOCKET_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),

  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ADMIN_JWT_SECRET: z.string().min(32),
  ADMIN_JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("2h"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  CSRF_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),

  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),

  BREVO_API_KEY: z.string().min(1),
  BREVO_FROM_EMAIL: z.email(),
  BREVO_FROM_NAME: z.string().default("Benificia"),
  // Set to "true" to skip real email sending and log OTPs to console instead
  MOCK_EMAIL: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  CORS_ORIGINS: z.string().default("http://localhost:30001"),

  AI_SERVER_URL: z.url(),
  AI_SERVER_API_KEY: z.string().min(1),
  AI_SERVER_ADMIN_KEY: z.string().min(1),

  // Phone OTP via 2factor.in — optional until SMS is enabled
  TWOFACTOR_API_KEY: z.string().optional(),
  TWOFACTOR_OTP_TEMPLATE: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map(
    (i) => `${i.path.join(".")}: ${i.message}`,
  );
  throw new Error(`Invalid environment variables:\n${issues.join("\n")}`);
}

export const env = parsed.data;
