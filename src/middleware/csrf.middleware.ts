import { doubleCsrf } from "csrf-csrf";
import { env } from "../config/env";

const isProd = env.NODE_ENV === "production";

// Auth flow endpoints are protected by other means (OTP, refresh-token cookie,
// rate limiting) and must not require a CSRF token — they run before the client
// has had a chance to obtain one.
const CSRF_SKIP_PATHS = [
  "/auth/otp/send",
  "/auth/otp/verify",
  "/auth/refresh",
  "/auth/logout",
  "/auth/login",
  "/auth/verify-otp",
];

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,
  // Use the refresh-token cookie as the session identifier — it is stable for
  // the entire login session and does not change with the user's IP address.
  // Falling back to "" for unauthenticated requests (auth routes are skipped anyway).
  getSessionIdentifier: (req) =>
    (req.cookies?.["refresh_token"] as string) ?? "",
  cookieName: isProd ? "__Host-csrf" : "csrf",
  cookieOptions: {
    sameSite: isProd ? "strict" : "lax",
    secure: isProd,
    httpOnly: true,
    path: "/",
  },
  size: 64,
  getCsrfTokenFromRequest: (req) =>
    req.headers["x-csrf-token"] as string | undefined,
  skipCsrfProtection: (req) =>
    CSRF_SKIP_PATHS.some((p) => req.path.includes(p)),
});

export { generateCsrfToken, doubleCsrfProtection };
