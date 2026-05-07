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

  // Screen: Finance 1 — Income Sources
  saveIncomeSources = async (req: Request, res: Response): Promise<void> => {
    const body = incomeSourcesSchema.parse(req.body);
    const result = await this.service.saveIncomeSources(req.user!.id, body);
    sendSuccess(res, result);
  };

  // Screen: Finance 2 — Dependents, Liabilities, Insurance
  saveFinanceProfile = async (req: Request, res: Response): Promise<void> => {
    const body = financeProfileSchema.parse(req.body);
    const result = await this.service.saveFinanceProfile(req.user!.id, body);
    sendSuccess(res, result);
  };

  // Screen: Finance 3 — Income Amount
  saveIncomeAmount = async (req: Request, res: Response): Promise<void> => {
    const body = incomeAmountSchema.parse(req.body);
    const result = await this.service.saveIncomeAmount(req.user!.id, body);
    sendSuccess(res, result);
  };

  // Screen: Finance 4 — Monthly Expenses
  saveExpenses = async (req: Request, res: Response): Promise<void> => {
    const body = expensesSchema.parse(req.body);
    const result = await this.service.saveExpenses(req.user!.id, body);
    sendSuccess(res, result);
  };

  // Screen: Finance 5 — Assets
  saveAssets = async (req: Request, res: Response): Promise<void> => {
    const body = assetsSchema.parse(req.body);
    const result = await this.service.saveAssets(req.user!.id, body);
    sendSuccess(res, result);
  };

  // Screen: Risk
  saveRisk = async (req: Request, res: Response): Promise<void> => {
    const body = riskSchema.parse(req.body);
    const result = await this.service.saveRisk(req.user!.id, body);
    sendSuccess(res, result);
  };

  // GET — returns current stage + all saved answers for pre-fill
  getStatus = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.getStatus(req.user!.id);
    sendSuccess(res, result);
  };
}
