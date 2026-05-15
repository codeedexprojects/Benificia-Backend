import type { Request, Response } from "express";
import type { FactFindingService } from "./fact-finding.service";
import {
  incomeSchema,
  financeProfileSchema,
  goalsSchema,
  riskSchema,
} from "./fact-finding.schema";
import { sendSuccess } from "../../utils/response";

export class FactFindingController {
  constructor(private readonly service: FactFindingService) {}

  saveIncome = async (req: Request, res: Response): Promise<void> => {
    const body = incomeSchema.parse(req.body);
    const result = await this.service.saveIncome(req.user!.id, body);
    sendSuccess(res, result);
  };

  saveFinanceProfile = async (req: Request, res: Response): Promise<void> => {
    const body = financeProfileSchema.parse(req.body);
    const result = await this.service.saveFinanceProfile(req.user!.id, body);
    sendSuccess(res, result);
  };

  saveGoals = async (req: Request, res: Response): Promise<void> => {
    const body = goalsSchema.parse(req.body);
    const result = await this.service.saveGoals(req.user!.id, body);
    sendSuccess(res, result);
  };

  saveRisk = async (req: Request, res: Response): Promise<void> => {
    const body = riskSchema.parse(req.body);
    const result = await this.service.saveRisk(req.user!.id, body);
    sendSuccess(res, result);
  };

  skipRisk = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.skipRisk(req.user!.id);
    sendSuccess(res, result);
  };

  getStatus = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.getStatus(req.user!.id);
    sendSuccess(res, result);
  };
}
