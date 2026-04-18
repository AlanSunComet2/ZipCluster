import type { Request } from "express";

export type UserRole = "ADMIN" | "AGENT" | "USER";

export interface DecodedTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: DecodedTokenPayload;
}
