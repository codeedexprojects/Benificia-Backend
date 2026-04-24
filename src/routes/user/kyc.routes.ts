import { Router } from "express";
import { requireUser } from "../../middleware/auth.middleware";
import type { KycController } from "../../modules/kyc/kyc.controller";

export function kycRoutes(controller: KycController): Router {
  const router = Router();

  router.use(requireUser);

  router.post("/send-otp", controller.sendOtp);
  router.post("/verify-otp", controller.verifyOtp);
  router.post("/confirm", controller.confirmKyc);
  router.post("/confirm", controller.confirmKyc);

  return router;
}
