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
        financeProfile: {
          select: { liabilityTypes: true, insuranceCoverageTypes: true },
        },
        assetLiabilityProfile: {
          select: {
            residentialProperty: true,
            investment: true,
            savingsBank: true,
            goldJewelry: true,
            retirementFunds: true,
            otherAssets: true,
            totalAssets: true,
          },
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
        financeProfile: {
          select: { liabilityTypes: true, insuranceCoverageTypes: true },
        },
        assetLiabilityProfile: {
          select: {
            residentialProperty: true,
            investment: true,
            savingsBank: true,
            goldJewelry: true,
            retirementFunds: true,
            otherAssets: true,
            totalAssets: true,
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
        financeProfile: {
          select: { insuranceCoverageTypes: true, numberOfDependents: true },
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
