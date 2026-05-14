import type { PrismaClient } from "@prisma/client";
import { RecommendationRepository } from "./recommendation.repository";
import { RecommendationService } from "./recommendation.service";
import { RecommendationController } from "./recommendation.controller";

export class RecommendationContainer {
  readonly recommendationService: RecommendationService;
  readonly recommendationController: RecommendationController;

  constructor(prisma: PrismaClient) {
    const repository = new RecommendationRepository(prisma);
    this.recommendationService = new RecommendationService(repository);
    this.recommendationController = new RecommendationController(
      this.recommendationService,
    );
  }
}
