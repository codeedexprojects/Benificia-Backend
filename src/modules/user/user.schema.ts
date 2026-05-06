import { z } from "zod";

// E.164 phone — digits only, 7-15 chars (covers all international formats)
const phoneSchema = z
  .string()
  .regex(
    /^\+[1-9]\d{6,14}$/,
    "Phone must be in E.164 format (e.g. +919876543210)",
  );

export const sendEmailOtpSchema = z.object({
  email: z.email({ error: "Please enter a valid email address" }),
});

export const sendPhoneOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyEmailOtpSchema = z.object({
  email: z.email({ error: "Please enter a valid email address" }),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

export const verifyPhoneOtpSchema = z.object({
  phone: phoneSchema,
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

// Keep the old name as an alias so existing imports don't break
export const sendOtpSchema = sendEmailOtpSchema;
export const verifyOtpSchema = verifyEmailOtpSchema;

// ── Unified identifier OTP (email or phone auto-detected) ─────

export const sendOtpByIdentifierSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
});

export const verifyOtpByIdentifierSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
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

// ── About You (fact-finding step 0) ──────────────────────────

export const personalDetailsSchema = z.object({
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"], {
    error: "Please select a valid gender",
  }),
  yob: z
    .number()
    .int("Year of birth must be a whole number")
    .min(1920, "Please enter a valid year of birth")
    .max(new Date().getFullYear() - 18, "You must be at least 18 years old"),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"], {
    error: "Please select a valid marital status",
  }),
  numberOfMembers: z
    .number()
    .int("Number of members must be a whole number")
    .min(1, "Household must have at least 1 member")
    .max(20, "Please enter a valid number of members"),
});
