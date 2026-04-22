import { Router } from "express";
import { requireUser } from "../../middleware/auth.middleware";
import type { UploadController } from "../../modules/upload/upload.controller";

export function uploadRoutes(controller: UploadController): Router {
  const router = Router();

  router.use(requireUser);

  router.post("/url", controller.requestUploadUrl);
  router.get("/url", controller.getDownloadUrl);
  router.delete("/url", controller.deleteFile);

  return router;
}
