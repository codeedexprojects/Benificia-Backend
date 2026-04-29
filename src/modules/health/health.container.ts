import type { PrismaClient } from "@prisma/client";
import { HealthRepository } from "./health.repository";
import { HealthService } from "./health.service";
import { HealthController } from "./health.controller";

export class HealthContainer {
  readonly healthController: HealthController;

  constructor(prisma: PrismaClient) {
    const repository = new HealthRepository(prisma);
    const service = new HealthService(repository);
    this.healthController = new HealthController(service);
  }
}
