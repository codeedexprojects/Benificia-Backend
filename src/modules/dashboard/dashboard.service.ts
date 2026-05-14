import type { DashboardRepository } from "./dashboard.repository";
import { getCompletionStatus } from "../../utils/profile-completion";
import { NotFoundError } from "../../utils/errors";
import type { InsuranceCoverageType } from "@prisma/client";

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

type AssetSnapshot = {
  residentialProperty: number;
  investment: number;
  savingsBank: number;
  goldJewelry: number;
  retirementFunds: number;
  otherAssets: number;
  totalAssets: number;
};

function assetComposition(a: AssetSnapshot) {
  return [
    {
      label: "Residential Property",
      amount: a.residentialProperty,
      color: "#F97316",
    },
    { label: "Investment", amount: a.investment, color: "#8B5CF6" },
    { label: "Savings & Bank", amount: a.savingsBank, color: "#22C55E" },
    { label: "Gold & Jewelry", amount: a.goldJewelry, color: "#EAB308" },
    { label: "Retirement Funds", amount: a.retirementFunds, color: "#06B6D4" },
    { label: "Other Assets", amount: a.otherAssets, color: "#6B7280" },
  ].filter((item) => item.amount > 0);
}

export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  // ── Overview ───────────────────────────────────────────────

  async getOverview(userId: string) {
    const data = await this.repo.getSnapshot(userId);
    if (!data) throw new NotFoundError("User not found");

    const income = data.incomeProfile;
    const expense = data.expenseProfile;
    const assets = data.assetLiabilityProfile;
    const finance = data.financeProfile;

    const monthlyIncome = income?.totalMonthly ?? 0;
    const monthlyExpenses = expense?.totalMonthly ?? 0;
    const cashAmount = assets?.savingsBank ?? 0;

    const scoreBreakdown = {
      savingsRate:
        income && expense ? scoreSavingsRate(expense.savingsRatioPct) : 0,
      debtLoad: expense
        ? scoreDebtLoad(
            (finance?.liabilityTypes?.length ?? 0) > 0,
            expense.savingsRatioPct,
          )
        : 0,
      emergencyFund:
        assets && expense ? scoreEmergencyFund(cashAmount, monthlyExpenses) : 0,
      insurance: finance ? scoreInsurance(finance.insuranceCoverageTypes) : 0,
      goals: WEIGHT_GOALS,
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
            totalAssets: assets.totalAssets,
          }
        : null,
      completion: getCompletionStatus(data.profileStage),
      riskProfile: data.riskProfile
        ? { category: data.riskProfile.riskCategory }
        : null,
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

  // ── Assets chart ───────────────────────────────────────────

  async getAssetsChart(userId: string) {
    const data = await this.repo.getAssetsData(userId);
    if (!data) throw new NotFoundError("User not found");

    const a = data.assetLiabilityProfile;
    const finance = data.financeProfile;

    if (!a) {
      return {
        available: false,
        message: "Complete the assets step to see this chart.",
      };
    }

    return {
      available: true,
      summary: {
        totalAssets: a.totalAssets,
      },
      assetComposition: assetComposition(a),
      liabilityTypes: finance?.liabilityTypes ?? [],
      insuranceCoverageTypes: finance?.insuranceCoverageTypes ?? [],
    };
  }

  // ── Insurance coverage gap ─────────────────────────────────

  async getInsuranceCoverage(userId: string) {
    const data = await this.repo.getInsuranceData(userId);
    if (!data) throw new NotFoundError("User not found");

    const income = data.incomeProfile;
    const finance = data.financeProfile;

    if (!income || !finance) {
      return {
        available: false,
        message:
          "Complete income and finance steps to see your insurance coverage.",
      };
    }

    const annualIncome = income.totalMonthly * 12;
    const dependents = finance.numberOfDependents ?? 0;

    const coverageTypes = finance.insuranceCoverageTypes;
    const hasLife = coverageTypes.includes("life_insurance");
    const hasHealth = coverageTypes.includes("health_insurance");
    const hasProperty = coverageTypes.includes("property_insurance");

    const recommendedLifeCover = annualIncome * 10;
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
