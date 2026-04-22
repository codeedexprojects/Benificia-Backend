export const OTP_EXPIRY_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 3;

// ── Admin session ────────────────────────────────────────────
export const ADMIN_REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
export const ADMIN_SESSION_KEY = (adminId: string, sessionId: string) =>
  `admin_session:${adminId}:${sessionId}`;

// ── User session ─────────────────────────────────────────────
export const USER_REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
export const USER_SESSION_KEY = (userId: string, sessionId: string) =>
  `user_session:${userId}:${sessionId}`;

// ── AI recommendations ───────────────────────────────────────
export const RECOMMENDATION_CACHE_TTL = 24 * 60 * 60;
export const REDIS_REC_KEY = (userId: string) => `rec:${userId}`;
export const REDIS_OTP_KEY = (email: string) => `otp:${email}`;

// ── Pagination ────────────────────────────────────────────────
export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 100;

// ── Cookie options (httpOnly + Secure + SameSite=Strict) ──────
export const JWT_COOKIE_NAME = "token";
export const JWT_REFRESH_COOKIE_NAME = "refresh_token";

export const JWT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/",
} as const;
