import type { PrismaClient } from "@prisma/client";
import { OtpChannel, OtpPurpose } from "@prisma/client";

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ── User ──────────────────────────────────────────────────────

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        phone: true,
        isPhoneVerified: true,
        profileStage: true,
        isActive: true,
        deletedAt: true,
      },
    });
  }

  findByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        email: true,
        phone: true,
        isPhoneVerified: true,
        profileStage: true,
        isActive: true,
        deletedAt: true,
      },
    });
  }

  createUser(email: string) {
    return this.prisma.user.create({
      data: { email },
      select: {
        id: true,
        email: true,
        phone: true,
        isPhoneVerified: true,
        profileStage: true,
        isActive: true,
      },
    });
  }

  createPhoneUser(phone: string) {
    return this.prisma.user.create({
      data: { phone, isPhoneVerified: true },
      select: {
        id: true,
        email: true,
        phone: true,
        isPhoneVerified: true,
        profileStage: true,
        isActive: true,
      },
    });
  }

  // Marks phone as verified. Called on every successful phone OTP verify
  // to keep isPhoneVerified consistent even if it was manually reset.
  upsertPhone(userId: string, phone: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { phone, isPhoneVerified: true },
      select: { id: true, phone: true, isPhoneVerified: true },
    });
  }

  // ── OTP ───────────────────────────────────────────────────────

  createOtpLog(data: {
    recipient: string;
    channel: OtpChannel;
    otpCodeHash: string;
    expiresAt: Date;
    purpose: OtpPurpose;
    userId: string | null;
  }) {
    return this.prisma.otpLog.create({
      data: {
        recipient: data.recipient,
        channel: data.channel,
        purpose: data.purpose,
        otpCodeHash: data.otpCodeHash,
        expiresAt: data.expiresAt,
        userId: data.userId,
      },
      select: { id: true },
    });
  }

  findActiveOtpLog(recipient: string, channel: OtpChannel) {
    return this.prisma.otpLog.findFirst({
      where: {
        recipient,
        channel,
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

  // ── Profile completion ────────────────────────────────────────

  getFullProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        profileStage: true,
        profile: {
          select: {
            fullName: true,
            gender: true,
            age: true,
            photoS3Key: true,
            addressLine1: true,
            landmark: true,
            locality: true,
            city: true,
            district: true,
            state: true,
            pincode: true,
            country: true,
            maritalStatus: true,
          },
        },
      },
    });
  }

  getAppStateData(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        profileStage: true,
        aiRecommendations: {
          orderBy: { generatedAt: "desc" },
          take: 1,
          select: { id: true },
        },
      },
    });
  }

  updatePersonalDetails(
    userId: string,
    data: {
      fullName?: string;
      gender?: "male" | "female" | "other" | "prefer_not_to_say";
      age: number;
      maritalStatus?: "single" | "married" | "divorced" | "widowed";
    },
    advanceStage: boolean,
  ) {
    return this.prisma.$transaction([
      this.prisma.userProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: { ...data },
        select: { userId: true },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: advanceStage ? { profileStage: "personal_complete" } : {},
        select: { profileStage: true },
      }),
    ]);
  }

  updateName(userId: string, fullName: string) {
    return this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, fullName },
      update: { fullName },
      select: { userId: true },
    });
  }
}
