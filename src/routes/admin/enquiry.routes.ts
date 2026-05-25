import { Router } from "express";
import type { EnquiryController } from "../../modules/enquiry/enquiry.controller";

export function adminEnquiryRoutes(controller: EnquiryController): Router {
  const router = Router();
  router.get("/", controller.list);
  router.get("/summary", controller.getSummary);
  router.get("/unread-count", controller.getUnreadCount);
  router.patch("/:id/status", controller.updateStatus);
  return router;
}
