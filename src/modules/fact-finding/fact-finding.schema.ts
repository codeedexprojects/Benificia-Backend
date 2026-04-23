import { z } from "zod";

const amount = (label: string) =>
  z
    .number({ error: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .default(0);

// ── Step 1: Income ────────────────────────────────────────────

export const incomeSchema = z.object({
  salaryMonthly: amount("Monthly salary"),
  businessMonthly: amount("Monthly business income"),
  passiveMonthly: amount("Monthly passive income"),
  otherMonthly: amount("Other monthly income"),
  annualBonus: amount("Annual bonus"),
  expectedGrowthPct: z
    .number()
    .min(0, "Growth percentage cannot be negative")
    .max(50, "Growth percentage seems too high")
    .default(5),
});

// ── Step 2: Expenses ─────────────────────────────────────────

export const expensesSchema = z.object({
  // Fixed
  rentOrHomeLoanEmi: amount("Rent / home loan EMI"),
  vehicleLoanEmi: amount("Vehicle loan EMI"),
  otherLoanEmis: amount("Other loan EMIs"),
  existingPremiums: amount("Existing insurance premiums"),
  // Variable
  groceriesFood: amount("Groceries & food"),
  utilities: amount("Utilities"),
  transport: amount("Transport"),
  medicalHealthcare: amount("Medical & healthcare"),
  // Lifestyle
  diningEntertainment: amount("Dining & entertainment"),
  shopping: amount("Shopping"),
  childrenEducation: amount("Children's education"),
  otherExpenses: amount("Other expenses"),
});

// ── Step 3: Assets & Liabilities ──────────────────────────────

export const assetsSchema = z.object({
  // Assets
  cashSavings: amount("Cash & savings"),
  fixedDeposits: amount("Fixed deposits"),
  mutualFundsStocks: amount("Mutual funds & stocks"),
  goldValue: amount("Gold value"),
  realEstateValue: amount("Real estate value"),
  epfPpfBalance: amount("EPF / PPF balance"),
  otherAssets: amount("Other assets"),
  // Liabilities
  homeLoanOutstanding: amount("Home loan outstanding"),
  vehicleLoanOutstanding: amount("Vehicle loan outstanding"),
  personalLoanOutstanding: amount("Personal loan outstanding"),
  creditCardOutstanding: amount("Credit card outstanding"),
  otherLoans: amount("Other loans"),
  // Insurance coverage
  existingLifeCover: amount("Existing life cover"),
  existingHealthCover: amount("Existing health cover"),
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
  priority: z
    .number()
    .int()
    .min(1, "Priority must be between 1 and 10")
    .max(10, "Priority must be between 1 and 10")
    .default(1),
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
  answers: z
    .array(
      z
        .number()
        .int("Answer must be a whole number")
        .min(1, "Answer must be between 1 and 4")
        .max(4, "Answer must be between 1 and 4"),
    )
    .length(5, "Please answer all 5 questions"),
});
