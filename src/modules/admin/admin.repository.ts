import type { PrismaClient } from "@prisma/client";
import { OtpPurpose } from "@prisma/client";

export class AdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Admin user ──────────────────────────────────────────────

  findByEmail(email: string) {
    return this.prisma.adminUser.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        name: true,
        role: true,
        isActive: true,
      },
    });
  }

  updateLastLogin(id: string) {
    return this.prisma.adminUser.update({
      where: { id },
      data: { lastLoginAt: new Date() },
      select: { id: true },
    });
  }

  // ── OTP ─────────────────────────────────────────────────────

  createOtpLog(data: { email: string; otpCodeHash: string; expiresAt: Date }) {
    return this.prisma.otpLog.create({
      data: {
        email: data.email,
        purpose: OtpPurpose.mfa,
        otpCodeHash: data.otpCodeHash,
        expiresAt: data.expiresAt,
        // userId intentionally null — OTP belongs to admin, not a User row
      },
      select: { id: true },
    });
  }

  findActiveOtpLog(email: string) {
    return this.prisma.otpLog.findFirst({
      where: {
        email,
        purpose: OtpPurpose.mfa,
        isVerified: false,
        expiresAt: { gt: new Date() },
        userId: null,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, otpCodeHash: true, attemptCount: true },
    });
  }

  markOtpVerified(id: string) {
    return this.prisma.otpLog.update({
      where: { id },
      data: { isVerified: true },
      select: { id: true },
    });
  }

  incrementOtpAttempts(id: string) {
    return this.prisma.otpLog.update({
      where: { id },
      data: { attemptCount: { increment: 1 } },
      select: { id: true, attemptCount: true },
    });
  }

  // ── Sessions ─────────────────────────────────────────────────

  createSession(data: {
    adminId: string;
    sessionId: string;
    refreshTokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.adminSession.create({
      data: {
        adminId: data.adminId,
        sessionId: data.sessionId,
        refreshTokenHash: data.refreshTokenHash,
        expiresAt: data.expiresAt,
      },
      select: { id: true },
    });
  }

  findSessionBySessionId(sessionId: string) {
    return this.prisma.adminSession.findUnique({
      where: { sessionId },
      select: {
        id: true,
        adminId: true,
        refreshTokenHash: true,
        isRevoked: true,
        expiresAt: true,
        admin: {
          select: { email: true, role: true, isActive: true },
        },
      },
    });
  }

  revokeSession(sessionId: string) {
    return this.prisma.adminSession.update({
      where: { sessionId },
      data: { isRevoked: true },
      select: { id: true },
    });
  }
}
