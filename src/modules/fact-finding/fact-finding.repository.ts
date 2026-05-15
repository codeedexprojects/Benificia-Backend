import type { PrismaClient } from "@prisma/client";
import type { z } from "zod";
import type {
  incomeSchema,
  financeProfileSchema,
  goalsSchema,
  riskSchema,
} from "./fact-finding.schema";

type IncomeData = z.infer<typeof incomeSchema> & {
  totalMonthly: number;
  totalAssets: number;
};
type FinanceProfileData = Omit<
  z.infer<typeof financeProfileSchema>,
  "frequency"
> & {
  totalMonthlyExpenses: number;
  totalShortTermLiabilities: number;
  totalLongTermLiabilities: number;
  monthlySurplus: number;
  savingsRatioPct: number;
};
type GoalsData = z.infer<typeof goalsSchema>;
type RiskData = z.infer<typeof riskSchema> & {
  riskCategory: "conservative" | "moderate" | "aggressive";
};

export class FactFindingRepository {
  constructor(private readonly db: PrismaClient) {}

  findUserStage(userId: string) {
    return this.db.user.findUnique({
      where: { id: userId },
      select: { profileStage: true },
    });
  }

  findIncomeProfile(userId: string) {
    return this.db.incomeProfile.findUnique({
      where: { userId },
      select: { totalMonthly: true },
    });
  }

  async upsertIncome(
    userId: string,
    data: IncomeData,
    shouldAdvance: boolean,
  ): Promise<void> {
    const {
      incomeSources,
      salaryMonthly,
      freelanceMonthly,
      businessMonthly,
      otherMonthly,
      totalMonthly,
      residentialProperty,
      investment,
      savingsBank,
      goldJewelry,
      retirementFunds,
      otherAssets,
      totalAssets,
    } = data;
    await this.db.$transaction([
      this.db.incomeSourcesProfile.upsert({
        where: { userId },
        create: { userId, incomeSources },
        update: { incomeSources },
      }),
      this.db.incomeProfile.upsert({
        where: { userId },
        create: {
          userId,
          salaryMonthly,
          freelanceMonthly,
          businessMonthly,
          otherMonthly,
          totalMonthly,
        },
        update: {
          salaryMonthly,
          freelanceMonthly,
          businessMonthly,
          otherMonthly,
          totalMonthly,
        },
      }),
      this.db.assetLiabilityProfile.upsert({
        where: { userId },
        create: {
          userId,
          residentialProperty,
          investment,
          savingsBank,
          goldJewelry,
          retirementFunds,
          otherAssets,
          totalAssets,
        },
        update: {
          residentialProperty,
          investment,
          savingsBank,
          goldJewelry,
          retirementFunds,
          otherAssets,
          totalAssets,
        },
      }),
      ...(shouldAdvance
        ? [
            this.db.user.update({
              where: { id: userId },
              data: { profileStage: "fact_finding_income_sources" },
            }),
          ]
        : []),
    ]);
  }

  async upsertFinanceProfile(
    userId: string,
    data: FinanceProfileData,
    shouldAdvance: boolean,
  ): Promise<void> {
    const {
      numberOfDependents,
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
    } = data;

    const payload = {
      numberOfDependents,
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

    await this.db.$transaction([
      this.db.financeProfile.upsert({
        where: { userId },
        create: { userId, ...payload },
        update: payload,
      }),
      ...(shouldAdvance
        ? [
            this.db.user.update({
              where: { id: userId },
              data: { profileStage: "fact_finding_dependents" },
            }),
          ]
        : []),
    ]);
  }

  async upsertGoals(
    userId: string,
    data: GoalsData,
    shouldAdvance: boolean,
  ): Promise<void> {
    await this.db.$transaction([
      this.db.goalsProfile.upsert({
        where: { userId },
        create: {
          userId,
          financialAims: data.financialAims,
          timeHorizon: data.timeHorizon,
        },
        update: {
          financialAims: data.financialAims,
          timeHorizon: data.timeHorizon,
        },
      }),
      ...(shouldAdvance
        ? [
            this.db.user.update({
              where: { id: userId },
              data: { profileStage: "fact_finding_assets" },
            }),
          ]
        : []),
    ]);
  }

  async upsertRisk(userId: string, data: RiskData): Promise<void> {
    const { portfolioDrop, investmentStyle, marketFeeling, riskCategory } =
      data;
    await this.db.riskProfile.upsert({
      where: { userId },
      create: {
        userId,
        portfolioDrop,
        investmentStyle,
        marketFeeling,
        riskCategory,
      },
      update: { portfolioDrop, investmentStyle, marketFeeling, riskCategory },
    });
  }

  advanceToComplete(userId: string) {
    return this.db.user.update({
      where: { id: userId },
      data: { profileStage: "fact_finding_complete" },
      select: { id: true },
    });
  }

  async findAllFactFindingData(userId: string) {
    const [
      user,
      incomeSources,
      incomeProfile,
      financeProfile,
      goals,
      assetProfile,
      risk,
    ] = await Promise.all([
      this.db.user.findUnique({
        where: { id: userId },
        select: { profileStage: true },
      }),
      this.db.incomeSourcesProfile.findUnique({
        where: { userId },
        select: { incomeSources: true },
      }),
      this.db.incomeProfile.findUnique({
        where: { userId },
        select: {
          salaryMonthly: true,
          freelanceMonthly: true,
          businessMonthly: true,
          otherMonthly: true,
          totalMonthly: true,
        },
      }),
      this.db.financeProfile.findUnique({
        where: { userId },
        select: {
          numberOfDependents: true,
          householdExpenses: true,
          rentAndEmi: true,
          educationExpenses: true,
          otherExpenses: true,
          insuranceMonthly: true,
          creditCardDues: true,
          personalLoan: true,
          medicalExpenses: true,
          otherShortTermExpenses: true,
          homeLoan: true,
          vehicleLoan: true,
          educationLoan: true,
          businessLoan: true,
          otherLongTermExpenses: true,
          totalMonthlyExpenses: true,
          totalShortTermLiabilities: true,
          totalLongTermLiabilities: true,
          monthlySurplus: true,
          savingsRatioPct: true,
        },
      }),
      this.db.goalsProfile.findUnique({
        where: { userId },
        select: {
          financialAims: true,
          timeHorizon: true,
        },
      }),
      this.db.assetLiabilityProfile.findUnique({
        where: { userId },
        select: {
          residentialProperty: true,
          investment: true,
          savingsBank: true,
          goldJewelry: true,
          retirementFunds: true,
          otherAssets: true,
          totalAssets: true,
        },
      }),
      this.db.riskProfile.findUnique({
        where: { userId },
        select: {
          portfolioDrop: true,
          investmentStyle: true,
          marketFeeling: true,
          riskCategory: true,
        },
      }),
    ]);

    const income =
      incomeSources || incomeProfile || assetProfile
        ? {
            ...incomeSources,
            ...incomeProfile,
            ...assetProfile,
          }
        : null;

    return {
      profileStage: user?.profileStage ?? null,
      income,
      financeProfile: financeProfile ?? null,
      goals: goals ?? null,
      assets: assetProfile ?? null,
      risk: risk ?? null,
    };
  }
}
