import { Router } from "express";
import type { Request, Response } from "express";
import { prisma, redis } from "../../container";
import { AdminContainer } from "../../modules/admin/admin.container";
import { HealthContainer } from "../../modules/health/health.container";
import { AiAdminController } from "../../modules/ai-admin/ai-admin.controller";
import { authRateLimit } from "../../middleware/rateLimit.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";
import { generateCsrfToken } from "../../middleware/csrf.middleware";
import { adminHealthRoutes } from "./health.routes";
import { usersRoutes } from "./users.routes";
import { aiAdminRoutes } from "./ai.routes";
import { adminEnquiryRoutes } from "./enquiry.routes";
import { EnquiryRepository } from "../../modules/enquiry/enquiry.repository";
import { EnquiryService } from "../../modules/enquiry/enquiry.service";
import { EnquiryController } from "../../modules/enquiry/enquiry.controller";
import { adminExpertRequestRoutes } from "./expert-request.routes";
import { ExpertRequestRepository } from "../../modules/expert-request/expert-request.repository";
import { ExpertRequestService } from "../../modules/expert-request/expert-request.service";
import { ExpertRequestController } from "../../modules/expert-request/expert-request.controller";

const router = Router();
const { adminController } = new AdminContainer(prisma, redis);
const { healthController } = new HealthContainer(prisma);
const aiAdminController = new AiAdminController();
const enquiryController = new EnquiryController(
  new EnquiryService(new EnquiryRepository(prisma)),
);
const expertRequestController = new ExpertRequestController(
  new ExpertRequestService(new ExpertRequestRepository(prisma)),
);

router.get("/auth/csrf-token", (req: Request, res: Response) => {
  const token = generateCsrfToken(req, res);
  res.json({ success: true, data: { token } });
});

router.post("/auth/login", authRateLimit, adminController.login);
router.post("/auth/verify-otp", authRateLimit, adminController.verifyOtp);
router.post("/auth/refresh", adminController.refresh);
router.post("/auth/logout", adminController.logout);

// Dashboard stats
router.get("/dashboard/stats", requireAdmin, adminController.getDashboardStats);

// User management
router.use("/users", usersRoutes(adminController));

// Health centres
router.use("/health-centres", adminHealthRoutes(healthController));

router.get("/auth/me", requireAdmin, adminController.getMe);

// Enquiries
router.use("/enquiries", requireAdmin, adminEnquiryRoutes(enquiryController));
router.use(
  "/expert-requests",
  requireAdmin,
  adminExpertRequestRoutes(expertRequestController),
);

// AI server proxy (all routes require admin auth)
router.use("/ai", requireAdmin, aiAdminRoutes(aiAdminController));

export default router;
