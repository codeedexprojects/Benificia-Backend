import type { Request, Response, NextFunction } from "express";
import { verifyUserAccessToken } from "../utils/jwt";
import { UnauthorizedError } from "../utils/errors";
import { JWT_COOKIE_NAME } from "../config/constants";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string | null };
    }
  }
}

export function requireUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers["authorization"];

  let token: string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7); // mobile / API clients
  } else {
    token = req.cookies?.[JWT_COOKIE_NAME]; // web browser (http-only cookie)
  }

  if (!token) throw new UnauthorizedError("Authentication required");

  const payload = verifyUserAccessToken(token);
  req.user = { id: payload.sub, email: payload.email };
  next();
}
