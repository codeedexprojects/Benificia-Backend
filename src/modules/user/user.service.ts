import { randomUUID } from "crypto";
import { addMinutes } from "date-fns";
import type { SESClient } from "@aws-sdk/client-ses";
import type { createClient } from "redis";
import { OtpChannel, OtpPurpose, type ProfileStage } from "@prisma/client";
import type { UserRepository } from "./user.repository";
import { hashOtp, compareOtp, hashToken } from "../../utils/encryption";
import {
  generateUploadUrl,
  generateDownloadUrl,
  validateUpload,
  s3Keys,
  UPLOAD_CATEGORY,
  type UploadUrlResult,
} from "../../utils/s3";
import type { S3Client } from "@aws-sdk/client-s3";
import { generateOtp } from "../../utils/otp";
import {
  signUserAccessToken,
  signUserRefreshToken,
  verifyUserRefreshToken,
} from "../../utils/jwt";
import { sendEmail, interpolateTemplate } from "../../utils/email";
import { sendSmsOtp } from "../../utils/twofactor";
import { env } from "../../config/env";
import {
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS,
  USER_REFRESH_TTL_SECONDS,
  USER_SESSION_KEY,
} from "../../config/constants";
import {
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  NotFoundError,
} from "../../utils/errors";
import { getCompletionStatus } from "../../utils/profile-completion";
import type { z } from "zod";
import type { personalDetailsSchema } from "./user.schema";

type RedisClient = ReturnType<typeof createClient>;

interface SessionCache {
  userId: string;
  email: string | null;
}

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult extends TokenPair {
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    profileStage: ProfileStage;
    isNewUser: boolean;
  };
}

const OTP_TEMPLATE = `
<p>Hi,</p>
<p>Your Benificia verification code is: <strong>{{otp_code}}</strong></p>
<p>Valid for {{expiry_minutes}} minutes. Do not share this code.</p>
`;

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly redis: RedisClient,
    private readonly ses: SESClient,
    private readonly s3: S3Client,
  ) {}

  // ── Dev bypass ────────────────────────────────────────────────
  // In development every OTP send is a no-op and every verify accepts
  // the fixed code "123456". No DB rows are created or consumed, so the
  // code works for any email / phone and never expires.

  private readonly DEV_OTP = "123456";
  private readonly isDev = env.NODE_ENV === "development";

  private async devVerifyEmail(
    email: string,
    otpCode: string,
    meta: RequestMeta,
  ): Promise<AuthResult> {
    if (otpCode !== this.DEV_OTP) throw new BadRequestError("Invalid OTP");

    const existing = await this.userRepository.findByEmail(email);
    const user =
      existing && !existing.deletedAt && existing.isActive ? existing : null;

    let userId: string;
    let profileStage: ProfileStage;
    const isNewUser = user === null;

    if (isNewUser) {
      try {
        const created = await this.userRepository.createUser(email);
        userId = created.id;
        profileStage = created.profileStage;
      } catch {
        const found = await this.userRepository.findByEmail(email);
        if (!found || found.deletedAt || !found.isActive)
          throw new ForbiddenError("Account unavailable");
        userId = found.id;
        profileStage = found.profileStage;
      }
    } else {
      if (!user.isActive) throw new ForbiddenError("Account deactivated");
      userId = user.id;
      profileStage = user.profileStage;
    }

    const tokens = await this.issueTokens({ userId, email }, meta);
    return {
      ...tokens,
      user: { id: userId, email, phone: null, profileStage, isNewUser },
    };
  }

  private async devVerifyPhone(
    phone: string,
    otpCode: string,
    meta: RequestMeta,
  ): Promise<AuthResult> {
    if (otpCode !== this.DEV_OTP) throw new BadRequestError("Invalid OTP");

    const existing = await this.userRepository.findByPhone(phone);
    const user =
      existing && !existing.deletedAt && existing.isActive ? existing : null;

    let userId: string;
    let userEmail: string | null;
    let profileStage: ProfileStage;
    const isNewUser = user === null;

    if (isNewUser) {
      try {
        const created = await this.userRepository.createPhoneUser(phone);
        userId = created.id;
        userEmail = created.email;
        profileStage = created.profileStage;
      } catch {
        const found = await this.userRepository.findByPhone(phone);
        if (!found || found.deletedAt || !found.isActive)
          throw new ForbiddenError("Account unavailable");
        userId = found.id;
        userEmail = found.email;
        profileStage = found.profileStage;
      }
    } else {
      if (!user.isActive) throw new ForbiddenError("Account deactivated");
      userId = user.id;
      userEmail = user.email;
      profileStage = user.profileStage;
    }

    const tokens = await this.issueTokens({ userId, email: userEmail }, meta);
    return {
      ...tokens,
      user: { id: userId, email: userEmail, phone, profileStage, isNewUser },
    };
  }

  // ── Email OTP ─────────────────────────────────────────────────

  async sendEmailOtp(email: string): Promise<{ isNewUser: boolean }> {
    const existing = await this.userRepository.findByEmail(email);
    const user =
      existing && !existing.deletedAt && existing.isActive ? existing : null;
    const isNewUser = user === null;

    if (this.isDev) {
      console.log(`[DEV] Email OTP for ${email}: ${this.DEV_OTP}`);
      return { isNewUser };
    }

    const purpose = isNewUser ? OtpPurpose.registration : OtpPurpose.login;
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = addMinutes(new Date(), OTP_EXPIRY_MINUTES);

    await this.userRepository.createOtpLog({
      recipient: email,
      channel: OtpChannel.email,
      otpCodeHash: otpHash,
      expiresAt,
      purpose,
      userId: user?.id ?? null,
    });

    const html = interpolateTemplate(OTP_TEMPLATE, {
      otp_code: otp,
      expiry_minutes: String(OTP_EXPIRY_MINUTES),
    });
    await sendEmail(this.ses, {
      to: email,
      subject: "Your Benificia verification code",
      html,
      text: `Your code is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
    });

    return { isNewUser };
  }

  async verifyEmailOtp(
    email: string,
    otpCode: string,
    meta: RequestMeta,
  ): Promise<AuthResult> {
    if (this.isDev) return this.devVerifyEmail(email, otpCode, meta);

    const otpLog = await this.userRepository.findActiveOtpLog(
      email,
      OtpChannel.email,
    );
    if (!otpLog) throw new BadRequestError("OTP expired or not requested");

    if (otpLog.attemptCount >= OTP_MAX_ATTEMPTS) {
      throw new ForbiddenError("Too many OTP attempts. Request a new OTP.");
    }

    const valid = await compareOtp(otpCode, otpLog.otpCodeHash);
    if (!valid) {
      const updated = await this.userRepository.incrementOtpAttempts(otpLog.id);
      const remaining = OTP_MAX_ATTEMPTS - updated.attemptCount;
      throw new BadRequestError(
        remaining > 0
          ? `Invalid OTP. ${remaining} attempt(s) remaining.`
          : "Invalid OTP. No attempts remaining.",
      );
    }

    const isNewUser = otpLog.purpose === OtpPurpose.registration;
    let userId: string;
    let profileStage: ProfileStage;

    if (isNewUser) {
      try {
        const created = await this.userRepository.createUser(email);
        userId = created.id;
        profileStage = created.profileStage;
      } catch {
        const existing = await this.userRepository.findByEmail(email);
        if (!existing || existing.deletedAt || !existing.isActive) {
          throw new ForbiddenError("Account unavailable");
        }
        userId = existing.id;
        profileStage = existing.profileStage;
      }
    } else {
      const user = await this.userRepository.findByEmail(email);
      if (!user || user.deletedAt)
        throw new UnauthorizedError("Account not found");
      if (!user.isActive) throw new ForbiddenError("Account deactivated");
      userId = user.id;
      profileStage = user.profileStage;
    }

    await this.userRepository.markOtpVerified(otpLog.id);
    const tokens = await this.issueTokens({ userId, email }, meta);

    return {
      ...tokens,
      user: { id: userId, email, phone: null, profileStage, isNewUser },
    };
  }

  // ── Phone OTP ─────────────────────────────────────────────────

  async sendPhoneOtp(phone: string): Promise<{ isNewUser: boolean }> {
    const existing = await this.userRepository.findByPhone(phone);
    const user =
      existing && !existing.deletedAt && existing.isActive ? existing : null;
    const isNewUser = user === null;

    if (this.isDev) {
      console.log(`[DEV] Phone OTP for ${phone}: ${this.DEV_OTP}`);
      return { isNewUser };
    }

    const purpose = isNewUser ? OtpPurpose.registration : OtpPurpose.login;
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = addMinutes(new Date(), OTP_EXPIRY_MINUTES);

    await this.userRepository.createOtpLog({
      recipient: phone,
      channel: OtpChannel.phone,
      otpCodeHash: otpHash,
      expiresAt,
      purpose,
      userId: user?.id ?? null,
    });

    await sendSmsOtp(phone, otp);

    return { isNewUser };
  }

  async verifyPhoneOtp(
    phone: string,
    otpCode: string,
    meta: RequestMeta,
  ): Promise<AuthResult> {
    if (this.isDev) return this.devVerifyPhone(phone, otpCode, meta);

    const otpLog = await this.userRepository.findActiveOtpLog(
      phone,
      OtpChannel.phone,
    );
    if (!otpLog) throw new BadRequestError("OTP expired or not requested");

    if (otpLog.attemptCount >= OTP_MAX_ATTEMPTS) {
      throw new ForbiddenError("Too many OTP attempts. Request a new OTP.");
    }

    const valid = await compareOtp(otpCode, otpLog.otpCodeHash);
    if (!valid) {
      const updated = await this.userRepository.incrementOtpAttempts(otpLog.id);
      const remaining = OTP_MAX_ATTEMPTS - updated.attemptCount;
      throw new BadRequestError(
        remaining > 0
          ? `Invalid OTP. ${remaining} attempt(s) remaining.`
          : "Invalid OTP. No attempts remaining.",
      );
    }

    const isNewUser = otpLog.purpose === OtpPurpose.registration;
    let userId: string;
    let userEmail: string | null;
    let profileStage: ProfileStage;

    if (isNewUser) {
      // Phone-first registration — create account with phone, no email required
      try {
        const created = await this.userRepository.createPhoneUser(phone);
        userId = created.id;
        userEmail = created.email;
        profileStage = created.profileStage;
      } catch {
        // P2002 — concurrent request already created this user; proceed as login
        const existing = await this.userRepository.findByPhone(phone);
        if (!existing || existing.deletedAt || !existing.isActive) {
          throw new ForbiddenError("Account unavailable");
        }
        userId = existing.id;
        userEmail = existing.email;
        profileStage = existing.profileStage;
      }
    } else {
      const user = await this.userRepository.findByPhone(phone);
      if (!user || user.deletedAt)
        throw new UnauthorizedError("Account not found");
      if (!user.isActive) throw new ForbiddenError("Account deactivated");
      userId = user.id;
      userEmail = user.email;
      profileStage = user.profileStage;
    }

    await this.userRepository.markOtpVerified(otpLog.id);

    const tokens = await this.issueTokens({ userId, email: userEmail }, meta);

    return {
      ...tokens,
      user: { id: userId, email: userEmail, phone, profileStage, isNewUser },
    };
  }

  // Keep the old names as aliases so existing tests/callers keep working
  async sendOtp(email: string): Promise<{ isNewUser: boolean }> {
    return this.sendEmailOtp(email);
  }

  async verifyOtp(
    email: string,
    otpCode: string,
    meta: RequestMeta,
  ): Promise<AuthResult> {
    return this.verifyEmailOtp(email, otpCode, meta);
  }

  async refreshSession(refreshToken: string): Promise<TokenPair> {
    // 1. Verify JWT signature first — cheapest check
    const payload = verifyUserRefreshToken(refreshToken);
    const redisKey = USER_SESSION_KEY(payload.sub, payload.sessionId);

    let cache: SessionCache | null = null;

    // 2. Fast path: Redis
    try {
      const raw = await this.redis.get(redisKey);
      if (raw) cache = JSON.parse(raw) as SessionCache;
    } catch {
      // Redis unavailable — fall through to DB
    }

    // 3. DB fallback: Redis miss or Redis down
    if (!cache) {
      const session = await this.userRepository.findSessionById(
        payload.sessionId,
      );

      if (
        !session ||
        session.isRevoked ||
        session.expiresAt < new Date() ||
        !session.user.isActive ||
        session.user.deletedAt
      ) {
        throw new UnauthorizedError("Session expired. Please log in again.");
      }

      // Token hash must match — defends against reuse of rotated tokens
      if (hashToken(refreshToken) !== session.refreshTokenHash) {
        throw new UnauthorizedError("Invalid session token");
      }

      cache = { userId: session.userId, email: session.user.email };
    }

    // 4. Rotate — invalidate old session in both stores before issuing new tokens
    await Promise.allSettled([
      this.userRepository.revokeSession(payload.sessionId),
      this.redis.del(redisKey),
    ]);

    // 5. Issue new tokens
    return this.issueTokens(cache, {});
  }

  // ── Profile photo ─────────────────────────────────────────────

  async requestPhotoUploadUrl(
    userId: string,
    contentType: string,
  ): Promise<UploadUrlResult> {
    validateUpload(contentType, UPLOAD_CATEGORY.PROFILE_PHOTO);
    const key = s3Keys.profilePhoto(userId, contentType);
    return generateUploadUrl(
      this.s3,
      key,
      contentType,
      UPLOAD_CATEGORY.PROFILE_PHOTO,
    );
  }

  async confirmPhotoUpload(userId: string, key: string): Promise<void> {
    // Verify the key belongs to this user — prevents saving another user's key
    const expectedPrefix = `profiles/${userId}/`;
    if (!key.startsWith(expectedPrefix)) {
      throw new BadRequestError("Invalid file key");
    }
    await this.userRepository.upsertPhotoKey(userId, key);
  }

  async getPhotoUrl(userId: string): Promise<string> {
    const profile = await this.userRepository.findPhotoKey(userId);
    if (!profile?.photoS3Key)
      throw new NotFoundError("No profile photo uploaded");
    return generateDownloadUrl(this.s3, profile.photoS3Key);
  }

  // ── Profile completion ─────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.userRepository.getFullProfile(userId);
    if (!user) throw new NotFoundError("User not found");

    let photoUrl: string | undefined;
    if (user.profile?.photoS3Key) {
      try {
        photoUrl = await generateDownloadUrl(this.s3, user.profile.photoS3Key);
      } catch {
        // Non-critical — signed URL generation failure should not block the response
      }
    }

    const { photoS3Key: _photoS3Key, ...profileRest } = user.profile ?? {};

    return {
      user: {
        id: user.id,
        email: user.email,
        profileStage: user.profileStage,
        kycStatus: user.kycStatus,
      },
      profile: user.profile ? { ...profileRest, photoUrl } : null,
      completion: getCompletionStatus(user.profileStage),
    };
  }

  async updatePersonalDetails(
    userId: string,
    data: z.infer<typeof personalDetailsSchema>,
  ): Promise<{ message: string; profileStage: string }> {
    const user = await this.userRepository.getFullProfile(userId);
    if (!user) throw new NotFoundError("User not found");

    const allowedStages = ["kyc_complete", "personal_complete"] as const;
    if (
      !allowedStages.includes(
        user.profileStage as (typeof allowedStages)[number],
      )
    ) {
      throw new ForbiddenError(
        "Please complete Aadhaar KYC verification before filling personal details",
      );
    }

    await this.userRepository.updatePersonalDetails(userId, data);

    return {
      message: "Personal details saved successfully",
      profileStage: "personal_complete",
    };
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await Promise.allSettled([
      this.userRepository.revokeSession(sessionId),
      this.redis.del(USER_SESSION_KEY(userId, sessionId)),
    ]);
  }

  private async issueTokens(
    session: SessionCache,
    meta: RequestMeta,
  ): Promise<TokenPair> {
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + USER_REFRESH_TTL_SECONDS * 1000);

    const accessToken = signUserAccessToken({
      sub: session.userId,
      email: session.email,
    });
    const refreshToken = signUserRefreshToken({
      sub: session.userId,
      sessionId,
    });

    // 1. Persist to DB (source of truth)
    await this.userRepository.createSession({
      id: sessionId,
      userId: session.userId,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      deviceId: meta.deviceId,
    });

    // 2. Cache in Redis (best-effort — DB already authoritative)
    try {
      await this.redis.set(
        USER_SESSION_KEY(session.userId, sessionId),
        JSON.stringify(session),
        { EX: USER_REFRESH_TTL_SECONDS },
      );
    } catch {
      // Redis write failed — DB is source of truth, proceed normally
    }

    return { accessToken, refreshToken };
  }
}
