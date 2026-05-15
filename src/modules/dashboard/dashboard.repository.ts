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
        financeProfile: {
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
        financeProfile: {
          select: {
            totalMonthlyExpenses: true,
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
          select: {
            totalShortTermLiabilities: true,
            totalLongTermLiabilities: true,
          },
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
          select: {
            numberOfDependents: true,
            insuranceMonthly: true,
          },
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
            marketFeeling: true,
          },
        },
        goalsProfile: {
          select: {
            financialAims: true,
            timeHorizon: true,
          },
        },
      },
    });
  }
}
