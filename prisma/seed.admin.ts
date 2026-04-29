/// <reference types="node" />

/**
 * Standalone admin seed — run any time to create or reset the test admin.
 *
 *   npx tsx prisma/seed.admin.ts
 *
 * Credentials
 *   Email    : admin@benifica.in
 *   Password : Admin@1234
 *   OTP      : 123456  (static, never expires)
 *   Role     : super_admin
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env["DATABASE_URL"] ?? "",
});
const prisma = new PrismaClient({ adapter } as ConstructorParameters<
  typeof PrismaClient
>[0]);

const ADMIN_ID = "00000000-0000-0000-0000-000000000001";
const OTP_LOG_ID = "00000000-0000-0000-0000-000000000001";

const EMAIL = "admin@benifica.in";
const PASSWORD = "Admin@1234";
const STATIC_OTP = "123456";

async function main() {
  console.log("🌱  Seeding admin user...");

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const otpHash = await bcrypt.hash(STATIC_OTP, 10);

  // ── Admin user ──────────────────────────────────────────────
  const admin = await prisma.adminUser.upsert({
    where: { id: ADMIN_ID },
    create: {
      id: ADMIN_ID,
      email: EMAIL,
      passwordHash,
      name: "Super Admin",
      role: "super_admin",
      isActive: true,
    },
    update: {
      passwordHash,
      name: "Super Admin",
      role: "super_admin",
      isActive: true,
    },
  });

  console.log(`✓  AdminUser: ${admin.email}  (role: ${admin.role})`);

  // ── Static MFA OTP ──────────────────────────────────────────
  // Invalidate any real OTPs (exclude the static row itself) so only
  // the static one is active. Must run before the upsert.
  await prisma.otpLog.updateMany({
    where: {
      recipient: EMAIL,
      channel: "email",
      purpose: "mfa",
      isVerified: false,
      id: { not: OTP_LOG_ID },
    },
    data: { isVerified: true },
  });

  await prisma.otpLog.upsert({
    where: { id: OTP_LOG_ID },
    create: {
      id: OTP_LOG_ID,
      recipient: EMAIL,
      channel: "email",
      purpose: "mfa",
      otpCodeHash: otpHash,
      attemptCount: 0,
      isVerified: false,
      expiresAt: new Date("2099-12-31T23:59:59Z"),
      // Far-future createdAt ensures this row wins the orderBy: createdAt desc
      // query in findActiveOtpLog, even if a real OTP was sent after seeding.
      createdAt: new Date("2099-01-01T00:00:00Z"),
    },
    update: {
      otpCodeHash: otpHash,
      attemptCount: 0,
      isVerified: false,
      expiresAt: new Date("2099-12-31T23:59:59Z"),
      createdAt: new Date("2099-01-01T00:00:00Z"),
    },
  });

  console.log(`✓  OtpLog: static MFA OTP = ${STATIC_OTP}  (never expires)`);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Admin login credentials
  Email    : ${EMAIL}
  Password : ${PASSWORD}
  OTP      : ${STATIC_OTP}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
