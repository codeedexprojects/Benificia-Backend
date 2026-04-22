import type { PrismaClient } from "@prisma/client";
import { OtpPurpose } from "@prisma/client";

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ── User ──────────────────────────────────────────────────────

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        profileStage: true,
        kycStatus: true,
        isActive: true,
        deletedAt: true,
      },
    });
  }

  createUser(email: string, passwordHash: string) {
    return this.prisma.user.create({
      data: { email, passwordHash },
      select: {
        id: true,
        email: true,
        profileStage: true,
        kycStatus: true,
        isActive: true,
      },
    });
  }

  // ── OTP ───────────────────────────────────────────────────────

  createOtpLog(data: {
    email: string;
    otpCodeHash: string;
    expiresAt: Date;
    purpose: OtpPurpose;
    userId: string | null;
  }) {
    return this.prisma.otpLog.create({
      data: {
        email: data.email,
        purpose: data.purpose,
        otpCodeHash: data.otpCodeHash,
        expiresAt: data.expiresAt,
        userId: data.userId,
      },
      select: { id: true },
    });
  }

  findActiveOtpLog(email: string) {
    return this.prisma.otpLog.findFirst({
      where: {
        email,
        purpose: { in: [OtpPurpose.registration, OtpPurpose.login] },
        isVerified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        otpCodeHash: true,
        attemptCount: true,
        purpose: true,
      },
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

  // ── Sessions ──────────────────────────────────────────────────

  createSession(data: {
    id: string; // pre-generated — becomes sessionId in the JWT
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
  }) {
    return this.prisma.authSession.create({
      data: {
        id: data.id,
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        expiresAt: data.expiresAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        deviceId: data.deviceId,
      },
      select: { id: true },
    });
  }

  findSessionById(id: string) {
    return this.prisma.authSession.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        refreshTokenHash: true,
        isRevoked: true,
        expiresAt: true,
        user: {
          select: {
            email: true,
            isActive: true,
            deletedAt: true,
            profileStage: true,
          },
        },
      },
    });
  }

  revokeSession(id: string) {
    return this.prisma.authSession.update({
      where: { id },
      data: { isRevoked: true },
      select: { id: true },
    });
  }

  // ── Profile photo ─────────────────────────────────────────────

  upsertPhotoKey(userId: string, photoS3Key: string) {
    return this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, photoS3Key },
      update: { photoS3Key },
      select: { photoS3Key: true },
    });
  }

  findPhotoKey(userId: string) {
    return this.prisma.userProfile.findUnique({
      where: { userId },
      select: { photoS3Key: true },
    });
  }
}
