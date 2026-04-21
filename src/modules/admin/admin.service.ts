import { randomUUID } from "crypto";
import { addMinutes } from "date-fns";
import type { SESClient } from "@aws-sdk/client-ses";
import type { createClient } from "redis";
import type { AdminRole } from "@prisma/client";
import type { AdminRepository } from "./admin.repository";
import {
  comparePassword,
  hashOtp,
  compareOtp,
  hashToken,
} from "../../utils/encryption";
import { generateOtp } from "../../utils/otp";
import {
  signAdminAccessToken,
  signAdminRefreshToken,
  verifyAdminRefreshToken,
} from "../../utils/jwt";
import { sendEmail, interpolateTemplate } from "../../utils/email";
import {
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS,
  ADMIN_REFRESH_TTL_SECONDS,
  ADMIN_SESSION_KEY,
} from "../../config/constants";
import {
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
} from "../../utils/errors";

type RedisClient = ReturnType<typeof createClient>;

interface SessionData {
  adminId: string;
  email: string;
  role: AdminRole;
}

const OTP_EMAIL_TEMPLATE = `
<p>Hi,</p>
<p>Your Benificia admin OTP is: <strong>{{otp_code}}</strong></p>
<p>Valid for {{expiry_minutes}} minutes. Do not share this code.</p>
`;

export class AdminService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly redis: RedisClient,
    private readonly ses: SESClient,
  ) {}

  async login(email: string, password: string): Promise<void> {
    const admin = await this.adminRepository.findByEmail(email);

    // Constant-time: don't reveal whether the email exists
    if (!admin || !(await comparePassword(password, admin.passwordHash))) {
      throw new UnauthorizedError("Invalid credentials");
    }
    if (!admin.isActive) throw new ForbiddenError("Account deactivated");

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = addMinutes(new Date(), OTP_EXPIRY_MINUTES);

    await this.adminRepository.createOtpLog({
      email,
      otpCodeHash: otpHash,
      expiresAt,
    });

    const html = interpolateTemplate(OTP_EMAIL_TEMPLATE, {
      otp_code: otp,
      expiry_minutes: String(OTP_EXPIRY_MINUTES),
    });
    await sendEmail(this.ses, {
      to: email,
      subject: "Your Benificia Admin OTP",
      html,
      text: `Your OTP is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
    });
  }

  async verifyOtp(
    email: string,
    otpCode: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const admin = await this.adminRepository.findByEmail(email);
    if (!admin || !admin.isActive)
      throw new ForbiddenError("Account deactivated");

    const otpLog = await this.adminRepository.findActiveOtpLog(email);
    if (!otpLog) throw new BadRequestError("OTP expired or not requested");

    if (otpLog.attemptCount >= OTP_MAX_ATTEMPTS) {
      throw new ForbiddenError("Too many OTP attempts. Request a new OTP.");
    }

    const valid = await compareOtp(otpCode, otpLog.otpCodeHash);
    if (!valid) {
      const updated = await this.adminRepository.incrementOtpAttempts(
        otpLog.id,
      );
      const remaining = OTP_MAX_ATTEMPTS - updated.attemptCount;
      throw new BadRequestError(
        remaining > 0
          ? `Invalid OTP. ${remaining} attempt(s) remaining.`
          : "Invalid OTP. No attempts remaining.",
      );
    }

    await Promise.all([
      this.adminRepository.markOtpVerified(otpLog.id),
      this.adminRepository.updateLastLogin(admin.id),
    ]);

    return this.issueTokens({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    });
  }

  async refreshSession(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // 1. Verify JWT signature first — cheapest check
    const payload = verifyAdminRefreshToken(refreshToken);
    const redisKey = ADMIN_SESSION_KEY(payload.sub, payload.sessionId);

    let session: SessionData | null = null;

    // 2. Fast path: Redis
    try {
      const raw = await this.redis.get(redisKey);
      if (raw) session = JSON.parse(raw) as SessionData;
    } catch {
      // Redis unavailable — fall through to DB
    }

    // 3. DB fallback: Redis miss or Redis down
    if (!session) {
      const dbSession = await this.adminRepository.findSessionBySessionId(
        payload.sessionId,
      );

      if (
        !dbSession ||
        dbSession.isRevoked ||
        dbSession.expiresAt < new Date() ||
        !dbSession.admin.isActive
      ) {
        throw new UnauthorizedError("Session expired. Please log in again.");
      }

      // Extra validation: token hash must match what was stored
      if (hashToken(refreshToken) !== dbSession.refreshTokenHash) {
        throw new UnauthorizedError("Invalid session token");
      }

      session = {
        adminId: dbSession.adminId,
        email: dbSession.admin.email,
        role: dbSession.admin.role,
      };
    }

    // 4. Rotate — revoke old session in both stores before issuing new tokens
    await Promise.allSettled([
      this.adminRepository.revokeSession(payload.sessionId),
      this.redis.del(redisKey),
    ]);

    // 5. Issue new tokens and persist
    return this.issueTokens(session);
  }

  async logout(adminId: string, sessionId: string): Promise<void> {
    // Both must complete independently — DB is the authoritative revocation
    await Promise.allSettled([
      this.adminRepository.revokeSession(sessionId),
      this.redis.del(ADMIN_SESSION_KEY(adminId, sessionId)),
    ]);
  }

  private async issueTokens(
    session: SessionData,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + ADMIN_REFRESH_TTL_SECONDS * 1000);

    const accessToken = signAdminAccessToken({
      sub: session.adminId,
      email: session.email,
      role: session.role,
    });
    const refreshToken = signAdminRefreshToken({
      sub: session.adminId,
      sessionId,
    });

    // 1. Persist to DB (source of truth)
    await this.adminRepository.createSession({
      adminId: session.adminId,
      sessionId,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt,
    });

    // 2. Cache in Redis (best-effort — DB already has it)
    try {
      await this.redis.set(
        ADMIN_SESSION_KEY(session.adminId, sessionId),
        JSON.stringify(session),
        { EX: ADMIN_REFRESH_TTL_SECONDS },
      );
    } catch {
      // Redis write failed — DB is source of truth, proceed normally
    }

    return { accessToken, refreshToken };
  }
}
