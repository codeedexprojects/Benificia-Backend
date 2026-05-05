import { Router } from "express";
import type { AiAdminController } from "../../modules/ai-admin/ai-admin.controller";

export function aiAdminRoutes(controller: AiAdminController): Router {
  const router = Router();

  // ── Plans (public/internal read) ────────────────────────────
  router.get("/plans", controller.listPlans);
  router.get("/plans/slug/:slug", controller.getPlanBySlug);
  router.get("/plans/:plan_id", controller.getPlan);

  // ── Plans (admin write) ─────────────────────────────────────
  router.get("/plans-all", controller.adminListPlans);
  router.patch("/plans/:plan_id", controller.updatePlan);
  router.delete("/plans/:plan_id", controller.deletePlan);

  // ── Plan Query Queue ────────────────────────────────────────
  router.post("/plans/query", controller.queryPlansFromLlm);
  router.get("/plans/query-queue", controller.listQueryQueue);
  router.get("/plans/query/:queue_id", controller.viewPendingQuery);
  router.patch("/plans/query/:queue_id/approve", controller.approvePlans);
  router.patch("/plans/query/:queue_id/reject", controller.rejectPlans);

  // ── Providers & Verticals ───────────────────────────────────
  router.get("/providers", controller.listProviders);
  router.get("/verticals", controller.listVerticals);

  // ── Recommendation Logs ─────────────────────────────────────
  router.get("/recommendation-logs", controller.listRecommendationLogs);
  router.get(
    "/recommendation-logs/:request_id",
    controller.getRecommendationLog,
  );
  router.get(
    "/recommendation-logs-admin",
    controller.adminListRecommendationLogs,
  );

  // ── Analytics ───────────────────────────────────────────────
  router.get("/analytics/top-plans", controller.getTopPlans);
  router.get("/analytics/success-rate", controller.getSuccessRate);

  // ── Prompt Templates ────────────────────────────────────────
  router.get("/prompts", controller.listPrompts);
  router.post("/prompts", controller.createPrompt);
  router.patch("/prompts/:template_id", controller.updatePrompt);
  router.patch("/prompts/:template_id/activate", controller.activatePrompt);

  // ── Audit Logs ──────────────────────────────────────────────
  router.get("/audit-logs", controller.listAuditLogs);

  // ── AI System Health ────────────────────────────────────────
  router.get("/ai-health", controller.aiHealth);

  return router;
}
