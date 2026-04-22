import { Router } from "express";
import { authRateLimit } from "../../middleware/rateLimit.middleware";
import type { UserController } from "../../modules/user/user.controller";

export function authRoutes(controller: UserController): Router {
  const router = Router();

  router.post("/send-otp", authRateLimit, controller.sendOtp);
  router.post("/verify-otp", authRateLimit, controller.verifyOtp);
  router.post("/refresh", controller.refresh);
  router.post("/logout", controller.logout);

  return router;
}
