import { Router } from "express";
import { requireUser } from "../../middleware/auth.middleware";
import type { UserController } from "../../modules/user/user.controller";

export function userRoutes(controller: UserController): Router {
  const router = Router();

  router.use(requireUser);

  // Profile
  router.get("/me", controller.getProfile);
  router.patch("/personal", controller.updatePersonalDetails);

  // Profile photo
  router.post("/photo/upload-url", controller.requestPhotoUploadUrl);
  router.patch("/photo", controller.confirmPhotoUpload);
  router.get("/photo", controller.getPhotoUrl);

  return router;
}
