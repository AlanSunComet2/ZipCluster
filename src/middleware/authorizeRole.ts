import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest, UserRole } from "./auth.types";

export const authorizeRole =
  (allowedRoles: UserRole[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized: token required." });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: "Forbidden: insufficient role permissions." });
      return;
    }

    next();
  };
