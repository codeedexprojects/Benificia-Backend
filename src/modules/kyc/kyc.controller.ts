import type { Request, Response } from "express";
import type { KycService } from "./kyc.service";
import { sendOtpSchema, verifyOtpSchema } from "./kyc.schema";
import { sendSuccess } from "../../utils/response";

export class KycController {
  constructor(private readonly kycService: KycService) {}

  /**
   * POST /api/v1/kyc/send-otp
   * Body: { aadhaarNumber, consentGiven }
   */
  sendOtp = async (req: Request, res: Response): Promise<void> => {
    const body = sendOtpSchema.parse(req.body);
    const result = await this.kycService.sendOtp(
      req.user!.id,
      body.aadhaarNumber,
      req.ip,
      req.headers["user-agent"],
    );
    sendSuccess(res, result);
  };

  /**
   * POST /api/v1/kyc/verify-otp
   * Body: { otp }
   */
  verifyOtp = async (req: Request, res: Response): Promise<void> => {
    const body = verifyOtpSchema.parse(req.body);
    const result = await this.kycService.verifyOtp(
      req.user!.id,
      body.otp,
      req.ip,
      req.headers["user-agent"],
    );
    sendSuccess(res, result);
  };
}
