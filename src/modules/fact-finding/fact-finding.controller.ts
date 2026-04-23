import type { Request, Response } from "express";
import type { FactFindingService } from "./fact-finding.service";
import {
  incomeSchema,
  expensesSchema,
  assetsSchema,
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

  saveExpenses = async (req: Request, res: Response): Promise<void> => {
    const body = expensesSchema.parse(req.body);
    const result = await this.service.saveExpenses(req.user!.id, body);
    sendSuccess(res, result);
  };

  saveAssets = async (req: Request, res: Response): Promise<void> => {
    const body = assetsSchema.parse(req.body);
    const result = await this.service.saveAssets(req.user!.id, body);
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
}
