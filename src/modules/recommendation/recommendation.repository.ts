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
            gender: true,
            age: true,
            city: true,
            state: true,
            pincode: true,
            maritalStatus: true,
          },
        },
        incomeProfile: {
          select: {
            salaryMonthly: true,
            freelanceMonthly: true,
            businessMonthly: true,
            otherMonthly: true,
            totalMonthly: true,
          },
        },
        financeProfile: {
          select: {
            numberOfDependents: true,
            totalMonthlyExpenses: true,
            totalShortTermLiabilities: true,
            totalLongTermLiabilities: true,
            monthlySurplus: true,
            savingsRatioPct: true,
            insuranceMonthly: true,
          },
        },
        incomeSourcesProfile: {
          select: { incomeSources: true },
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
        goalsProfile: {
          select: {
            financialAims: true,
            timeHorizon: true,
          },
        },
        riskProfile: {
          select: {
            riskCategory: true,
            portfolioDrop: true,
            investmentStyle: true,
            marketFeeling: true,
          },
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

  findProductByPlanId(planId: string) {
    return this.prisma.insuranceProduct.findFirst({
      where: {
        OR: [{ id: planId }, { externalId: planId }],
      },
      select: { id: true, name: true, type: true, coverageAmount: true },
    });
  }

  upsertProductFromAi(data: {
    externalId: string;
    name: string;
    type: import("@prisma/client").InsuranceType;
    coverageAmount?: number | null;
  }) {
    return this.prisma.insuranceProduct.upsert({
      where: { externalId: data.externalId },
      create: {
        externalId: data.externalId,
        name: data.name,
        type: data.type,
        coverageAmount: data.coverageAmount ?? null,
        isActive: true,
      },
      update: {},
      select: { id: true },
    });
  }

  upsertInterest(
    userId: string,
    productId: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.insuranceInterest.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      create: {
        userId,
        productId,
        status: "pending",
        metadata: metadata as never,
      },
      update: { metadata: metadata as never },
      select: {
        id: true,
        status: true,
        createdAt: true,
        product: {
          select: { id: true, name: true, type: true, coverageAmount: true },
        },
      },
    });
  }
}
