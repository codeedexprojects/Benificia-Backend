import type { PrismaClient } from "@prisma/client";
import { DashboardRepository } from "./dashboard.repository";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";

export class DashboardContainer {
  readonly dashboardController: DashboardController;

  constructor(prisma: PrismaClient) {
    const repository = new DashboardRepository(prisma);
    const service = new DashboardService(repository);
    this.dashboardController = new DashboardController(service);
  }
}
