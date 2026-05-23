import type { Request, Response } from "express";
import type { UserService } from "./user.service";
import {
  sendOtpByIdentifierSchema,
  verifyOtpByIdentifierSchema,
  requestPhotoUploadSchema,
  confirmPhotoUploadSchema,
  personalDetailsSchema,
  updateNameSchema,
} from "./user.schema";
import { sendSuccess } from "../../utils/response";
import { verifyUserRefreshToken } from "../../utils/jwt";
import {
  JWT_COOKIE_OPTIONS,
  JWT_COOKIE_NAME,
  JWT_REFRESH_COOKIE_NAME,
} from "../../config/constants";

const ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 min
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export class UserController {
  constructor(private readonly userService: UserService) {}

  // ── Unified identifier OTP ────────────────────────────────────

  sendOtpByIdentifier = async (req: Request, res: Response): Promise<void> => {
    const { identifier } = sendOtpByIdentifierSchema.parse(req.body);
    const result = await this.userService.sendOtpByIdentifier(identifier);
    sendSuccess(res, {
      message: `OTP sent to your ${result.channel}`,
      channel: result.channel,
      isNewUser: result.isNewUser,
    });
  };

  verifyOtpByIdentifier = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { identifier, otp } = verifyOtpByIdentifierSchema.parse(req.body);
    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      deviceId: req.headers["x-device-id"] as string | undefined,
    };

    const { accessToken, refreshToken, user, channel } =
      await this.userService.verifyOtpByIdentifier(identifier, otp, meta);

    // Web: set http-only cookies
    res
      .cookie(JWT_COOKIE_NAME, accessToken, {
        ...JWT_COOKIE_OPTIONS,
        maxAge: ACCESS_MAX_AGE,
      })
      .cookie(JWT_REFRESH_COOKIE_NAME, refreshToken, {
        ...JWT_COOKIE_OPTIONS,
        maxAge: REFRESH_MAX_AGE,
      });

    // Mobile: tokens also in response body
    sendSuccess(
      res,
      {
        message: user.isNewUser ? "Account created" : "Login successful",
        channel,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          profileStage: user.profileStage,
        },
        isNewUser: user.isNewUser,
        accessToken,
        refreshToken,
      },
      user.isNewUser ? 201 : 200,
    );
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    // Mobile sends token in body, web sends via cookie
    const token =
      (req.body?.refreshToken as string | undefined) ??
      (req.cookies?.[JWT_REFRESH_COOKIE_NAME] as string | undefined);

    if (!token) {
      res.status(401).json({ success: false, message: "No refresh token" });
      return;
    }

    const { accessToken, refreshToken } =
      await this.userService.refreshSession(token);

    // Refresh web cookies
    res
      .cookie(JWT_COOKIE_NAME, accessToken, {
        ...JWT_COOKIE_OPTIONS,
        maxAge: ACCESS_MAX_AGE,
      })
      .cookie(JWT_REFRESH_COOKIE_NAME, refreshToken, {
        ...JWT_COOKIE_OPTIONS,
        maxAge: REFRESH_MAX_AGE,
      });

    sendSuccess(res, { accessToken, refreshToken });
  };

  // ── Profile photo ─────────────────────────────────────────────

  requestPhotoUploadUrl = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { contentType } = requestPhotoUploadSchema.parse(req.body);
    const result = await this.userService.requestPhotoUploadUrl(
      req.user!.id,
      contentType,
    );
    sendSuccess(res, result);
  };

  confirmPhotoUpload = async (req: Request, res: Response): Promise<void> => {
    const { key } = confirmPhotoUploadSchema.parse(req.body);
    await this.userService.confirmPhotoUpload(req.user!.id, key);
    sendSuccess(res, { message: "Profile photo saved" });
  };

  getPhotoUrl = async (req: Request, res: Response): Promise<void> => {
    const url = await this.userService.getPhotoUrl(req.user!.id);
    sendSuccess(res, { url });
  };

  // ── App state (routing decision) ──────────────────────────────

  getAppState = async (req: Request, res: Response): Promise<void> => {
    const result = await this.userService.getAppState(req.user!.id);
    sendSuccess(res, result);
  };

  // ── Profile ───────────────────────────────────────────────────

  getProfile = async (req: Request, res: Response): Promise<void> => {
    const result = await this.userService.getProfile(req.user!.id);
    sendSuccess(res, result);
  };

  updatePersonalDetails = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const body = personalDetailsSchema.parse(req.body);
    const result = await this.userService.updatePersonalDetails(
      req.user!.id,
      body,
    );
    sendSuccess(res, result);
  };

  updateName = async (req: Request, res: Response): Promise<void> => {
    const { fullName } = updateNameSchema.parse(req.body);
    await this.userService.updateName(req.user!.id, fullName);
    sendSuccess(res, { message: "Name updated successfully" });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const token =
      (req.body?.refreshToken as string | undefined) ??
      (req.cookies?.[JWT_REFRESH_COOKIE_NAME] as string | undefined);

    if (token) {
      try {
        const payload = verifyUserRefreshToken(token);
        await this.userService.logout(payload.sub, payload.sessionId);
      } catch {
        // Token invalid/expired — revoke silently
      }
    }

    // Clear web cookies
    res
      .clearCookie(JWT_COOKIE_NAME, { path: "/" })
      .clearCookie(JWT_REFRESH_COOKIE_NAME, { path: "/" });

    sendSuccess(res, { message: "Logged out" });
  };
}
