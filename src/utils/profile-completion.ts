import type { ProfileStage } from "@prisma/client";

// Auth=20%, Personal=30%, Fact-Finding=50%
const STAGE_PERCENTAGE: Record<ProfileStage, number> = {
  auth_complete: 20,
  personal_complete: 50,
  fact_finding_income: 60,
  fact_finding_expenses: 70,
  fact_finding_assets: 80,
  fact_finding_goals: 90,
  fact_finding_risk: 100,
  fact_finding_complete: 100,
  recommendations_ready: 100,
};

const NEXT_STEP: Record<ProfileStage, string> = {
  auth_complete: "personal_details",
  personal_complete: "fact_finding",
  fact_finding_income: "fact_finding_expenses",
  fact_finding_expenses: "fact_finding_assets",
  fact_finding_assets: "fact_finding_goals",
  fact_finding_goals: "fact_finding_risk",
  fact_finding_risk: "complete",
  fact_finding_complete: "complete",
  recommendations_ready: "complete",
};

export function getCompletionStatus(stage: ProfileStage) {
  return {
    percentage: STAGE_PERCENTAGE[stage],
    currentStage: stage,
    nextStep: NEXT_STEP[stage],
  };
}
