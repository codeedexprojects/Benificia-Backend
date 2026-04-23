import type { PrismaClient } from "@prisma/client";
import { FactFindingRepository } from "./fact-finding.repository";
import { FactFindingService } from "./fact-finding.service";
import { FactFindingController } from "./fact-finding.controller";

export class FactFindingContainer {
  readonly factFindingController: FactFindingController;

  constructor(db: PrismaClient) {
    const repository = new FactFindingRepository(db);
    const service = new FactFindingService(repository);
    this.factFindingController = new FactFindingController(service);
  }
}
