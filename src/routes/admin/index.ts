import { Router } from "express";
import { prisma, redis, ses } from "../../container";
import { AdminContainer } from "../../modules/admin/admin.container";
import { authRateLimit } from "../../middleware/rateLimit.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";

const router = Router();
const { adminController } = new AdminContainer(prisma, redis, ses);

router.post("/auth/login", authRateLimit, adminController.login);
router.post("/auth/verify-otp", authRateLimit, adminController.verifyOtp);
router.post("/auth/refresh", adminController.refresh);
router.post("/auth/logout", adminController.logout);
router.get("/auth/me", requireAdmin, adminController.getMe);

export default router;
