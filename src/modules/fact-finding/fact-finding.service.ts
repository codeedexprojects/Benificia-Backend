import type { FactFindingRepository } from "./fact-finding.repository";
import type { z } from "zod";
import type {
  incomeSchema,
  expensesSchema,
  assetsSchema,
  goalsSchema,
  riskSchema,
} from "./fact-finding.schema";
import { ForbiddenError } from "../../utils/errors";
import { getCompletionStatus } from "../../utils/profile-completion";

type ProfileStageStr = string;

const STAGE_ORDER: Record<string, number> = {
  personal_complete: 0,
  fact_finding_income: 1,
  fact_finding_expenses: 2,
  fact_finding_assets: 3,
  fact_finding_goals: 4,
  fact_finding_risk: 5,
  fact_finding_complete: 6,
  recommendations_ready: 7,
};

function shouldAdvanceStage(
  current: ProfileStageStr,
  requiredBefore: ProfileStageStr,
): boolean {
  return (
    (STAGE_ORDER[current] ?? -1) < (STAGE_ORDER[requiredBefore] ?? 0) + 1 &&
    current === requiredBefore
  );
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

// ── Computed field helpers ────────────────────────────────────

function computeIncome(raw: z.infer<typeof incomeSchema>) {
  const totalMonthly =
    raw.salaryMonthly +
    raw.freelanceMonthly +
    raw.businessMonthly +
    raw.passiveMonthly +
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
  const totalAssets = raw.assets.reduce((sum, a) => sum + a.amount, 0);
  // We don't have liability amounts — totalLiabilities stored as 0 until user provides amounts
  return { totalAssets, totalLiabilities: 0, netWorth: totalAssets };
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

// ── Service ───────────────────────────────────────────────────

export class FactFindingService {
  constructor(private readonly repo: FactFindingRepository) {}

  async saveIncome(userId: string, input: z.infer<typeof incomeSchema>) {
    const user = await this.repo.findUserStage(userId);
    const stage = user?.profileStage ?? "";

    assertAtLeast(
      stage,
      "personal_complete",
      "Please complete your personal details first",
    );

    const data = computeIncome(input);
    const advance = shouldAdvanceStage(stage, "personal_complete");

    await this.repo.upsertIncome(userId, data, advance);

    return {
      message: "Income details saved",
      totalMonthly: data.totalMonthly,
      completion: getCompletionStatus(
        advance ? "fact_finding_income" : (stage as never),
      ),
    };
  }

  async saveExpenses(userId: string, input: z.infer<typeof expensesSchema>) {
    const user = await this.repo.findUserStage(userId);
    const stage = user?.profileStage ?? "";

    assertAtLeast(
      stage,
      "fact_finding_income",
      "Please complete income details before adding expenses",
    );

    const income = await this.repo.findIncomeProfile(userId);
    const data = computeExpenses(input, income?.totalMonthly ?? 0);
    const advance = shouldAdvanceStage(stage, "fact_finding_income");

    await this.repo.upsertExpenses(userId, data, advance);

    return {
      message: "Expense details saved",
      totalMonthly: input.totalMonthly,
      monthlySurplus: data.monthlySurplus,
      savingsRatioPct: data.savingsRatioPct,
      completion: getCompletionStatus(
        advance ? "fact_finding_expenses" : (stage as never),
      ),
    };
  }

  async saveAssets(userId: string, input: z.infer<typeof assetsSchema>) {
    const user = await this.repo.findUserStage(userId);
    const stage = user?.profileStage ?? "";

    assertAtLeast(
      stage,
      "fact_finding_expenses",
      "Please complete expense details before adding assets",
    );

    const computed = computeAssets(input);
    const advance = shouldAdvanceStage(stage, "fact_finding_expenses");

    await this.repo.upsertAssets(userId, input, computed, advance);

    return {
      message: "Assets and liabilities saved",
      totalAssets: computed.totalAssets,
      netWorth: computed.netWorth,
      completion: getCompletionStatus(
        advance ? "fact_finding_assets" : (stage as never),
      ),
    };
  }

  async saveGoals(userId: string, input: z.infer<typeof goalsSchema>) {
    const user = await this.repo.findUserStage(userId);
    const stage = user?.profileStage ?? "";

    assertAtLeast(
      stage,
      "fact_finding_assets",
      "Please complete assets before setting financial goals",
    );

    const advance = shouldAdvanceStage(stage, "fact_finding_assets");

    await this.repo.replaceGoals(userId, input.goals, advance);

    return {
      message: "Financial goals saved",
      count: input.goals.length,
      completion: getCompletionStatus(
        advance ? "fact_finding_goals" : (stage as never),
      ),
    };
  }

  async saveRisk(userId: string, input: z.infer<typeof riskSchema>) {
    const user = await this.repo.findUserStage(userId);
    const stage = user?.profileStage ?? "";

    assertAtLeast(
      stage,
      "fact_finding_goals",
      "Please complete your financial goals before the risk assessment",
    );

    const riskCategory = deriveRiskCategory(
      input.portfolioDrop,
      input.investmentStyle,
      input.marketFeeling,
    );

    await this.repo.upsertRisk(userId, { ...input, riskCategory });

    return {
      message: "Risk profile saved",
      riskCategory,
      completion: getCompletionStatus("fact_finding_complete"),
    };
  }
}
