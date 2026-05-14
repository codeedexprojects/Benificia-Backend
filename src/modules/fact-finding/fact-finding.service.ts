import type { FactFindingRepository } from "./fact-finding.repository";
import type { z } from "zod";
import type {
  incomeSourcesSchema,
  financeProfileSchema,
  incomeAmountSchema,
  expensesSchema,
  assetsSchema,
  riskSchema,
} from "./fact-finding.schema";
import { ForbiddenError, BadRequestError } from "../../utils/errors";
import { getCompletionStatus } from "../../utils/profile-completion";
import type { ProfileStage } from "@prisma/client";
import type { RecommendationService } from "../recommendation/recommendation.service";

const asStage = (s: string) => s as ProfileStage;

type ProfileStageStr = string;

const STAGE_ORDER: Record<string, number> = {
  personal_complete: 0,
  fact_finding_income_sources: 1,
  fact_finding_dependents: 2,
  fact_finding_liabilities: 3,
  fact_finding_insurance: 4,
  fact_finding_income_amount: 5,
  fact_finding_expenses: 6,
  fact_finding_assets: 7,
  fact_finding_complete: 8,
  recommendations_ready: 9,
};

const COMPLETE_STAGES = new Set([
  "fact_finding_complete",
  "recommendations_ready",
]);

function assertNotComplete(stage: ProfileStageStr): void {
  if (COMPLETE_STAGES.has(stage)) {
    throw new BadRequestError(
      "Fact-finding is already complete. Head to your dashboard.",
    );
  }
}

function shouldAdvanceStage(
  current: ProfileStageStr,
  requiredBefore: ProfileStageStr,
): boolean {
  return current === requiredBefore;
}

function assertAtLeast(
  current: ProfileStageStr,
  minimumStage: ProfileStageStr,
  errorMsg: string,
): void {
  if ((STAGE_ORDER[current] ?? -1) < (STAGE_ORDER[minimumStage] ?? 0)) {
    throw new ForbiddenError(errorMsg);
  }
}

function computeIncomeAmount(raw: z.infer<typeof incomeAmountSchema>) {
  const totalMonthly =
    raw.salaryMonthly +
    raw.freelanceMonthly +
    raw.businessMonthly +
    raw.otherMonthly;
  return { ...raw, totalMonthly };
}

function computeExpenses(
  raw: z.infer<typeof expensesSchema>,
  incomeMonthly: number,
) {
  const monthlySurplus = incomeMonthly - raw.totalMonthly;
  const savingsRatioPct =
    incomeMonthly > 0
      ? parseFloat(((monthlySurplus / incomeMonthly) * 100).toFixed(2))
      : 0;
  return { ...raw, monthlySurplus, savingsRatioPct };
}

function computeAssets(raw: z.infer<typeof assetsSchema>) {
  const totalAssets =
    raw.residentialProperty +
    raw.investment +
    raw.savingsBank +
    raw.goldJewelry +
    raw.retirementFunds +
    raw.otherAssets;
  return { totalAssets };
}

function deriveRiskCategory(
  portfolioDrop: string,
  investmentStyle: string,
  marketFeeling: string,
): "conservative" | "moderate" | "aggressive" {
  let score = 0;

  if (portfolioDrop === "buy_more") score += 2;
  else if (portfolioDrop === "wait_it_out") score += 1;

  if (investmentStyle === "aggressive") score += 2;
  else if (investmentStyle === "moderate") score += 1;

  if (marketFeeling === "excited") score += 2;
  else if (marketFeeling === "neutral") score += 1;

  if (score >= 5) return "aggressive";
  if (score >= 2) return "moderate";
  return "conservative";
}

export class FactFindingService {
  constructor(
    private readonly repo: FactFindingRepository,
    private readonly recommendationService: RecommendationService,
  ) {}

  async saveIncomeSources(
    userId: string,
    input: z.infer<typeof incomeSourcesSchema>,
  ) {
    const user = await this.repo.findUserStage(userId);
    const stage = user?.profileStage ?? "";

    assertNotComplete(stage);
    assertAtLeast(
      stage,
      "personal_complete",
      "Please complete your personal details first",
    );

    const advance = shouldAdvanceStage(stage, "personal_complete");
    await this.repo.upsertIncomeSources(userId, input, advance);

    const nextStage = advance
      ? asStage("fact_finding_income_sources")
      : (stage as ProfileStage);
    return {
      message: "Income sources saved",
      completion: getCompletionStatus(nextStage),
    };
  }

  async saveFinanceProfile(
    userId: string,
    input: z.infer<typeof financeProfileSchema>,
  ) {
    const user = await this.repo.findUserStage(userId);
    const stage = user?.profileStage ?? "";

    assertNotComplete(stage);
    assertAtLeast(
      stage,
      "fact_finding_income_sources",
      "Please complete income sources first",
    );

    const advance = shouldAdvanceStage(stage, "fact_finding_income_sources");
    await this.repo.upsertFinanceProfile(userId, input, advance);

    const nextStage = advance
      ? asStage("fact_finding_dependents")
      : (stage as ProfileStage);
    return {
      message: "Finance profile saved",
      completion: getCompletionStatus(nextStage),
    };
  }

  async saveIncomeAmount(
    userId: string,
    input: z.infer<typeof incomeAmountSchema>,
  ) {
    const user = await this.repo.findUserStage(userId);
    const stage = user?.profileStage ?? "";

    assertNotComplete(stage);
    assertAtLeast(
      stage,
      "fact_finding_dependents",
      "Please complete the finance profile step first",
    );

    const data = computeIncomeAmount(input);
    const advance = shouldAdvanceStage(stage, "fact_finding_dependents");
    await this.repo.upsertIncomeAmount(userId, data, advance);

    const nextStage = advance
      ? asStage("fact_finding_income_amount")
      : (stage as ProfileStage);
    return {
      message: "Income amount saved",
      totalMonthly: data.totalMonthly,
      completion: getCompletionStatus(nextStage),
    };
  }

  async saveExpenses(userId: string, input: z.infer<typeof expensesSchema>) {
    const user = await this.repo.findUserStage(userId);
    const stage = user?.profileStage ?? "";

    assertNotComplete(stage);
    assertAtLeast(
      stage,
      "fact_finding_income_amount",
      "Please complete income amount before adding expenses",
    );

    const income = await this.repo.findIncomeAmountProfile(userId);
    const data = computeExpenses(input, income?.totalMonthly ?? 0);
    const advance = shouldAdvanceStage(stage, "fact_finding_income_amount");
    await this.repo.upsertExpenses(userId, data, advance);

    const nextStage = advance
      ? asStage("fact_finding_expenses")
      : (stage as ProfileStage);
    return {
      message: "Expense details saved",
      totalMonthly: input.totalMonthly,
      monthlySurplus: data.monthlySurplus,
      savingsRatioPct: data.savingsRatioPct,
      completion: getCompletionStatus(nextStage),
    };
  }

  async saveAssets(userId: string, input: z.infer<typeof assetsSchema>) {
    const user = await this.repo.findUserStage(userId);
    const stage = user?.profileStage ?? "";

    assertNotComplete(stage);
    assertAtLeast(
      stage,
      "fact_finding_expenses",
      "Please complete expense details before adding assets",
    );

    const computed = computeAssets(input);
    const advance = shouldAdvanceStage(stage, "fact_finding_expenses");
    await this.repo.upsertAssets(userId, input, computed, advance);

    const nextStage = advance
      ? asStage("fact_finding_assets")
      : (stage as ProfileStage);
    return {
      message: "Assets saved",
      totalAssets: computed.totalAssets,
      completion: getCompletionStatus(nextStage),
    };
  }

  async saveRisk(userId: string, input: z.infer<typeof riskSchema>) {
    const user = await this.repo.findUserStage(userId);
    const stage = user?.profileStage ?? "";

    assertNotComplete(stage);
    assertAtLeast(
      stage,
      "fact_finding_assets",
      "Please complete the assets step before the risk assessment",
    );

    const riskCategory = deriveRiskCategory(
      input.portfolioDrop,
      input.investmentStyle,
      input.marketFeeling,
    );

    await this.repo.upsertRisk(userId, { ...input, riskCategory });

    const recommendation = await this.recommendationService.generate(userId);

    return {
      message: "Risk profile saved",
      riskCategory,
      completion: getCompletionStatus("fact_finding_complete"),
      destination: "dashboard",
      recommendation: {
        id: recommendation.id,
        recommendations: recommendation.recommendations,
      },
    };
  }

  async getStatus(userId: string) {
    const data = await this.repo.findAllFactFindingData(userId);
    return {
      currentStage: data.profileStage,
      completion: data.profileStage
        ? getCompletionStatus(asStage(data.profileStage))
        : null,
      savedData: {
        incomeSources: data.incomeSources,
        financeProfile: data.financeProfile,
        incomeAmount: data.incomeAmount,
        expenses: data.expenses,
        assets: data.assets,
        risk: data.risk,
      },
    };
  }
}
