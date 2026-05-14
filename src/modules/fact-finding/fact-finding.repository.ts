import type { PrismaClient } from "@prisma/client";
import type { z } from "zod";
import type {
  incomeSourcesSchema,
  financeProfileSchema,
  incomeAmountSchema,
  expensesSchema,
  assetsSchema,
  riskSchema,
} from "./fact-finding.schema";

type IncomeSourcesData = z.infer<typeof incomeSourcesSchema>;
type FinanceProfileData = z.infer<typeof financeProfileSchema>;
type IncomeAmountData = z.infer<typeof incomeAmountSchema> & {
  totalMonthly: number;
};
type ExpensesData = z.infer<typeof expensesSchema> & {
  monthlySurplus: number;
  savingsRatioPct: number;
};
type AssetsInput = z.infer<typeof assetsSchema>;
type AssetsComputed = { totalAssets: number };
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

  findIncomeAmountProfile(userId: string) {
    return this.db.incomeProfile.findUnique({
      where: { userId },
      select: { totalMonthly: true },
    });
  }

  async upsertIncomeSources(
    userId: string,
    data: IncomeSourcesData,
    shouldAdvance: boolean,
  ): Promise<void> {
    await this.db.$transaction([
      this.db.incomeSourcesProfile.upsert({
        where: { userId },
        create: { userId, incomeSources: data.incomeSources },
        update: { incomeSources: data.incomeSources },
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
    await this.db.$transaction([
      this.db.financeProfile.upsert({
        where: { userId },
        create: {
          userId,
          numberOfDependents: data.numberOfDependents,
          liabilityTypes: data.liabilityTypes,
          insuranceCoverageTypes: data.insuranceCoverageTypes,
        },
        update: {
          numberOfDependents: data.numberOfDependents,
          liabilityTypes: data.liabilityTypes,
          insuranceCoverageTypes: data.insuranceCoverageTypes,
        },
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

  async upsertIncomeAmount(
    userId: string,
    data: IncomeAmountData,
    shouldAdvance: boolean,
  ): Promise<void> {
    const {
      salaryMonthly,
      freelanceMonthly,
      businessMonthly,
      otherMonthly,
      totalMonthly,
    } = data;
    await this.db.$transaction([
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
      ...(shouldAdvance
        ? [
            this.db.user.update({
              where: { id: userId },
              data: { profileStage: "fact_finding_income_amount" },
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
    const {
      residentialProperty,
      investment,
      savingsBank,
      goldJewelry,
      retirementFunds,
      otherAssets,
    } = input;
    await this.db.$transaction([
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
          totalAssets: computed.totalAssets,
        },
        update: {
          residentialProperty,
          investment,
          savingsBank,
          goldJewelry,
          retirementFunds,
          otherAssets,
          totalAssets: computed.totalAssets,
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

  async findAllFactFindingData(userId: string) {
    const [
      user,
      incomeSources,
      financeProfile,
      incomeAmount,
      expenses,
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
      this.db.financeProfile.findUnique({
        where: { userId },
        select: {
          numberOfDependents: true,
          liabilityTypes: true,
          insuranceCoverageTypes: true,
        },
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
      this.db.expenseProfile.findUnique({
        where: { userId },
        select: {
          totalMonthly: true,
          monthlySurplus: true,
          savingsRatioPct: true,
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
          financialAims: true,
          timeHorizon: true,
          marketFeeling: true,
          riskCategory: true,
        },
      }),
    ]);

    return {
      profileStage: user?.profileStage ?? null,
      incomeSources: incomeSources ?? null,
      financeProfile: financeProfile ?? null,
      incomeAmount: incomeAmount ?? null,
      expenses: expenses ?? null,
      assets: assetProfile ?? null,
      risk: risk ?? null,
    };
  }
}
