import type { DashboardRepository } from "./dashboard.repository";
import { getCompletionStatus } from "../../utils/profile-completion";
import { NotFoundError } from "../../utils/errors";

// ── Health score weights ──────────────────────────────────────
const WEIGHT_SAVINGS_RATE = 30;
const WEIGHT_DEBT_LOAD = 25;
const WEIGHT_EMERGENCY_FUND = 20;
const WEIGHT_INSURANCE = 15;
const WEIGHT_GOALS = 10;

function scoreSavingsRate(pct: number) {
  return Math.round((Math.min(pct, 20) / 20) * WEIGHT_SAVINGS_RATE);
}
function scoreDebtLoad(totalEmi: number, income: number) {
  if (income <= 0) return 0;
  const r = totalEmi / income;
  if (r <= 0.3) return WEIGHT_DEBT_LOAD;
  if (r >= 0.6) return 0;
  return Math.round(((0.6 - r) / 0.3) * WEIGHT_DEBT_LOAD);
}
function scoreEmergencyFund(cash: number, monthlyExp: number) {
  if (monthlyExp <= 0) return WEIGHT_EMERGENCY_FUND;
  return Math.round(
    (Math.min(cash / monthlyExp, 6) / 6) * WEIGHT_EMERGENCY_FUND,
  );
}
function scoreInsurance(life: number, health: number, annualIncome: number) {
  const lifeR = annualIncome > 0 ? Math.min(life / (annualIncome * 10), 1) : 0;
  const healthR = Math.min(health / 500000, 1);
  return Math.round(((lifeR + healthR) / 2) * WEIGHT_INSURANCE);
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

// ── Risk profile meta ─────────────────────────────────────────
const RISK_META = {
  conservative: {
    label: "Conservative",
    description:
      "You prefer safety over high returns. You are comfortable with lower but stable growth and want to protect your capital.",
    investmentMix: { debt: 70, equity: 20, gold: 10 },
    advice: "Focus on FDs, debt mutual funds, PPF, and sovereign gold bonds.",
  },
  moderate: {
    label: "Moderate",
    description:
      "You are comfortable with some ups and downs in your investments. You want a healthy balance between safety and growth.",
    investmentMix: { debt: 50, equity: 40, gold: 10 },
    advice:
      "A mix of balanced mutual funds, blue-chip stocks, and debt instruments works well for you.",
  },
  aggressive: {
    label: "Aggressive",
    description:
      "You are comfortable with higher risk in pursuit of higher long-term returns. Short-term losses don't bother you.",
    investmentMix: { debt: 20, equity: 75, gold: 5 },
    advice:
      "Equity mutual funds, direct stocks, and growth-oriented instruments suit your profile.",
  },
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
    const annualIncome = monthlyIncome * 12 + (income?.annualBonus ?? 0);
    const totalEmi = expense
      ? expense.rentOrHomeLoanEmi +
        expense.vehicleLoanEmi +
        expense.otherLoanEmis
      : 0;

    const scoreBreakdown = {
      savingsRate:
        income && expense ? scoreSavingsRate(expense.savingsRatioPct) : 0,
      debtLoad: income && expense ? scoreDebtLoad(totalEmi, monthlyIncome) : 0,
      emergencyFund:
        assets && expense
          ? scoreEmergencyFund(assets.cashSavings, monthlyExpenses)
          : 0,
      insurance: assets
        ? scoreInsurance(
            assets.existingLifeCover,
            assets.existingHealthCover,
            annualIncome,
          )
        : 0,
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
        ? {
            category: data.riskProfile.riskCategory,
            score: data.riskProfile.totalScore,
          }
        : null,
      goalsSummary: {
        total: goals.length,
        achieved: goals.filter((g) => g.isAchieved).length,
        topGoal: goals[0] ?? null,
      },
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

    // Group totals
    const fixedTotal =
      e.rentOrHomeLoanEmi +
      e.vehicleLoanEmi +
      e.otherLoanEmis +
      e.existingPremiums;
    const variableTotal =
      e.groceriesFood + e.utilities + e.transport + e.medicalHealthcare;
    const lifestyleTotal =
      e.diningEntertainment +
      e.shopping +
      e.childrenEducation +
      e.otherExpenses;
    const savingsAmount = Math.max(surplus, 0);

    const pct = (v: number) =>
      monthlyIncome > 0 ? Math.round((v / monthlyIncome) * 100) : 0;

    return {
      available: true,
      summary: {
        monthlyIncome,
        totalExpenses: e.totalMonthly,
        surplus,
        isDeficit: surplus < 0,
      },
      // For donut / pie chart
      incomeAllocation: [
        {
          label: "Fixed EMIs & Premiums",
          amount: fixedTotal,
          percentage: pct(fixedTotal),
          color: "#EF4444",
        },
        {
          label: "Variable Expenses",
          amount: variableTotal,
          percentage: pct(variableTotal),
          color: "#F97316",
        },
        {
          label: "Lifestyle",
          amount: lifestyleTotal,
          percentage: pct(lifestyleTotal),
          color: "#EAB308",
        },
        {
          label: "Savings / Surplus",
          amount: savingsAmount,
          percentage: pct(savingsAmount),
          color: "#22C55E",
        },
      ],
      // For category breakdown bar chart
      expenseCategories: [
        {
          category: "Rent / Home Loan EMI",
          amount: e.rentOrHomeLoanEmi,
          group: "fixed",
        },
        {
          category: "Vehicle Loan EMI",
          amount: e.vehicleLoanEmi,
          group: "fixed",
        },
        {
          category: "Other Loan EMIs",
          amount: e.otherLoanEmis,
          group: "fixed",
        },
        {
          category: "Insurance Premiums",
          amount: e.existingPremiums,
          group: "fixed",
        },
        {
          category: "Groceries & Food",
          amount: e.groceriesFood,
          group: "variable",
        },
        { category: "Utilities", amount: e.utilities, group: "variable" },
        { category: "Transport", amount: e.transport, group: "variable" },
        {
          category: "Medical & Healthcare",
          amount: e.medicalHealthcare,
          group: "variable",
        },
        {
          category: "Dining & Entertainment",
          amount: e.diningEntertainment,
          group: "lifestyle",
        },
        { category: "Shopping", amount: e.shopping, group: "lifestyle" },
        {
          category: "Children's Education",
          amount: e.childrenEducation,
          group: "lifestyle",
        },
        {
          category: "Other Expenses",
          amount: e.otherExpenses,
          group: "lifestyle",
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
      // For side-by-side bar chart
      comparison: [
        { label: "Total Assets", amount: a.totalAssets },
        { label: "Total Liabilities", amount: a.totalLiabilities },
        { label: "Net Worth", amount: a.netWorth },
      ],
      // For asset composition pie chart
      assetComposition: [
        { label: "Cash & Savings", amount: a.cashSavings, color: "#22C55E" },
        { label: "Fixed Deposits", amount: a.fixedDeposits, color: "#3B82F6" },
        {
          label: "Mutual Funds & Stocks",
          amount: a.mutualFundsStocks,
          color: "#8B5CF6",
        },
        { label: "Gold", amount: a.goldValue, color: "#EAB308" },
        { label: "Real Estate", amount: a.realEstateValue, color: "#F97316" },
        { label: "EPF / PPF", amount: a.epfPpfBalance, color: "#06B6D4" },
        { label: "Other Assets", amount: a.otherAssets, color: "#6B7280" },
      ].filter((item) => item.amount > 0),
      // For liability breakdown
      liabilityBreakdown: [
        { label: "Home Loan", amount: a.homeLoanOutstanding },
        { label: "Vehicle Loan", amount: a.vehicleLoanOutstanding },
        { label: "Personal Loan", amount: a.personalLoanOutstanding },
        { label: "Credit Card Dues", amount: a.creditCardOutstanding },
        { label: "Other Loans", amount: a.otherLoans },
      ].filter((item) => item.amount > 0),
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

    const annualIncome = income.totalMonthly * 12 + income.annualBonus;
    const dependents = data.profile?.numberOfDependents ?? 0;

    // Recommended life cover = 10× annual income
    const recommendedLifeCover = annualIncome * 10;
    const lifeCoverGap = Math.max(
      recommendedLifeCover - assets.existingLifeCover,
      0,
    );
    const lifeCovered =
      recommendedLifeCover > 0
        ? Math.min(
            Math.round((assets.existingLifeCover / recommendedLifeCover) * 100),
            100,
          )
        : 100;

    // Recommended health cover: ₹5L base + ₹2L per dependent
    const recommendedHealthCover = 500000 + dependents * 200000;
    const healthCoverGap = Math.max(
      recommendedHealthCover - assets.existingHealthCover,
      0,
    );
    const healthCovered = Math.min(
      Math.round((assets.existingHealthCover / recommendedHealthCover) * 100),
      100,
    );

    return {
      available: true,
      life: {
        existing: assets.existingLifeCover,
        recommended: recommendedLifeCover,
        gap: lifeCoverGap,
        coveredPercentage: lifeCovered,
        status:
          lifeCoverGap === 0
            ? "Adequate"
            : lifeCovered >= 60
              ? "Partial"
              : "Under-covered",
        message:
          lifeCoverGap > 0
            ? `You are ₹${(lifeCoverGap / 100000).toFixed(1)}L under-covered on life insurance`
            : "Your life insurance coverage is adequate",
      },
      health: {
        existing: assets.existingHealthCover,
        recommended: recommendedHealthCover,
        gap: healthCoverGap,
        coveredPercentage: healthCovered,
        dependentsConsidered: dependents,
        status:
          healthCoverGap === 0
            ? "Adequate"
            : healthCovered >= 60
              ? "Partial"
              : "Under-covered",
        message:
          healthCoverGap > 0
            ? `You are ₹${(healthCoverGap / 100000).toFixed(1)}L under-covered on health insurance`
            : "Your health insurance coverage is adequate",
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

      // Monthly savings needed = remaining / (targetYears × 12)
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

    const { riskCategory, totalScore } = data.riskProfile;
    const meta = RISK_META[riskCategory];

    return {
      available: true,
      category: riskCategory,
      score: totalScore,
      maxScore: 20,
      label: meta.label,
      description: meta.description,
      investmentMix: meta.investmentMix,
      advice: meta.advice,
    };
  }
}
