import { Router } from "express";
import type { Request, Response } from "express";
import { authRateLimit } from "../../middleware/rateLimit.middleware";
import { generateCsrfToken } from "../../middleware/csrf.middleware";
import type { UserController } from "../../modules/user/user.controller";

export function authRoutes(controller: UserController): Router {
  const router = Router();

  // Provides a CSRF token — must be called before any state-changing request
  router.get("/csrf-token", (req: Request, res: Response) => {
    const token = generateCsrfToken(req, res);
    res.json({ success: true, data: { token } });
  });

  // Unified OTP — accepts email or E.164 phone, auto-detects channel
  router.post("/otp/send", authRateLimit, controller.sendOtpByIdentifier);
  router.post("/otp/verify", authRateLimit, controller.verifyOtpByIdentifier);

  router.post("/refresh", controller.refresh);
  router.post("/logout", controller.logout);

  return router;
}
