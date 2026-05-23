import { Router } from "express";
import type { EnquiryController } from "../../modules/enquiry/enquiry.controller";

export function enquiryRoutes(controller: EnquiryController): Router {
  const router = Router();
  router.post("/", controller.submit);
  return router;
}
