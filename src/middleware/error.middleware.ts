import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation — 400 with per-field messages, no logging
  if (err instanceof ZodError) {
    const errors = Object.fromEntries(
      err.issues.map((issue) => [
        issue.path.join(".") || "root",
        issue.message,
      ]),
    );
    res
      .status(400)
      .json({ success: false, message: "Validation failed", errors });
    return;
  }

  // Operational errors (BadRequestError, UnauthorizedError, etc.)
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error("Non-operational AppError", {
        message: err.message,
        stack: err.stack,
      });
    }
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res
        .status(409)
        .json({ success: false, message: "Resource already exists" });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ success: false, message: "Resource not found" });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ success: false, message: "Invalid request data" });
    return;
  }

  // Unexpected — log with stack trace, never leak details to client
  logger.error("Unhandled error", {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  res.status(500).json({ success: false, message: "Internal server error" });
}
