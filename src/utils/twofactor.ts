import { env } from "../config/env";
import { InternalError } from "./errors";

// 2factor.in REST API — https://2factor.in/API/V1
const BASE = "https://2factor.in/API/V1";

interface TwoFactorResponse {
  Status: string; // "Success" | "Error"
  Details: string; // session_id on success, error message on failure
}

async function call(url: string): Promise<TwoFactorResponse> {
  const res = await fetch(url);
  const json = (await res.json()) as TwoFactorResponse;

  if (!res.ok || json.Status !== "Success") {
    throw new InternalError(`2factor SMS error: ${json.Details}`);
  }

  return json;
}

/**
 * Send OTP via 2factor.in.
 * In development the OTP is only logged — no real SMS is sent.
 * Returns the session ID returned by 2factor (unused by us — we
 * store our own hash; kept for future delivery-status lookups).
 */
export async function sendSmsOtp(phone: string, otp: string): Promise<string> {
  if (env.NODE_ENV === "development") {
    console.log("================ MOCK SMS ================");
    console.log(`To: ${phone}`);
    console.log(`OTP: ${otp}`);
    console.log("==========================================");
    return "mock-session-id";
  }

  // Use a DLT-approved template when configured, otherwise use the
  // auto-generated route which works without DLT for testing.
  const template = env.TWOFACTOR_OTP_TEMPLATE;
  const url = template
    ? `${BASE}/${env.TWOFACTOR_API_KEY}/SMS/${encodeURIComponent(phone)}/${otp}/${encodeURIComponent(template)}`
    : `${BASE}/${env.TWOFACTOR_API_KEY}/SMS/${encodeURIComponent(phone)}/${otp}`;

  const data = await call(url);
  return data.Details;
}
