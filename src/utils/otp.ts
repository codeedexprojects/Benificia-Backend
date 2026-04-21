import crypto from "crypto";

export function generateOtp(): string {
  // Cryptographically random 6-digit OTP
  const bytes = crypto.randomBytes(3);
  const num = (bytes.readUIntBE(0, 3) % 900000) + 100000;
  return num.toString();
}
