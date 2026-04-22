import type { Request, Response, NextFunction } from "express";
import { verifyUserAccessToken } from "../utils/jwt";
import { UnauthorizedError } from "../utils/errors";
import { JWT_COOKIE_NAME } from "../config/constants";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export function requireUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = req.cookies[JWT_COOKIE_NAME] as string | undefined;
  if (!token) throw new UnauthorizedError("Authentication required");

  const payload = verifyUserAccessToken(token);
  req.user = { id: payload.sub, email: payload.email };
  next();
}
