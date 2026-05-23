import type { Request, Response } from "express";
import type { RecommendationService } from "./recommendation.service";
import { sendSuccess } from "../../utils/response";
import { z } from "zod";
import { BadRequestError } from "../../utils/errors";

const expressInterestSchema = z.object({
  planId: z.string().min(1),
  planName: z.string().min(1),
  category: z.string().optional(),
  coverageAmount: z.number().nullable().optional(),
  reasoning: z.string().optional(),
  matchTags: z.array(z.string()).optional(),
  planSnapshot: z.record(z.string(), z.unknown()).optional(),
});

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

  expressInterest = async (req: Request, res: Response): Promise<void> => {
    const parsed = expressInterestSchema.safeParse(req.body);
    if (!parsed.success)
      throw new BadRequestError("planId and planName are required");
    const {
      planId,
      planName,
      category,
      coverageAmount,
      reasoning,
      matchTags,
      planSnapshot,
    } = parsed.data;
    const result = await this.recommendationService.expressInterest(
      req.user!.id,
      planId,
      {
        name: planName,
        category,
        coverageAmount,
        reasoning,
        matchTags,
        planSnapshot,
      },
    );
    sendSuccess(res, result, 201);
  };
}
