import { Router } from "express";
import { requireUser } from "../../middleware/auth.middleware";
import type { RecommendationController } from "../../modules/recommendation/recommendation.controller";

export function recommendationRoutes(
  controller: RecommendationController,
): Router {
  const router = Router();
  router.use(requireUser);

  router.post("/generate", controller.generate);
  router.get("/latest", controller.getLatest);
  router.post("/interest", controller.expressInterest);

  return router;
}
