import { z } from "zod";

// ── Screen: Finance 1 — Income Sources ───────────────────────
// "How do you generate income?" — multi-select

export const incomeSourcesSchema = z.object({
  incomeSources: z
    .array(
      z.enum(
        [
          "full_time_salary",
          "freelance_contract",
          "business_owner",
          "passive_income",
          "other",
        ],
        { error: "Invalid income source" },
      ),
    )
    .min(1, "Please select at least one income source"),
});

// ── Screen: Finance 2 — Dependents, Liabilities, Insurance ───
// "How many people depend on your income?"
// "Do you have any liabilities?"
// "What is your insurance coverage?"

export const financeProfileSchema = z.object({
  numberOfDependents: z
    .number({ error: "Number of dependents must be a number" })
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .max(20, "Please enter a valid number"),

  liabilityTypes: z
    .array(
      z.enum(["credit_card_debt", "personal_loan", "mortgage"], {
        error: "Invalid liability type",
      }),
    )
    .default([]),

  insuranceCoverageTypes: z
    .array(
      z.enum(["health_insurance", "life_insurance", "property_insurance"], {
        error: "Invalid insurance coverage type",
      }),
    )
    .default([]),
});

// ── Screen: Finance 3 — Income Amount ────────────────────────
// "What is your total monthly income?" — per-source amounts
// Frontend sends monthly values (divides yearly by 12 before sending)

const amount = (label: string) =>
  z
    .number({ error: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .default(0);

export const incomeAmountSchema = z
  .object({
    salaryMonthly: amount("Salary"),
    freelanceMonthly: amount("Freelance income"),
    businessMonthly: amount("Business income"),
    passiveMonthly: amount("Passive income"),
    otherMonthly: amount("Other income"),
  })
  .refine(
    (d) =>
      d.salaryMonthly +
        d.freelanceMonthly +
        d.businessMonthly +
        d.passiveMonthly +
        d.otherMonthly >
      0,
    { message: "Please enter at least one income amount" },
  );

// ── Screen: Finance 4 — Monthly Expenses ─────────────────────
// "How much do you spend monthly?"
// Frontend sends monthly value (divides yearly by 12 before sending)

export const expensesSchema = z.object({
  totalMonthly: z
    .number({ error: "Monthly spending must be a number" })
    .min(0, "Monthly spending cannot be negative"),
});

// ── Screen: Finance 5 — Assets ───────────────────────────────
// "What are your total assets?" — type + amount list
// Skippable: assets array can be empty

export const assetsSchema = z.object({
  assets: z
    .array(
      z.object({
        assetType: z.enum(
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
        ),
        amount: z
          .number({ error: "Amount must be a number" })
          .min(0, "Amount cannot be negative"),
      }),
    )
    .default([]),
});

// ── Screen: Risk — all 5 questions submitted together ────────

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
