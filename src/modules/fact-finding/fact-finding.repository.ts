import type { PrismaClient } from "@prisma/client";
import type { z } from "zod";
import type {
  incomeSchema,
  expensesSchema,
  assetsSchema,
  goalsSchema,
} from "./fact-finding.schema";

type IncomeData = z.infer<typeof incomeSchema> & { totalMonthly: number };
type ExpensesData = z.infer<typeof expensesSchema> & {
  totalMonthly: number;
  monthlySurplus: number;
  savingsRatioPct: number;
};
type AssetsData = z.infer<typeof assetsSchema> & {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
};
type GoalItem = z.infer<typeof goalsSchema>["goals"][number];
type RiskData = {
  answers: number[];
  totalScore: number;
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
    await this.db.$transaction([
      this.db.incomeProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
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
    await this.db.$transaction([
      this.db.expenseProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
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
    data: AssetsData,
    shouldAdvance: boolean,
  ): Promise<void> {
    await this.db.$transaction([
      this.db.assetLiabilityProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
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
    // Risk is always the final step — always advance to fact_finding_complete
    await this.db.$transaction([
      this.db.riskProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      }),
      this.db.user.update({
        where: { id: userId },
        data: { profileStage: "fact_finding_complete" },
      }),
    ]);
  }
}
