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

    // Build user_context payload for the AI server
    const userContext: Record<string, unknown> = {
      user_id: ctx.id,
      // Demographics
      gender: profile?.gender ?? null,
      marital_status: profile?.maritalStatus ?? null,
      number_of_dependents: profile?.numberOfDependents ?? 0,
      children_ages: profile?.childrenAges ?? [],
      occupation: profile?.occupation ?? null,
      income_type: profile?.incomeType ?? null,
      city: profile?.city ?? null,
      state: profile?.state ?? null,
      retirement_age: profile?.retirementAge ?? 60,
      is_primary_earner: profile?.isPrimaryEarner ?? true,
      dependents_rely_on_income: profile?.dependentsRelyOnIncome ?? true,
      // Income
      monthly_income: income?.totalMonthly ?? 0,
      annual_income: income ? income.totalMonthly * 12 + income.annualBonus : 0,
      annual_bonus: income?.annualBonus ?? 0,
      expected_income_growth_pct: income?.expectedGrowthPct ?? 5,
      // Expenses
      monthly_expenses: expense?.totalMonthly ?? 0,
      monthly_surplus: expense?.monthlySurplus ?? 0,
      savings_ratio_pct: expense?.savingsRatioPct ?? 0,
      total_emi: expense
        ? expense.rentOrHomeLoanEmi +
          expense.vehicleLoanEmi +
          expense.otherLoanEmis
        : 0,
      existing_premiums_monthly: expense?.existingPremiums ?? 0,
      // Assets & liabilities
      total_assets: assets?.totalAssets ?? 0,
      total_liabilities: assets?.totalLiabilities ?? 0,
      net_worth: assets?.netWorth ?? 0,
      cash_savings: assets?.cashSavings ?? 0,
      fixed_deposits: assets?.fixedDeposits ?? 0,
      mutual_funds_stocks: assets?.mutualFundsStocks ?? 0,
      gold_value: assets?.goldValue ?? 0,
      real_estate_value: assets?.realEstateValue ?? 0,
      epf_ppf_balance: assets?.epfPpfBalance ?? 0,
      home_loan_outstanding: assets?.homeLoanOutstanding ?? 0,
      vehicle_loan_outstanding: assets?.vehicleLoanOutstanding ?? 0,
      personal_loan_outstanding: assets?.personalLoanOutstanding ?? 0,
      credit_card_outstanding: assets?.creditCardOutstanding ?? 0,
      existing_life_cover: assets?.existingLifeCover ?? 0,
      existing_health_cover: assets?.existingHealthCover ?? 0,
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
      risk_score: ctx.riskProfile?.totalScore ?? null,
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
