import { Router } from "express";
import { requireUser } from "../../middleware/auth.middleware";
import type { ExpertRequestController } from "../../modules/expert-request/expert-request.controller";

export function expertRequestRoutes(
  controller: ExpertRequestController,
): Router {
  const router = Router();
  router.post("/", requireUser, controller.submit);
  router.get("/status", requireUser, controller.getStatus);
  return router;
}
