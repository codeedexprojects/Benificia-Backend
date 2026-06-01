import { Router } from "express";
import type { ExpertRequestController } from "../../modules/expert-request/expert-request.controller";

export function adminExpertRequestRoutes(
  controller: ExpertRequestController,
): Router {
  const router = Router();
  router.get("/", controller.list);
  router.get("/summary", controller.getSummary);
  router.get("/unread-count", controller.getUnreadCount);
  router.patch("/:id/status", controller.updateStatus);
  router.delete("/:id", controller.delete);
  return router;
}
