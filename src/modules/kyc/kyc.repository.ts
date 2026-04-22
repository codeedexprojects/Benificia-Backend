import type { PrismaClient } from "@prisma/client";
import type { AadhaarKycData } from "../../utils/deepvue";

export interface CompleteKycInput {
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

  async completeKyc(userId: string, input: CompleteKycInput): Promise<void> {
    const { kycData, photoS3Key } = input;
    const now = new Date();

    await this.db.$transaction([
      this.db.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          fullName: kycData.fullName,
          dateOfBirth: kycData.dateOfBirth,
          gender: kycData.gender ? mapGender(kycData.gender) : undefined,
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
          gender: kycData.gender ? mapGender(kycData.gender) : undefined,
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
          profileStage: "kyc_complete",
        },
      }),
    ]);
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

function mapGender(g: "male" | "female" | "other") {
  return g as "male" | "female" | "other" | "prefer_not_to_say";
}
