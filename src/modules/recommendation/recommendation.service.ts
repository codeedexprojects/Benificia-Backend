import { randomUUID } from "crypto";
import type { RecommendationRepository } from "./recommendation.repository";
import { callAiRecommendations } from "../../utils/ai-client";
import { BadRequestError, NotFoundError } from "../../utils/errors";

const ALLOWED_STAGES = new Set([
  "fact_finding_complete",
  "recommendations_ready",
]);

const TOP_N = 5;

export class RecommendationService {
  constructor(private readonly repo: RecommendationRepository) {}

  // ── Generate (calls AI server) ─────────────────────────────

  async generate(userId: string) {
    const ctx = await this.repo.getUserContext(userId);
    if (!ctx) throw new NotFoundError("User not found");

    if (!ALLOWED_STAGES.has(ctx.profileStage)) {
      throw new BadRequestError(
        "Please complete all fact-finding steps before generating recommendations",
      );
    }

    const profile = ctx.profile;
    const income = ctx.incomeProfile;
    const expense = ctx.expenseProfile;
    const assets = ctx.assetLiabilityProfile;

    const assetMap = Object.fromEntries(
      (assets?.assets ?? []).map((a) => [a.assetType, a.amount]),
    );

    // Build user_context payload for the AI server
    const userContext: Record<string, unknown> = {
      user_id: ctx.id,
      // Demographics
      gender: profile?.gender ?? null,
      marital_status: profile?.maritalStatus ?? null,
      year_of_birth: profile?.yob ?? null,
      number_of_members: profile?.numberOfMembers ?? 1,
      number_of_dependents: profile?.numberOfDependents ?? 0,
      city: profile?.city ?? null,
      state: profile?.state ?? null,
      // Income
      income_sources: income?.incomeSources ?? [],
      salary_monthly: income?.salaryMonthly ?? 0,
      freelance_monthly: income?.freelanceMonthly ?? 0,
      business_monthly: income?.businessMonthly ?? 0,
      passive_monthly: income?.passiveMonthly ?? 0,
      other_monthly: income?.otherMonthly ?? 0,
      monthly_income: income?.totalMonthly ?? 0,
      annual_income: (income?.totalMonthly ?? 0) * 12,
      // Expenses
      monthly_expenses: expense?.totalMonthly ?? 0,
      monthly_surplus: expense?.monthlySurplus ?? 0,
      savings_ratio_pct: expense?.savingsRatioPct ?? 0,
      // Assets & liabilities
      total_assets: assets?.totalAssets ?? 0,
      total_liabilities: assets?.totalLiabilities ?? 0,
      net_worth: assets?.netWorth ?? 0,
      liability_types: assets?.liabilityTypes ?? [],
      insurance_coverage_types: assets?.insuranceCoverageTypes ?? [],
      cash_savings: assetMap["cash_savings"] ?? 0,
      fixed_deposits: assetMap["fixed_deposit"] ?? 0,
      mutual_funds_stocks: assetMap["mutual_funds_stocks"] ?? 0,
      gold_value: assetMap["gold"] ?? 0,
      real_estate_value: assetMap["real_estate"] ?? 0,
      epf_ppf_balance: assetMap["epf_ppf"] ?? 0,
      // Goals
      financial_goals: ctx.financialGoals.map((g) => ({
        type: g.type,
        target_amount: g.targetAmount,
        current_saved: g.currentSaved,
        target_years: g.targetYears,
        priority: g.priority,
      })),
      // Risk
      risk_category: ctx.riskProfile?.riskCategory ?? null,
      portfolio_drop: ctx.riskProfile?.portfolioDrop ?? null,
      investment_style: ctx.riskProfile?.investmentStyle ?? null,
      financial_aims: ctx.riskProfile?.financialAims ?? [],
      time_horizon: ctx.riskProfile?.timeHorizon ?? null,
      market_feeling: ctx.riskProfile?.marketFeeling ?? null,
    };

    const requestId = randomUUID();
    const version = (await this.repo.getVersionCount(userId)) + 1;

    const result = await callAiRecommendations({
      request_id: requestId,
      vertical: "health",
      user_context: userContext,
      llm_provider: null as unknown as string,
      top_n: TOP_N,
    });

    const saved = await this.repo.saveRecommendation({
      userId,
      insuranceOutput: result,
      investmentOutput: {},
      fullPayloadSent: { request_id: requestId, user_context: userContext },
      version,
    });

    // Advance profile stage if this is the first generation
    if (ctx.profileStage === "fact_finding_complete") {
      await this.repo.advanceStage(userId);
    }

    return {
      id: saved.id,
      status: saved.status,
      version: saved.version,
      generatedAt: saved.generatedAt,
      recommendations: result.recommendations,
      meta: {
        llmProvider: result.llm_provider,
        model: result.model,
        latencyMs: result.latency_ms,
      },
    };
  }

  // ── Get latest ─────────────────────────────────────────────

  async getLatest(userId: string) {
    const rec = await this.repo.getLatest(userId);
    if (!rec) {
      return {
        available: false,
        message:
          "No recommendations generated yet. Complete fact-finding and generate your recommendations.",
      };
    }

    // Mark as viewed if first time
    if (!rec.viewedAt) {
      await this.repo.markViewed(rec.id);
    }

    return {
      available: true,
      id: rec.id,
      status: rec.status,
      version: rec.version,
      generatedAt: rec.generatedAt,
      viewedAt: rec.viewedAt,
      recommendations:
        (rec.insuranceOutput as { recommendations?: unknown[] })
          ?.recommendations ?? [],
    };
  }
}
