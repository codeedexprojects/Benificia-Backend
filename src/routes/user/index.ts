import { Router } from "express";
import { prisma, redis, ses, s3 } from "../../container";
import { UserContainer } from "../../modules/user/user.container";
import { UploadService } from "../../modules/upload/upload.service";
import { UploadController } from "../../modules/upload/upload.controller";
import { FactFindingContainer } from "../../modules/fact-finding/fact-finding.container";
import { HealthContainer } from "../../modules/health/health.container";
import { DashboardContainer } from "../../modules/dashboard/dashboard.container";
import { RecommendationContainer } from "../../modules/recommendation/recommendation.container";
import { authRoutes } from "./auth.routes";
import { userRoutes } from "./user.routes";
import { uploadRoutes } from "./upload.routes";
import { factFindingRoutes } from "./fact-finding.routes";
import { healthRoutes } from "./health.routes";
import { dashboardRoutes } from "./dashboard.routes";
import { recommendationRoutes } from "./recommendation.routes";

const router = Router();
const { userController } = new UserContainer(prisma, redis, ses, s3);
const uploadController = new UploadController(new UploadService(s3));
const { factFindingController } = new FactFindingContainer(prisma);
const { healthController } = new HealthContainer(prisma);
const { dashboardController } = new DashboardContainer(prisma);
const { recommendationController } = new RecommendationContainer(prisma);

router.use("/auth", authRoutes(userController));
router.use("/profile", userRoutes(userController));
router.use("/upload", uploadRoutes(uploadController));
router.use("/fact-finding", factFindingRoutes(factFindingController));
router.use("/health-centres", healthRoutes(healthController));
router.use("/dashboard", dashboardRoutes(dashboardController));
router.use("/recommendations", recommendationRoutes(recommendationController));

export default router;
