import { Router } from "express";
import { authRateLimit } from "../../middleware/rateLimit.middleware";
import type { UserController } from "../../modules/user/user.controller";

export function authRoutes(controller: UserController): Router {
  const router = Router();

  // Email OTP
  router.post("/send-otp", authRateLimit, controller.sendOtp);
  router.post("/verify-otp", authRateLimit, controller.verifyOtp);

  // Phone OTP (login only — registration requires email first)
  router.post("/phone/send-otp", authRateLimit, controller.sendPhoneOtp);
  router.post("/phone/verify-otp", authRateLimit, controller.verifyPhoneOtp);

  router.post("/refresh", controller.refresh);
  router.post("/logout", controller.logout);

  return router;
}
