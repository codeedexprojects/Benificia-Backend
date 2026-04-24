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

// Stage order used to decide whether to advance or just update
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

// Returns true only when the user is at exactly the stage just before this step
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
    raw.businessMonthly +
    raw.passiveMonthly +
    raw.otherMonthly;
  return { ...raw, totalMonthly };
}

function computeExpenses(
  raw: z.infer<typeof expensesSchema>,
  incomeMonthly: number,
) {
  const totalMonthly =
    raw.rentOrHomeLoanEmi +
    raw.vehicleLoanEmi +
    raw.otherLoanEmis +
    raw.existingPremiums +
    raw.groceriesFood +
    raw.utilities +
    raw.transport +
    raw.medicalHealthcare +
    raw.diningEntertainment +
    raw.shopping +
    raw.childrenEducation +
    raw.otherExpenses;

  const monthlySurplus = incomeMonthly - totalMonthly;
  const savingsRatioPct =
    incomeMonthly > 0
      ? parseFloat(((monthlySurplus / incomeMonthly) * 100).toFixed(2))
      : 0;

  return { ...raw, totalMonthly, monthlySurplus, savingsRatioPct };
}

function computeAssets(raw: z.infer<typeof assetsSchema>) {
  const totalAssets =
    raw.cashSavings +
    raw.fixedDeposits +
    raw.mutualFundsStocks +
    raw.goldValue +
    raw.realEstateValue +
    raw.epfPpfBalance +
    raw.otherAssets;

  const totalLiabilities =
    raw.homeLoanOutstanding +
    raw.vehicleLoanOutstanding +
    raw.personalLoanOutstanding +
    raw.creditCardOutstanding +
    raw.otherLoans;

  const netWorth = totalAssets - totalLiabilities;

  return { ...raw, totalAssets, totalLiabilities, netWorth };
}

function computeRisk(answers: number[]): {
  totalScore: number;
  riskCategory: "conservative" | "moderate" | "aggressive";
} {
  const totalScore = answers.reduce((sum, a) => sum + a, 0);
  let riskCategory: "conservative" | "moderate" | "aggressive";

  if (totalScore <= 9) riskCategory = "conservative";
  else if (totalScore <= 15) riskCategory = "moderate";
  else riskCategory = "aggressive";

  return { totalScore, riskCategory };
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
      "Please complete your personal details before adding income information",
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
      totalMonthly: data.totalMonthly,
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
      "Please complete expense details before adding assets and liabilities",
    );

    const data = computeAssets(input);
    const advance = shouldAdvanceStage(stage, "fact_finding_expenses");

    await this.repo.upsertAssets(userId, data, advance);

    return {
      message: "Assets and liabilities saved",
      totalAssets: data.totalAssets,
      totalLiabilities: data.totalLiabilities,
      netWorth: data.netWorth,
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
      "Please complete assets and liabilities before setting financial goals",
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

    const { totalScore, riskCategory } = computeRisk(input.answers);

    await this.repo.upsertRisk(userId, {
      answers: input.answers,
      totalScore,
      riskCategory,
    });

    return {
      message: "Risk profile saved",
      totalScore,
      riskCategory,
      completion: getCompletionStatus("fact_finding_complete"),
    };
  }
}
