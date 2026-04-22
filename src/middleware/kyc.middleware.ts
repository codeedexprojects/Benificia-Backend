import type { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../utils/errors";
import { prisma } from "../container";

export async function requireKyc(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { kycStatus: true },
  });

  if (user?.kycStatus !== "verified") {
    throw new ForbiddenError(
      "KYC verification required to access this resource",
    );
  }

  next();
}
