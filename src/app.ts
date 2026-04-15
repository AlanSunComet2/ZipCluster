import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler } from "./lib/http";
import { authenticate } from "./middleware/authenticate";
import { createAdminRouter } from "./modules/admin/admin.routes";
import { AuthController } from "./modules/auth/auth.controller";
import { createAuthRouter } from "./modules/auth/auth.routes";
import { AuthService } from "./modules/auth/auth.service";
import { createAgentRouter } from "./modules/agents/agent.routes";
import { createPublicListingRouter } from "./modules/listings/public.routes";
import { createUserRouter } from "./modules/users/user.routes";

const authService = new AuthService(env.jwtSecret, env.jwtRefreshSecret);
const authController = new AuthController(authService);

export const createApp = (): express.Express => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
  app.use(express.json({ limit: "3mb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/", (_req, res) => {
    res.status(200).json({
      name: "wireframes-api",
      status: "ok",
      docs: "/docs/openapi.yaml",
      health: "/health",
    });
  });

  app.use("/auth", createAuthRouter(authController));
  app.use("/listings", createPublicListingRouter());
  app.use("/admin", authenticate(env.jwtSecret), createAdminRouter());
  app.use("/agents", authenticate(env.jwtSecret), createAgentRouter());
  app.use("/users", authenticate(env.jwtSecret), createUserRouter());

  app.use((req, res) => {
    res.status(404).json({
      message: "Route not found.",
      path: req.path,
    });
  });

  app.use(errorHandler);
  return app;
};
