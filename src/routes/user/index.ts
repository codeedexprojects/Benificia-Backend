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
import { enquiryRoutes } from "./enquiry.routes";
import { expertRequestRoutes } from "./expert-request.routes";
import { EnquiryRepository } from "../../modules/enquiry/enquiry.repository";
import { EnquiryService } from "../../modules/enquiry/enquiry.service";
import { EnquiryController } from "../../modules/enquiry/enquiry.controller";
import { ExpertRequestRepository } from "../../modules/expert-request/expert-request.repository";
import { ExpertRequestService } from "../../modules/expert-request/expert-request.service";
import { ExpertRequestController } from "../../modules/expert-request/expert-request.controller";

const router = Router();
const { userController } = new UserContainer(prisma, redis, ses, s3);
const uploadController = new UploadController(new UploadService(s3));
const { healthController } = new HealthContainer(prisma);
const { dashboardController } = new DashboardContainer(prisma);
const recommendationContainer = new RecommendationContainer(prisma);
const { recommendationController } = recommendationContainer;
const { factFindingController } = new FactFindingContainer(
  prisma,
  recommendationContainer.recommendationService,
);

router.use("/auth", authRoutes(userController));
router.use("/profile", userRoutes(userController));
router.use("/upload", uploadRoutes(uploadController));
router.use("/fact-finding", factFindingRoutes(factFindingController));
router.use("/health-centres", healthRoutes(healthController));
router.use("/dashboard", dashboardRoutes(dashboardController));
router.use("/recommendations", recommendationRoutes(recommendationController));

const enquiryController = new EnquiryController(
  new EnquiryService(new EnquiryRepository(prisma)),
);
router.use("/contact", enquiryRoutes(enquiryController));

const expertRequestController = new ExpertRequestController(
  new ExpertRequestService(new ExpertRequestRepository(prisma)),
);
router.use("/expert-request", expertRequestRoutes(expertRequestController));

export default router;
