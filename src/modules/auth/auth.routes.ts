import { Router } from "express";
import { validateBody } from "../../lib/http";
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  ssoSchema,
} from "./auth.schemas";
import type { AuthController } from "./auth.controller";

export const createAuthRouter = (controller: AuthController): Router => {
  const router = Router();

  router.post("/register", validateBody(registerSchema), controller.register);
  router.post("/login", validateBody(loginSchema), controller.login);
  router.post("/refresh", validateBody(refreshTokenSchema), controller.refresh);
  router.post("/sso/google", validateBody(ssoSchema), controller.googleSso);
  router.post("/sso/apple", validateBody(ssoSchema), controller.appleSso);

  return router;
};
