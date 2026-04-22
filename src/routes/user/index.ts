import { Router } from "express";
import { prisma, redis, ses, s3 } from "../../container";
import { UserContainer } from "../../modules/user/user.container";
import { UploadService } from "../../modules/upload/upload.service";
import { UploadController } from "../../modules/upload/upload.controller";
import { KycContainer } from "../../modules/kyc/kyc.container";
import { authRoutes } from "./auth.routes";
import { userRoutes } from "./user.routes";
import { uploadRoutes } from "./upload.routes";
import { kycRoutes } from "./kyc.routes";

const router = Router();
const { userController } = new UserContainer(prisma, redis, ses, s3);
const uploadController = new UploadController(new UploadService(s3));
const { kycController } = new KycContainer(prisma, redis, s3);

router.use("/auth", authRoutes(userController));
router.use("/profile", userRoutes(userController));
router.use("/upload", uploadRoutes(uploadController));
router.use("/kyc", kycRoutes(kycController));

export default router;
