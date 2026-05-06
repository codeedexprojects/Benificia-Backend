import { Router } from "express";
import { authRateLimit } from "../../middleware/rateLimit.middleware";
import type { UserController } from "../../modules/user/user.controller";

export function authRoutes(controller: UserController): Router {
  const router = Router();

  // Unified OTP — accepts email or E.164 phone, auto-detects channel
  router.post("/otp/send", authRateLimit, controller.sendOtpByIdentifier);
  router.post("/otp/verify", authRateLimit, controller.verifyOtpByIdentifier);

  router.post("/refresh", controller.refresh);
  router.post("/logout", controller.logout);

  return router;
}
