import type { PrismaClient } from "@prisma/client";
import type { AadhaarKycData } from "../../utils/deepvue";

export interface SaveKycDataInput {
  kycData: AadhaarKycData;
  photoS3Key?: string;
}

export interface CreateConsentInput {
  userId: string;
  consentType: string;
  consentText: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateAuditLogInput {
  userId: string;
  action: string;
  method?: string;
  referenceId?: string;
  ipAddress?: string;
  outcome?: string;
  errorReason?: string;
}

export class KycRepository {
  constructor(private readonly db: PrismaClient) {}

  async findUserKycStatus(userId: string) {
    return this.db.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true, profileStage: true },
    });
  }

  async getProfile(userId: string) {
    return this.db.userProfile.findUnique({
      where: { userId },
      select: {
        fullName: true,
        dateOfBirth: true,
        gender: true,
        photoS3Key: true,
        addressLine1: true,
        landmark: true,
        locality: true,
        city: true,
        district: true,
        state: true,
        pincode: true,
        country: true,
        aadhaarLast4: true,
        kycMethod: true,
        kycVerifiedAt: true,
      },
    });
  }

  // Saves Aadhaar data + marks kycStatus=verified + profileStage=kyc_in_progress
  async saveKycData(userId: string, input: SaveKycDataInput): Promise<void> {
    const { kycData, photoS3Key } = input;
    const now = new Date();

    await this.db.$transaction([
      this.db.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          fullName: kycData.fullName,
          dateOfBirth: kycData.dateOfBirth,
          gender: kycData.gender,
          photoS3Key,
          addressLine1: kycData.addressLine1,
          landmark: kycData.landmark,
          locality: kycData.locality,
          city: kycData.city,
          district: kycData.district,
          state: kycData.state,
          pincode: kycData.pincode,
          aadhaarLast4: kycData.aadhaarLast4,
          kycMethod: "aadhaar_otp",
          kycVerifiedAt: now,
        },
        update: {
          fullName: kycData.fullName,
          dateOfBirth: kycData.dateOfBirth,
          gender: kycData.gender,
          photoS3Key,
          addressLine1: kycData.addressLine1,
          landmark: kycData.landmark,
          locality: kycData.locality,
          city: kycData.city,
          district: kycData.district,
          state: kycData.state,
          pincode: kycData.pincode,
          aadhaarLast4: kycData.aadhaarLast4,
          kycMethod: "aadhaar_otp",
          kycVerifiedAt: now,
        },
      }),
      this.db.user.update({
        where: { id: userId },
        data: {
          kycStatus: "verified",
          profileStage: "kyc_in_progress",
        },
      }),
    ]);
  }

  // User has reviewed the auto-filled data and confirmed — advance to kyc_complete
  async confirmKyc(userId: string): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { profileStage: "kyc_complete" },
    });
  }

  async createConsent(input: CreateConsentInput): Promise<void> {
    await this.db.kycConsent.create({
      data: {
        userId: input.userId,
        consentType: input.consentType,
        consentText: input.consentText,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  async createAuditLog(input: CreateAuditLogInput): Promise<void> {
    await this.db.kycAuditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        method: input.method,
        referenceId: input.referenceId,
        ipAddress: input.ipAddress,
        outcome: input.outcome,
        errorReason: input.errorReason,
      },
    });
  }
}
