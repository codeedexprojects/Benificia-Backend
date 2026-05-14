import type { PrismaClient } from "@prisma/client";
import { FactFindingRepository } from "./fact-finding.repository";
import { FactFindingService } from "./fact-finding.service";
import { FactFindingController } from "./fact-finding.controller";
import type { RecommendationService } from "../recommendation/recommendation.service";

export class FactFindingContainer {
  readonly factFindingController: FactFindingController;

  constructor(db: PrismaClient, recommendationService: RecommendationService) {
    const repository = new FactFindingRepository(db);
    const service = new FactFindingService(repository, recommendationService);
    this.factFindingController = new FactFindingController(service);
  }
}
