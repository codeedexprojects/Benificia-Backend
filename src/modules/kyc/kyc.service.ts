import type { createClient } from "redis";
import type { S3Client } from "@aws-sdk/client-s3";
import type { KycRepository } from "./kyc.repository";
import {
  sendAadhaarOtp,
  verifyAadhaarOtp,
  kycRefKey,
} from "../../utils/deepvue";
import { uploadBuffer, generateDownloadUrl } from "../../utils/s3";
import { BadRequestError, ForbiddenError } from "../../utils/errors";
import { logger } from "../../utils/logger";

type RedisClient = ReturnType<typeof createClient>;

const AADHAAR_PHOTO_CONTENT_TYPE = "image/jpeg";

const CONSENT_TEXT =
  "I hereby provide my consent to verify my Aadhaar details for KYC completion on Benifica. I understand that my Aadhaar data will be used solely for identity verification and stored securely.";

export class KycService {
  constructor(
    private readonly kycRepository: KycRepository,
    private readonly redis: RedisClient,
    private readonly s3: S3Client,
  ) {}

  async sendOtp(
    userId: string,
    aadhaarNumber: string,
    ipAddress?: string,
    _userAgent?: string,
  ): Promise<{ message: string }> {
    const user = await this.kycRepository.findUserKycStatus(userId);
    if (user?.profileStage === "kyc_complete") {
      throw new ForbiddenError("Aadhaar verification is already complete");
    }

    let referenceId: string;
    try {
      referenceId = await sendAadhaarOtp(this.redis, userId, aadhaarNumber);
    } catch (err) {
      await this.kycRepository.createAuditLog({
        userId,
        action: "otp_send_failed",
        method: "aadhaar_otp",
        ipAddress,
        outcome: "failure",
        errorReason: err instanceof Error ? err.message : "Unknown error",
      });
      throw err;
    }

    await this.kycRepository.createAuditLog({
      userId,
      action: "otp_sent",
      method: "aadhaar_otp",
      referenceId,
      ipAddress,
      outcome: "success",
    });

    return { message: "OTP sent to your Aadhaar-linked mobile number" };
  }

  async verifyOtp(
    userId: string,
    otp: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    message: string;
    profile: {
      fullName?: string;
      dateOfBirth?: Date;
      gender?: string;
      aadhaarLast4?: string;
      address: {
        addressLine1?: string;
        landmark?: string;
        locality?: string;
        city?: string;
        district?: string;
        state?: string;
        pincode?: string;
      };
      photoUrl?: string;
    };
  }> {
    const user = await this.kycRepository.findUserKycStatus(userId);
    if (user?.profileStage === "kyc_complete") {
      throw new ForbiddenError("Aadhaar verification is already complete");
    }

    const pendingRef = await this.redis.get(kycRefKey(userId));
    if (!pendingRef) {
      throw new BadRequestError(
        "No active OTP session. Please request a new OTP",
      );
    }

    let kycData: Awaited<ReturnType<typeof verifyAadhaarOtp>>;
    try {
      kycData = await verifyAadhaarOtp(this.redis, userId, otp);
    } catch (err) {
      await this.kycRepository.createAuditLog({
        userId,
        action: "otp_verification_failed",
        method: "aadhaar_otp",
        ipAddress,
        outcome: "failure",
        errorReason: err instanceof Error ? err.message : "Unknown error",
      });
      throw err;
    }

    let photoS3Key: string | undefined;
    if (kycData.photo) {
      photoS3Key = `profiles/${userId}/aadhaar_photo.jpg`;
      try {
        await uploadBuffer(
          this.s3,
          photoS3Key,
          kycData.photo,
          AADHAAR_PHOTO_CONTENT_TYPE,
        );
      } catch (err) {
        logger.error("Failed to upload Aadhaar photo", {
          userId,
          error: err instanceof Error ? err.message : err,
        });
        photoS3Key = undefined;
      }
    }

    await Promise.all([
      this.kycRepository.saveKycData(userId, { kycData, photoS3Key }),
      this.kycRepository.createConsent({
        userId,
        consentType: "aadhaar_kyc",
        consentText: CONSENT_TEXT,
        ipAddress,
        userAgent,
      }),
    ]);

    await this.kycRepository.createAuditLog({
      userId,
      action: "otp_verified",
      method: "aadhaar_otp",
      ipAddress,
      outcome: "success",
    });

    let photoUrl: string | undefined;
    if (photoS3Key) {
      try {
        photoUrl = await generateDownloadUrl(this.s3, photoS3Key);
      } catch {
        // Non-critical
      }
    }

    return {
      message:
        "Verification successful. Please review your details and confirm.",
      profile: {
        fullName: kycData.fullName,
        dateOfBirth: kycData.dateOfBirth,
        gender: kycData.gender,
        aadhaarLast4: kycData.aadhaarLast4,
        address: {
          addressLine1: kycData.addressLine1,
          landmark: kycData.landmark,
          locality: kycData.locality,
          city: kycData.city,
          district: kycData.district,
          state: kycData.state,
          pincode: kycData.pincode,
        },
        photoUrl,
      },
    };
  }

  async confirmKyc(userId: string): Promise<{ message: string }> {
    const user = await this.kycRepository.findUserKycStatus(userId);

    if (user?.profileStage === "kyc_complete") {
      throw new ForbiddenError("Aadhaar verification is already complete");
    }
    if (user?.kycStatus !== "verified") {
      throw new BadRequestError(
        "Please complete Aadhaar OTP verification before confirming",
      );
    }

    await this.kycRepository.confirmKyc(userId);

    return { message: "KYC confirmed successfully" };
  }
}
