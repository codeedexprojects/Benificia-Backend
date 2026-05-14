import type { Request, Response } from "express";
import type { FactFindingService } from "./fact-finding.service";
import {
  incomeSourcesSchema,
  financeProfileSchema,
  incomeAmountSchema,
  expensesSchema,
  assetsSchema,
  riskSchema,
} from "./fact-finding.schema";
import { sendSuccess } from "../../utils/response";

export class FactFindingController {
  constructor(private readonly service: FactFindingService) {}

  saveIncomeSources = async (req: Request, res: Response): Promise<void> => {
    const body = incomeSourcesSchema.parse(req.body);
    const result = await this.service.saveIncomeSources(req.user!.id, body);
    sendSuccess(res, result);
  };

  saveFinanceProfile = async (req: Request, res: Response): Promise<void> => {
    const body = financeProfileSchema.parse(req.body);
    const result = await this.service.saveFinanceProfile(req.user!.id, body);
    sendSuccess(res, result);
  };

  saveIncomeAmount = async (req: Request, res: Response): Promise<void> => {
    const body = incomeAmountSchema.parse(req.body);
    const result = await this.service.saveIncomeAmount(req.user!.id, body);
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

  saveRisk = async (req: Request, res: Response): Promise<void> => {
    const body = riskSchema.parse(req.body);
    const result = await this.service.saveRisk(req.user!.id, body);
    sendSuccess(res, result);
  };

  getStatus = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.getStatus(req.user!.id);
    sendSuccess(res, result);
  };
}
