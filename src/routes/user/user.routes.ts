import { Router } from "express";
import { requireUser } from "../../middleware/auth.middleware";
import type { UserController } from "../../modules/user/user.controller";

export function userRoutes(controller: UserController): Router {
  const router = Router();

  router.use(requireUser);

  // App routing state — call on every app open after login
  router.get("/app-state", controller.getAppState);

  // Profile
  router.get("/me", controller.getProfile);
  router.patch("/personal", controller.updatePersonalDetails);
  router.patch("/name", controller.updateName);

  // Profile photo
  router.post("/photo/upload-url", controller.requestPhotoUploadUrl);
  router.patch("/photo", controller.confirmPhotoUpload);
  router.get("/photo", controller.getPhotoUrl);

  return router;
}
