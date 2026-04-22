import { z } from "zod";
import type { createClient } from "redis";
import { env } from "../config/env";

type RedisClient = ReturnType<typeof createClient>;
import { BadRequestError, InternalError } from "./errors";

const DEEPVUE_BASE = "https://production.deepvue.tech/v1";
const TOKEN_CACHE_KEY = "deepvue_access_token";
const TOKEN_TTL_SECONDS = 55 * 60; // cache 5 min before actual expiry
const KYC_REF_TTL_SECONDS = 10 * 60; // Aadhaar OTP valid for 10 min

// ── Response schemas ──────────────────────────────────────────

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional(),
});

const sendOtpResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    reference_id: z.string().min(1),
    message: z.string().optional(),
  }),
  message: z.string().optional(),
});

const addressSchema = z.object({
  house: z.string().optional(),
  street: z.string().optional(),
  landmark: z.string().optional(),
  locality: z.string().optional(),
  vtc: z.string().optional(),
  subdist: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});

const verifyOtpResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      full_name: z.string().optional(),
      dob: z.string().optional(),
      gender: z.string().optional(),
      photo: z.string().optional(),
      zip: z.string().optional(),
      aadhaar_number: z.string().optional(),
      address: addressSchema.optional(),
    })
    .optional(),
  message: z.string().optional(),
});

export interface AadhaarKycData {
  fullName?: string;
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other";
  photo?: Buffer;
  aadhaarLast4?: string;
  addressLine1?: string;
  landmark?: string;
  locality?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
}

// ── Helpers ───────────────────────────────────────────────────

async function post<T>(
  endpoint: string,
  body: Record<string, string>,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${DEEPVUE_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as unknown;

  if (!res.ok) {
    const msg = (json as { message?: string }).message ?? "Deepvue API error";
    throw new InternalError(`Deepvue: ${msg}`);
  }

  return json as T;
}

function mapGender(raw: string | undefined): AadhaarKycData["gender"] {
  if (!raw) return undefined;
  const g = raw.toUpperCase();
  if (g === "M" || g === "MALE") return "male";
  if (g === "F" || g === "FEMALE") return "female";
  return "other";
}

function parseDob(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  // Deepvue returns "dd-mm-yyyy"
  const [day, month, year] = raw.split("-");
  if (!day || !month || !year) return undefined;
  const d = new Date(`${year}-${month}-${day}`);
  return isNaN(d.getTime()) ? undefined : d;
}

// ── Public API ────────────────────────────────────────────────

export async function getAccessToken(redis: RedisClient): Promise<string> {
  const cached = await redis.get(TOKEN_CACHE_KEY);
  if (cached) return cached;

  const raw = await post<unknown>("/authorize", {
    client_id: env.DEEPVUE_CLIENT_ID,
    client_secret: env.DEEPVUE_CLIENT_SECRET,
  });

  const parsed = tokenResponseSchema.safeParse(raw);
  if (!parsed.success)
    throw new InternalError("Invalid Deepvue token response");

  const { access_token } = parsed.data;
  await redis.setEx(TOKEN_CACHE_KEY, TOKEN_TTL_SECONDS, access_token);
  return access_token;
}

export async function sendAadhaarOtp(
  redis: RedisClient,
  userId: string,
  aadhaarNumber: string,
): Promise<string> {
  if (!/^\d{12}$/.test(aadhaarNumber)) {
    throw new BadRequestError("Aadhaar number must be exactly 12 digits");
  }

  const token = await getAccessToken(redis);

  const raw = await post<unknown>(
    "/verification/aadhaar-otp",
    { aadhaar_number: aadhaarNumber },
    token,
  );

  const parsed = sendOtpResponseSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.success) {
    const msg = (raw as { message?: string }).message ?? "Failed to send OTP";
    throw new BadRequestError(msg);
  }

  const referenceId = parsed.data.data.reference_id;

  // Store referenceId in Redis — TTL matches Aadhaar OTP validity
  await redis.setEx(kycRefKey(userId), KYC_REF_TTL_SECONDS, referenceId);

  return referenceId;
}

export async function verifyAadhaarOtp(
  redis: RedisClient,
  userId: string,
  otp: string,
): Promise<AadhaarKycData> {
  const referenceId = await redis.get(kycRefKey(userId));
  if (!referenceId) {
    throw new BadRequestError("OTP session expired. Please request a new OTP");
  }

  const token = await getAccessToken(redis);

  const raw = await post<unknown>(
    "/verification/aadhaar-otp/verify",
    { reference_id: referenceId, otp },
    token,
  );

  const parsed = verifyOtpResponseSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.success) {
    const msg =
      (raw as { message?: string }).message ?? "OTP verification failed";
    throw new BadRequestError(msg);
  }

  await redis.del(kycRefKey(userId));

  const d = parsed.data.data ?? {};
  const addr = d.address ?? {};

  const result: AadhaarKycData = {
    fullName: d.full_name,
    dateOfBirth: parseDob(d.dob),
    gender: mapGender(d.gender),
    aadhaarLast4: d.aadhaar_number?.slice(-4),
    addressLine1:
      [addr.house, addr.street].filter(Boolean).join(", ") || undefined,
    landmark: addr.landmark,
    locality: addr.locality ?? addr.vtc,
    city: addr.vtc ?? addr.subdist,
    district: addr.district,
    state: addr.state,
    pincode: addr.pincode ?? d.zip,
  };

  if (d.photo) {
    result.photo = Buffer.from(d.photo, "base64");
  }

  return result;
}

export const kycRefKey = (userId: string) => `kyc_ref:${userId}`;
