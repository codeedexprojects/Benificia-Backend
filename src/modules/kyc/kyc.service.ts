import type { createClient } from "redis";
import type { S3Client } from "@aws-sdk/client-s3";

type RedisClient = ReturnType<typeof createClient>;
import type { KycRepository } from "./kyc.repository";
import {
  sendAadhaarOtp,
  verifyAadhaarOtp,
  kycRefKey,
} from "../../utils/deepvue";
import { uploadBuffer } from "../../utils/s3";
import { BadRequestError, ForbiddenError } from "../../utils/errors";
import { logger } from "../../utils/logger";

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
    userAgent?: string,
  ): Promise<{ message: string }> {
    const user = await this.kycRepository.findUserKycStatus(userId);
    if (user?.kycStatus === "verified") {
      throw new ForbiddenError("KYC is already verified");
    }

    // Don't expose if OTP is already pending — idempotent re-send is fine
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
  ): Promise<{ message: string }> {
    const user = await this.kycRepository.findUserKycStatus(userId);
    if (user?.kycStatus === "verified") {
      throw new ForbiddenError("KYC is already verified");
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

    // Upload Aadhaar photo to S3 if Deepvue returned one
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
        // Photo upload failure must not block KYC completion
        logger.error("Failed to upload Aadhaar photo", {
          userId,
          error: err instanceof Error ? err.message : err,
        });
        photoS3Key = undefined;
      }
    }

    await Promise.all([
      this.kycRepository.completeKyc(userId, { kycData, photoS3Key }),
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
      action: "kyc_verified",
      method: "aadhaar_otp",
      ipAddress,
      outcome: "success",
    });

    return { message: "KYC verification successful" };
  }
}
