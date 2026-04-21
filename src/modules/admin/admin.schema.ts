import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const adminVerifyOtpSchema = z.object({
  email: z.email(),
  otp: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});
