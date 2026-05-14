import { z } from "zod";

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

const amount = (label: string) =>
  z
    .number({ error: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .default(0);

export const incomeAmountSchema = z
  .object({
    salaryMonthly: amount("Full time salary"),
    freelanceMonthly: amount("Freelance/contract income"),
    businessMonthly: amount("Business income"),
    otherMonthly: amount("Other income"),
  })
  .refine(
    (d) =>
      d.salaryMonthly +
        d.freelanceMonthly +
        d.businessMonthly +
        d.otherMonthly >
      0,
    { message: "Please enter at least one income amount" },
  );

export const expensesSchema = z.object({
  totalMonthly: z
    .number({ error: "Monthly spending must be a number" })
    .min(0, "Monthly spending cannot be negative"),
});

export const assetsSchema = z.object({
  residentialProperty: amount("Residential property"),
  investment: amount("Investment"),
  savingsBank: amount("Savings and bank account"),
  goldJewelry: amount("Gold and jewelry"),
  retirementFunds: amount("Retirement funds"),
  otherAssets: amount("Other assets"),
});

export const riskSchema = z.object({
  portfolioDrop: z.enum(["sell_everything", "wait_it_out", "buy_more"], {
    error: "Please select what you would do if your portfolio dropped",
  }),

  investmentStyle: z.enum(["conservative", "moderate", "aggressive"], {
    error: "Please select your investment style",
  }),

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

  timeHorizon: z.enum(["short_1_3", "medium_3_7", "long_7_plus"], {
    error: "Please select your time horizon",
  }),

  marketFeeling: z.enum(["very_anxious", "neutral", "excited"], {
    error: "Please select how you feel about market fluctuations",
  }),
});
