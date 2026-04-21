import type { Request, Response } from "express";
import type { AdminService } from "./admin.service";
import { adminLoginSchema, adminVerifyOtpSchema } from "./admin.schema";
import { sendSuccess } from "../../utils/response";
import { verifyAdminRefreshToken } from "../../utils/jwt";
import { JWT_COOKIE_OPTIONS } from "../../config/constants";

const ACCESS_COOKIE = "admin_token";
const REFRESH_COOKIE = "admin_refresh_token";
const ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 min
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  login = async (req: Request, res: Response): Promise<void> => {
    const body = adminLoginSchema.parse(req.body);
    await this.adminService.login(body.email, body.password);
    sendSuccess(res, { message: "OTP sent to your registered email" });
  };

  verifyOtp = async (req: Request, res: Response): Promise<void> => {
    const body = adminVerifyOtpSchema.parse(req.body);
    const { accessToken, refreshToken } = await this.adminService.verifyOtp(
      body.email,
      body.otp,
    );

    res
      .cookie(ACCESS_COOKIE, accessToken, {
        ...JWT_COOKIE_OPTIONS,
        maxAge: ACCESS_MAX_AGE,
      })
      .cookie(REFRESH_COOKIE, refreshToken, {
        ...JWT_COOKIE_OPTIONS,
        maxAge: REFRESH_MAX_AGE,
      });

    sendSuccess(res, { message: "Login successful" });
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const token = req.cookies[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      res.status(401).json({ success: false, message: "No refresh token" });
      return;
    }

    const { accessToken, refreshToken } =
      await this.adminService.refreshSession(token);

    res
      .cookie(ACCESS_COOKIE, accessToken, {
        ...JWT_COOKIE_OPTIONS,
        maxAge: ACCESS_MAX_AGE,
      })
      .cookie(REFRESH_COOKIE, refreshToken, {
        ...JWT_COOKIE_OPTIONS,
        maxAge: REFRESH_MAX_AGE,
      });

    sendSuccess(res, { message: "Session refreshed" });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const token = req.cookies[REFRESH_COOKIE] as string | undefined;

    if (token) {
      try {
        const payload = verifyAdminRefreshToken(token);
        await this.adminService.logout(payload.sub, payload.sessionId);
      } catch {
        // Token invalid/expired — proceed to clear cookies
      }
    }

    res
      .clearCookie(ACCESS_COOKIE, { path: "/" })
      .clearCookie(REFRESH_COOKIE, { path: "/" });

    sendSuccess(res, { message: "Logged out" });
  };
}
