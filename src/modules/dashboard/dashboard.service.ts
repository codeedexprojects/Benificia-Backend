import type { DashboardRepository } from "./dashboard.repository";
import { getCompletionStatus } from "../../utils/profile-completion";
import { NotFoundError } from "../../utils/errors";
import type { InsuranceCoverageType, AssetType } from "@prisma/client";

// ── Health score weights ──────────────────────────────────────
const WEIGHT_SAVINGS_RATE = 30;
const WEIGHT_DEBT_LOAD = 25;
const WEIGHT_EMERGENCY_FUND = 20;
const WEIGHT_INSURANCE = 15;
const WEIGHT_GOALS = 10;

function scoreSavingsRate(pct: number) {
  return Math.round((Math.min(pct, 20) / 20) * WEIGHT_SAVINGS_RATE);
}
function scoreDebtLoad(hasDebts: boolean, savingsRatioPct: number) {
  if (!hasDebts) return WEIGHT_DEBT_LOAD;
  // Approximate from savings ratio — lower surplus suggests heavier debt load
  if (savingsRatioPct >= 30) return WEIGHT_DEBT_LOAD;
  if (savingsRatioPct <= 0) return 0;
  return Math.round((savingsRatioPct / 30) * WEIGHT_DEBT_LOAD);
}
function scoreEmergencyFund(cashAmount: number, monthlyExp: number) {
  if (monthlyExp <= 0) return WEIGHT_EMERGENCY_FUND;
  return Math.round(
    (Math.min(cashAmount / monthlyExp, 6) / 6) * WEIGHT_EMERGENCY_FUND,
  );
}
function scoreInsurance(coverageTypes: InsuranceCoverageType[]) {
  const hasLife = coverageTypes.includes("life_insurance");
  const hasHealth = coverageTypes.includes("health_insurance");
  const ratio = ((hasLife ? 1 : 0) + (hasHealth ? 1 : 0)) / 2;
  return Math.round(ratio * WEIGHT_INSURANCE);
}
function scoreGoals(goals: { targetAmount: number; currentSaved: number }[]) {
  if (!goals.length) return 0;
  const avg =
    goals.reduce(
      (s, g) =>
        s +
        Math.min(g.targetAmount > 0 ? g.currentSaved / g.targetAmount : 0, 1),
      0,
    ) / goals.length;
  return Math.round(avg * WEIGHT_GOALS);
}

function assetAmountByType(
  assets: { assetType: AssetType; amount: number }[],
  type: AssetType,
) {
  return assets.find((a) => a.assetType === type)?.amount ?? 0;
}

// ── Risk profile meta ─────────────────────────────────────────
const RISK_META = {
  conservative: {
    label: "Conservative",
    description:
      "You prefer safety over high returns. Stable growth and capital protection matter most to you.",
    investmentMix: { debt: 70, equity: 20, gold: 10 },
    advice: "Focus on FDs, debt mutual funds, PPF, and sovereign gold bonds.",
  },
  moderate: {
    label: "Moderate",
    description:
      "You are comfortable with some ups and downs and want a healthy balance between safety and growth.",
    investmentMix: { debt: 50, equity: 40, gold: 10 },
    advice:
      "A mix of balanced mutual funds, blue-chip stocks, and debt instruments works well for you.",
  },
  aggressive: {
    label: "Aggressive",
    description:
      "You are comfortable with higher risk in pursuit of higher long-term returns.",
    investmentMix: { debt: 20, equity: 75, gold: 5 },
    advice:
      "Equity mutual funds, direct stocks, and growth-oriented instruments suit your profile.",
  },
};

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cash_savings: "Cash & Savings",
  fixed_deposit: "Fixed Deposits",
  mutual_funds_stocks: "Mutual Funds & Stocks",
  gold: "Gold",
  real_estate: "Real Estate",
  epf_ppf: "EPF / PPF",
  other: "Other Assets",
};

const ASSET_COLORS: Record<AssetType, string> = {
  cash_savings: "#22C55E",
  fixed_deposit: "#3B82F6",
  mutual_funds_stocks: "#8B5CF6",
  gold: "#EAB308",
  real_estate: "#F97316",
  epf_ppf: "#06B6D4",
  other: "#6B7280",
};

export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  // ── Overview ───────────────────────────────────────────────

  async getOverview(userId: string) {
    const data = await this.repo.getSnapshot(userId);
    if (!data) throw new NotFoundError("User not found");

    const income = data.incomeProfile;
    const expense = data.expenseProfile;
    const assets = data.assetLiabilityProfile;
    const goals = data.financialGoals;

    const monthlyIncome = income?.totalMonthly ?? 0;
    const monthlyExpenses = expense?.totalMonthly ?? 0;
    const cashAmount = assets
      ? assetAmountByType(assets.assets, "cash_savings")
      : 0;

    const scoreBreakdown = {
      savingsRate:
        income && expense ? scoreSavingsRate(expense.savingsRatioPct) : 0,
      debtLoad:
        income && expense
          ? scoreDebtLoad(
              assets?.liabilityTypes ? assets.liabilityTypes.length > 0 : false,
              expense.savingsRatioPct,
            )
          : 0,
      emergencyFund:
        assets && expense ? scoreEmergencyFund(cashAmount, monthlyExpenses) : 0,
      insurance: assets ? scoreInsurance(assets.insuranceCoverageTypes) : 0,
      goals: goals.length ? scoreGoals(goals) : 0,
    };

    const healthScore = Object.values(scoreBreakdown).reduce(
      (a, b) => a + b,
      0,
    );
    const healthLabel =
      healthScore >= 75
        ? "Excellent"
        : healthScore >= 55
          ? "Good"
          : healthScore >= 35
            ? "Fair"
            : "Needs Attention";

    return {
      healthScore: {
        score: healthScore,
        label: healthLabel,
        breakdown: scoreBreakdown,
        maxScore: 100,
      },
      cashFlow:
        income && expense
          ? {
              monthly: expense.monthlySurplus,
              isDeficit: expense.monthlySurplus < 0,
            }
          : null,
      netWorth: assets
        ? {
            value: assets.netWorth,
            totalAssets: assets.totalAssets,
            totalLiabilities: assets.totalLiabilities,
          }
        : null,
      completion: getCompletionStatus(data.profileStage),
      riskProfile: data.riskProfile
        ? { category: data.riskProfile.riskCategory }
        : null,
      goalsSummary: {
        total: goals.length,
        achieved: goals.filter((g) => g.isAchieved).length,
        topGoal: goals[0] ?? null,
      },
      monthlyIncome,
    };
  }

  // ── Cash flow chart ────────────────────────────────────────

  async getCashFlow(userId: string) {
    const data = await this.repo.getCashFlowData(userId);
    if (!data) throw new NotFoundError("User not found");

    const income = data.incomeProfile;
    const e = data.expenseProfile;

    if (!income || !e) {
      return {
        available: false,
        message: "Complete income and expense steps to see this chart.",
      };
    }

    const monthlyIncome = income.totalMonthly;
    const surplus = e.monthlySurplus;
    const savingsAmount = Math.max(surplus, 0);

    const pct = (v: number) =>
      monthlyIncome > 0 ? Math.round((v / monthlyIncome) * 100) : 0;

    return {
      available: true,
      summary: {
        monthlyIncome,
        totalExpenses: e.totalMonthly,
        surplus,
        savingsRatioPct: e.savingsRatioPct,
        isDeficit: surplus < 0,
      },
      incomeAllocation: [
        {
          label: "Expenses",
          amount: e.totalMonthly,
          percentage: pct(e.totalMonthly),
          color: "#EF4444",
        },
        {
          label: "Savings / Surplus",
          amount: savingsAmount,
          percentage: pct(savingsAmount),
          color: "#22C55E",
        },
      ],
    };
  }

  // ── Assets vs liabilities chart ────────────────────────────

  async getAssetsChart(userId: string) {
    const data = await this.repo.getAssetsData(userId);
    if (!data) throw new NotFoundError("User not found");

    const a = data.assetLiabilityProfile;
    if (!a) {
      return {
        available: false,
        message: "Complete the assets & liabilities step to see this chart.",
      };
    }

    const debtToAssetRatio =
      a.totalAssets > 0
        ? Math.round((a.totalLiabilities / a.totalAssets) * 100) / 100
        : null;

    return {
      available: true,
      summary: {
        totalAssets: a.totalAssets,
        totalLiabilities: a.totalLiabilities,
        netWorth: a.netWorth,
        debtToAssetRatio,
        debtToAssetLabel:
          debtToAssetRatio === null
            ? null
            : debtToAssetRatio <= 0.3
              ? "Healthy"
              : debtToAssetRatio <= 0.5
                ? "Moderate"
                : "High",
      },
      comparison: [
        { label: "Total Assets", amount: a.totalAssets },
        { label: "Total Liabilities", amount: a.totalLiabilities },
        { label: "Net Worth", amount: a.netWorth },
      ],
      assetComposition: a.assets
        .filter((asset) => asset.amount > 0)
        .map((asset) => ({
          label: ASSET_TYPE_LABELS[asset.assetType],
          amount: asset.amount,
          color: ASSET_COLORS[asset.assetType],
        })),
      liabilityTypes: a.liabilityTypes,
      insuranceCoverageTypes: a.insuranceCoverageTypes,
    };
  }

  // ── Insurance coverage gap ─────────────────────────────────

  async getInsuranceCoverage(userId: string) {
    const data = await this.repo.getInsuranceData(userId);
    if (!data) throw new NotFoundError("User not found");

    const income = data.incomeProfile;
    const assets = data.assetLiabilityProfile;

    if (!income || !assets) {
      return {
        available: false,
        message:
          "Complete income and assets steps to see your insurance coverage.",
      };
    }

    const annualIncome = income.totalMonthly * 12;
    const members = data.profile?.numberOfMembers ?? 1;
    const dependents =
      data.profile?.numberOfDependents ?? Math.max(members - 1, 0);

    const hasLife = assets.insuranceCoverageTypes.includes("life_insurance");
    const hasHealth =
      assets.insuranceCoverageTypes.includes("health_insurance");
    const hasProperty =
      assets.insuranceCoverageTypes.includes("property_insurance");

    // Recommended life cover = 10× annual income
    const recommendedLifeCover = annualIncome * 10;
    // Recommended health cover: ₹5L base + ₹2L per dependent
    const recommendedHealthCover = 500000 + dependents * 200000;

    return {
      available: true,
      annualIncome,
      coverageTypes: {
        life: hasLife,
        health: hasHealth,
        property: hasProperty,
      },
      gaps: {
        life: {
          covered: hasLife,
          recommended: recommendedLifeCover,
          status: hasLife ? "Covered" : "Not covered",
          message: hasLife
            ? `Ensure your life cover is at least ₹${(recommendedLifeCover / 100000).toFixed(0)}L (10× annual income)`
            : `You need life insurance of at least ₹${(recommendedLifeCover / 100000).toFixed(0)}L`,
        },
        health: {
          covered: hasHealth,
          recommended: recommendedHealthCover,
          dependentsConsidered: dependents,
          status: hasHealth ? "Covered" : "Not covered",
          message: hasHealth
            ? `Ensure your health cover is at least ₹${(recommendedHealthCover / 100000).toFixed(0)}L for your family`
            : `You need health insurance of at least ₹${(recommendedHealthCover / 100000).toFixed(0)}L`,
        },
        property: {
          covered: hasProperty,
          status: hasProperty ? "Covered" : "Not covered",
        },
      },
    };
  }

  // ── Goals tracker ──────────────────────────────────────────

  async getGoalsTracker(userId: string) {
    const data = await this.repo.getGoalsData(userId);
    if (!data) throw new NotFoundError("User not found");

    if (!data.financialGoals.length) {
      return { available: false, message: "No financial goals added yet." };
    }

    const surplus = data.expenseProfile?.monthlySurplus ?? 0;
    const availableForGoals = Math.max(surplus, 0);

    const goals = data.financialGoals.map((g) => {
      const remaining = Math.max(g.targetAmount - g.currentSaved, 0);
      const progressPct =
        g.targetAmount > 0
          ? Math.min(Math.round((g.currentSaved / g.targetAmount) * 100), 100)
          : 0;
      const monthsLeft = g.targetYears * 12;
      const monthlySavingsNeeded =
        monthsLeft > 0 ? Math.round(remaining / monthsLeft) : 0;
      const onTrack =
        monthlySavingsNeeded <=
        availableForGoals / Math.max(data.financialGoals.length, 1);

      return {
        id: g.id,
        type: g.type,
        priority: g.priority,
        targetAmount: g.targetAmount,
        currentSaved: g.currentSaved,
        remaining,
        targetYears: g.targetYears,
        progressPercentage: progressPct,
        monthlySavingsNeeded,
        isAchieved: g.isAchieved,
        status: g.isAchieved
          ? "Achieved"
          : onTrack
            ? "On Track"
            : "Needs Attention",
      };
    });

    return {
      available: true,
      availableMonthlySurplus: availableForGoals,
      totalGoals: goals.length,
      achieved: goals.filter((g) => g.isAchieved).length,
      goals,
    };
  }

  // ── Risk profile card ──────────────────────────────────────

  async getRiskProfile(userId: string) {
    const data = await this.repo.getRiskData(userId);
    if (!data) throw new NotFoundError("User not found");

    if (!data.riskProfile) {
      return {
        available: false,
        message:
          "Complete the risk profile questionnaire to see your risk profile.",
      };
    }

    const {
      riskCategory,
      portfolioDrop,
      investmentStyle,
      financialAims,
      timeHorizon,
      marketFeeling,
    } = data.riskProfile;
    const meta = RISK_META[riskCategory];

    return {
      available: true,
      category: riskCategory,
      label: meta.label,
      description: meta.description,
      investmentMix: meta.investmentMix,
      advice: meta.advice,
      answers: {
        portfolioDrop,
        investmentStyle,
        financialAims,
        timeHorizon,
        marketFeeling,
      },
    };
  }
}
