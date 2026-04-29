import { Router } from "express";
import type { HealthController } from "../../modules/health/health.controller";

export function healthRoutes(controller: HealthController): Router {
  const router = Router();

  router.get("/", controller.list);
  router.get("/:id", controller.getById);

  return router;
}
