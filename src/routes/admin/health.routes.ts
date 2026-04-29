import { Router } from "express";
import type { HealthController } from "../../modules/health/health.controller";
import { requireAdmin } from "../../middleware/admin.middleware";

export function adminHealthRoutes(controller: HealthController): Router {
  const router = Router();

  router.use(requireAdmin);

  router.get("/", controller.adminList);
  router.post("/", controller.create);
  router.get("/:id", controller.adminGetById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);

  return router;
}
