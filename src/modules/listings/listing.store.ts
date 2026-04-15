import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export type ListingStatus = "PENDING" | "APPROVED" | "SOLD";

export interface PropertyListingRecord {
  id: string;
  agentId: string;
  price: number;
  location: string;
  propertyType: string | null;
  description: string;
  status: ListingStatus;
  mediaUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ListingModerationActionRecord {
  id: string;
  listingId: string;
  actedById: string;
  action: string;
  notes: string | null;
  createdAt: Date;
}

const toRecord = (listing: {
  id: string;
  agentId: string;
  price: unknown;
  location: string;
  description: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  propertyType: { name: string } | null;
  media: Array<{ mediaUrl: string }>;
}): PropertyListingRecord => ({
  id: listing.id,
  agentId: listing.agentId,
  price: Number(listing.price),
  location: listing.location,
  propertyType: listing.propertyType?.name ?? null,
  description: listing.description,
  status: listing.status as ListingStatus,
  mediaUrls: listing.media.map((item) => item.mediaUrl),
  createdAt: listing.createdAt,
  updatedAt: listing.updatedAt,
});

export const listingStore = {
  async create(input: {
    agentId: string;
    price: number;
    location: string;
    propertyType?: string;
    description: string;
    status?: ListingStatus;
    mediaUrls?: string[];
  }): Promise<PropertyListingRecord> {
    let propertyTypeId: string | undefined;
    if (input.propertyType) {
      const propertyType = await prisma.propertyType.upsert({
        where: { name: input.propertyType },
        update: {},
        create: { name: input.propertyType },
      });
      propertyTypeId = propertyType.id;
    }
    const saved = await prisma.propertyListing.create({
      data: {
        agentId: input.agentId,
        price: input.price,
        location: input.location,
        description: input.description,
        status: input.status ?? "PENDING",
        propertyTypeId,
        media: input.mediaUrls?.length
          ? {
              createMany: {
                data: input.mediaUrls.map((mediaUrl, index) => ({
                  mediaUrl,
                  mediaType: "IMAGE",
                  sortOrder: index,
                })),
              },
            }
          : undefined,
      },
      include: { propertyType: true, media: true },
    });
    return toRecord(saved);
  },

  async updateById(
    id: string,
    input: {
      price?: number;
      location?: string;
      propertyType?: string;
      description?: string;
      status?: ListingStatus;
      mediaUrls?: string[];
    },
  ): Promise<PropertyListingRecord | undefined> {
    const existing = await prisma.propertyListing.findUnique({ where: { id }, include: { propertyType: true, media: true } });
    if (!existing) {
      return undefined;
    }

    if (input.mediaUrls) {
      await prisma.propertyMedia.deleteMany({ where: { listingId: id } });
    }

    let propertyTypeId: string | undefined;
    if (input.propertyType) {
      const propertyType = await prisma.propertyType.upsert({
        where: { name: input.propertyType },
        update: {},
        create: { name: input.propertyType },
      });
      propertyTypeId = propertyType.id;
    }
    const saved = await prisma.propertyListing.update({
      where: { id },
      data: {
        price: input.price,
        location: input.location,
        description: input.description,
        status: input.status,
        propertyTypeId,
        media: input.mediaUrls
          ? {
              createMany: {
                data: input.mediaUrls.map((mediaUrl, index) => ({
                  mediaUrl,
                  mediaType: "IMAGE",
                  sortOrder: index,
                })),
              },
            }
          : undefined,
      },
      include: { propertyType: true, media: true },
    });
    return toRecord(saved);
  },

  async findById(id: string): Promise<PropertyListingRecord | undefined> {
    const listing = await prisma.propertyListing.findUnique({
      where: { id },
      include: { propertyType: true, media: true },
    });
    return listing ? toRecord(listing) : undefined;
  },

  async remove(id: string): Promise<void> {
    await prisma.propertyListing.delete({ where: { id } });
  },

  async list(filters?: {
    agentId?: string;
    status?: ListingStatus;
    locationContains?: string;
    priceMin?: number;
    priceMax?: number;
    propertyType?: string;
  }): Promise<PropertyListingRecord[]> {
    const listings = await prisma.propertyListing.findMany({
      where: {
        agentId: filters?.agentId,
        status: filters?.status,
        location: filters?.locationContains ? { contains: filters.locationContains, mode: "insensitive" } : undefined,
        price: {
          gte: filters?.priceMin,
          lte: filters?.priceMax,
        },
        propertyType: filters?.propertyType
          ? {
              name: { equals: filters.propertyType, mode: "insensitive" },
            }
          : undefined,
      },
      include: { propertyType: true, media: true },
      orderBy: { createdAt: "desc" },
    });
    return listings.map(toRecord);
  },

  async createRevision(input: {
    listingId: string;
    changedById: string;
    changedFields: Record<string, unknown>;
    triggersReview: boolean;
  }): Promise<void> {
    await prisma.listingRevision.create({
      data: {
        listingId: input.listingId,
        changedById: input.changedById,
        changedFields: input.changedFields as Prisma.InputJsonValue,
        triggersReview: input.triggersReview,
      },
    });
  },

  async createModerationAction(input: {
    listingId: string;
    actedById: string;
    action: string;
    notes?: string;
  }): Promise<ListingModerationActionRecord> {
    const record = await prisma.listingModerationAction.create({
      data: {
        listingId: input.listingId,
        actedById: input.actedById,
        action: input.action,
        notes: input.notes,
      },
    });
    return {
      id: record.id,
      listingId: record.listingId,
      actedById: record.actedById,
      action: record.action,
      notes: record.notes,
      createdAt: record.createdAt,
    };
  },

  async listModerationActions(listingId: string): Promise<ListingModerationActionRecord[]> {
    const records = await prisma.listingModerationAction.findMany({
      where: { listingId },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => ({
      id: record.id,
      listingId: record.listingId,
      actedById: record.actedById,
      action: record.action,
      notes: record.notes,
      createdAt: record.createdAt,
    }));
  },
};
