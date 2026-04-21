import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const isDev = env.NODE_ENV === "development";

export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Applied per-route on: /auth/send-otp, /auth/login, /auth/verify-otp
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 5,
  message: {
    success: false,
    message: "Too many attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
