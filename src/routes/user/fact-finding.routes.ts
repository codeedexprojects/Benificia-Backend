import { Router } from "express";
import { requireUser } from "../../middleware/auth.middleware";
import type { FactFindingController } from "../../modules/fact-finding/fact-finding.controller";

export function factFindingRoutes(controller: FactFindingController): Router {
  const router = Router();

  router.use(requireUser);

  // GET — current stage + all saved answers (for Previous/Edit pre-fill)
  router.get("/status", controller.getStatus);

  // Finance section (in order)
  router.post("/income", controller.saveIncome); // Finance 1: income sources + amounts
  router.post("/finance-profile", controller.saveFinanceProfile); // Finance 2: dependents + spend + insurance + liabilities
  router.post("/goals", controller.saveGoals); // Finance 3: financial aims + time horizon

  // Page 5: risk assessment (optional — can skip)
  router.post("/risk", controller.saveRisk);
  router.post("/risk/skip", controller.skipRisk);

  return router;
}
