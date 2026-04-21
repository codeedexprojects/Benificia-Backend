import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
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

  logger.error("Unhandled error", {
    error: err instanceof Error ? err.message : "Unknown error",
  });
  res.status(500).json({ success: false, message: "Internal server error" });
}
