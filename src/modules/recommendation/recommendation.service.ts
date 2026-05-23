import { randomUUID } from "crypto";
import type { RecommendationRepository } from "./recommendation.repository";
import {
  callAiRecommendations,
  type AiRecommendationItem,
  type AiRecommendationResponse,
} from "../../utils/ai-client";
import { BadRequestError, NotFoundError } from "../../utils/errors";
import type { InsuranceType } from "@prisma/client";

const ALLOWED_STAGES = new Set([
  "fact_finding_complete",
  "recommendations_ready",
]);

const TOP_N = 5;

// ── Vertical detection ────────────────────────────────────────
// Derives which AI verticals to call purely from collected fact-finding data.
// Returns one or both of "health" | "investment".
function determineVerticals(userContext: Record<string, unknown>): string[] {
  const monthlyIncome = (userContext["monthly_income"] as number) ?? 0;
  const insuranceMonthly = (userContext["insurance_monthly"] as number) ?? 0;
  const dependents = (userContext["number_of_dependents"] as number) ?? 0;
  const investmentAsset = (userContext["investment"] as number) ?? 0;
  const savingsRatio = (userContext["savings_ratio_pct"] as number) ?? 0;
  const riskCategory = (userContext["risk_category"] as string) ?? null;
  const financialAims = (userContext["financial_aims"] as string[]) ?? [];

  const INVESTMENT_AIMS = new Set([
    "retirement",
    "wealth_building",
    "home_ownership",
    "education",
  ]);

  // Health/insurance gap: no or zero existing coverage and has income / dependents
  const needsHealth =
    (insuranceMonthly === 0 && monthlyIncome > 0) || dependents > 0;

  // Investment gap: no existing investments, surplus available, goals align, or risk-tolerant
  const needsInvestment =
    (investmentAsset === 0 && savingsRatio > 0) ||
    financialAims.some((a) => INVESTMENT_AIMS.has(a)) ||
    riskCategory === "aggressive" ||
    riskCategory === "moderate";

  if (needsHealth && needsInvestment) return ["health", "investment"];
  if (needsInvestment) return ["investment"];
  // Default to health when no clear investment signal
  return ["health"];
}

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

    const userContext: Record<string, unknown> = {
      user_id: ctx.id,
      gender: profile?.gender ?? null,
      marital_status: profile?.maritalStatus ?? null,
      age: profile?.age ?? null,
      city: profile?.city ?? null,
      state: profile?.state ?? null,
      income_sources: incomeSrc?.incomeSources ?? [],
      salary_monthly: income?.salaryMonthly ?? 0,
      freelance_monthly: income?.freelanceMonthly ?? 0,
      business_monthly: income?.businessMonthly ?? 0,
      other_monthly: income?.otherMonthly ?? 0,
      monthly_income: income?.totalMonthly ?? 0,
      annual_income: (income?.totalMonthly ?? 0) * 12,
      monthly_expenses: finance?.totalMonthlyExpenses ?? 0,
      monthly_surplus: finance?.monthlySurplus ?? 0,
      savings_ratio_pct: finance?.savingsRatioPct ?? 0,
      insurance_monthly: finance?.insuranceMonthly ?? 0,
      number_of_dependents: finance?.numberOfDependents ?? 0,
      total_short_term_liabilities: finance?.totalShortTermLiabilities ?? 0,
      total_long_term_liabilities: finance?.totalLongTermLiabilities ?? 0,
      total_assets: assets?.totalAssets ?? 0,
      residential_property: assets?.residentialProperty ?? 0,
      investment: assets?.investment ?? 0,
      savings_bank: assets?.savingsBank ?? 0,
      gold_jewelry: assets?.goldJewelry ?? 0,
      retirement_funds: assets?.retirementFunds ?? 0,
      other_assets: assets?.otherAssets ?? 0,
      financial_aims: ctx.goalsProfile?.financialAims ?? [],
      time_horizon: ctx.goalsProfile?.timeHorizon ?? null,
      risk_category: ctx.riskProfile?.riskCategory ?? null,
      portfolio_drop: ctx.riskProfile?.portfolioDrop ?? null,
      investment_style: ctx.riskProfile?.investmentStyle ?? null,
      market_feeling: ctx.riskProfile?.marketFeeling ?? null,
    };

    const verticals = determineVerticals(userContext);
    const requestId = randomUUID();
    const version = (await this.repo.getVersionCount(userId)) + 1;

    // Call AI for each required vertical in parallel
    const aiCalls = verticals.map((vertical) =>
      callAiRecommendations({
        request_id: `${requestId}-${vertical}`,
        vertical,
        user_context: userContext,
        top_n: TOP_N,
      }).then((res) => ({ vertical, res })),
    );

    const results = await Promise.all(aiCalls);

    const healthResult =
      results.find((r) => r.vertical === "health")?.res ?? null;
    const investmentResult =
      results.find((r) => r.vertical === "investment")?.res ?? null;

    const saved = await this.repo.saveRecommendation({
      userId,
      insuranceOutput: healthResult ?? {},
      investmentOutput: investmentResult ?? {},
      fullPayloadSent: {
        request_id: requestId,
        verticals,
        user_context: userContext,
      },
      version,
    });

    if (ctx.profileStage === "fact_finding_complete") {
      await this.repo.advanceStage(userId);
    }

    return {
      id: saved.id,
      status: saved.status,
      version: saved.version,
      generatedAt: saved.generatedAt,
      verticals,
      health: healthResult?.recommendations ?? [],
      investment: investmentResult?.recommendations ?? [],
      meta: buildMeta(results.map((r) => r.res)),
    };
  }

  // ── Express interest (Get Quotes) ─────────────────────────

  async expressInterest(
    userId: string,
    planId: string,
    planInfo: {
      name: string;
      category?: string;
      coverageAmount?: number | null;
      reasoning?: string;
      matchTags?: string[];
      planSnapshot?: Record<string, unknown>;
    },
  ) {
    let product = await this.repo.findProductByPlanId(planId);

    if (!product) {
      const type = mapCategoryToType(planInfo.category ?? "");
      const created = await this.repo.upsertProductFromAi({
        externalId: planId,
        name: planInfo.name,
        type,
        coverageAmount: planInfo.coverageAmount ?? null,
      });
      product = {
        id: created.id,
        name: planInfo.name,
        type,
        coverageAmount: planInfo.coverageAmount ?? null,
      };
    }

    const metadata = {
      category: planInfo.category,
      reasoning: planInfo.reasoning,
      matchTags: planInfo.matchTags,
      ...(planInfo.planSnapshot ?? {}),
    };

    return this.repo.upsertInterest(userId, product.id, metadata);
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

    if (!rec.viewedAt) {
      await this.repo.markViewed(rec.id);
    }

    const healthRecs = extractRecommendations(rec.insuranceOutput);
    const investmentRecs = extractRecommendations(rec.investmentOutput);

    const verticals: string[] = [];
    if (healthRecs.length > 0) verticals.push("health");
    if (investmentRecs.length > 0) verticals.push("investment");

    return {
      available: true,
      id: rec.id,
      status: rec.status,
      version: rec.version,
      generatedAt: rec.generatedAt,
      viewedAt: rec.viewedAt,
      verticals,
      health: healthRecs,
      investment: investmentRecs,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────

function extractRecommendations(output: unknown): AiRecommendationItem[] {
  if (!output || typeof output !== "object") return [];
  const o = output as { recommendations?: AiRecommendationItem[] };
  return Array.isArray(o.recommendations) ? o.recommendations : [];
}

function buildMeta(results: AiRecommendationResponse[]) {
  if (results.length === 0) return null;
  // Surface meta from the first available call
  const first = results[0]!;
  return {
    llmProvider: first.llm_provider,
    model: first.model,
    totalLatencyMs: results.reduce((sum, r) => sum + r.latency_ms, 0),
  };
}

function mapCategoryToType(category: string): InsuranceType {
  const c = category.toLowerCase();
  if (c.includes("health") || c.includes("medical") || c.includes("mediclaim"))
    return "health";
  if (c.includes("term") || c.includes("life")) return "term";
  if (c.includes("ulip")) return "ulip";
  if (c.includes("endowment")) return "endowment";
  if (c.includes("vehicle") || c.includes("motor") || c.includes("car"))
    return "vehicle";
  return "term";
}
