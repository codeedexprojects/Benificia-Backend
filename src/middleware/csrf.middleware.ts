import { doubleCsrf } from "csrf-csrf";
import { env } from "../config/env";

const isProd = env.NODE_ENV === "production";

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,
  // Use the request IP as the session identifier for anonymous requests;
  // authenticated routes tie the token to the user via the cookie secret.
  getSessionIdentifier: (req) => req.ip ?? "",
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
});

export { generateCsrfToken, doubleCsrfProtection };
