import type { PrismaClient } from "@prisma/client";
import type { createClient } from "redis";
import type { S3Client } from "@aws-sdk/client-s3";

type RedisClient = ReturnType<typeof createClient>;
import { KycRepository } from "./kyc.repository";
import { KycService } from "./kyc.service";
import { KycController } from "./kyc.controller";

export class KycContainer {
  readonly kycController: KycController;

  constructor(db: PrismaClient, redis: RedisClient, s3: S3Client) {
    const repository = new KycRepository(db);
    const service = new KycService(repository, redis, s3);
    this.kycController = new KycController(service);
  }
}
