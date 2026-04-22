import type { PrismaClient } from "@prisma/client";
import type { SESClient } from "@aws-sdk/client-ses";
import type { S3Client } from "@aws-sdk/client-s3";
import type { createClient } from "redis";
import { UserRepository } from "./user.repository";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";

type RedisClient = ReturnType<typeof createClient>;

export class UserContainer {
  public readonly userRepository: UserRepository;
  public readonly userService: UserService;
  public readonly userController: UserController;

  constructor(
    prisma: PrismaClient,
    redis: RedisClient,
    ses: SESClient,
    s3: S3Client,
  ) {
    this.userRepository = new UserRepository(prisma);
    this.userService = new UserService(this.userRepository, redis, ses, s3);
    this.userController = new UserController(this.userService);
  }
}
