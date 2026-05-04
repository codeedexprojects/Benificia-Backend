import type { Request, Response } from "express";
import type { RecommendationService } from "./recommendation.service";
import { sendSuccess } from "../../utils/response";

export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  generate = async (req: Request, res: Response): Promise<void> => {
    const result = await this.recommendationService.generate(req.user!.id);
    sendSuccess(res, result, 201);
  };

  getLatest = async (req: Request, res: Response): Promise<void> => {
    const result = await this.recommendationService.getLatest(req.user!.id);
    sendSuccess(res, result);
  };
}
