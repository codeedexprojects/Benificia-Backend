export const OTP_EXPIRY_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 3;

export const ADMIN_REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days — reset on every refresh (sliding session)
export const ADMIN_SESSION_KEY = (adminId: string, sessionId: string) =>
  `admin_session:${adminId}:${sessionId}`;

export const RECOMMENDATION_CACHE_TTL = 24 * 60 * 60; // 24h in seconds

export const REDIS_REC_KEY = (userId: string) => `rec:${userId}`;
export const REDIS_OTP_KEY = (email: string) => `otp:${email}`;

export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 100;

export const JWT_COOKIE_NAME = "token";
export const JWT_REFRESH_COOKIE_NAME = "refresh_token";

export const JWT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/",
} as const;
