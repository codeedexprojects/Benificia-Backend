import { Router } from "express";
import { requireAdmin, requireRole } from "../../middleware/admin.middleware";
import type { AdminController } from "../../modules/admin/admin.controller";

export function usersRoutes(controller: AdminController): Router {
  const router = Router();

  router.use(requireAdmin);

  router.get("/", controller.listUsers);
  router.get("/:id", controller.getUserDetail);
  router.patch(
    "/:id/block",
    requireRole("super_admin", "product_admin"),
    controller.blockUser,
  );
  router.patch(
    "/:id/unblock",
    requireRole("super_admin", "product_admin"),
    controller.unblockUser,
  );
  router.patch("/:id/contact", controller.updateContact);

  return router;
}
