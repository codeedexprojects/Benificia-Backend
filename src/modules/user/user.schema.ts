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
