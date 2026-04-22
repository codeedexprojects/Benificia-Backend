import { z } from "zod";

export const sendOtpSchema = z.object({
  aadhaarNumber: z
    .string()
    .regex(/^\d{12}$/, "Please enter a valid 12-digit Aadhaar number"),
  consentGiven: z.boolean().refine((v) => v === true, {
    message: "Your consent is required to proceed with Aadhaar verification",
  }),
});

export const verifyOtpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
});
