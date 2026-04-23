import type { ProfileStage } from "@prisma/client";

// Auth=10%, KYC=30%, Personal=20%, Fact-Finding=40%
const STAGE_PERCENTAGE: Record<ProfileStage, number> = {
  auth_complete: 10,
  kyc_in_progress: 25,
  kyc_complete: 40,
  personal_complete: 60,
  fact_finding_income: 68,
  fact_finding_expenses: 76,
  fact_finding_assets: 84,
  fact_finding_goals: 92,
  fact_finding_risk: 100,
  fact_finding_complete: 100,
  recommendations_ready: 100,
};

const NEXT_STEP: Record<ProfileStage, string> = {
  auth_complete: "kyc_verification",
  kyc_in_progress: "kyc_confirm",
  kyc_complete: "personal_details",
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
