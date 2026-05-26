import { z } from "zod";

export const incomeSchema = z
  .object({
    // Income sources
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

    // Income amounts — must already be monthly (frontend converts yearly÷12 before sending)
    salaryMonthly: z
      .number({ error: "Salary must be a number" })
      .min(0)
      .max(100_000_000)
      .default(0),
    freelanceMonthly: z
      .number({ error: "Freelance income must be a number" })
      .min(0)
      .max(100_000_000)
      .default(0),
    businessMonthly: z
      .number({ error: "Business income must be a number" })
      .min(0)
      .max(100_000_000)
      .default(0),
    otherMonthly: z
      .number({ error: "Other income must be a number" })
      .min(0)
      .max(100_000_000)
      .default(0),

    // Period metadata — stored so the frontend can restore the original toggle state
    salaryPeriod: z.enum(["monthly", "yearly"]).default("monthly"),
    freelancePeriod: z.enum(["monthly", "yearly"]).default("monthly"),
    businessPeriod: z.enum(["monthly", "yearly"]).default("monthly"),
    otherPeriod: z.enum(["monthly", "yearly"]).default("monthly"),

    // Assets (max ~100 crore)
    residentialProperty: z
      .number({ error: "Residential property must be a number" })
      .min(0)
      .max(1_000_000_000)
      .default(0),
    investment: z
      .number({ error: "Investment must be a number" })
      .min(0)
      .max(1_000_000_000)
      .default(0),
    savingsBank: z
      .number({ error: "Savings must be a number" })
      .min(0)
      .max(1_000_000_000)
      .default(0),
    goldJewelry: z
      .number({ error: "Gold and jewelry must be a number" })
      .min(0)
      .max(1_000_000_000)
      .default(0),
    retirementFunds: z
      .number({ error: "Retirement funds must be a number" })
      .min(0)
      .max(1_000_000_000)
      .default(0),
    otherAssets: z
      .number({ error: "Other assets must be a number" })
      .min(0)
      .max(1_000_000_000)
      .default(0),
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

const optionalAmount = (label: string, max = 100_000_000) =>
  z
    .number({ error: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .max(max, `${label} exceeds maximum allowed value`)
    .default(0);

export const financeProfileSchema = z.object({
  frequency: z.enum(["monthly", "yearly"]).default("monthly"),

  // Dependents
  numberOfDependents: z
    .number({ error: "Number of dependents must be a number" })
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .max(20, "Please enter a valid number"),

  // Spend
  householdExpenses: optionalAmount("Household expenses"),
  rentAndEmi: optionalAmount("Rent and EMI"),
  educationExpenses: optionalAmount("Education expenses"),
  otherExpenses: optionalAmount("Other expenses"),

  // Insurance
  insuranceMonthly: optionalAmount("Insurance amount"),

  // Short-term liabilities
  creditCardDues: optionalAmount("Credit card dues"),
  personalLoan: optionalAmount("Personal loan"),
  medicalExpenses: optionalAmount("Medical expenses"),
  otherShortTermExpenses: optionalAmount("Other short-term expenses"),

  // Long-term liabilities
  homeLoan: optionalAmount("Home loan"),
  vehicleLoan: optionalAmount("Vehicle loan"),
  educationLoan: optionalAmount("Education loan"),
  businessLoan: optionalAmount("Business loan"),
  otherLongTermExpenses: optionalAmount("Other long-term expenses"),
});

export const goalsSchema = z.object({
  financialAims: z
    .array(
      z.enum(
        [
          "retirement",
          "home_ownership",
          "education",
          "wealth_building",
          "repay_debts",
          "other",
        ],
        { error: "Invalid financial aim" },
      ),
    )
    .min(1, "Please select at least one financial aim"),

  timeHorizon: z.enum(["short_1_3", "medium_3_7", "long_7_plus"], {
    error: "Please select your time horizon",
  }),
});

export const riskSchema = z.object({
  portfolioDrop: z.enum(["sell_everything", "wait_it_out", "buy_more"], {
    error: "Please select what you would do if your portfolio dropped",
  }),

  investmentStyle: z.enum(["conservative", "moderate", "aggressive"], {
    error: "Please select your investment style",
  }),

  marketFeeling: z.enum(["very_anxious", "neutral", "excited"], {
    error: "Please select how you feel about market fluctuations",
  }),
});
