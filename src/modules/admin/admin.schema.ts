import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.email({ error: "Please enter a valid email address" }),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const adminVerifyOtpSchema = z.object({
  email: z.email({ error: "Please enter a valid email address" }),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

// ── User management ───────────────────────────────────────────

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(255).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  profileStage: z
    .enum([
      "auth_complete",
      "personal_complete",
      "fact_finding_income",
      "fact_finding_expenses",
      "fact_finding_assets",
      "fact_finding_goals",
      "fact_finding_risk",
      "fact_finding_complete",
      "recommendations_ready",
    ])
    .optional(),
});

export const blockUserSchema = z.object({
  reason: z.string().max(500).optional(),
});
