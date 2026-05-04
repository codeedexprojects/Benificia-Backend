import { Router } from "express";
import { requireUser } from "../../middleware/auth.middleware";
import type { DashboardController } from "../../modules/dashboard/dashboard.controller";

export function dashboardRoutes(controller: DashboardController): Router {
  const router = Router();
  router.use(requireUser);

  router.get("/overview", controller.getOverview);
  router.get("/cash-flow", controller.getCashFlow);
  router.get("/assets", controller.getAssetsChart);
  router.get("/insurance", controller.getInsuranceCoverage);
  router.get("/goals", controller.getGoalsTracker);
  router.get("/risk-profile", controller.getRiskProfile);

  return router;
}
