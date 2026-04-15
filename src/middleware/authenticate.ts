import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthenticatedRequest, DecodedTokenPayload } from "./auth.types";

const getBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const authenticate =
  (jwtSecret: string) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ message: "Missing or invalid Authorization header." });
      return;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as DecodedTokenPayload;
      req.user = decoded;
      next();
    } catch (_error: unknown) {
      res.status(401).json({ message: "Invalid or expired token." });
    }
  };
