import type { PrismaClient } from "@prisma/client";
import type { SESClient } from "@aws-sdk/client-ses";
import type { createClient } from "redis";
import { AdminRepository } from "./admin.repository";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";

type RedisClient = ReturnType<typeof createClient>;

export class AdminContainer {
  public readonly adminRepository: AdminRepository;
  public readonly adminService: AdminService;
  public readonly adminController: AdminController;

  constructor(prisma: PrismaClient, redis: RedisClient, ses: SESClient) {
    this.adminRepository = new AdminRepository(prisma);
    this.adminService = new AdminService(this.adminRepository, redis, ses);
    this.adminController = new AdminController(this.adminService);
  }
}
