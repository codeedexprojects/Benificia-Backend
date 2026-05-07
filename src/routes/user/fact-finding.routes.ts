import { Router } from "express";
import { requireUser } from "../../middleware/auth.middleware";
import type { FactFindingController } from "../../modules/fact-finding/fact-finding.controller";

export function factFindingRoutes(controller: FactFindingController): Router {
  const router = Router();

  router.use(requireUser);

  // GET — current stage + all saved answers (for Previous/Edit pre-fill)
  router.get("/status", controller.getStatus);

  // Finance section (in order)
  router.post("/income-sources", controller.saveIncomeSources); // Finance 1
  router.post("/finance-profile", controller.saveFinanceProfile); // Finance 2: dependents + liabilities + insurance
  router.post("/income-amount", controller.saveIncomeAmount); // Finance 3
  router.post("/expenses", controller.saveExpenses); // Finance 4
  router.post("/assets", controller.saveAssets); // Finance 5 (skippable)

  // Risk section (all 5 questions submitted together)
  router.post("/risk", controller.saveRisk);

  return router;
}
