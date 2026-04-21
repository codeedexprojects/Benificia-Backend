import bcrypt from "bcrypt";
import crypto from "crypto";

const PASSWORD_ROUNDS = 12;
const OTP_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
}

export async function comparePassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, OTP_ROUNDS);
}

export async function compareOtp(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
