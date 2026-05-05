import type { PrismaClient } from "@prisma/client";
import type { z } from "zod";
import type {
  incomeSchema,
  expensesSchema,
  assetsSchema,
  goalsSchema,
  riskSchema,
} from "./fact-finding.schema";

type IncomeData = z.infer<typeof incomeSchema> & { totalMonthly: number };
type ExpensesData = z.infer<typeof expensesSchema> & {
  monthlySurplus: number;
  savingsRatioPct: number;
};
type AssetsInput = z.infer<typeof assetsSchema>;
type AssetsComputed = {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
};
type GoalItem = z.infer<typeof goalsSchema>["goals"][number];
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
      passiveMonthly,
      otherMonthly,
      totalMonthly,
    } = data;
    await this.db.$transaction([
      this.db.incomeProfile.upsert({
        where: { userId },
        create: {
          userId,
          incomeSources,
          salaryMonthly,
          freelanceMonthly,
          businessMonthly,
          passiveMonthly,
          otherMonthly,
          totalMonthly,
        },
        update: {
          incomeSources,
          salaryMonthly,
          freelanceMonthly,
          businessMonthly,
          passiveMonthly,
          otherMonthly,
          totalMonthly,
        },
      }),
      ...(shouldAdvance
        ? [
            this.db.user.update({
              where: { id: userId },
              data: { profileStage: "fact_finding_income" },
            }),
          ]
        : []),
    ]);
  }

  async upsertExpenses(
    userId: string,
    data: ExpensesData,
    shouldAdvance: boolean,
  ): Promise<void> {
    const { totalMonthly, monthlySurplus, savingsRatioPct } = data;
    await this.db.$transaction([
      this.db.expenseProfile.upsert({
        where: { userId },
        create: { userId, totalMonthly, monthlySurplus, savingsRatioPct },
        update: { totalMonthly, monthlySurplus, savingsRatioPct },
      }),
      ...(shouldAdvance
        ? [
            this.db.user.update({
              where: { id: userId },
              data: { profileStage: "fact_finding_expenses" },
            }),
          ]
        : []),
    ]);
  }

  async upsertAssets(
    userId: string,
    input: AssetsInput,
    computed: AssetsComputed,
    shouldAdvance: boolean,
  ): Promise<void> {
    const existing = await this.db.assetLiabilityProfile.upsert({
      where: { userId },
      create: {
        userId,
        liabilityTypes: input.liabilityTypes,
        insuranceCoverageTypes: input.insuranceCoverageTypes,
        totalAssets: computed.totalAssets,
        totalLiabilities: computed.totalLiabilities,
        netWorth: computed.netWorth,
      },
      update: {
        liabilityTypes: input.liabilityTypes,
        insuranceCoverageTypes: input.insuranceCoverageTypes,
        totalAssets: computed.totalAssets,
        totalLiabilities: computed.totalLiabilities,
        netWorth: computed.netWorth,
      },
    });

    await this.db.$transaction([
      this.db.userAsset.deleteMany({
        where: { assetLiabilityProfileId: existing.id },
      }),
      this.db.userAsset.createMany({
        data: input.assets.map((a) => ({
          assetLiabilityProfileId: existing.id,
          assetType: a.assetType,
          amount: a.amount,
        })),
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

  async replaceGoals(
    userId: string,
    goals: GoalItem[],
    shouldAdvance: boolean,
  ): Promise<void> {
    await this.db.$transaction([
      this.db.financialGoal.deleteMany({ where: { userId } }),
      this.db.financialGoal.createMany({
        data: goals.map((g) => ({
          userId,
          type: g.type,
          targetAmount: g.targetAmount,
          targetYears: g.targetYears,
          currentSaved: g.currentSaved,
          priority: g.priority,
        })),
      }),
      ...(shouldAdvance
        ? [
            this.db.user.update({
              where: { id: userId },
              data: { profileStage: "fact_finding_goals" },
            }),
          ]
        : []),
    ]);
  }

  async upsertRisk(userId: string, data: RiskData): Promise<void> {
    const {
      portfolioDrop,
      investmentStyle,
      financialAims,
      timeHorizon,
      marketFeeling,
      riskCategory,
    } = data;
    await this.db.$transaction([
      this.db.riskProfile.upsert({
        where: { userId },
        create: {
          userId,
          portfolioDrop,
          investmentStyle,
          financialAims,
          timeHorizon,
          marketFeeling,
          riskCategory,
        },
        update: {
          portfolioDrop,
          investmentStyle,
          financialAims,
          timeHorizon,
          marketFeeling,
          riskCategory,
        },
      }),
      this.db.user.update({
        where: { id: userId },
        data: { profileStage: "fact_finding_complete" },
      }),
    ]);
  }
}
