import type { UserRole } from "../../types/auth";
import { prisma } from "../../lib/prisma";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  deactivatedAt: Date | null;
  createdAt: Date;
}

const toRecord = (user: {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  deactivatedAt: Date | null;
  createdAt: Date;
}): UserRecord => ({
  id: user.id,
  email: user.email,
  passwordHash: user.passwordHash,
  role: user.role as UserRole,
  isVerified: user.isVerified,
  isActive: user.isActive,
  deactivatedAt: user.deactivatedAt,
  createdAt: user.createdAt,
});

export const userStore = {
  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return user ? toRecord(user) : undefined;
  },

  async findById(id: string): Promise<UserRecord | undefined> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? toRecord(user) : undefined;
  },

  async upsert(user: UserRecord): Promise<UserRecord> {
    const saved = await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email.toLowerCase(),
        passwordHash: user.passwordHash,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        deactivatedAt: user.deactivatedAt,
      },
      update: {
        email: user.email.toLowerCase(),
        passwordHash: user.passwordHash,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        deactivatedAt: user.deactivatedAt,
      },
    });
    return toRecord(saved);
  },

  async list(): Promise<UserRecord[]> {
    const users = await prisma.user.findMany();
    return users.map(toRecord);
  },
};
