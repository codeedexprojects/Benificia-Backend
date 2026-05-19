import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { redis } from "../container";

const isDev = env.NODE_ENV === "development";

const makeRedisStore = (prefix: string) =>
  new RedisStore({
    sendCommand: (...args: string[]) => redis.sendCommand(args),
    prefix,
  });

// Lazily-initialized handlers — safe to import at module load time.
// Call initRateLimiters() once after redis.connect() in bootstrap().
let _global: RateLimitRequestHandler | null = null;
let _auth: RateLimitRequestHandler | null = null;

export function initRateLimiters(): void {
  _global = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    store: makeRedisStore("rl:global:"),
    message: {
      success: false,
      message: "Too many requests, please try again later",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  _auth = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 100 : 5,
    store: makeRedisStore("rl:auth:"),
    message: {
      success: false,
      message: "Too many attempts, please try again later",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

export const globalRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  _global!(req, res, next);
};

// Applied per-route on: /auth/send-otp, /auth/login, /auth/verify-otp
export const authRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  _auth!(req, res, next);
};
