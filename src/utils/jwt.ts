import jwt from "jsonwebtoken";
import type { AdminRole } from "@prisma/client";
import { env } from "../config/env";
import { UnauthorizedError } from "./errors";

export interface AdminAccessPayload {
  sub: string;
  email: string;
  role: AdminRole;
  type: "admin_access";
  iat?: number;
  exp?: number;
}

export interface AdminRefreshPayload {
  sub: string;
  sessionId: string;
  type: "admin_refresh";
  iat?: number;
  exp?: number;
}

function sign(payload: object, secret: string, expiresIn: string): string {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

function verify<T>(token: string, secret: string): T {
  try {
    return jwt.verify(token, secret) as T;
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}

export function signAdminAccessToken(
  payload: Omit<AdminAccessPayload, "type" | "iat" | "exp">,
): string {
  return sign(
    { ...payload, type: "admin_access" },
    env.JWT_SECRET,
    env.JWT_EXPIRES_IN,
  );
}

export function signAdminRefreshToken(
  payload: Omit<AdminRefreshPayload, "type" | "iat" | "exp">,
): string {
  return sign(
    { ...payload, type: "admin_refresh" },
    env.JWT_REFRESH_SECRET,
    env.JWT_REFRESH_EXPIRES_IN,
  );
}

export function verifyAdminAccessToken(token: string): AdminAccessPayload {
  const payload = verify<AdminAccessPayload>(token, env.JWT_SECRET);
  if (payload.type !== "admin_access")
    throw new UnauthorizedError("Invalid token type");
  return payload;
}

export function verifyAdminRefreshToken(token: string): AdminRefreshPayload {
  const payload = verify<AdminRefreshPayload>(token, env.JWT_REFRESH_SECRET);
  if (payload.type !== "admin_refresh")
    throw new UnauthorizedError("Invalid token type");
  return payload;
}
