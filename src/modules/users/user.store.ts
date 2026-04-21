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
  fullName: string | null;
  contactEmail: string | null;
  phoneNumber: string | null;
  licenseNumber: string | null;
  licenseExpirationDate: Date | null;
}

// We define the parameter to exactly match what Prisma returns
const toRecord = (user: {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  fullName: string | null;
  contactEmail: string | null;
  phoneNumber: string | null;
  licenseNumber: string | null;
  licenseExpirationDate: Date | null;
}): UserRecord => ({
  id: user.id,
  email: user.email,
  passwordHash: user.passwordHash,
  role: user.role as UserRole,
  isVerified: user.isVerified,
  isActive: user.isActive,
  deactivatedAt: user.deactivatedAt,
  createdAt: user.createdAt,
  fullName: user.fullName,
  contactEmail: user.contactEmail,
  phoneNumber: user.phoneNumber,
  licenseNumber: user.licenseNumber,
  licenseExpirationDate: user.licenseExpirationDate,
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
        fullName: user.fullName,
        contactEmail: user.contactEmail,
        phoneNumber: user.phoneNumber,
        licenseNumber: user.licenseNumber,
        licenseExpirationDate: user.licenseExpirationDate,
      },
      update: {
        email: user.email.toLowerCase(),
        passwordHash: user.passwordHash,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        deactivatedAt: user.deactivatedAt,
        fullName: user.fullName,
        contactEmail: user.contactEmail,
        phoneNumber: user.phoneNumber,
        licenseNumber: user.licenseNumber,
        licenseExpirationDate: user.licenseExpirationDate,
      },
    });
    return toRecord(saved);
  },

  async list(): Promise<UserRecord[]> {
    const users = await prisma.user.findMany();
    return users.map(toRecord);
  },
};