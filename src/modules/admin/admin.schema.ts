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
