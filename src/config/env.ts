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
    .default(5000),

  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  ENCRYPTION_KEY: z.string().min(32),

  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_SES_FROM_EMAIL: z.email(),
  AWS_S3_BUCKET: z.string().min(1),

  CORS_ORIGINS: z.string().default("http://localhost:30001"),

  AI_SERVER_URL: z.url(),
  AI_SERVER_API_KEY: z.string().min(1),
  AI_SERVER_ADMIN_KEY: z.string().min(1),

  TWOFACTOR_API_KEY: z.string().min(1),
  // Optional: custom DLT-approved SMS template name. Defaults to the
  // 2factor auto-generated OTP template when not set.
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
