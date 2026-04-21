import type { Response } from "express";

interface Meta {
  total: number;
  page: number;
  limit: number;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Meta,
): void {
  res.status(statusCode).json({ success: true, data, ...(meta && { meta }) });
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
): void {
  res.status(statusCode).json({ success: false, message });
}

export function sendValidationError(
  res: Response,
  errors: Record<string, string[]>,
): void {
  res.status(400).json({ success: false, errors });
}
