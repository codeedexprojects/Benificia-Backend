import "dotenv/config";
import { app } from "./app";
import { prisma, redis } from "./container";
import { env } from "./config/env";
import { logger } from "./utils/logger";

async function bootstrap(): Promise<void> {
  await redis.connect();
  logger.info("Redis connected");

  await prisma.$connect();
  logger.info("Database connected");

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await prisma.$disconnect();
      await redis.disconnect();
      logger.info("Shutdown complete");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { message: err.message });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: String(reason) });
    process.exit(1);
  });
}

void bootstrap();
