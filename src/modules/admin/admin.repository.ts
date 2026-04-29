import type { PrismaClient } from "@prisma/client";
import { OtpChannel, OtpPurpose } from "@prisma/client";

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

  findById(id: string) {
    return this.prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
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
        recipient: data.email,
        channel: OtpChannel.email,
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
        recipient: email,
        channel: OtpChannel.email,
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

  resetOtpAttempts(id: string) {
    return this.prisma.otpLog.update({
      where: { id },
      data: { attemptCount: 0 },
      select: { id: true },
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

  // ── User management ──────────────────────────────────────────

  listUsers(params: {
    skip: number;
    take: number;
    search?: string;
    kycStatus?: "pending" | "verified" | "failed";
    isActive?: boolean;
    profileStage?: string;
  }) {
    const where = {
      deletedAt: null,
      ...(params.search && {
        email: { contains: params.search, mode: "insensitive" as const },
      }),
      ...(params.kycStatus && { kycStatus: params.kycStatus }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      ...(params.profileStage && {
        profileStage: params.profileStage as never,
      }),
    };

    return Promise.all([
      this.prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          profileStage: true,
          kycStatus: true,
          isActive: true,
          createdAt: true,
          profile: {
            select: { fullName: true, city: true, state: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
  }

  getUserDetail(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        profileStage: true,
        kycStatus: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        profile: true,
        incomeProfile: true,
        expenseProfile: true,
        assetLiabilityProfile: true,
        financialGoals: { orderBy: { priority: "asc" } },
        riskProfile: true,
        kyc_consents: { orderBy: { consentedAt: "desc" }, take: 5 },
        kycAuditLogs: { orderBy: { createdAt: "desc" }, take: 10 },
        aiRecommendations: {
          orderBy: { generatedAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            insuranceOutput: true,
            investmentOutput: true,
            generatedAt: true,
            viewedAt: true,
          },
        },
        insuranceInterests: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            callbackTime: true,
            notes: true,
            createdAt: true,
            product: {
              select: {
                id: true,
                name: true,
                type: true,
                coverageAmount: true,
              },
            },
          },
        },
        authSessions: {
          where: { isRevoked: false, expiresAt: { gt: new Date() } },
          select: {
            id: true,
            createdAt: true,
            ipAddress: true,
            userAgent: true,
          },
        },
      },
    });
  }

  setUserActive(userId: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: { id: true, email: true, isActive: true },
    });
  }

  revokeAllUserSessions(userId: string) {
    return this.prisma.authSession.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  createAdminAuditLog(data: {
    adminId: string;
    action: string;
    targetTable: string;
    targetId: string;
    ipAddress?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.adminAuditLog.create({
      data: {
        adminId: data.adminId,
        action: data.action,
        targetTable: data.targetTable,
        targetId: data.targetId,
        ipAddress: data.ipAddress,
        metadata: (data.metadata ?? undefined) as never,
      },
      select: { id: true },
    });
  }
}
