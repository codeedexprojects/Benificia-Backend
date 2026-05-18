import PDFDocument from "pdfkit";
import type { DashboardRepository } from "./dashboard.repository";
import { getCompletionStatus } from "../../utils/profile-completion";
import { NotFoundError } from "../../utils/errors";

// ── PDF helpers ───────────────────────────────────────────────

const BRAND = "#1D4ED8";
const MUTED = "#6B7280";
const BLACK = "#111827";
const LINE = "#E5E7EB";
const GREEN = "#16A34A";
const RED = "#DC2626";

const INR = (n: number) =>
  "₹" +
  Math.round(n).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });

const PCT = (n: number) => `${n.toFixed(1)}%`;

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.6);
  doc
    .rect(
      doc.page.margins.left,
      doc.y,
      doc.page.width - doc.page.margins.left - doc.page.margins.right,
      24,
    )
    .fill(BRAND);
  doc
    .fillColor("#ffffff")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(title, doc.page.margins.left + 8, doc.y - 19);
  doc.fillColor(BLACK).moveDown(0.8);
}

function row(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  valueColor = BLACK,
) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const y = doc.y;
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(MUTED)
    .text(label, left, y, { continued: false });
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(valueColor)
    .text(value, left, y, { align: "right", width: right - left });
  doc.moveDown(0.35);
  doc
    .moveTo(left, doc.y)
    .lineTo(right, doc.y)
    .strokeColor(LINE)
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.35);
}

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
    const monthlyExpenses = finance?.totalMonthlyExpenses ?? 0;
    const cashAmount = assets?.savingsBank ?? 0;
    const hasDebts =
      (finance?.totalShortTermLiabilities ?? 0) > 0 ||
      (finance?.totalLongTermLiabilities ?? 0) > 0;

    const scoreBreakdown = {
      savingsRate: finance ? scoreSavingsRate(finance.savingsRatioPct) : 0,
      debtLoad: finance ? scoreDebtLoad(hasDebts, finance.savingsRatioPct) : 0,
      emergencyFund:
        assets && finance ? scoreEmergencyFund(cashAmount, monthlyExpenses) : 0,
      insurance: finance ? scoreInsurance(finance.insuranceMonthly) : 0,
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

    const profile = data.profile;
    const income = data.incomeProfile;
    const finance = data.financeProfile;
    const assets = data.assetLiabilityProfile;
    const goals = data.goalsProfile;
    const risk = data.riskProfile;
    const latestRec = data.aiRecommendations?.[0] ?? null;

    const monthlyIncome = income?.totalMonthly ?? 0;
    const annualIncome = monthlyIncome * 12;
    const surplus = finance?.monthlySurplus ?? 0;
    const totalAssets = assets?.totalAssets ?? 0;
    const totalLiabilities =
      (finance?.totalShortTermLiabilities ?? 0) +
      (finance?.totalLongTermLiabilities ?? 0);
    const netWorth = totalAssets - totalLiabilities;

    // ── health score (same logic as getOverview) ──────────────
    const hasDebts =
      (finance?.totalShortTermLiabilities ?? 0) > 0 ||
      (finance?.totalLongTermLiabilities ?? 0) > 0;
    const scoreBreakdown = {
      savingsRate: finance ? scoreSavingsRate(finance.savingsRatioPct) : 0,
      debtLoad: finance ? scoreDebtLoad(hasDebts, finance.savingsRatioPct) : 0,
      emergencyFund:
        assets && finance
          ? scoreEmergencyFund(assets.savingsBank, finance.totalMonthlyExpenses)
          : 0,
      insurance: finance ? scoreInsurance(finance.insuranceMonthly) : 0,
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

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve) => {
      doc.on("end", resolve);

      const L = doc.page.margins.left;
      const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const generatedOn = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      // ── Cover header ─────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 90).fill(BRAND);
      doc
        .fillColor("#ffffff")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("Financial Health Report", L, 22);
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#BFDBFE")
        .text(`Generated on ${generatedOn}`, L, 52);
      doc.fillColor(BLACK).moveDown(3.5);

      // ── Personal details ──────────────────────────────────────
      sectionHeader(doc, "Personal Details");
      row(doc, "Name", profile?.fullName ?? "—");
      row(doc, "Age", profile?.age ? `${profile.age} years` : "—");
      row(doc, "Gender", profile?.gender ?? "—");
      row(doc, "Marital Status", profile?.maritalStatus ?? "—");
      row(
        doc,
        "City / State",
        [profile?.city, profile?.state].filter(Boolean).join(", ") || "—",
      );
      row(doc, "Email", data.email ?? "—");
      row(doc, "Phone", data.phone ?? "—");

      // ── Financial health score ────────────────────────────────
      sectionHeader(doc, "Financial Health Score");
      const scoreColor =
        healthScore >= 75 ? GREEN : healthScore >= 35 ? "#D97706" : RED;
      row(
        doc,
        "Overall Score",
        `${healthScore} / 100 — ${healthLabel}`,
        scoreColor,
      );
      row(
        doc,
        "Savings Rate Score",
        `${scoreBreakdown.savingsRate} / ${WEIGHT_SAVINGS_RATE}`,
      );
      row(
        doc,
        "Debt Load Score",
        `${scoreBreakdown.debtLoad} / ${WEIGHT_DEBT_LOAD}`,
      );
      row(
        doc,
        "Emergency Fund Score",
        `${scoreBreakdown.emergencyFund} / ${WEIGHT_EMERGENCY_FUND}`,
      );
      row(
        doc,
        "Insurance Score",
        `${scoreBreakdown.insurance} / ${WEIGHT_INSURANCE}`,
      );
      row(doc, "Goals Score", `${scoreBreakdown.goals} / ${WEIGHT_GOALS}`);

      // ── Income ────────────────────────────────────────────────
      sectionHeader(doc, "Income");
      row(
        doc,
        "Income Sources",
        data.incomeSourcesProfile?.incomeSources.join(", ") || "—",
      );
      row(doc, "Salary (Monthly)", INR(income?.salaryMonthly ?? 0));
      row(doc, "Freelance (Monthly)", INR(income?.freelanceMonthly ?? 0));
      row(doc, "Business (Monthly)", INR(income?.businessMonthly ?? 0));
      row(doc, "Other (Monthly)", INR(income?.otherMonthly ?? 0));
      row(doc, "Total Monthly Income", INR(monthlyIncome), BRAND);
      row(doc, "Annual Income", INR(annualIncome), BRAND);

      // ── Expenses & cash flow ──────────────────────────────────
      sectionHeader(doc, "Monthly Expenses & Cash Flow");
      row(doc, "Household Expenses", INR(finance?.householdExpenses ?? 0));
      row(doc, "Rent & EMI", INR(finance?.rentAndEmi ?? 0));
      row(doc, "Education Expenses", INR(finance?.educationExpenses ?? 0));
      row(doc, "Insurance (Monthly)", INR(finance?.insuranceMonthly ?? 0));
      row(doc, "Other Expenses", INR(finance?.otherExpenses ?? 0));
      row(
        doc,
        "Total Monthly Expenses",
        INR(finance?.totalMonthlyExpenses ?? 0),
      );
      row(
        doc,
        "Monthly Surplus / Deficit",
        `${surplus >= 0 ? "+" : ""}${INR(surplus)}`,
        surplus >= 0 ? GREEN : RED,
      );
      row(
        doc,
        "Savings Ratio",
        PCT(finance?.savingsRatioPct ?? 0),
        surplus >= 0 ? GREEN : RED,
      );
      row(
        doc,
        "Number of Dependents",
        String(finance?.numberOfDependents ?? 0),
      );

      // ── Liabilities ───────────────────────────────────────────
      sectionHeader(doc, "Liabilities");
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(MUTED)
        .text("Short-Term", L)
        .moveDown(0.3);
      row(doc, "Credit Card Dues", INR(finance?.creditCardDues ?? 0));
      row(doc, "Personal Loan", INR(finance?.personalLoan ?? 0));
      row(doc, "Medical Expenses", INR(finance?.medicalExpenses ?? 0));
      row(doc, "Other Short-Term", INR(finance?.otherShortTermExpenses ?? 0));
      row(
        doc,
        "Total Short-Term Liabilities",
        INR(finance?.totalShortTermLiabilities ?? 0),
        RED,
      );
      doc
        .moveDown(0.3)
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(MUTED)
        .text("Long-Term", L)
        .moveDown(0.3);
      row(doc, "Home Loan", INR(finance?.homeLoan ?? 0));
      row(doc, "Vehicle Loan", INR(finance?.vehicleLoan ?? 0));
      row(doc, "Education Loan", INR(finance?.educationLoan ?? 0));
      row(doc, "Business Loan", INR(finance?.businessLoan ?? 0));
      row(doc, "Other Long-Term", INR(finance?.otherLongTermExpenses ?? 0));
      row(
        doc,
        "Total Long-Term Liabilities",
        INR(finance?.totalLongTermLiabilities ?? 0),
        RED,
      );

      // ── Assets & net worth ────────────────────────────────────
      sectionHeader(doc, "Assets & Net Worth");
      row(doc, "Residential Property", INR(assets?.residentialProperty ?? 0));
      row(doc, "Investments", INR(assets?.investment ?? 0));
      row(doc, "Savings & Bank Balance", INR(assets?.savingsBank ?? 0));
      row(doc, "Gold & Jewelry", INR(assets?.goldJewelry ?? 0));
      row(doc, "Retirement Funds", INR(assets?.retirementFunds ?? 0));
      row(doc, "Other Assets", INR(assets?.otherAssets ?? 0));
      row(doc, "Total Assets", INR(totalAssets), GREEN);
      row(doc, "Total Liabilities", INR(totalLiabilities), RED);
      row(doc, "Net Worth", INR(netWorth), netWorth >= 0 ? GREEN : RED);

      // ── Insurance coverage ────────────────────────────────────
      sectionHeader(doc, "Insurance Coverage");
      const recLifeCover = annualIncome * 10;
      const recHealthCover =
        500000 + (finance?.numberOfDependents ?? 0) * 200000;
      row(
        doc,
        "Current Insurance (Monthly)",
        INR(finance?.insuranceMonthly ?? 0),
      );
      row(doc, "Recommended Life Cover", INR(recLifeCover));
      row(doc, "Recommended Health Cover", INR(recHealthCover));
      row(
        doc,
        "Coverage Status",
        finance?.insuranceMonthly ? "Active" : "Not covered",
        finance?.insuranceMonthly ? GREEN : RED,
      );

      // ── Goals ─────────────────────────────────────────────────
      sectionHeader(doc, "Financial Goals");
      row(doc, "Financial Aims", goals?.financialAims.join(", ") || "—");
      row(doc, "Time Horizon", goals?.timeHorizon ?? "—");

      // ── Risk profile ──────────────────────────────────────────
      sectionHeader(doc, "Risk Profile");
      if (risk) {
        const riskMeta = RISK_META[risk.riskCategory];
        row(doc, "Risk Category", riskMeta.label);
        row(doc, "Portfolio Drop Preference", risk.portfolioDrop);
        row(doc, "Investment Style", risk.investmentStyle);
        row(doc, "Market Feeling", risk.marketFeeling);
        row(
          doc,
          "Recommended Portfolio Mix",
          `Debt ${riskMeta.investmentMix.debt}% | Equity ${riskMeta.investmentMix.equity}% | Gold ${riskMeta.investmentMix.gold}%`,
        );
        doc
          .moveDown(0.3)
          .fontSize(9)
          .font("Helvetica")
          .fillColor(MUTED)
          .text(riskMeta.advice, L, doc.y, { width: W })
          .moveDown(0.5);
      } else {
        doc
          .fontSize(10)
          .fillColor(MUTED)
          .text("Risk profile not completed.", L)
          .moveDown(0.5);
      }

      // ── AI Recommendations ────────────────────────────────────
      if (latestRec) {
        const healthRecs =
          (
            latestRec.insuranceOutput as {
              recommendations?: {
                rank: number;
                plan_name: string;
                score: number;
                reasoning: string;
              }[];
            }
          )?.recommendations ?? [];
        const investRecs =
          (
            latestRec.investmentOutput as {
              recommendations?: {
                rank: number;
                plan_name: string;
                score: number;
                reasoning: string;
              }[];
            }
          )?.recommendations ?? [];

        if (healthRecs.length > 0) {
          sectionHeader(doc, "Health / Insurance Recommendations");
          healthRecs.forEach((r) => {
            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .fillColor(BLACK)
              .text(`#${r.rank} ${r.plan_name}  (Score: ${r.score})`, L)
              .moveDown(0.2);
            doc
              .fontSize(9)
              .font("Helvetica")
              .fillColor(MUTED)
              .text(r.reasoning, L, doc.y, { width: W })
              .moveDown(0.5);
          });
        }

        if (investRecs.length > 0) {
          sectionHeader(doc, "Investment Recommendations");
          investRecs.forEach((r) => {
            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .fillColor(BLACK)
              .text(`#${r.rank} ${r.plan_name}  (Score: ${r.score})`, L)
              .moveDown(0.2);
            doc
              .fontSize(9)
              .font("Helvetica")
              .fillColor(MUTED)
              .text(r.reasoning, L, doc.y, { width: W })
              .moveDown(0.5);
          });
        }

        doc
          .moveDown(0.3)
          .fontSize(8)
          .fillColor(MUTED)
          .text(
            `Recommendations generated on ${new Date(latestRec.generatedAt).toLocaleDateString("en-IN")} (v${latestRec.version})`,
            L,
          );
      }

      // ── Footer ────────────────────────────────────────────────
      doc.moveDown(1);
      doc
        .moveTo(L, doc.y)
        .lineTo(L + W, doc.y)
        .strokeColor(LINE)
        .lineWidth(1)
        .stroke();
      doc
        .moveDown(0.5)
        .fontSize(8)
        .fillColor(MUTED)
        .text(
          "This report is generated for informational purposes only and does not constitute financial advice.",
          L,
          doc.y,
          { width: W, align: "center" },
        );

      doc.end();
    });

    return Buffer.concat(chunks);
  }
}
