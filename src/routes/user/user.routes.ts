import { Router } from "express";
import { requireUser } from "../../middleware/auth.middleware";
import type { UserController } from "../../modules/user/user.controller";

export function userRoutes(controller: UserController): Router {
  const router = Router();

  router.use(requireUser);

  // Step 2 — frontend requests a presigned PUT URL
  router.post("/photo/upload-url", controller.requestPhotoUploadUrl);

  // Step 5 — frontend confirms upload completed; backend saves the key in DB
  router.patch("/photo", controller.confirmPhotoUpload);

  // Step 6 — fetch a short-lived signed GET URL
  router.get("/photo", controller.getPhotoUrl);

  return router;
}
