/// <reference types="node" />

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env["DATABASE_URL"] ?? "",
});
const prisma = new PrismaClient({ adapter } as ConstructorParameters<
  typeof PrismaClient
>[0]);

// ── Fixed UUIDs — idempotent re-runs ─────────────────────────

const IDS = {
  admin: "00000000-0000-0000-0000-000000000001",
  scoringConfig: "00000000-0000-0000-0000-000000000002",
  company: "00000000-0000-0000-0000-000000000010",
  tieupAudit: "00000000-0000-0000-0000-000000000011",
  productTerm: "00000000-0000-0000-0000-000000000020",
  productHealth: "00000000-0000-0000-0000-000000000021",
  productUlip: "00000000-0000-0000-0000-000000000022",
  user: "00000000-0000-0000-0000-000000000100",
  userProfile: "00000000-0000-0000-0000-000000000101",
  kycConsent: "00000000-0000-0000-0000-000000000102",
  kycAuditSend: "00000000-0000-0000-0000-000000000103",
  kycAuditVerify: "00000000-0000-0000-0000-000000000104",
  kycAuditConfirm: "00000000-0000-0000-0000-000000000105",
  incomeProfile: "00000000-0000-0000-0000-000000000110",
  expenseProfile: "00000000-0000-0000-0000-000000000111",
  assetProfile: "00000000-0000-0000-0000-000000000112",
  goalEmergency: "00000000-0000-0000-0000-000000000120",
  goalRetirement: "00000000-0000-0000-0000-000000000121",
  goalEducation: "00000000-0000-0000-0000-000000000122",
  goalHouse: "00000000-0000-0000-0000-000000000123",
  riskProfile: "00000000-0000-0000-0000-000000000130",
  recommendation: "00000000-0000-0000-0000-000000000140",
  recProduct1: "00000000-0000-0000-0000-000000000141",
  recProduct2: "00000000-0000-0000-0000-000000000142",
  interest1: "00000000-0000-0000-0000-000000000150",
  otpLog: "00000000-0000-0000-0000-000000000160",
  notifOtp: "00000000-0000-0000-0000-000000000200",
  notifKyc: "00000000-0000-0000-0000-000000000201",
  notifRec: "00000000-0000-0000-0000-000000000202",
};

// ── Computed helpers ──────────────────────────────────────────

// Income
const income = {
  salaryMonthly: 80_000,
  businessMonthly: 0,
  passiveMonthly: 5_000,
  otherMonthly: 0,
  totalMonthly: 85_000,
  annualBonus: 100_000,
  expectedGrowthPct: 8,
};

// Expenses
const expenseFields = {
  rentOrHomeLoanEmi: 20_000,
  vehicleLoanEmi: 5_000,
  otherLoanEmis: 3_000,
  existingPremiums: 2_000,
  groceriesFood: 8_000,
  utilities: 2_000,
  transport: 3_000,
  medicalHealthcare: 1_000,
  diningEntertainment: 3_000,
  shopping: 2_000,
  childrenEducation: 5_000,
  otherExpenses: 1_000,
};
const expenseTotalMonthly = Object.values(expenseFields).reduce(
  (s, v) => s + v,
  0,
); // 55_000
const monthlySurplus = income.totalMonthly - expenseTotalMonthly; // 30_000
const savingsRatioPct = parseFloat(
  ((monthlySurplus / income.totalMonthly) * 100).toFixed(2),
); // 35.29

// Assets
const assetFields = {
  cashSavings: 200_000,
  fixedDeposits: 500_000,
  mutualFundsStocks: 300_000,
  goldValue: 100_000,
  realEstateValue: 5_000_000,
  epfPpfBalance: 400_000,
  otherAssets: 50_000,
};
const totalAssets = Object.values(assetFields).reduce((s, v) => s + v, 0); // 6_550_000

const liabilityFields = {
  homeLoanOutstanding: 2_000_000,
  vehicleLoanOutstanding: 200_000,
  personalLoanOutstanding: 0,
  creditCardOutstanding: 50_000,
  otherLoans: 0,
};
const totalLiabilities = Object.values(liabilityFields).reduce(
  (s, v) => s + v,
  0,
); // 2_250_000
const netWorth = totalAssets - totalLiabilities; // 4_300_000

async function main() {
  console.log("🌱  Starting seed...");

  // ── 1. Admin user ───────────────────────────────────────────
  const adminPasswordHash = await bcrypt.hash("Admin@1234", 12);

  const admin = await prisma.adminUser.upsert({
    where: { id: IDS.admin },
    create: {
      id: IDS.admin,
      email: "admin@benifica.in",
      passwordHash: adminPasswordHash,
      name: "Super Admin",
      role: "super_admin",
      isActive: true,
      lastLoginAt: new Date(),
    },
    update: {
      name: "Super Admin",
      role: "super_admin",
      isActive: true,
    },
  });
  console.log("✓  Admin:", admin.email);

  // ── 2. Scoring config ───────────────────────────────────────
  await prisma.scoringConfig.upsert({
    where: { id: IDS.scoringConfig },
    create: {
      id: IDS.scoringConfig,
      savingsRatioWeight: 40,
      debtRatioWeight: 40,
      emergencyFundWeight: 20,
      poorThreshold: 40,
      averageThreshold: 60,
      goodThreshold: 80,
      isActive: true,
      updatedBy: IDS.admin,
    },
    update: { isActive: true },
  });
  console.log("✓  ScoringConfig");

  // ── 3. Notification templates ───────────────────────────────
  await prisma.notificationTemplate.upsert({
    where: { id: IDS.notifOtp },
    create: {
      id: IDS.notifOtp,
      key: "otp_login",
      channel: "email",
      subject: "Your Benifica verification code",
      body: "<p>Hi,</p><p>Your verification code is: <strong>{{otp_code}}</strong></p><p>Valid for {{expiry_minutes}} minutes.</p>",
      isActive: true,
    },
    update: {},
  });

  await prisma.notificationTemplate.upsert({
    where: { id: IDS.notifKyc },
    create: {
      id: IDS.notifKyc,
      key: "kyc_verified",
      channel: "email",
      subject: "Your KYC is verified",
      body: "<p>Hi {{user_name}},</p><p>Your Aadhaar KYC has been successfully verified on Benifica.</p>",
      isActive: true,
    },
    update: {},
  });

  await prisma.notificationTemplate.upsert({
    where: { id: IDS.notifRec },
    create: {
      id: IDS.notifRec,
      key: "recommendation_ready",
      channel: "email",
      subject: "Your personalized recommendations are ready",
      body: "<p>Hi {{user_name}},</p><p>Your financial recommendations are ready. Log in to view them.</p>",
      isActive: true,
    },
    update: {},
  });
  console.log("✓  NotificationTemplates (3)");

  // ── 4. Insurance company ────────────────────────────────────
  const company = await prisma.insuranceCompany.upsert({
    where: { id: IDS.company },
    create: {
      id: IDS.company,
      name: "LIC of India",
      website: "https://licindia.in",
      contactEmail: "contact@licindia.in",
      contactPhone: "022-68276827",
      agreementRef: "LIC-TIE-2024-001",
      tieupStartDate: new Date("2024-01-01"),
      tieupEndDate: new Date("2026-12-31"),
      commissionPct: 15,
      priorityOrder: 1,
      isActive: true,
      notes: "Primary tie-up partner — term and health products",
      addedByAdmin: IDS.admin,
    },
    update: { isActive: true },
  });
  console.log("✓  InsuranceCompany:", company.name);

  // ── 5. Tieup audit log ──────────────────────────────────────
  await prisma.tieupAuditLog.upsert({
    where: { id: IDS.tieupAudit },
    create: {
      id: IDS.tieupAudit,
      companyId: IDS.company,
      adminId: IDS.admin,
      action: "added",
      changes: { after: { name: "LIC of India", status: "active" } },
    },
    update: {},
  });
  console.log("✓  TieupAuditLog");

  // ── 6. Insurance products ───────────────────────────────────
  await prisma.insuranceProduct.upsert({
    where: { id: IDS.productTerm },
    create: {
      id: IDS.productTerm,
      companyId: IDS.company,
      managedByAdmin: IDS.admin,
      externalId: "LIC-TECH-TERM-001",
      name: "LIC Tech Term",
      type: "term",
      premiumMonthly: 1200,
      premiumAnnual: 13500,
      coverageAmount: 10_000_000,
      minAge: 18,
      maxAge: 65,
      policyTermYears: 30,
      claimSettlementRatio: 98.5,
      riskLevel: "low",
      benefits: [
        "Pure term plan",
        "High coverage at low cost",
        "Online purchase",
      ],
      exclusions: ["Suicide within 1 year", "Pre-existing conditions"],
      sourceUrl: "https://licindia.in/tech-term",
      isTieupProduct: true,
      isActive: true,
      scrapedAt: new Date(),
    },
    update: { isActive: true },
  });

  await prisma.insuranceProduct.upsert({
    where: { id: IDS.productHealth },
    create: {
      id: IDS.productHealth,
      companyId: IDS.company,
      managedByAdmin: IDS.admin,
      externalId: "LIC-HEALTH-001",
      name: "LIC Arogya Rakshak",
      type: "health",
      premiumMonthly: 800,
      premiumAnnual: 9000,
      coverageAmount: 500_000,
      minAge: 18,
      maxAge: 65,
      policyTermYears: 1,
      claimSettlementRatio: 96.2,
      riskLevel: "low",
      benefits: [
        "Cashless hospitalisation",
        "Day care procedures",
        "No claim bonus",
      ],
      exclusions: ["Cosmetic surgery", "Dental treatment"],
      sourceUrl: "https://licindia.in/health",
      isTieupProduct: true,
      isActive: true,
      scrapedAt: new Date(),
    },
    update: { isActive: true },
  });

  await prisma.insuranceProduct.upsert({
    where: { id: IDS.productUlip },
    create: {
      id: IDS.productUlip,
      companyId: null,
      managedByAdmin: IDS.admin,
      externalId: "HDFC-ULIP-001",
      name: "HDFC Life Click 2 Wealth",
      type: "ulip",
      premiumMonthly: 5000,
      premiumAnnual: 60_000,
      coverageAmount: 3_000_000,
      minAge: 18,
      maxAge: 60,
      policyTermYears: 20,
      claimSettlementRatio: 99.1,
      riskLevel: "moderate",
      benefits: [
        "Market-linked returns",
        "Life cover",
        "Tax benefit under 80C",
      ],
      exclusions: ["Suicide within 1 year"],
      sourceUrl: "https://hdfclife.com/click2wealth",
      isTieupProduct: false,
      isActive: true,
      scrapedAt: new Date(),
    },
    update: { isActive: true },
  });
  console.log("✓  InsuranceProducts (3)");

  // ── 7. Test user ────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { id: IDS.user },
    create: {
      id: IDS.user,
      email: "testuser@benifica.in",
      profileStage: "recommendations_ready",
      kycStatus: "verified",
      isActive: true,
    },
    update: {
      profileStage: "recommendations_ready",
      kycStatus: "verified",
    },
  });
  console.log("✓  User:", user.email);

  // ── 7b. Static OTP for auth testing ─────────────────────────
  // OTP: 123456  — never expires, so you can call verify-otp without SES
  const staticOtpHash = await bcrypt.hash("123456", 10);

  // Clear any previous test OTP for this email to avoid "already verified" conflicts
  await prisma.otpLog.updateMany({
    where: {
      email: "testuser@benifica.in",
      isVerified: false,
    },
    data: { isVerified: true },
  });

  await prisma.otpLog.upsert({
    where: { id: IDS.otpLog },
    create: {
      id: IDS.otpLog,
      userId: IDS.user,
      email: "testuser@benifica.in",
      purpose: "login",
      otpCodeHash: staticOtpHash,
      attemptCount: 0,
      isVerified: false,
      expiresAt: new Date("2099-12-31T23:59:59Z"),
      // Far-future createdAt ensures this row is always returned first by
      // findActiveOtpLog (orderBy createdAt desc), even if sendOtp was called
      // after the seed and created a newer row with a random OTP.
      createdAt: new Date("2099-01-01T00:00:00Z"),
    },
    update: {
      otpCodeHash: staticOtpHash,
      attemptCount: 0,
      isVerified: false,
      expiresAt: new Date("2099-12-31T23:59:59Z"),
      createdAt: new Date("2099-01-01T00:00:00Z"),
    },
  });
  console.log("✓  OtpLog (static login OTP: 123456)");

  // ── 8. User profile (KYC data) ──────────────────────────────
  await prisma.userProfile.upsert({
    where: { id: IDS.userProfile },
    create: {
      id: IDS.userProfile,
      userId: IDS.user,
      fullName: "Rahul Sharma",
      dateOfBirth: new Date("1990-06-15"),
      gender: "male",
      photoS3Key:
        "profiles/00000000-0000-0000-0000-000000000100/aadhaar_photo.jpg",
      addressLine1: "42, Ashok Nagar",
      landmark: "Near City Mall",
      locality: "Koramangala",
      city: "Bengaluru",
      district: "Bengaluru Urban",
      state: "Karnataka",
      pincode: "560034",
      country: "India",
      aadhaarLast4: "5678",
      kycMethod: "aadhaar_otp",
      kycVerifiedAt: new Date("2024-03-10T09:30:00Z"),
      maritalStatus: "married",
      numberOfDependents: 3,
      childrenAges: [5, 8],
      occupation: "Software Engineer",
      employer: "Infosys Ltd",
      incomeType: "fixed",
      retirementAge: 60,
      isPrimaryEarner: true,
      dependentsRelyOnIncome: true,
    },
    update: {
      fullName: "Rahul Sharma",
      maritalStatus: "married",
      numberOfDependents: 3,
    },
  });
  console.log("✓  UserProfile");

  // ── 9. KYC consent ──────────────────────────────────────────
  await prisma.kycConsent.upsert({
    where: { id: IDS.kycConsent },
    create: {
      id: IDS.kycConsent,
      userId: IDS.user,
      consentType: "aadhaar_kyc",
      consentText:
        "I hereby provide my consent to verify my Aadhaar details for KYC completion on Benifica.",
      ipAddress: "122.168.1.10",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
      consentedAt: new Date("2024-03-10T09:29:00Z"),
    },
    update: {},
  });
  console.log("✓  KycConsent");

  // ── 10. KYC audit logs ──────────────────────────────────────
  await prisma.kycAuditLog.upsert({
    where: { id: IDS.kycAuditSend },
    create: {
      id: IDS.kycAuditSend,
      userId: IDS.user,
      action: "otp_sent",
      method: "aadhaar_otp",
      referenceId: "REF-DEEPVUE-ABC123",
      ipAddress: "122.168.1.10",
      outcome: "success",
    },
    update: {},
  });

  await prisma.kycAuditLog.upsert({
    where: { id: IDS.kycAuditVerify },
    create: {
      id: IDS.kycAuditVerify,
      userId: IDS.user,
      action: "otp_verified",
      method: "aadhaar_otp",
      referenceId: "REF-DEEPVUE-ABC123",
      ipAddress: "122.168.1.10",
      outcome: "success",
    },
    update: {},
  });

  await prisma.kycAuditLog.upsert({
    where: { id: IDS.kycAuditConfirm },
    create: {
      id: IDS.kycAuditConfirm,
      userId: IDS.user,
      action: "kyc_confirmed",
      method: "aadhaar_otp",
      ipAddress: "122.168.1.10",
      outcome: "success",
    },
    update: {},
  });
  console.log("✓  KycAuditLogs (3)");

  // ── 11. Income profile ──────────────────────────────────────
  await prisma.incomeProfile.upsert({
    where: { id: IDS.incomeProfile },
    create: {
      id: IDS.incomeProfile,
      userId: IDS.user,
      ...income,
    },
    update: { ...income },
  });
  console.log(
    `✓  IncomeProfile  (totalMonthly=₹${income.totalMonthly.toLocaleString()})`,
  );

  // ── 12. Expense profile ─────────────────────────────────────
  await prisma.expenseProfile.upsert({
    where: { id: IDS.expenseProfile },
    create: {
      id: IDS.expenseProfile,
      userId: IDS.user,
      ...expenseFields,
      totalMonthly: expenseTotalMonthly,
      monthlySurplus,
      savingsRatioPct,
    },
    update: {
      ...expenseFields,
      totalMonthly: expenseTotalMonthly,
      monthlySurplus,
      savingsRatioPct,
    },
  });
  console.log(
    `✓  ExpenseProfile (totalMonthly=₹${expenseTotalMonthly.toLocaleString()}, surplus=₹${monthlySurplus.toLocaleString()}, ratio=${savingsRatioPct}%)`,
  );

  // ── 13. Asset & liability profile ───────────────────────────
  await prisma.assetLiabilityProfile.upsert({
    where: { id: IDS.assetProfile },
    create: {
      id: IDS.assetProfile,
      userId: IDS.user,
      ...assetFields,
      totalAssets,
      ...liabilityFields,
      totalLiabilities,
      netWorth,
      existingLifeCover: 5_000_000,
      existingHealthCover: 500_000,
    },
    update: {
      ...assetFields,
      totalAssets,
      ...liabilityFields,
      totalLiabilities,
      netWorth,
      existingLifeCover: 5_000_000,
      existingHealthCover: 500_000,
    },
  });
  console.log(
    `✓  AssetLiabilityProfile (netWorth=₹${netWorth.toLocaleString()})`,
  );

  // ── 14. Financial goals ─────────────────────────────────────
  await prisma.financialGoal.deleteMany({ where: { userId: IDS.user } });
  await prisma.financialGoal.createMany({
    data: [
      {
        id: IDS.goalEmergency,
        userId: IDS.user,
        type: "emergency_fund",
        targetAmount: 500_000,
        targetYears: 1,
        currentSaved: 100_000,
        priority: 1,
      },
      {
        id: IDS.goalRetirement,
        userId: IDS.user,
        type: "retirement",
        targetAmount: 30_000_000,
        targetYears: 25,
        currentSaved: 400_000,
        priority: 2,
      },
      {
        id: IDS.goalEducation,
        userId: IDS.user,
        type: "child_education",
        targetAmount: 3_000_000,
        targetYears: 13,
        currentSaved: 50_000,
        priority: 3,
      },
      {
        id: IDS.goalHouse,
        userId: IDS.user,
        type: "house_purchase",
        targetAmount: 8_000_000,
        targetYears: 7,
        currentSaved: 500_000,
        priority: 4,
      },
    ],
  });
  console.log("✓  FinancialGoals (4)");

  // ── 15. Risk profile ────────────────────────────────────────
  const riskAnswers = [3, 3, 2, 3, 2]; // totalScore=13 → moderate
  const riskScore = riskAnswers.reduce((s, a) => s + a, 0);

  await prisma.riskProfile.upsert({
    where: { id: IDS.riskProfile },
    create: {
      id: IDS.riskProfile,
      userId: IDS.user,
      answers: riskAnswers,
      totalScore: riskScore,
      riskCategory: "moderate",
    },
    update: {
      answers: riskAnswers,
      totalScore: riskScore,
      riskCategory: "moderate",
    },
  });
  console.log(`✓  RiskProfile (score=${riskScore}, category=moderate)`);

  // ── 16. Insurance interest ──────────────────────────────────
  await prisma.insuranceInterest.upsert({
    where: { id: IDS.interest1 },
    create: {
      id: IDS.interest1,
      userId: IDS.user,
      productId: IDS.productTerm,
      status: "pending",
      callbackTime: "Weekdays 10am-12pm",
      notes: "User expressed interest from recommendation page",
    },
    update: { status: "pending" },
  });
  console.log("✓  InsuranceInterest");

  // ── 17. AI recommendation ───────────────────────────────────
  await prisma.aiRecommendation.upsert({
    where: { id: IDS.recommendation },
    create: {
      id: IDS.recommendation,
      userId: IDS.user,
      status: "ready",
      version: 1,
      tieupCompanyCount: 1,
      insuranceOutput: {
        summary:
          "Based on your income of ₹85,000/month, moderate risk appetite, and dependents, we recommend a term cover of ₹1.5 crore and health cover of ₹10 lakh.",
        termCoverRequired: 15_000_000,
        healthCoverRequired: 1_000_000,
        products: [IDS.productTerm, IDS.productHealth],
      },
      investmentOutput: {
        summary:
          "With a savings ratio of 35%, a monthly SIP of ₹20,000 in equity funds is recommended to meet your retirement and education goals.",
        monthlySipRecommended: 20_000,
        allocation: { equity: 60, debt: 30, gold: 10 },
      },
      fullPayloadSent: {
        userId: IDS.user,
        income: income,
        riskCategory: "moderate",
        goals: [
          "retirement",
          "child_education",
          "house_purchase",
          "emergency_fund",
        ],
        existingCover: { life: 5_000_000, health: 500_000 },
        netWorth,
        dependents: 3,
      },
      generatedAt: new Date(),
      viewedAt: new Date(),
    },
    update: { status: "ready" },
  });

  // Recommendation products
  await prisma.recommendationProduct.deleteMany({
    where: { recommendationId: IDS.recommendation },
  });
  await prisma.recommendationProduct.createMany({
    data: [
      {
        id: IDS.recProduct1,
        recommendationId: IDS.recommendation,
        productId: IDS.productTerm,
        rank: 1,
        matchReason:
          "Best-fit term plan for your age (34), income level, and 3 dependents. CSR of 98.5%.",
      },
      {
        id: IDS.recProduct2,
        recommendationId: IDS.recommendation,
        productId: IDS.productHealth,
        rank: 2,
        matchReason:
          "Comprehensive health cover with cashless network. Addresses gap in your existing ₹5L health cover.",
      },
    ],
  });
  console.log("✓  AiRecommendation + RecommendationProducts (2)");

  console.log("\n✅  Seed complete.");
  console.log("═══════════════════════════════════════════════════════");
  console.log("  ADMIN LOGIN");
  console.log("    Email    : admin@benifica.in");
  console.log("    Password : Admin@1234");
  console.log("───────────────────────────────────────────────────────");
  console.log("  USER AUTH  (passwordless — use verify-otp directly)");
  console.log("    Email    : testuser@benifica.in");
  console.log("    OTP      : 123456   (never expires)");
  console.log("");
  console.log("  POST /api/v1/auth/verify-otp");
  console.log('  { "email": "testuser@benifica.in", "otp": "123456" }');
  console.log("═══════════════════════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
