import winston from "winston";
import { env } from "../config/env";

const isProd = env.NODE_ENV === "production";

export const logger = winston.createLogger({
  level: isProd ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    isProd
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
  ),
  transports: [new winston.transports.Console()],
});
