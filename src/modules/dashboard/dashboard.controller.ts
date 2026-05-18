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

  getGoalsTracker = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, {
      available: false,
      message: "Goals tracker is not available in this version.",
    });
  };

  getRiskProfile = async (req: Request, res: Response): Promise<void> => {
    const result = await this.dashboardService.getRiskProfile(req.user!.id);
    sendSuccess(res, result);
  };

  downloadReport = async (req: Request, res: Response): Promise<void> => {
    const pdfBuffer = await this.dashboardService.generatePdfReport(
      req.user!.id,
    );
    const filename = `financial-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.end(pdfBuffer);
  };
}
