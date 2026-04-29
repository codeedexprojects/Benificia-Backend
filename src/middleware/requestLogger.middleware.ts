import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// Paths where the body must never be logged (tokens, credentials, OTPs)
const REDACT_BODY_PATHS = [
  "/auth/login",
  "/auth/verify-otp",
  "/auth/phone/verify-otp",
  "/auth/refresh",
];

function shouldRedactBody(path: string): boolean {
  return REDACT_BODY_PATHS.some((p) => path.endsWith(p));
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1e6;

    const meta: Record<string, unknown> = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: parseFloat(durationMs.toFixed(2)),
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
      userId: req.user?.id ?? null,
    };

    if (
      req.method !== "GET" &&
      req.body &&
      Object.keys(req.body).length > 0 &&
      !shouldRedactBody(req.path)
    ) {
      meta.body = req.body;
    }

    const level =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    logger[level](`${req.method} ${req.path} ${res.statusCode}`, meta);
  });

  next();
}
