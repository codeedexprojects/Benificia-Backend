import type { Request, Response, NextFunction } from "express";
import type { AdminRole } from "@prisma/client";
import { verifyAdminAccessToken } from "../utils/jwt";
import { UnauthorizedError, ForbiddenError } from "../utils/errors";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: { id: string; email: string; role: AdminRole };
    }
  }
}

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = req.cookies["admin_token"] as string | undefined;
  if (!token) throw new UnauthorizedError("Authentication required");

  const payload = verifyAdminAccessToken(token);
  req.admin = { id: payload.sub, email: payload.email, role: payload.role };
  next();
}

export function requireRole(...roles: AdminRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.admin) throw new UnauthorizedError("Authentication required");
    if (!roles.includes(req.admin.role)) {
      throw new ForbiddenError("Insufficient permissions");
    }
    next();
  };
}
