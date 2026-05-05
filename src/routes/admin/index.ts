import { Router } from "express";
import { prisma, redis, ses } from "../../container";
import { AdminContainer } from "../../modules/admin/admin.container";
import { HealthContainer } from "../../modules/health/health.container";
import { AiAdminController } from "../../modules/ai-admin/ai-admin.controller";
import { authRateLimit } from "../../middleware/rateLimit.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";
import { adminHealthRoutes } from "./health.routes";
import { usersRoutes } from "./users.routes";
import { aiAdminRoutes } from "./ai.routes";

const router = Router();
const { adminController } = new AdminContainer(prisma, redis, ses);
const { healthController } = new HealthContainer(prisma);
const aiAdminController = new AiAdminController();

router.post("/auth/login", authRateLimit, adminController.login);
router.post("/auth/verify-otp", authRateLimit, adminController.verifyOtp);
router.post("/auth/refresh", adminController.refresh);
router.post("/auth/logout", adminController.logout);

// User management
router.use("/users", usersRoutes(adminController));

// Health centres
router.use("/health-centres", adminHealthRoutes(healthController));
router.get("/auth/me", requireAdmin, adminController.getMe);

// AI server proxy (all routes require admin auth)
router.use("/ai", requireAdmin, aiAdminRoutes(aiAdminController));

export default router;
