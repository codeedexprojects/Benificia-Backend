import type { PrismaClient } from "@prisma/client";

export class DashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  getSnapshot(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profileStage: true,
        incomeProfile: {
          select: { totalMonthly: true },
        },
        expenseProfile: {
          select: {
            totalMonthly: true,
            monthlySurplus: true,
            savingsRatioPct: true,
          },
        },
        assetLiabilityProfile: {
          select: {
            totalAssets: true,
            totalLiabilities: true,
            netWorth: true,
            liabilityTypes: true,
            insuranceCoverageTypes: true,
            assets: { select: { assetType: true, amount: true } },
          },
        },
        financialGoals: {
          select: {
            type: true,
            targetAmount: true,
            currentSaved: true,
            targetYears: true,
            priority: true,
            isAchieved: true,
          },
          orderBy: { priority: "asc" },
        },
        riskProfile: {
          select: { riskCategory: true },
        },
      },
    });
  }

  getCashFlowData(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        incomeProfile: { select: { totalMonthly: true } },
        expenseProfile: {
          select: {
            totalMonthly: true,
            monthlySurplus: true,
            savingsRatioPct: true,
          },
        },
      },
    });
  }

  getAssetsData(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        assetLiabilityProfile: {
          select: {
            totalAssets: true,
            totalLiabilities: true,
            netWorth: true,
            liabilityTypes: true,
            insuranceCoverageTypes: true,
            assets: { select: { assetType: true, amount: true } },
          },
        },
      },
    });
  }

  getInsuranceData(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        incomeProfile: { select: { totalMonthly: true } },
        assetLiabilityProfile: {
          select: { insuranceCoverageTypes: true },
        },
        profile: {
          select: { numberOfDependents: true, numberOfMembers: true },
        },
      },
    });
  }

  getGoalsData(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        incomeProfile: { select: { totalMonthly: true } },
        expenseProfile: { select: { monthlySurplus: true } },
        financialGoals: {
          select: {
            id: true,
            type: true,
            targetAmount: true,
            currentSaved: true,
            targetYears: true,
            priority: true,
            isAchieved: true,
          },
          orderBy: { priority: "asc" },
        },
      },
    });
  }

  getRiskData(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        riskProfile: {
          select: {
            riskCategory: true,
            portfolioDrop: true,
            investmentStyle: true,
            financialAims: true,
            timeHorizon: true,
            marketFeeling: true,
          },
        },
      },
    });
  }
}
