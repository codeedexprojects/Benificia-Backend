import PDFDocument from "pdfkit";

// ── Brand tokens ──────────────────────────────────────────────
const C = {
  green: "#1FAB89",
  greenLight: "#E8F8F4",
  greenDark: "#157A62",
  bg: "#F8F8F8",
  white: "#FFFFFF",
  black: "#1A1A1A",
  muted: "#6B7280",
  border: "#E0E0E0",
  red: "#E53E3E",
  amber: "#D97706",
  cardBg: "#FFFFFF",
};

const FONT_REGULAR = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";
const PAGE_MARGIN = 40;

// ── Formatters ────────────────────────────────────────────────
const INR = (n: number) =>
  "Rs." + Math.abs(Math.round(n)).toLocaleString("en-IN");

const PCT = (n: number) => `${n.toFixed(1)}%`;

const fmt = (v: string | number | null | undefined, fallback = "—") =>
  v !== null && v !== undefined && v !== "" ? String(v) : fallback;

// ── Page dimensions ───────────────────────────────────────────
const PAGE_W = 595.28; // A4 width
const CONTENT_W = PAGE_W - PAGE_MARGIN * 2;

// ── Drawing primitives ────────────────────────────────────────

function drawRoundRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
) {
  doc.save().roundedRect(x, y, w, h, r).fillColor(fill).fill();
  if (stroke) {
    doc.roundedRect(x, y, w, h, r).strokeColor(stroke).lineWidth(1).stroke();
  }
  doc.restore();
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string, y: number) {
  // Left accent bar
  doc.save().rect(PAGE_MARGIN, y, 4, 16).fillColor(C.green).fill().restore();
  doc
    .font(FONT_BOLD)
    .fontSize(12)
    .fillColor(C.black)
    .text(title, PAGE_MARGIN + 12, y + 1);
  // Underline
  doc
    .moveTo(PAGE_MARGIN, y + 20)
    .lineTo(PAGE_MARGIN + CONTENT_W, y + 20)
    .strokeColor(C.border)
    .lineWidth(0.75)
    .stroke();
}

function tableRow(
  doc: PDFKit.PDFDocument,
  y: number,
  label: string,
  value: string,
  valueColor = C.black,
  shade = false,
) {
  if (shade) {
    doc
      .save()
      .rect(PAGE_MARGIN, y, CONTENT_W, 20)
      .fillColor("#F3FBF9")
      .fill()
      .restore();
  }
  doc
    .font(FONT_REGULAR)
    .fontSize(9.5)
    .fillColor(C.muted)
    .text(label, PAGE_MARGIN + 8, y + 5, { width: CONTENT_W * 0.6 });
  doc
    .font(FONT_BOLD)
    .fontSize(9.5)
    .fillColor(valueColor)
    .text(value, PAGE_MARGIN + CONTENT_W * 0.6, y + 5, {
      width: CONTENT_W * 0.4 - 8,
      align: "right",
    });
  doc
    .moveTo(PAGE_MARGIN, y + 20)
    .lineTo(PAGE_MARGIN + CONTENT_W, y + 20)
    .strokeColor(C.border)
    .lineWidth(0.4)
    .stroke();
  return y + 20;
}

function subLabel(doc: PDFKit.PDFDocument, text: string, y: number) {
  doc
    .font(FONT_BOLD)
    .fontSize(9)
    .fillColor(C.green)
    .text(text, PAGE_MARGIN + 8, y + 6);
  return y + 20;
}

function checkPageBreak(doc: PDFKit.PDFDocument, neededHeight: number): number {
  const bottomMargin = doc.page.height - PAGE_MARGIN;
  if (doc.y + neededHeight > bottomMargin) {
    doc.addPage();
    return doc.y;
  }
  return doc.y;
}

// ── Summary card ──────────────────────────────────────────────
function summaryCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  sub: string,
  accent: string,
) {
  // Card shadow simulation (slightly offset darker rect)
  drawRoundRect(doc, x + 2, y + 2, w, h, 8, "#D1D5DB");
  // Card body
  drawRoundRect(doc, x, y, w, h, 8, C.cardBg, C.border);
  // Top accent bar
  drawRoundRect(doc, x, y, w, 5, 0, accent);

  doc
    .font(FONT_REGULAR)
    .fontSize(8)
    .fillColor(C.muted)
    .text(label.toUpperCase(), x + 10, y + 14, { width: w - 20 });
  doc
    .font(FONT_BOLD)
    .fontSize(16)
    .fillColor(C.black)
    .text(value, x + 10, y + 28, { width: w - 20 });
  doc
    .font(FONT_REGULAR)
    .fontSize(8)
    .fillColor(accent)
    .text(sub, x + 10, y + 52, { width: w - 20 });
}

// ── Score ring (text-based) ───────────────────────────────────
function scoreCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  score: number,
  label: string,
) {
  drawRoundRect(doc, x + 2, y + 2, w, h, 8, "#D1D5DB");
  drawRoundRect(doc, x, y, w, h, 8, C.cardBg, C.border);
  drawRoundRect(doc, x, y, w, 5, 0, C.green);

  const color = score >= 75 ? C.green : score >= 50 ? C.amber : C.red;

  // "HEALTH SCORE" label sits above the circle
  doc
    .font(FONT_REGULAR)
    .fontSize(8)
    .fillColor(C.muted)
    .text("HEALTH SCORE", x + 10, y + 8, { width: w - 20, align: "center" });

  // Score circle — center at y+41 so top (y+19) clears the label (ends ~y+17)
  const cx = x + w / 2;
  const cy = y + 41;
  doc.save().circle(cx, cy, 22).strokeColor(color).lineWidth(3).stroke();
  doc.restore();

  doc
    .font(FONT_BOLD)
    .fontSize(16)
    .fillColor(color)
    .text(String(score), cx - 16, cy - 10, { width: 32, align: "center" });
  doc
    .font(FONT_REGULAR)
    .fontSize(7)
    .fillColor(C.muted)
    .text("/ 100", cx - 16, cy + 7, { width: 32, align: "center" });

  doc
    .font(FONT_BOLD)
    .fontSize(8)
    .fillColor(color)
    .text(label, x + 10, y + 66, { width: w - 20, align: "center" });
}

// ── Progress bar ──────────────────────────────────────────────
function progressBar(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  value: number,
  max: number,
  color: string,
) {
  const ratio = Math.min(value / max, 1);
  doc.save().rect(x, y, w, 6).fillColor(C.border).fill().restore();
  if (ratio > 0) {
    doc
      .save()
      .rect(x, y, w * ratio, 6)
      .fillColor(color)
      .fill()
      .restore();
  }
}

// ── Header ────────────────────────────────────────────────────
function drawHeader(doc: PDFKit.PDFDocument, userName: string, date: string) {
  // Full-width green header
  doc.save().rect(0, 0, PAGE_W, 72).fillColor(C.green).fill().restore();

  // Brand name
  doc
    .font(FONT_BOLD)
    .fontSize(22)
    .fillColor(C.white)
    .text("Beneficia", PAGE_MARGIN, 18);

  // Tagline
  doc
    .font(FONT_REGULAR)
    .fontSize(9)
    .fillColor("#B2EFE0")
    .text("Personal Finance Report", PAGE_MARGIN, 44);

  // Right side: user + date
  doc
    .font(FONT_BOLD)
    .fontSize(10)
    .fillColor(C.white)
    .text(userName, 0, 22, { width: PAGE_W - PAGE_MARGIN, align: "right" });
  doc
    .font(FONT_REGULAR)
    .fontSize(8)
    .fillColor("#B2EFE0")
    .text(`Generated: ${date}`, 0, 38, {
      width: PAGE_W - PAGE_MARGIN,
      align: "right",
    });

  doc.y = 82;
}

// ── Footer on every page ──────────────────────────────────────
function drawFooter(doc: PDFKit.PDFDocument) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(pages.start + i);
    const footerY = doc.page.height - 28;

    doc
      .moveTo(PAGE_MARGIN, footerY)
      .lineTo(PAGE_W - PAGE_MARGIN, footerY)
      .strokeColor(C.border)
      .lineWidth(0.5)
      .stroke();

    // footerY+6 is inside the bottom margin area (page.height-22 > page.height-40).
    // Temporarily zero the bottom margin so PDFKit's maxY() extends to the full
    // page height, allowing text to render there without triggering a new page.
    (doc.page as any).margins.bottom = 0;

    doc
      .font(FONT_REGULAR)
      .fontSize(7.5)
      .fillColor(C.muted)
      .text(
        "This report is generated for informational purposes only and does not constitute financial advice.  |  Beneficia",
        PAGE_MARGIN,
        footerY + 6,
        { width: CONTENT_W, align: "center", lineBreak: false },
      );

    // Restore bottom margin and park the cursor safely at top of page
    (doc.page as any).margins.bottom = PAGE_MARGIN;
    doc.y = PAGE_MARGIN;
  }
}

// ── Main export ───────────────────────────────────────────────

export interface ReportData {
  user: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    age: number | null;
    gender: string | null;
    maritalStatus: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
  };
  healthScore: number;
  healthLabel: string;
  scoreBreakdown: {
    savingsRate: number;
    debtLoad: number;
    emergencyFund: number;
    insurance: number;
    goals: number;
  };
  income: {
    salaryMonthly: number;
    freelanceMonthly: number;
    businessMonthly: number;
    otherMonthly: number;
    totalMonthly: number;
    incomeSources: string[];
  } | null;
  finance: {
    numberOfDependents: number;
    householdExpenses: number;
    rentAndEmi: number;
    educationExpenses: number;
    otherExpenses: number;
    insuranceMonthly: number;
    creditCardDues: number;
    personalLoan: number;
    medicalExpenses: number;
    otherShortTermExpenses: number;
    homeLoan: number;
    vehicleLoan: number;
    educationLoan: number;
    businessLoan: number;
    otherLongTermExpenses: number;
    totalMonthlyExpenses: number;
    totalShortTermLiabilities: number;
    totalLongTermLiabilities: number;
    monthlySurplus: number;
    savingsRatioPct: number;
  } | null;
  assets: {
    residentialProperty: number;
    investment: number;
    savingsBank: number;
    goldJewelry: number;
    retirementFunds: number;
    otherAssets: number;
    totalAssets: number;
  } | null;
  goals: { financialAims: string[]; timeHorizon: string } | null;
  risk: {
    riskCategory: string;
    portfolioDrop: string;
    investmentStyle: string;
    marketFeeling: string;
    investmentMix: { debt: number; equity: number; gold: number };
    advice: string;
  } | null;
}

export async function buildFinancialReport(data: ReportData): Promise<Buffer> {
  const doc = new PDFDocument({
    margin: PAGE_MARGIN,
    size: "A4",
    bufferPages: true,
    info: {
      Title: "Beneficia Financial Health Report",
      Author: "Beneficia",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  await new Promise<void>((resolve) => {
    doc.on("end", resolve);

    const date = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const userName = data.user.fullName ?? "User";
    const monthlyIncome = data.income?.totalMonthly ?? 0;
    const surplus = data.finance?.monthlySurplus ?? 0;
    const totalAssets = data.assets?.totalAssets ?? 0;
    const totalLiab =
      (data.finance?.totalShortTermLiabilities ?? 0) +
      (data.finance?.totalLongTermLiabilities ?? 0);
    const netWorth = totalAssets - totalLiab;

    // ── PAGE 1 ────────────────────────────────────────────────
    drawHeader(doc, userName, date);

    // ── Summary cards row ─────────────────────────────────────
    const cardY = doc.y + 4;
    const cardH = 78;
    const cardGap = 10;
    const cardW = (CONTENT_W - cardGap * 3) / 4;

    scoreCard(
      doc,
      PAGE_MARGIN,
      cardY,
      cardW,
      cardH,
      data.healthScore,
      data.healthLabel,
    );

    summaryCard(
      doc,
      PAGE_MARGIN + (cardW + cardGap),
      cardY,
      cardW,
      cardH,
      "Monthly Income",
      INR(monthlyIncome),
      `Annual: ${INR(monthlyIncome * 12)}`,
      C.green,
    );

    summaryCard(
      doc,
      PAGE_MARGIN + (cardW + cardGap) * 2,
      cardY,
      cardW,
      cardH,
      "Net Worth",
      INR(netWorth),
      netWorth >= 0 ? "Assets − Liabilities" : "Deficit",
      netWorth >= 0 ? C.green : C.red,
    );

    summaryCard(
      doc,
      PAGE_MARGIN + (cardW + cardGap) * 3,
      cardY,
      cardW,
      cardH,
      "Monthly Surplus",
      (surplus >= 0 ? "+" : "-") + INR(surplus),
      surplus >= 0
        ? `Savings: ${PCT(data.finance?.savingsRatioPct ?? 0)}`
        : "Deficit",
      surplus >= 0 ? C.green : C.red,
    );

    doc.y = cardY + cardH + 20;

    // ── Score breakdown bar chart ─────────────────────────────
    checkPageBreak(doc, 100);
    let y = doc.y;
    sectionTitle(doc, "Financial Health Breakdown", y);
    y += 30;

    const bars = [
      { label: "Savings Rate", val: data.scoreBreakdown.savingsRate, max: 30 },
      { label: "Debt Load", val: data.scoreBreakdown.debtLoad, max: 25 },
      {
        label: "Emergency Fund",
        val: data.scoreBreakdown.emergencyFund,
        max: 20,
      },
      { label: "Insurance", val: data.scoreBreakdown.insurance, max: 15 },
      { label: "Goals", val: data.scoreBreakdown.goals, max: 10 },
    ];

    const barLabelW = 110;
    const barAreaW = CONTENT_W - barLabelW - 60;

    bars.forEach((b) => {
      const barColor =
        b.val / b.max >= 0.7 ? C.green : b.val / b.max >= 0.4 ? C.amber : C.red;
      doc
        .font(FONT_REGULAR)
        .fontSize(9)
        .fillColor(C.muted)
        .text(b.label, PAGE_MARGIN + 8, y + 5, { width: barLabelW });
      progressBar(
        doc,
        PAGE_MARGIN + barLabelW + 8,
        y + 5,
        barAreaW,
        b.val,
        b.max,
        barColor,
      );
      doc
        .font(FONT_BOLD)
        .fontSize(9)
        .fillColor(barColor)
        .text(
          `${b.val}/${b.max}`,
          PAGE_MARGIN + barLabelW + barAreaW + 14,
          y + 5,
          { width: 40, align: "right" },
        );
      y += 22;
    });

    doc.y = y + 12;

    // ── Personal details ──────────────────────────────────────
    checkPageBreak(doc, 120);
    y = doc.y;
    sectionTitle(doc, "Personal Details", y);
    y += 30;

    const personal: [string, string][] = [
      ["Full Name", fmt(data.user.fullName)],
      ["Age", data.user.age ? `${data.user.age} years` : "—"],
      ["Gender", fmt(data.user.gender)],
      ["Marital Status", fmt(data.user.maritalStatus)],
      [
        "Location",
        [data.user.city, data.user.state].filter(Boolean).join(", ") || "—",
      ],
      ["Email", fmt(data.user.email)],
      ["Phone", fmt(data.user.phone)],
    ];
    personal.forEach(([label, value], i) => {
      y = tableRow(doc, y, label, value, C.black, i % 2 === 1);
    });

    doc.y = y + 14;

    // ── Income ────────────────────────────────────────────────
    checkPageBreak(doc, 160);
    y = doc.y;
    sectionTitle(doc, "Income", y);
    y += 30;

    if (data.income) {
      const incomeRows: [string, string, string][] = [
        [
          "Income Sources",
          data.income.incomeSources.join(", ") || "—",
          C.black,
        ],
        ["Salary", INR(data.income.salaryMonthly), C.black],
        ["Freelance", INR(data.income.freelanceMonthly), C.black],
        ["Business", INR(data.income.businessMonthly), C.black],
        ["Other", INR(data.income.otherMonthly), C.black],
        ["Total Monthly Income", INR(data.income.totalMonthly), C.green],
        ["Annual Income", INR(data.income.totalMonthly * 12), C.green],
      ];
      incomeRows.forEach(([label, value, color], i) => {
        y = tableRow(doc, y, label, value, color, i % 2 === 1);
      });
    } else {
      doc
        .font(FONT_REGULAR)
        .fontSize(9)
        .fillColor(C.muted)
        .text("Income data not available.", PAGE_MARGIN + 8, y + 6);
      y += 24;
    }

    doc.y = y + 14;

    // ── Expenses & Cash Flow ──────────────────────────────────
    checkPageBreak(doc, 200);
    y = doc.y;
    sectionTitle(doc, "Monthly Expenses & Cash Flow", y);
    y += 30;

    if (data.finance) {
      const expRows: [string, string, string][] = [
        ["Household Expenses", INR(data.finance.householdExpenses), C.black],
        ["Rent & EMI", INR(data.finance.rentAndEmi), C.black],
        ["Education Expenses", INR(data.finance.educationExpenses), C.black],
        ["Insurance (Monthly)", INR(data.finance.insuranceMonthly), C.black],
        ["Other Expenses", INR(data.finance.otherExpenses), C.black],
        [
          "Total Monthly Expenses",
          INR(data.finance.totalMonthlyExpenses),
          C.red,
        ],
        [
          "Monthly Surplus / Deficit",
          (surplus >= 0 ? "+" : "-") + INR(Math.abs(surplus)),
          surplus >= 0 ? C.green : C.red,
        ],
        [
          "Savings Ratio",
          PCT(data.finance.savingsRatioPct),
          surplus >= 0 ? C.green : C.red,
        ],
        ["Dependents", String(data.finance.numberOfDependents), C.black],
      ];
      expRows.forEach(([label, value, color], i) => {
        y = tableRow(doc, y, label, value, color, i % 2 === 1);
      });
    }

    doc.y = y + 14;

    // ── Liabilities ───────────────────────────────────────────
    checkPageBreak(doc, 260);
    y = doc.y;
    sectionTitle(doc, "Liabilities", y);
    y += 30;

    if (data.finance) {
      y = subLabel(doc, "Short-Term", y);
      const stRows: [string, string][] = [
        ["Credit Card Dues", INR(data.finance.creditCardDues)],
        ["Personal Loan", INR(data.finance.personalLoan)],
        ["Medical Expenses", INR(data.finance.medicalExpenses)],
        ["Other Short-Term", INR(data.finance.otherShortTermExpenses)],
        ["Total Short-Term", INR(data.finance.totalShortTermLiabilities)],
      ];
      stRows.forEach(([label, value], i) => {
        const color = label.startsWith("Total") ? C.red : C.black;
        y = tableRow(doc, y, label, value, color, i % 2 === 0);
      });

      y += 6;
      y = subLabel(doc, "Long-Term", y);
      const ltRows: [string, string][] = [
        ["Home Loan", INR(data.finance.homeLoan)],
        ["Vehicle Loan", INR(data.finance.vehicleLoan)],
        ["Education Loan", INR(data.finance.educationLoan)],
        ["Business Loan", INR(data.finance.businessLoan)],
        ["Other Long-Term", INR(data.finance.otherLongTermExpenses)],
        ["Total Long-Term", INR(data.finance.totalLongTermLiabilities)],
      ];
      ltRows.forEach(([label, value], i) => {
        const color = label.startsWith("Total") ? C.red : C.black;
        y = tableRow(doc, y, label, value, color, i % 2 === 0);
      });
    }

    doc.y = y + 14;

    // ── Assets & Net Worth ────────────────────────────────────
    checkPageBreak(doc, 200);
    y = doc.y;
    sectionTitle(doc, "Assets & Net Worth", y);
    y += 30;

    if (data.assets) {
      const assetRows: [string, string, string][] = [
        ["Residential Property", INR(data.assets.residentialProperty), C.black],
        ["Investments", INR(data.assets.investment), C.black],
        ["Savings & Bank Balance", INR(data.assets.savingsBank), C.black],
        ["Gold & Jewelry", INR(data.assets.goldJewelry), C.black],
        ["Retirement Funds", INR(data.assets.retirementFunds), C.black],
        ["Other Assets", INR(data.assets.otherAssets), C.black],
        ["Total Assets", INR(totalAssets), C.green],
        ["Total Liabilities", INR(totalLiab), C.red],
        ["Net Worth", INR(netWorth), netWorth >= 0 ? C.green : C.red],
      ];
      assetRows.forEach(([label, value, color], i) => {
        y = tableRow(doc, y, label, value, color, i % 2 === 1);
      });
    }

    doc.y = y + 14;

    // ── Insurance Coverage ────────────────────────────────────
    checkPageBreak(doc, 120);
    y = doc.y;
    sectionTitle(doc, "Insurance Coverage", y);
    y += 30;

    const annualIncome = monthlyIncome * 12;
    const deps = data.finance?.numberOfDependents ?? 0;
    const recLife = annualIncome * 10;
    const recHealth = 500000 + deps * 200000;
    const hasCoverage = (data.finance?.insuranceMonthly ?? 0) > 0;

    const insurRows: [string, string, string][] = [
      [
        "Current Insurance (Monthly)",
        INR(data.finance?.insuranceMonthly ?? 0),
        C.black,
      ],
      [
        "Coverage Status",
        hasCoverage ? "Active" : "Not Covered",
        hasCoverage ? C.green : C.red,
      ],
      ["Recommended Life Cover (10× income)", INR(recLife), C.green],
      ["Recommended Health Cover", INR(recHealth), C.green],
      ["Dependents Considered", String(deps), C.black],
    ];
    insurRows.forEach(([label, value, color], i) => {
      y = tableRow(doc, y, label, value, color, i % 2 === 1);
    });

    doc.y = y + 14;

    // ── Goals ─────────────────────────────────────────────────
    checkPageBreak(doc, 80);
    y = doc.y;
    sectionTitle(doc, "Financial Goals", y);
    y += 30;

    const goalRows: [string, string][] = [
      ["Financial Aims", data.goals?.financialAims.join(", ") || "—"],
      ["Time Horizon", fmt(data.goals?.timeHorizon)],
    ];
    goalRows.forEach(([label, value], i) => {
      y = tableRow(doc, y, label, value, C.black, i % 2 === 1);
    });

    doc.y = y + 14;

    // ── Risk Profile ──────────────────────────────────────────
    checkPageBreak(doc, 160);
    y = doc.y;
    sectionTitle(doc, "Risk Profile", y);
    y += 30;

    if (data.risk) {
      const riskRows: [string, string, string][] = [
        ["Risk Category", data.risk.riskCategory.toUpperCase(), C.green],
        ["Investment Style", fmt(data.risk.investmentStyle), C.black],
        ["Portfolio Drop Preference", fmt(data.risk.portfolioDrop), C.black],
        ["Market Feeling", fmt(data.risk.marketFeeling), C.black],
        ["Recommended Mix — Debt", `${data.risk.investmentMix.debt}%`, C.black],
        [
          "Recommended Mix — Equity",
          `${data.risk.investmentMix.equity}%`,
          C.black,
        ],
        ["Recommended Mix — Gold", `${data.risk.investmentMix.gold}%`, C.black],
      ];
      riskRows.forEach(([label, value, color], i) => {
        y = tableRow(doc, y, label, value, color, i % 2 === 1);
      });

      // Advice box
      y += 8;
      checkPageBreak(doc, 50);
      drawRoundRect(doc, PAGE_MARGIN, y, CONTENT_W, 44, 6, C.greenLight);
      doc
        .font(FONT_BOLD)
        .fontSize(8.5)
        .fillColor(C.greenDark)
        .text("Advisor Note", PAGE_MARGIN + 10, y + 8);
      doc
        .font(FONT_REGULAR)
        .fontSize(8.5)
        .fillColor(C.greenDark)
        .text(data.risk.advice, PAGE_MARGIN + 10, y + 22, {
          width: CONTENT_W - 20,
        });
      y += 52;
    } else {
      doc
        .font(FONT_REGULAR)
        .fontSize(9)
        .fillColor(C.muted)
        .text("Risk profile not completed.", PAGE_MARGIN + 8, y + 6);
      y += 24;
    }

    doc.y = y + 10;

    // ── Footers on all pages ──────────────────────────────────
    drawFooter(doc);

    doc.end();
  });

  return Buffer.concat(chunks);
}
