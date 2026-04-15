import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const main = async (): Promise<void> => {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@marketplace.local" },
    update: { passwordHash, role: UserRole.ADMIN, isVerified: true, isActive: true, deactivatedAt: null },
    create: {
      email: "admin@marketplace.local",
      passwordHash,
      role: UserRole.ADMIN,
      isVerified: true,
      isActive: true,
    },
  });

  const approvedAgent = await prisma.user.upsert({
    where: { email: "agent@marketplace.local" },
    update: { passwordHash, role: UserRole.AGENT, isVerified: true, isActive: true, deactivatedAt: null },
    create: {
      email: "agent@marketplace.local",
      passwordHash,
      role: UserRole.AGENT,
      isVerified: true,
      isActive: true,
    },
  });

  const pendingAgent = await prisma.user.upsert({
    where: { email: "pending-agent@marketplace.local" },
    update: { passwordHash, role: UserRole.AGENT, isVerified: false, isActive: true, deactivatedAt: null },
    create: {
      email: "pending-agent@marketplace.local",
      passwordHash,
      role: UserRole.AGENT,
      isVerified: false,
      isActive: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@marketplace.local" },
    update: { passwordHash, role: UserRole.USER, isVerified: true, isActive: true, deactivatedAt: null },
    create: {
      email: "user@marketplace.local",
      passwordHash,
      role: UserRole.USER,
      isVerified: true,
      isActive: true,
    },
  });

  const [houseType, condoType, cityGeo] = await Promise.all([
    prisma.propertyType.upsert({
      where: { name: "House" },
      update: {},
      create: { name: "House" },
    }),
    prisma.propertyType.upsert({
      where: { name: "Condo" },
      update: {},
      create: { name: "Condo" },
    }),
    prisma.geoCategory.upsert({
      where: { name: "Metro" },
      update: {},
      create: { name: "Metro" },
    }),
  ]);

  const approvedListing = await prisma.propertyListing.upsert({
    where: { id: "seed-approved-listing" },
    update: {
      agentId: approvedAgent.id,
      price: 425000,
      location: "Downtown",
      description: "Modern two-bedroom unit near transit and schools.",
      status: "APPROVED",
      propertyTypeId: condoType.id,
      geoCategoryId: cityGeo.id,
    },
    create: {
      id: "seed-approved-listing",
      agentId: approvedAgent.id,
      price: 425000,
      location: "Downtown",
      description: "Modern two-bedroom unit near transit and schools.",
      status: "APPROVED",
      propertyTypeId: condoType.id,
      geoCategoryId: cityGeo.id,
    },
  });

  const pendingListing = await prisma.propertyListing.upsert({
    where: { id: "seed-pending-listing" },
    update: {
      agentId: approvedAgent.id,
      price: 689000,
      location: "Riverside",
      description: "Detached family home pending moderation review.",
      status: "PENDING",
      propertyTypeId: houseType.id,
      geoCategoryId: cityGeo.id,
    },
    create: {
      id: "seed-pending-listing",
      agentId: approvedAgent.id,
      price: 689000,
      location: "Riverside",
      description: "Detached family home pending moderation review.",
      status: "PENDING",
      propertyTypeId: houseType.id,
      geoCategoryId: cityGeo.id,
    },
  });

  await prisma.propertyMedia.deleteMany({
    where: { listingId: { in: [approvedListing.id, pendingListing.id] } },
  });
  await prisma.propertyMedia.createMany({
    data: [
      {
        listingId: approvedListing.id,
        mediaUrl: "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg",
        mediaType: "IMAGE",
        sortOrder: 0,
      },
      {
        listingId: pendingListing.id,
        mediaUrl: "https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg",
        mediaType: "IMAGE",
        sortOrder: 0,
      },
    ],
  });

  await prisma.agentApplication.upsert({
    where: { id: "seed-pending-application" },
    update: {
      applicantId: pendingAgent.id,
      status: "PENDING",
      notes: "Awaiting manual verification",
    },
    create: {
      id: "seed-pending-application",
      applicantId: pendingAgent.id,
      status: "PENDING",
      notes: "Awaiting manual verification",
    },
  });

  await prisma.licenseDocument.deleteMany({ where: { applicationId: "seed-pending-application" } });
  await prisma.licenseDocument.create({
    data: {
      applicationId: "seed-pending-application",
      fileUrl: "https://example.com/license-docs/pending-agent-license.pdf",
      mimeType: "application/pdf",
    },
  });

  await prisma.inquiry.upsert({
    where: { id: "seed-inquiry-1" },
    update: {
      listingId: approvedListing.id,
      buyerId: user.id,
      message: "Is this property still available this month?",
    },
    create: {
      id: "seed-inquiry-1",
      listingId: approvedListing.id,
      buyerId: user.id,
      message: "Is this property still available this month?",
    },
  });

  await prisma.tourRequest.upsert({
    where: { id: "seed-tour-1" },
    update: {
      listingId: approvedListing.id,
      buyerId: user.id,
      preferredTime: new Date("2026-04-20T14:00:00.000Z"),
      status: "REQUESTED",
    },
    create: {
      id: "seed-tour-1",
      listingId: approvedListing.id,
      buyerId: user.id,
      preferredTime: new Date("2026-04-20T14:00:00.000Z"),
      status: "REQUESTED",
    },
  });

  await prisma.favorite.upsert({
    where: { userId_listingId: { userId: user.id, listingId: approvedListing.id } },
    update: {},
    create: { userId: user.id, listingId: approvedListing.id },
  });

  await prisma.notificationSubscription.upsert({
    where: { userId_listingId: { userId: user.id, listingId: approvedListing.id } },
    update: { onPriceDrop: true, onStatusChange: true },
    create: { userId: user.id, listingId: approvedListing.id, onPriceDrop: true, onStatusChange: true },
  });

  await prisma.notificationEvent.create({
    data: {
      listingId: approvedListing.id,
      createdById: admin.id,
      eventType: "PRICE_DROP",
      payload: { from: 450000, to: 425000 },
    },
  });
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
