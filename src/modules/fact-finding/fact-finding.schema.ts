import { z } from "zod";

// ── Step 1: Income ────────────────────────────────────────────

const incomeSourceEnum = z.enum(
  [
    "full_time_salary",
    "freelance_contract",
    "business_owner",
    "passive_income",
    "other",
  ],
  { error: "Invalid income source" },
);

const amount = (label: string) =>
  z
    .number({ error: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .default(0);

export const incomeSchema = z
  .object({
    incomeSources: z
      .array(incomeSourceEnum)
      .min(1, "Please select at least one income source"),

    // Amounts — always monthly (frontend divides yearly by 12)
    salaryMonthly: amount("Salary"),
    freelanceMonthly: amount("Freelance income"),
    businessMonthly: amount("Business income"),
    passiveMonthly: amount("Passive income"),
    otherMonthly: amount("Other income"),
  })
  .refine(
    (d) => {
      // At least one source must have a non-zero amount
      return (
        d.salaryMonthly +
          d.freelanceMonthly +
          d.businessMonthly +
          d.passiveMonthly +
          d.otherMonthly >
        0
      );
    },
    { message: "Please enter at least one income amount" },
  );

// ── Step 2: Expenses ─────────────────────────────────────────

export const expensesSchema = z.object({
  // Total monthly spend — frontend converts yearly → monthly before sending
  totalMonthly: z
    .number({ error: "Monthly spending must be a number" })
    .min(0, "Monthly spending cannot be negative"),
});

// ── Step 3: Assets & Liabilities ─────────────────────────────

const assetTypeEnum = z.enum(
  [
    "cash_savings",
    "fixed_deposit",
    "mutual_funds_stocks",
    "gold",
    "real_estate",
    "epf_ppf",
    "other",
  ],
  { error: "Invalid asset type" },
);

const liabilityTypeEnum = z.enum(
  ["credit_card_debt", "personal_loan", "mortgage"],
  { error: "Invalid liability type" },
);

const insuranceCoverageTypeEnum = z.enum(
  ["health_insurance", "life_insurance", "property_insurance"],
  { error: "Invalid insurance coverage type" },
);

const assetItemSchema = z.object({
  assetType: assetTypeEnum,
  amount: z
    .number({ error: "Amount must be a number" })
    .min(0, "Amount cannot be negative"),
});

export const assetsSchema = z.object({
  // Dynamic list of assets (type + amount pairs)
  assets: z.array(assetItemSchema).min(1, "Please add at least one asset"),

  // Which liability types the user has
  liabilityTypes: z.array(liabilityTypeEnum).default([]),

  // Which insurance coverage types the user has
  insuranceCoverageTypes: z.array(insuranceCoverageTypeEnum).default([]),
});

// ── Step 4: Goals ─────────────────────────────────────────────

const goalTypeEnum = z.enum(
  [
    "emergency_fund",
    "child_education",
    "house_purchase",
    "retirement",
    "wealth_creation",
    "debt_repayment",
  ],
  { error: "Invalid goal type" },
);

const goalItemSchema = z.object({
  type: goalTypeEnum,
  targetAmount: z
    .number({ error: "Target amount must be a number" })
    .positive("Target amount must be greater than zero"),
  targetYears: z
    .number()
    .int("Target years must be a whole number")
    .min(1, "Target years must be at least 1")
    .max(40, "Target years cannot exceed 40"),
  currentSaved: amount("Current saved amount"),
  priority: z.number().int().min(1).max(10).default(1),
});

export const goalsSchema = z
  .object({
    goals: z
      .array(goalItemSchema)
      .min(1, "Please add at least one financial goal")
      .max(6, "You can add up to 6 financial goals"),
  })
  .refine(
    (data) => {
      const types = data.goals.map((g) => g.type);
      return new Set(types).size === types.length;
    },
    { message: "Each goal type can only be added once", path: ["goals"] },
  );

// ── Step 5: Risk Profile ──────────────────────────────────────

export const riskSchema = z.object({
  // Q1: If your portfolio dropped 20% you would…
  portfolioDrop: z.enum(["sell_everything", "wait_it_out", "buy_more"], {
    error: "Please select what you would do if your portfolio dropped",
  }),

  // Q2: Which investment style suits you best?
  investmentStyle: z.enum(["conservative", "moderate", "aggressive"], {
    error: "Please select your investment style",
  }),

  // Q3: What are you aiming for? (multi-select)
  financialAims: z
    .array(
      z.enum(
        [
          "retirement",
          "home_ownership",
          "education",
          "wealth_building",
          "repay_debts",
        ],
        { error: "Invalid financial aim" },
      ),
    )
    .min(1, "Please select at least one financial aim"),

  // Q4: When do you hope to achieve this?
  timeHorizon: z.enum(["short_1_3", "medium_3_7", "long_7_plus"], {
    error: "Please select your time horizon",
  }),

  // Q5: How do you feel about market fluctuations?
  marketFeeling: z.enum(["very_anxious", "neutral", "excited"], {
    error: "Please select how you feel about market fluctuations",
  }),
});
