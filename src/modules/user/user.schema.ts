import { z } from "zod";

export const sendOtpSchema = z.object({
  email: z.email({ error: "Please enter a valid email address" }),
});

export const verifyOtpSchema = z.object({
  email: z.email({ error: "Please enter a valid email address" }),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

// ── S3 profile photo ──────────────────────────────────────────

export const requestPhotoUploadSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"], {
    error: "Allowed file types are JPEG, PNG, and WebP",
  }),
});

export const confirmPhotoUploadSchema = z.object({
  key: z
    .string()
    .min(1, "File key is required")
    .max(500, "File key is too long"),
});

// ── Personal details (Step 2 of profile completion) ───────────

export const personalDetailsSchema = z.object({
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"], {
    error: "Please select a valid marital status",
  }),
  numberOfDependents: z
    .number()
    .int("Number of dependents must be a whole number")
    .min(0, "Number of dependents cannot be negative")
    .max(20, "Please enter a valid number of dependents"),
  childrenAges: z
    .array(
      z
        .number()
        .int("Age must be a whole number")
        .min(0, "Age cannot be negative")
        .max(30, "Please enter a valid child age"),
    )
    .max(10, "Maximum 10 children ages allowed")
    .default([]),
  occupation: z
    .string()
    .min(1, "Occupation is required")
    .max(100, "Occupation is too long"),
  employer: z
    .string()
    .min(1, "Employer name is required")
    .max(100, "Employer name is too long")
    .optional(),
  incomeType: z.enum(["fixed", "business", "freelance"], {
    error: "Please select a valid income type",
  }),
  retirementAge: z
    .number()
    .int("Retirement age must be a whole number")
    .min(40, "Retirement age must be at least 40")
    .max(80, "Retirement age must be 80 or below")
    .default(60),
  isPrimaryEarner: z.boolean().default(true),
  dependentsRelyOnIncome: z.boolean().default(true),
});
