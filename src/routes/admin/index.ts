import { Router } from "express";
import { prisma, redis, ses } from "../../container";
import { AdminContainer } from "../../modules/admin/admin.container";
import { authRateLimit } from "../../middleware/rateLimit.middleware";

const router = Router();
const { adminController } = new AdminContainer(prisma, redis, ses);

// Auth — rate limited, no requireAdmin guard (these are the login endpoints)
router.post("/auth/login", authRateLimit, adminController.login);
router.post("/auth/verify-otp", authRateLimit, adminController.verifyOtp);
router.post("/auth/refresh", adminController.refresh);
router.post("/auth/logout", adminController.logout);

export default router;
