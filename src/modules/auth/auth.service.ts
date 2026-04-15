import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { HttpError } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import type { UserRole } from "../../types/auth";
import { userStore, type UserRecord } from "../users/user.store";
import type { LoginInput, RegisterInput, SsoInput } from "./auth.schemas";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
}

export class AuthService {
  constructor(
    private readonly jwtSecret: string,
    private readonly jwtRefreshSecret: string,
  ) {}

  async register(input: RegisterInput): Promise<{ user: AuthenticatedUser; tokens: TokenPair }> {
    const existing = await userStore.findByEmail(input.email);
    if (existing) {
      throw new HttpError(409, "An account already exists with this email.");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user: UserRecord = await userStore.upsert({
      id: crypto.randomUUID(),
      email: input.email,
      passwordHash,
      role: input.role,
      isVerified: input.role === "USER",
      isActive: true,
      deactivatedAt: null,
      createdAt: new Date(),
    });

    return {
      user: this.mapUser(user),
      tokens: await this.issueTokens(user),
    };
  }

  async login(input: LoginInput): Promise<{ user: AuthenticatedUser; tokens: TokenPair }> {
    const user = await userStore.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw new HttpError(401, "Invalid credentials.");
    }

    const matched = await bcrypt.compare(input.password, user.passwordHash);
    if (!matched) {
      throw new HttpError(401, "Invalid credentials.");
    }

    return { user: this.mapUser(user), tokens: await this.issueTokens(user) };
  }

  async ssoLogin(input: SsoInput): Promise<{ user: AuthenticatedUser; tokens: TokenPair }> {
    if (input.providerToken.length < 10) {
      throw new HttpError(401, "Invalid SSO provider token.");
    }

    let user = await userStore.findByEmail(input.email);
    if (!user) {
      user = await userStore.upsert({
        id: crypto.randomUUID(),
        email: input.email,
        passwordHash: "SSO_AUTH",
        role: "USER",
        isVerified: true,
        isActive: true,
        deactivatedAt: null,
        createdAt: new Date(),
      });
    }

    return { user: this.mapUser(user), tokens: await this.issueTokens(user) };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as { sub: string };
      const refreshRecord = await prisma.passwordResetToken.findFirst({
        where: {
          tokenHash: refreshToken,
          userId: decoded.sub,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!refreshRecord) {
        throw new HttpError(401, "Invalid refresh token.");
      }

      const user = await userStore.findById(decoded.sub);
      if (!user || !user.isActive) {
        throw new HttpError(401, "Invalid refresh token.");
      }

      await prisma.passwordResetToken.update({
        where: { id: refreshRecord.id },
        data: { usedAt: new Date() },
      });

      return await this.issueTokens(user);
    } catch (error: unknown) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(401, "Invalid refresh token.");
    }
  }

  private mapUser(user: UserRecord): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    };
  }

  private async issueTokens(user: UserRecord): Promise<TokenPair> {
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      this.jwtSecret,
      { expiresIn: "15m" },
    );

    const refreshToken = jwt.sign({ sub: user.id }, this.jwtRefreshSecret, {
      expiresIn: "7d",
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken };
  }
}
