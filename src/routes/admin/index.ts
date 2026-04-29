import { Router } from "express";
import { prisma, redis, ses } from "../../container";
import { AdminContainer } from "../../modules/admin/admin.container";
import { HealthContainer } from "../../modules/health/health.container";
import { authRateLimit } from "../../middleware/rateLimit.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";
import { adminHealthRoutes } from "./health.routes";
import { usersRoutes } from "./users.routes";

const router = Router();
const { adminController } = new AdminContainer(prisma, redis, ses);
const { healthController } = new HealthContainer(prisma);

router.post("/auth/login", authRateLimit, adminController.login);
router.post("/auth/verify-otp", authRateLimit, adminController.verifyOtp);
router.post("/auth/refresh", adminController.refresh);
router.post("/auth/logout", adminController.logout);

// User management
router.use("/users", usersRoutes(adminController));

// Health centres
router.use("/health-centres", adminHealthRoutes(healthController));
router.get("/auth/me", requireAdmin, adminController.getMe);

export default router;
