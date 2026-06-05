import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createClient } from "redis";
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./config/env";
import { logger } from "./utils/logger";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_POOL_CONNECTION_TIMEOUT_MS,
  // Detect silently-dropped connections through cloud firewalls/NAT.
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Set statement_timeout on every new physical connection so slow queries
// fail fast rather than hanging until the process-level timeout fires.
pool.on("connect", (client) => {
  client
    .query(`SET statement_timeout = ${env.DB_STATEMENT_TIMEOUT_MS}`)
    .catch((err: Error) =>
      logger.error("Failed to set statement_timeout", { message: err.message }),
    );
});

pool.on("error", (err: Error) =>
  logger.error("Idle pool client error", { message: err.message }),
);

// disposeExternalPool: true — ensures pool.end() is called when prisma.$disconnect() runs.
const adapter = new PrismaPg(pool, { disposeExternalPool: true });

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export const redis = createClient({ url: env.REDIS_URL });

redis.on("error", (err: Error) =>
  logger.error("Redis client error", { message: err.message }),
);

export const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});
