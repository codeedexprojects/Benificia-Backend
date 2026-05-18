import type { DashboardRepository } from "./dashboard.repository";
import { buildFinancialReport } from "./report.template";
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
function scoreInsurance(insuranceMonthly: number) {
  return insuranceMonthly > 0 ? WEIGHT_INSURANCE : 0;
}

function deriveHealthScore(
  finance: {
    savingsRatioPct: number;
    totalShortTermLiabilities: number;
    totalLongTermLiabilities: number;
    insuranceMonthly: number;
    totalMonthlyExpenses: number;
  } | null,
  assets: { savingsBank: number } | null,
) {
  const hasDebts =
    (finance?.totalShortTermLiabilities ?? 0) > 0 ||
    (finance?.totalLongTermLiabilities ?? 0) > 0;

  const breakdown = {
    savingsRate: finance ? scoreSavingsRate(finance.savingsRatioPct) : 0,
    debtLoad: finance ? scoreDebtLoad(hasDebts, finance.savingsRatioPct) : 0,
    emergencyFund:
      assets && finance
        ? scoreEmergencyFund(assets.savingsBank, finance.totalMonthlyExpenses)
        : 0,
    insurance: finance ? scoreInsurance(finance.insuranceMonthly) : 0,
    goals: WEIGHT_GOALS,
  };

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const label =
    score >= 75
      ? "Excellent"
      : score >= 55
        ? "Good"
        : score >= 35
          ? "Fair"
          : "Needs Attention";

  return { score, label, breakdown };
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
    const finance = data.financeProfile;
    const assets = data.assetLiabilityProfile;
    const monthlyIncome = income?.totalMonthly ?? 0;

    const {
      score: healthScore,
      label: healthLabel,
      breakdown: scoreBreakdown,
    } = deriveHealthScore(finance, assets);

    return {
      healthScore: {
        score: healthScore,
        label: healthLabel,
        breakdown: scoreBreakdown,
        maxScore: 100,
      },
      cashFlow: finance
        ? {
            monthly: finance.monthlySurplus,
            isDeficit: finance.monthlySurplus < 0,
          }
        : null,
      netWorth: assets ? { totalAssets: assets.totalAssets } : null,
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
    const finance = data.financeProfile;

    if (!income || !finance) {
      return {
        available: false,
        message: "Complete income and finance steps to see this chart.",
      };
    }

    const monthlyIncome = income.totalMonthly;
    const surplus = finance.monthlySurplus;
    const savingsAmount = Math.max(surplus, 0);

    const pct = (v: number) =>
      monthlyIncome > 0 ? Math.round((v / monthlyIncome) * 100) : 0;

    return {
      available: true,
      summary: {
        monthlyIncome,
        totalExpenses: finance.totalMonthlyExpenses,
        surplus,
        savingsRatioPct: finance.savingsRatioPct,
        isDeficit: surplus < 0,
      },
      incomeAllocation: [
        {
          label: "Expenses",
          amount: finance.totalMonthlyExpenses,
          percentage: pct(finance.totalMonthlyExpenses),
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
        totalShortTermLiabilities: finance?.totalShortTermLiabilities ?? 0,
        totalLongTermLiabilities: finance?.totalLongTermLiabilities ?? 0,
      },
      assetComposition: assetComposition(a),
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
    const hasCoverage = finance.insuranceMonthly > 0;
    const recommendedLifeCover = annualIncome * 10;
    const recommendedHealthCover = 500000 + dependents * 200000;

    return {
      available: true,
      annualIncome,
      insuranceMonthly: finance.insuranceMonthly,
      hasCoverage,
      gaps: {
        life: {
          recommended: recommendedLifeCover,
          message: `Ensure your life cover is at least ₹${(recommendedLifeCover / 100000).toFixed(0)}L (10× annual income)`,
        },
        health: {
          recommended: recommendedHealthCover,
          dependentsConsidered: dependents,
          message: `Ensure your health cover is at least ₹${(recommendedHealthCover / 100000).toFixed(0)}L for your family`,
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

    const { riskCategory, portfolioDrop, investmentStyle, marketFeeling } =
      data.riskProfile;
    const goals = data.goalsProfile;
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
        marketFeeling,
        financialAims: goals?.financialAims ?? [],
        timeHorizon: goals?.timeHorizon ?? null,
      },
    };
  }

  // ── PDF Report ─────────────────────────────────────────────

  async generatePdfReport(userId: string): Promise<Buffer> {
    const data = await this.repo.getFullReportData(userId);
    if (!data) throw new NotFoundError("User not found");

    const finance = data.financeProfile;
    const assets = data.assetLiabilityProfile;
    const risk = data.riskProfile;

    const {
      score: healthScore,
      label: healthLabel,
      breakdown: scoreBreakdown,
    } = deriveHealthScore(finance, assets);

    return buildFinancialReport({
      user: {
        fullName: data.profile?.fullName ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        age: data.profile?.age ?? null,
        gender: data.profile?.gender ?? null,
        maritalStatus: data.profile?.maritalStatus ?? null,
        city: data.profile?.city ?? null,
        state: data.profile?.state ?? null,
        pincode: data.profile?.pincode ?? null,
      },
      healthScore,
      healthLabel,
      scoreBreakdown,
      income: data.incomeProfile
        ? {
            ...data.incomeProfile,
            incomeSources: data.incomeSourcesProfile?.incomeSources ?? [],
          }
        : null,
      finance: finance ?? null,
      assets: assets ?? null,
      goals: data.goalsProfile
        ? {
            financialAims: data.goalsProfile.financialAims,
            timeHorizon: data.goalsProfile.timeHorizon,
          }
        : null,
      risk: risk
        ? {
            riskCategory: risk.riskCategory,
            portfolioDrop: risk.portfolioDrop,
            investmentStyle: risk.investmentStyle,
            marketFeeling: risk.marketFeeling,
            investmentMix: RISK_META[risk.riskCategory].investmentMix,
            advice: RISK_META[risk.riskCategory].advice,
          }
        : null,
    });
  }
}
