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
          select: { totalMonthly: true, annualBonus: true },
        },
        expenseProfile: {
          select: {
            totalMonthly: true,
            monthlySurplus: true,
            savingsRatioPct: true,
            rentOrHomeLoanEmi: true,
            vehicleLoanEmi: true,
            otherLoanEmis: true,
          },
        },
        assetLiabilityProfile: {
          select: {
            totalAssets: true,
            totalLiabilities: true,
            netWorth: true,
            cashSavings: true,
            existingLifeCover: true,
            existingHealthCover: true,
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
          select: { riskCategory: true, totalScore: true },
        },
      },
    });
  }

  getCashFlowData(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        incomeProfile: {
          select: { totalMonthly: true },
        },
        expenseProfile: {
          select: {
            totalMonthly: true,
            monthlySurplus: true,
            // Fixed
            rentOrHomeLoanEmi: true,
            vehicleLoanEmi: true,
            otherLoanEmis: true,
            existingPremiums: true,
            // Variable
            groceriesFood: true,
            utilities: true,
            transport: true,
            medicalHealthcare: true,
            // Lifestyle
            diningEntertainment: true,
            shopping: true,
            childrenEducation: true,
            otherExpenses: true,
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
            cashSavings: true,
            fixedDeposits: true,
            mutualFundsStocks: true,
            goldValue: true,
            realEstateValue: true,
            epfPpfBalance: true,
            otherAssets: true,
            homeLoanOutstanding: true,
            vehicleLoanOutstanding: true,
            personalLoanOutstanding: true,
            creditCardOutstanding: true,
            otherLoans: true,
          },
        },
      },
    });
  }

  getInsuranceData(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        incomeProfile: {
          select: { totalMonthly: true, annualBonus: true },
        },
        assetLiabilityProfile: {
          select: {
            existingLifeCover: true,
            existingHealthCover: true,
          },
        },
        profile: {
          select: { numberOfDependents: true },
        },
      },
    });
  }

  getGoalsData(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        incomeProfile: {
          select: { totalMonthly: true },
        },
        expenseProfile: {
          select: { monthlySurplus: true },
        },
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
          select: { riskCategory: true, totalScore: true, answers: true },
        },
      },
    });
  }
}
