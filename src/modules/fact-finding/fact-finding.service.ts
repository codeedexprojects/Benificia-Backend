import type { FactFindingRepository } from "./fact-finding.repository";
import type { z } from "zod";
import type {
  incomeSchema,
  financeProfileSchema,
  goalsSchema,
  riskSchema,
} from "./fact-finding.schema";
import { ForbiddenError } from "../../utils/errors";
import { getCompletionStatus } from "../../utils/profile-completion";
import type { ProfileStage } from "@prisma/client";
import type { RecommendationService } from "../recommendation/recommendation.service";

const asStage = (s: string) => s as ProfileStage;

type ProfileStageStr = string;

const STAGE_ORDER: Record<string, number> = {
  personal_complete: 0,
  fact_finding_income_sources: 1,
  fact_finding_liabilities: 2,
  fact_finding_goals: 3,
  fact_finding_complete: 4,
  recommendations_ready: 5,
};

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

function computeIncome(raw: z.infer<typeof incomeSchema>) {
  const totalMonthly =
    raw.salaryMonthly +
    raw.freelanceMonthly +
    raw.businessMonthly +
    raw.otherMonthly;
  const totalAssets =
    raw.residentialProperty +
    raw.investment +
    raw.savingsBank +
    raw.goldJewelry +
    raw.retirementFunds +
    raw.otherAssets;
  return { ...raw, totalMonthly, totalAssets };
}

function computeFinanceProfile(
  raw: z.infer<typeof financeProfileSchema>,
  incomeMonthly: number,
) {
  const n = raw.frequency === "yearly" ? 12 : 1;

  const householdExpenses = raw.householdExpenses / n;
  const rentAndEmi = raw.rentAndEmi / n;
  const educationExpenses = raw.educationExpenses / n;
  const otherExpenses = raw.otherExpenses / n;
  const insuranceMonthly = raw.insuranceMonthly / n;
  const creditCardDues = raw.creditCardDues / n;
  const personalLoan = raw.personalLoan / n;
  const medicalExpenses = raw.medicalExpenses / n;
  const otherShortTermExpenses = raw.otherShortTermExpenses / n;
  const homeLoan = raw.homeLoan / n;
  const vehicleLoan = raw.vehicleLoan / n;
  const educationLoan = raw.educationLoan / n;
  const businessLoan = raw.businessLoan / n;
  const otherLongTermExpenses = raw.otherLongTermExpenses / n;

  const totalMonthlyExpenses =
    householdExpenses +
    rentAndEmi +
    educationExpenses +
    otherExpenses +
    insuranceMonthly;

  const totalShortTermLiabilities =
    creditCardDues + personalLoan + medicalExpenses + otherShortTermExpenses;

  const totalLongTermLiabilities =
    homeLoan +
    vehicleLoan +
    educationLoan +
    businessLoan +
    otherLongTermExpenses;

  const monthlySurplus = incomeMonthly - totalMonthlyExpenses;
  const savingsRatioPct =
    incomeMonthly > 0
      ? parseFloat(((monthlySurplus / incomeMonthly) * 100).toFixed(2))
      : 0;

  return {
    numberOfDependents: raw.numberOfDependents,
    householdExpenses,
    rentAndEmi,
    educationExpenses,
    otherExpenses,
    insuranceMonthly,
    creditCardDues,
    personalLoan,
    medicalExpenses,
    otherShortTermExpenses,
    homeLoan,
    vehicleLoan,
    educationLoan,
    businessLoan,
    otherLongTermExpenses,
    totalMonthlyExpenses,
    totalShortTermLiabilities,
    totalLongTermLiabilities,
    monthlySurplus,
    savingsRatioPct,
  };
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

  // Page 2: income sources + amounts + assets
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

    const nextStage = advance
      ? asStage("fact_finding_income_sources")
      : (stage as ProfileStage);
    return {
      message: "Income and assets saved",
      totalMonthly: data.totalMonthly,
      totalAssets: data.totalAssets,
      completion: getCompletionStatus(nextStage),
    };
  }

  // Page 3: dependents + spend + insurance + liabilities
  async saveFinanceProfile(
    userId: string,
    input: z.infer<typeof financeProfileSchema>,
  ) {
    const user = await this.repo.findUserStage(userId);
    const stage = user?.profileStage ?? "";

    assertAtLeast(
      stage,
      "fact_finding_income_sources",
      "Please complete the income step first",
    );

    const incomeProfile = await this.repo.findIncomeProfile(userId);
    const data = computeFinanceProfile(input, incomeProfile?.totalMonthly ?? 0);

    const advance = shouldAdvanceStage(stage, "fact_finding_income_sources");
    await this.repo.upsertFinanceProfile(userId, data, advance);

    const nextStage = advance
      ? asStage("fact_finding_liabilities")
      : (stage as ProfileStage);
    return {
      message: "Finance profile saved",
      totalMonthlyExpenses: data.totalMonthlyExpenses,
      totalShortTermLiabilities: data.totalShortTermLiabilities,
      totalLongTermLiabilities: data.totalLongTermLiabilities,
      monthlySurplus: data.monthlySurplus,
      savingsRatioPct: data.savingsRatioPct,
      completion: getCompletionStatus(nextStage),
    };
  }

  // Page 4: goals + time horizon
  async saveGoals(userId: string, input: z.infer<typeof goalsSchema>) {
    const user = await this.repo.findUserStage(userId);
    const stage = user?.profileStage ?? "";

    assertAtLeast(
      stage,
      "fact_finding_liabilities",
      "Please complete the finance profile step first",
    );

    const advance = shouldAdvanceStage(stage, "fact_finding_liabilities");
    await this.repo.upsertGoals(userId, input, advance);

    const nextStage = advance
      ? asStage("fact_finding_goals")
      : (stage as ProfileStage);
    return {
      message: "Goals saved",
      completion: getCompletionStatus(nextStage),
    };
  }

  // Page 5: risk assessment (optional)
  async saveRisk(userId: string, input: z.infer<typeof riskSchema>) {
    const user = await this.repo.findUserStage(userId);
    const stage = user?.profileStage ?? "";

    assertAtLeast(
      stage,
      "fact_finding_goals",
      "Please complete the goals step before the risk assessment",
    );

    const riskCategory = deriveRiskCategory(
      input.portfolioDrop,
      input.investmentStyle,
      input.marketFeeling,
    );

    await this.repo.upsertRisk(userId, { ...input, riskCategory });

    // Only advance stage and generate recommendation if not already complete
    const isFirstCompletion = stage === "fact_finding_goals";
    if (isFirstCompletion) {
      await this.repo.advanceToComplete(userId);
    }
    const recommendation = await this.recommendationService.generate(userId);

    return {
      message: "Risk profile saved",
      riskCategory,
      completion: getCompletionStatus("fact_finding_complete"),
      destination: "dashboard",
      recommendation: {
        id: recommendation.id,
        verticals: recommendation.verticals,
        health: recommendation.health,
        investment: recommendation.investment,
      },
    };
  }

  // Page 5: skip risk (goes straight to dashboard with moderate default)
  async skipRisk(userId: string) {
    const user = await this.repo.findUserStage(userId);
    const stage = user?.profileStage ?? "";

    assertAtLeast(
      stage,
      "fact_finding_goals",
      "Please complete the goals step first",
    );

    const isFirstCompletion = stage === "fact_finding_goals";
    if (isFirstCompletion) {
      await this.repo.advanceToComplete(userId);
    }
    const recommendation = await this.recommendationService.generate(userId);

    return {
      message: "Risk assessment skipped",
      completion: getCompletionStatus("fact_finding_complete"),
      destination: "dashboard",
      recommendation: {
        id: recommendation.id,
        verticals: recommendation.verticals,
        health: recommendation.health,
        investment: recommendation.investment,
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
        income: data.income,
        financeProfile: data.financeProfile,
        goals: data.goals,
        assets: data.assets,
        risk: data.risk,
      },
    };
  }
}
