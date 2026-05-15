import type { ProfileStage } from "@prisma/client";

// Temporary cast until `prisma generate` picks up the new ProfileStage enum values.
type AnyStage = ProfileStage | string;

const STAGE_PERCENTAGE: Record<string, number> = {
  auth_complete: 10,
  personal_complete: 20,
  fact_finding_income_sources: 35,
  fact_finding_liabilities: 50,
  fact_finding_income_amount: 62,
  fact_finding_expenses: 75,
  fact_finding_goals: 87,
  fact_finding_complete: 100,
  recommendations_ready: 100,
};

const NEXT_STEP: Record<string, string> = {
  auth_complete: "personal_details",
  personal_complete: "fact_finding_income_sources",
  fact_finding_income_sources: "fact_finding_liabilities",
  fact_finding_liabilities: "fact_finding_income_amount",
  fact_finding_income_amount: "fact_finding_expenses",
  fact_finding_expenses: "fact_finding_goals",
  fact_finding_goals: "fact_finding_risk",
  fact_finding_complete: "complete",
  recommendations_ready: "complete",
};

export function getCompletionStatus(stage: AnyStage) {
  const s = stage as string;
  return {
    percentage: STAGE_PERCENTAGE[s] ?? 0,
    currentStage: s,
    nextStep: NEXT_STEP[s] ?? "complete",
  };
}
