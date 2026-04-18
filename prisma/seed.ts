import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const main = async (): Promise<void> => {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@marketplace.local" },
    update: { passwordHash, role: UserRole.ADMIN, isVerified: true, isActive: true, deactivatedAt: null },
    create: { email: "admin@marketplace.local", passwordHash, role: UserRole.ADMIN, isVerified: true, isActive: true },
  });

  const agent1 = await prisma.user.upsert({
    where: { email: "agent@marketplace.local" },
    update: { passwordHash, role: UserRole.AGENT, isVerified: true, isActive: true, deactivatedAt: null },
    create: { email: "agent@marketplace.local", passwordHash, role: UserRole.AGENT, isVerified: true, isActive: true },
  });

  const agent2 = await prisma.user.upsert({
    where: { email: "luxury-agent@marketplace.local" },
    update: { passwordHash, role: UserRole.AGENT, isVerified: true, isActive: true, deactivatedAt: null },
    create: { email: "luxury-agent@marketplace.local", passwordHash, role: UserRole.AGENT, isVerified: true, isActive: true },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@marketplace.local" },
    update: { passwordHash, role: UserRole.USER, isVerified: true, isActive: true, deactivatedAt: null },
    create: { email: "user@marketplace.local", passwordHash, role: UserRole.USER, isVerified: true, isActive: true },
  });

  const [houseType, condoType, landType, townType] = await Promise.all([
    prisma.propertyType.upsert({ where: { name: "House" }, update: {}, create: { name: "House" } }),
    prisma.propertyType.upsert({ where: { name: "Condo" }, update: {}, create: { name: "Condo" } }),
    prisma.propertyType.upsert({ where: { name: "Land" }, update: {}, create: { name: "Land" } }),
    prisma.propertyType.upsert({ where: { name: "Townhouse" }, update: {}, create: { name: "Townhouse" } }),
  ]);

  const geoCity = await prisma.geoCategory.upsert({ where: { name: "Metro" }, update: {}, create: { name: "Metro" } });

  // Create 8 realistic listings
  const listingsData = [
    {
      id: "listing-austin-1",
      agentId: agent1.id,
      price: 1250000,
      location: "East Austin",
      zipCode: "78702",
      lat: 30.264,
      lng: -97.718,
      description: "Beautiful modern home located in the heart of East Austin with a sprawling backyard and skyline views.",
      status: "APPROVED" as const,
      propertyTypeId: houseType.id,
      geoCategoryId: geoCity.id,
      mediaUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"
    },
    {
      id: "listing-austin-2",
      agentId: agent2.id,
      price: 850000,
      location: "Zilker Park",
      zipCode: "78704",
      lat: 30.263,
      lng: -97.771,
      description: "Charming bungalow steps away from Zilker Park. Perfect for active lifestyles.",
      status: "APPROVED" as const,
      propertyTypeId: houseType.id,
      geoCategoryId: geoCity.id,
      mediaUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"
    },
    {
      id: "listing-nyc-1",
      agentId: agent2.id,
      price: 3500000,
      location: "Manhattan Central",
      zipCode: "10019",
      lat: 40.764,
      lng: -73.980,
      description: "Luxury high-rise condo offering unparalleled views of Central Park and premium amenities.",
      status: "APPROVED" as const,
      propertyTypeId: condoType.id,
      geoCategoryId: geoCity.id,
      mediaUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"
    },
    {
      id: "listing-la-1",
      agentId: agent1.id,
      price: 4200000,
      location: "Beverly Hills",
      zipCode: "90210",
      lat: 34.073,
      lng: -118.400,
      description: "Gated estate with an iconic pool, perfect for entertaining large parties with total privacy.",
      status: "APPROVED" as const,
      propertyTypeId: houseType.id,
      geoCategoryId: geoCity.id,
      mediaUrl: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80"
    },
    {
      id: "listing-miami-1",
      agentId: agent2.id,
      price: 2150000,
      location: "South Beach",
      zipCode: "33139",
      lat: 25.790,
      lng: -80.130,
      description: "Oceanfront getaway with dual balconies, direct beach access and world-class dining downstairs.",
      status: "APPROVED" as const,
      propertyTypeId: condoType.id,
      geoCategoryId: geoCity.id,
      mediaUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80"
    },
    {
      id: "listing-chicago-1",
      agentId: agent1.id,
      price: 1100000,
      location: "Lincoln Park",
      zipCode: "60614",
      lat: 41.921,
      lng: -87.651,
      description: "Historic greystone townhome beautifully preserved while boasting a fully modern kitchen.",
      status: "APPROVED" as const,
      propertyTypeId: townType.id,
      geoCategoryId: geoCity.id,
      mediaUrl: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80"
    },
    {
      id: "listing-seattle-1",
      agentId: agent1.id,
      price: 1550000,
      location: "Queen Anne",
      zipCode: "98109",
      lat: 47.630,
      lng: -122.360,
      description: "Spacious house offering sweeping views of the Space Needle and the sound. Quiet and extremely desirable neighborhood.",
      status: "APPROVED" as const,
      propertyTypeId: houseType.id,
      geoCategoryId: geoCity.id,
      mediaUrl: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80"
    },
    {
      id: "listing-pending-1",
      agentId: agent2.id,
      price: 500000,
      location: "Rural Acres",
      zipCode: "78620",
      lat: 30.180,
      lng: -98.102,
      description: "10 acres of pristine untouched land waiting for development. (Currently pending administrative approval).",
      status: "PENDING" as const,
      propertyTypeId: landType.id,
      geoCategoryId: geoCity.id,
      mediaUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80"
    }
  ];

  for (const item of listingsData) {
    const listing = await prisma.propertyListing.upsert({
      where: { id: item.id },
      update: {
        agentId: item.agentId,
        price: item.price,
        location: item.location,
        zipCode: item.zipCode,
        lat: item.lat,
        lng: item.lng,
        description: item.description,
        status: item.status,
        propertyTypeId: item.propertyTypeId,
        geoCategoryId: item.geoCategoryId,
      },
      create: {
        id: item.id,
        agentId: item.agentId,
        price: item.price,
        location: item.location,
        zipCode: item.zipCode,
        lat: item.lat,
        lng: item.lng,
        description: item.description,
        status: item.status,
        propertyTypeId: item.propertyTypeId,
        geoCategoryId: item.geoCategoryId,
      },
    });

    await prisma.propertyMedia.deleteMany({ where: { listingId: listing.id } });
    await prisma.propertyMedia.create({
      data: { listingId: listing.id, mediaUrl: item.mediaUrl, mediaType: "IMAGE", sortOrder: 0 },
    });
  }

};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
