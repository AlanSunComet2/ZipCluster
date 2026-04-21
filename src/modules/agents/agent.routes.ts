import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../../lib/http";
import { authorizeRole } from "../../middleware/authorizeRole";
import type { AuthenticatedRequest } from "../../types/auth";
import { engagementStore } from "../listings/engagement.store";
import { listingStore, type ListingStatus } from "../listings/listing.store";
import { userStore } from "../users/user.store";
import { prisma } from "../../lib/prisma";

const asParam = (value: string | string[] | undefined): string => {
  if (!value) {
    return "";
  }
  return Array.isArray(value) ? value[0] : value;
};

const majorEditDetected = (payload: {
  price?: number;
  location?: string;
  description?: string;
  mediaUrls?: string[];
}): boolean => {
  return Boolean(payload.price || payload.location || payload.description || payload.mediaUrls?.length);
};

const listingCreateSchema = z.object({
  price: z.number().positive(),
  location: z.string().min(2),
  propertyType: z.string().min(2).optional(),
  description: z.string().min(10),
  mediaUrls: z.array(z.string().url()).optional(),
});

const listingUpdateSchema = z.object({
  price: z.number().positive().optional(),
  location: z.string().min(2).optional(),
  propertyType: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  status: z.enum(["PENDING", "APPROVED", "SOLD"]).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
});

const addMediaSchema = z.object({
  mediaUrl: z.string().url(),
});

const inquiryResponseSchema = z.object({
  message: z.string().min(1),
});
const agentApplicationSchema = z.object({
  notes: z.string().max(500).optional(),
  licenseDocuments: z.array(
    z.object({
      fileUrl: z.string().url(),
      mimeType: z.string().min(3),
    }),
  ).min(1),
});

const inquiryStatusSchema = z.object({
  status: z.enum(["ANSWERED", "RESOLVED"]),
});

const tourStatusSchema = z.object({
  status: z.enum(["REQUESTED", "CONFIRMED", "DECLINED"]),
});

export const createAgentRouter = (): Router => {
  const router = Router();
  router.use(authorizeRole(["AGENT"]));

  router.get("/verification-status", async (req: AuthenticatedRequest, res) => {
    const user = await userStore.findById(req.user?.sub ?? "");
    if (!user) {
      res.status(404).json({ message: "Agent not found." });
      return;
    }
    const latestApplication = await prisma.agentApplication.findFirst({
      where: { applicantId: user.id },
      orderBy: { createdAt: "desc" },
      include: { licenseDocs: true },
    });
    res.status(200).json({
      status: user.isVerified ? "approved" : "pending",
      isActive: user.isActive,
      applicationStatus: latestApplication?.status ?? "PENDING",
      latestApplication,
    });
  });

  router.post("/me/application", validateBody(agentApplicationSchema), async (req: AuthenticatedRequest, res) => {
    const user = await userStore.findById(req.user?.sub ?? "");
    if (!user || user.role !== "AGENT") {
      res.status(404).json({ message: "Agent not found." });
      return;
    }
    const application = await prisma.agentApplication.create({
      data: {
        applicantId: user.id,
        status: "PENDING",
        notes: req.body.notes,
        licenseDocs: {
          createMany: {
            data: req.body.licenseDocuments,
          },
        },
      },
      include: { licenseDocs: true },
    });
    await userStore.upsert({ ...user, isVerified: false, deactivatedAt: null });
    res.status(201).json(application);
  });

  router.get("/me/listings", async (req: AuthenticatedRequest, res) => {
    const user = await userStore.findById(req.user?.sub ?? "");
    if (!user || !user.isActive || !user.isVerified) {
      res.status(403).json({ message: "Agent account is not verified or active." });
      return;
    }
    const items = await listingStore.list({ agentId: req.user?.sub });
    res.status(200).json({ items });
  });

  router.post("/me/listings", validateBody(listingCreateSchema), async (req: AuthenticatedRequest, res) => {
    const user = await userStore.findById(req.user?.sub ?? "");
    if (!user || !user.isActive || !user.isVerified) {
      res.status(403).json({ message: "Agent account is not verified or active." });
      return;
    }
    const listing = await listingStore.create({
      agentId: req.user?.sub ?? "",
      price: req.body.price,
      location: req.body.location,
      propertyType: req.body.propertyType,
      description: req.body.description,
      status: "PENDING",
      mediaUrls: req.body.mediaUrls,
    });
    res.status(201).json(listing);
  });

  router.patch("/me/listings/:id", validateBody(listingUpdateSchema), async (req: AuthenticatedRequest, res) => {
    const user = await userStore.findById(req.user?.sub ?? "");
    if (!user || !user.isActive || !user.isVerified) {
      res.status(403).json({ message: "Agent account is not verified or active." });
      return;
    }
    const listingId = asParam(req.params.id);
    const listing = await listingStore.findById(listingId);
    if (!listing || listing.agentId !== req.user?.sub) {
      res.status(404).json({ message: "Listing not found." });
      return;
    }

    const nextStatus = (req.body.status as ListingStatus | undefined) ?? listing.status;
    const majorEdit = majorEditDetected(req.body as Record<string, unknown>);
    const updated = await listingStore.updateById(listingId, {
      price: req.body.price ?? listing.price,
      location: req.body.location ?? listing.location,
      propertyType: req.body.propertyType ?? listing.propertyType ?? undefined,
      description: req.body.description ?? listing.description,
      mediaUrls: req.body.mediaUrls ?? listing.mediaUrls,
      status: majorEdit ? "PENDING" : nextStatus,
    });
    await listingStore.createRevision({
      listingId,
      changedById: req.user?.sub ?? "",
      changedFields: req.body as Record<string, unknown>,
      triggersReview: majorEdit,
    });
    if (majorEdit) {
      await engagementStore.createNotificationEvent({
        listingId,
        createdById: req.user?.sub,
        eventType: "LISTING_STATUS_CHANGED",
        payload: { status: "PENDING" },
      });
    }
    res.status(200).json(updated ?? listing);
  });

  router.delete("/me/listings/:id", async (req: AuthenticatedRequest, res) => {
    const listingId = asParam(req.params.id);
    const listing = await listingStore.findById(listingId);
    if (!listing || listing.agentId !== req.user?.sub) {
      res.status(404).json({ message: "Listing not found." });
      return;
    }
    await listingStore.remove(listingId);
    res.status(204).send();
  });

  router.post("/me/listings/:id/media", validateBody(addMediaSchema), async (req: AuthenticatedRequest, res) => {
    const listingId = asParam(req.params.id);
    const listing = await listingStore.findById(listingId);
    if (!listing || listing.agentId !== req.user?.sub) {
      res.status(404).json({ message: "Listing not found." });
      return;
    }
    const updated = await listingStore.updateById(listingId, {
      mediaUrls: [...listing.mediaUrls, req.body.mediaUrl],
      status: "PENDING",
    });
    await listingStore.createRevision({
      listingId,
      changedById: req.user?.sub ?? "",
      changedFields: { mediaUrls: [...listing.mediaUrls, req.body.mediaUrl] },
      triggersReview: true,
    });
    res.status(200).json(updated ?? listing);
  });

  router.get("/inquiries", async (req: AuthenticatedRequest, res) => {
    const agentListings = (await listingStore.list({ agentId: req.user?.sub }))
      .map((listing) => listing.id);

    const items = await engagementStore.listInquiriesByListingIds(agentListings);
    res.status(200).json({ items });
  });

  router.post("/inquiries/:id/respond", validateBody(inquiryResponseSchema), async (req: AuthenticatedRequest, res) => {
    try {
      const message = await engagementStore.respondToInquiry({
        inquiryId: asParam(req.params.id),
        agentId: req.user?.sub ?? "",
        message: req.body.message,
      });
      res.status(201).json(message);
    } catch (_error: unknown) {
      res.status(404).json({ message: "Inquiry not found." });
    }
  });

  router.patch("/inquiries/:id/status", validateBody(inquiryStatusSchema), async (req: AuthenticatedRequest, res) => {
    try {
      await engagementStore.resolveInquiry(
        asParam(req.params.id), req.user?.sub ?? "", req.body.status,
      );
      res.status(200).json({ ok: true });
    } catch (_error: unknown) {
      res.status(404).json({ message: "Inquiry not found." });
    }
  });

  router.get("/tour-requests", async (req: AuthenticatedRequest, res) => {
    const agentListingIds = (await listingStore.list({ agentId: req.user?.sub }))
      .map((listing) => listing.id);
    const items = await engagementStore.listToursByListingIds(agentListingIds);
    res.status(200).json({ items });
  });

  router.patch("/tour-requests/:id", validateBody(tourStatusSchema), async (req, res) => {
    const tourId = asParam(req.params.id);
    const tour = await engagementStore.updateTourStatus(tourId, req.body.status);
    if (!tour) {
      res.status(404).json({ message: "Tour request not found." });
      return;
    }
    res.status(200).json(tour);
  });

  return router;
};
