import type { Request, Response } from "express";
import type { DashboardService } from "./dashboard.service";
import { sendSuccess } from "../../utils/response";

export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  getOverview = async (req: Request, res: Response): Promise<void> => {
    const result = await this.dashboardService.getOverview(req.user!.id);
    sendSuccess(res, result);
  };

  getCashFlow = async (req: Request, res: Response): Promise<void> => {
    const result = await this.dashboardService.getCashFlow(req.user!.id);
    sendSuccess(res, result);
  };

  getAssetsChart = async (req: Request, res: Response): Promise<void> => {
    const result = await this.dashboardService.getAssetsChart(req.user!.id);
    sendSuccess(res, result);
  };

  getInsuranceCoverage = async (req: Request, res: Response): Promise<void> => {
    const result = await this.dashboardService.getInsuranceCoverage(
      req.user!.id,
    );
    sendSuccess(res, result);
  };

  getGoalsTracker = async (req: Request, res: Response): Promise<void> => {
    const result = await this.dashboardService.getGoalsTracker(req.user!.id);
    sendSuccess(res, result);
  };

  getRiskProfile = async (req: Request, res: Response): Promise<void> => {
    const result = await this.dashboardService.getRiskProfile(req.user!.id);
    sendSuccess(res, result);
  };
}
