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
    const assets = ctx.assetLiabilityProfile;
    const finance = ctx.financeProfile;
    const incomeSrc = ctx.incomeSourcesProfile;

    // Build user_context payload for the AI server
    const userContext: Record<string, unknown> = {
      user_id: ctx.id,
      // Demographics
      gender: profile?.gender ?? null,
      marital_status: profile?.maritalStatus ?? null,
      age: profile?.age ?? null,
      city: profile?.city ?? null,
      state: profile?.state ?? null,
      // Income
      income_sources: incomeSrc?.incomeSources ?? [],
      salary_monthly: income?.salaryMonthly ?? 0,
      freelance_monthly: income?.freelanceMonthly ?? 0,
      business_monthly: income?.businessMonthly ?? 0,
      other_monthly: income?.otherMonthly ?? 0,
      monthly_income: income?.totalMonthly ?? 0,
      annual_income: (income?.totalMonthly ?? 0) * 12,
      // Expenses & liabilities
      monthly_expenses: finance?.totalMonthlyExpenses ?? 0,
      monthly_surplus: finance?.monthlySurplus ?? 0,
      savings_ratio_pct: finance?.savingsRatioPct ?? 0,
      insurance_monthly: finance?.insuranceMonthly ?? 0,
      number_of_dependents: finance?.numberOfDependents ?? 0,
      total_short_term_liabilities: finance?.totalShortTermLiabilities ?? 0,
      total_long_term_liabilities: finance?.totalLongTermLiabilities ?? 0,
      // Assets
      total_assets: assets?.totalAssets ?? 0,
      residential_property: assets?.residentialProperty ?? 0,
      investment: assets?.investment ?? 0,
      savings_bank: assets?.savingsBank ?? 0,
      gold_jewelry: assets?.goldJewelry ?? 0,
      retirement_funds: assets?.retirementFunds ?? 0,
      other_assets: assets?.otherAssets ?? 0,
      // Goals
      financial_aims: ctx.goalsProfile?.financialAims ?? [],
      time_horizon: ctx.goalsProfile?.timeHorizon ?? null,
      // Risk
      risk_category: ctx.riskProfile?.riskCategory ?? null,
      portfolio_drop: ctx.riskProfile?.portfolioDrop ?? null,
      investment_style: ctx.riskProfile?.investmentStyle ?? null,
      market_feeling: ctx.riskProfile?.marketFeeling ?? null,
    };

    const requestId = randomUUID();
    const version = (await this.repo.getVersionCount(userId)) + 1;

    const result = await callAiRecommendations({
      request_id: requestId,
      vertical: "health",
      user_context: userContext,
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
