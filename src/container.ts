import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "redis";
import { SESClient } from "@aws-sdk/client-ses";
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./config/env";
import { logger } from "./utils/logger";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export const redis = createClient({ url: env.REDIS_URL });

redis.on("error", (err: Error) =>
  logger.error("Redis client error", { message: err.message }),
);

export const ses = new SESClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});
