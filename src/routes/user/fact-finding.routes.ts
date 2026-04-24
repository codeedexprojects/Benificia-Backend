import { Router } from "express";
import { requireUser } from "../../middleware/auth.middleware";
import type { FactFindingController } from "../../modules/fact-finding/fact-finding.controller";

export function factFindingRoutes(controller: FactFindingController): Router {
  const router = Router();

  router.use(requireUser);

  router.post("/income", controller.saveIncome);
  router.post("/expenses", controller.saveExpenses);
  router.post("/assets", controller.saveAssets);
  router.post("/goals", controller.saveGoals);
  router.post("/risk", controller.saveRisk);

  return router;
}
