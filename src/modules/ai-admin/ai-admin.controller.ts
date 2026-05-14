import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import {
  aiAdminGet,
  aiAdminPost,
  aiAdminPatch,
  aiAdminDelete,
} from "../../utils/ai-admin-client";

export class AiAdminController {
  // ── Plans (Internal API) ────────────────────────────────────

  listPlans = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminGet(
      "/api/v1/plans",
      req.query as Record<string, unknown>,
    );
    sendSuccess(res, data);
  };

  getPlan = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminGet(`/api/v1/plans/${req.params["plan_id"]}`);
    sendSuccess(res, data);
  };

  getPlanBySlug = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminGet(`/api/v1/plans/slug/${req.params["slug"]}`);
    sendSuccess(res, data);
  };

  // ── Plans (Admin API) ───────────────────────────────────────

  adminListPlans = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminGet(
      "/admin/v1/plans",
      req.query as Record<string, unknown>,
    );
    sendSuccess(res, data);
  };

  updatePlan = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminPatch(
      `/admin/v1/plans/${req.params["plan_id"]}`,
      req.body,
    );
    sendSuccess(res, data);
  };

  deletePlan = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminDelete(
      `/admin/v1/plans/${req.params["plan_id"]}`,
    );
    sendSuccess(res, data);
  };

  // ── Plan Query Queue ────────────────────────────────────────

  queryPlansFromLlm = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminPost("/admin/v1/plans/query", {
      ...req.body,
      admin_id: req.admin!.id,
    });
    sendSuccess(res, data);
  };

  listQueryQueue = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminGet(
      "/admin/v1/plans/query-queue",
      req.query as Record<string, unknown>,
    );
    sendSuccess(res, data);
  };

  viewPendingQuery = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminGet(
      `/admin/v1/plans/query/${req.params["queue_id"]}`,
    );
    sendSuccess(res, data);
  };

  approvePlans = async (req: Request, res: Response): Promise<void> => {
    const queueId = req.params["queue_id"];

    // Fetch the queue item to get its query_text — the AI server requires
    // either `query` or `template` in the approve body.
    const queueItem = await aiAdminGet<{
      query_text?: string;
      provider_name?: string;
    }>(`/admin/v1/plans/query/${queueId}`);

    const body: Record<string, unknown> = { admin_id: req.admin!.id };
    if (queueItem.query_text) body["query"] = queueItem.query_text;
    if (queueItem.provider_name) body["provider"] = queueItem.provider_name;

    const data = await aiAdminPatch(
      `/admin/v1/plans/query/${queueId}/approve`,
      body,
    );
    sendSuccess(res, data);
  };

  rejectPlans = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminPatch(
      `/admin/v1/plans/query/${req.params["queue_id"]}/reject`,
      req.body,
    );
    sendSuccess(res, data);
  };

  // ── Providers ───────────────────────────────────────────────

  listProviders = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminGet("/api/v1/providers");
    sendSuccess(res, data);
  };

  listVerticals = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminGet("/api/v1/verticals");
    sendSuccess(res, data);
  };

  // ── Recommendations (Internal API) ─────────────────────────

  listRecommendationLogs = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await aiAdminGet(
      "/api/v1/recommendations",
      req.query as Record<string, unknown>,
    );
    sendSuccess(res, data);
  };

  getRecommendationLog = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminGet(
      `/api/v1/recommendations/${req.params["request_id"]}`,
    );
    sendSuccess(res, data);
  };

  getTopPlans = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminGet(
      "/api/v1/recommendations/analytics/top-plans",
      req.query as Record<string, unknown>,
    );
    sendSuccess(res, data);
  };

  getSuccessRate = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminGet(
      "/api/v1/recommendations/analytics/success-rate",
      req.query as Record<string, unknown>,
    );
    sendSuccess(res, data);
  };

  // ── Recommendation Logs (Admin API) ────────────────────────

  adminListRecommendationLogs = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await aiAdminGet(
      "/admin/v1/recommendation-logs",
      req.query as Record<string, unknown>,
    );
    sendSuccess(res, data);
  };

  // ── Prompt Templates ────────────────────────────────────────

  listPrompts = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminGet(
      "/admin/v1/prompts",
      req.query as Record<string, unknown>,
    );
    sendSuccess(res, data);
  };

  createPrompt = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminPost("/admin/v1/prompts", req.body);
    sendSuccess(res, data);
  };

  updatePrompt = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminPatch(
      `/admin/v1/prompts/${req.params["template_id"]}`,
      req.body,
    );
    sendSuccess(res, data);
  };

  activatePrompt = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminPatch(
      `/admin/v1/prompts/${req.params["template_id"]}/activate`,
    );
    sendSuccess(res, data);
  };

  // ── Audit Logs ──────────────────────────────────────────────

  listAuditLogs = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminGet(
      "/admin/v1/audit-logs",
      req.query as Record<string, unknown>,
    );
    sendSuccess(res, data);
  };

  // ── Templates ───────────────────────────────────────────────

  getTemplatesMetadata = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminGet("/admin/v1/templates/metadata");
    sendSuccess(res, data);
  };

  // ── AI Health ───────────────────────────────────────────────

  aiHealth = async (req: Request, res: Response): Promise<void> => {
    const data = await aiAdminGet("/admin/v1/health");
    sendSuccess(res, data);
  };
}
