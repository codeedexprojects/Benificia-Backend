import jwt from "jsonwebtoken";
import type { AdminRole } from "@prisma/client";
import { env } from "../config/env";
import { UnauthorizedError } from "./errors";

// ── Admin payloads ────────────────────────────────────────────

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

// ── User payloads ─────────────────────────────────────────────

export interface UserAccessPayload {
  sub: string;
  email: string;
  type: "user_access";
  iat?: number;
  exp?: number;
}

export interface UserRefreshPayload {
  sub: string;
  sessionId: string; // AuthSession.id
  type: "user_refresh";
  iat?: number;
  exp?: number;
}

// ── Internals ─────────────────────────────────────────────────

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

// ── Admin ─────────────────────────────────────────────────────

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

// ── User ──────────────────────────────────────────────────────

export function signUserAccessToken(
  payload: Omit<UserAccessPayload, "type" | "iat" | "exp">,
): string {
  return sign(
    { ...payload, type: "user_access" },
    env.JWT_SECRET,
    env.JWT_EXPIRES_IN,
  );
}

export function signUserRefreshToken(
  payload: Omit<UserRefreshPayload, "type" | "iat" | "exp">,
): string {
  return sign(
    { ...payload, type: "user_refresh" },
    env.JWT_REFRESH_SECRET,
    env.JWT_REFRESH_EXPIRES_IN,
  );
}

export function verifyUserAccessToken(token: string): UserAccessPayload {
  const payload = verify<UserAccessPayload>(token, env.JWT_SECRET);
  if (payload.type !== "user_access")
    throw new UnauthorizedError("Invalid token type");
  return payload;
}

export function verifyUserRefreshToken(token: string): UserRefreshPayload {
  const payload = verify<UserRefreshPayload>(token, env.JWT_REFRESH_SECRET);
  if (payload.type !== "user_refresh")
    throw new UnauthorizedError("Invalid token type");
  return payload;
}
