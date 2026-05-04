import type { PrismaClient } from "@prisma/client";

export class RecommendationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Fetch all data needed to build the AI user_context payload
  getUserContext(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profileStage: true,
        profile: {
          select: {
            fullName: true,
            dateOfBirth: true,
            gender: true,
            city: true,
            state: true,
            pincode: true,
            maritalStatus: true,
            numberOfDependents: true,
            childrenAges: true,
            occupation: true,
            incomeType: true,
            retirementAge: true,
            isPrimaryEarner: true,
            dependentsRelyOnIncome: true,
          },
        },
        incomeProfile: {
          select: {
            salaryMonthly: true,
            businessMonthly: true,
            passiveMonthly: true,
            otherMonthly: true,
            totalMonthly: true,
            annualBonus: true,
            expectedGrowthPct: true,
          },
        },
        expenseProfile: {
          select: {
            totalMonthly: true,
            monthlySurplus: true,
            savingsRatioPct: true,
            rentOrHomeLoanEmi: true,
            vehicleLoanEmi: true,
            otherLoanEmis: true,
            existingPremiums: true,
          },
        },
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
            homeLoanOutstanding: true,
            vehicleLoanOutstanding: true,
            personalLoanOutstanding: true,
            creditCardOutstanding: true,
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
          },
          orderBy: { priority: "asc" },
        },
        riskProfile: {
          select: { riskCategory: true, totalScore: true },
        },
      },
    });
  }

  // Get latest recommendation for the user
  getLatest(userId: string) {
    return this.prisma.aiRecommendation.findFirst({
      where: { userId },
      orderBy: { generatedAt: "desc" },
      select: {
        id: true,
        status: true,
        insuranceOutput: true,
        investmentOutput: true,
        generatedAt: true,
        viewedAt: true,
        version: true,
      },
    });
  }

  saveRecommendation(data: {
    userId: string;
    insuranceOutput: unknown;
    investmentOutput: unknown;
    fullPayloadSent: unknown;
    version: number;
  }) {
    return this.prisma.aiRecommendation.create({
      data: {
        userId: data.userId,
        insuranceOutput: data.insuranceOutput as never,
        investmentOutput: data.investmentOutput as never,
        fullPayloadSent: data.fullPayloadSent as never,
        status: "ready",
        version: data.version,
      },
      select: { id: true, status: true, generatedAt: true, version: true },
    });
  }

  markViewed(id: string) {
    return this.prisma.aiRecommendation.update({
      where: { id },
      data: { viewedAt: new Date() },
      select: { id: true },
    });
  }

  getVersionCount(userId: string) {
    return this.prisma.aiRecommendation.count({ where: { userId } });
  }

  advanceStage(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { profileStage: "recommendations_ready" },
      select: { id: true },
    });
  }
}
