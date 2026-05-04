import type { PrismaClient } from "@prisma/client";
import { RecommendationRepository } from "./recommendation.repository";
import { RecommendationService } from "./recommendation.service";
import { RecommendationController } from "./recommendation.controller";

export class RecommendationContainer {
  readonly recommendationController: RecommendationController;

  constructor(prisma: PrismaClient) {
    const repository = new RecommendationRepository(prisma);
    const service = new RecommendationService(repository);
    this.recommendationController = new RecommendationController(service);
  }
}
