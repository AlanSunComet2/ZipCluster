import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../../lib/http";
import { authorizeRole } from "../../middleware/authorizeRole";
import type { AuthenticatedRequest } from "../../types/auth";
import { engagementStore } from "../listings/engagement.store";
import { listingStore } from "../listings/listing.store";

const asParam = (value: string | string[] | undefined): string => {
  if (!value) {
    return "";
  }
  return Array.isArray(value) ? value[0] : value;
};

const parseBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
};

const inquirySchema = z.object({ message: z.string().min(1) });
const tourSchema = z.object({ preferredTime: z.string().datetime() });
const reviewSchema = z.object({
  listingId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});
const listingReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});
const notificationSchema = z.object({
  onPriceDrop: z.boolean().optional(),
  onStatusChange: z.boolean().optional(),
});
const messageSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const createUserRouter = (): Router => {
  const router = Router();
  router.use(authorizeRole(["USER", "AGENT", "ADMIN"]));

  router.get("/listings", async (req, res) => {
    const priceMin = Number(req.query.priceMin ?? 0);
    const priceMax = Number(req.query.priceMax ?? Number.MAX_SAFE_INTEGER);
    const location = String(req.query.location ?? "").toLowerCase();
    const propertyType = String(req.query.propertyType ?? "").toLowerCase();

    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const sortBy = String(req.query.sortBy ?? "createdAt");
    const sortDir = String(req.query.sortDir ?? "desc");
    const items = await listingStore.list({
      status: "APPROVED",
      priceMin,
      priceMax,
      locationContains: location || undefined,
      propertyType: propertyType || undefined,
    });
    const sorted = [...items].sort((a, b) => {
      const factor = sortDir === "asc" ? 1 : -1;
      if (sortBy === "price") {
        return (a.price - b.price) * factor;
      }
      return (a.createdAt.getTime() - b.createdAt.getTime()) * factor;
    });
    const paged = sorted.slice((page - 1) * pageSize, page * pageSize);
    res.status(200).json({ items: paged, pagination: { page, pageSize, total: sorted.length } });
  });

  router.post("/me/favorites/:listingId", async (req: AuthenticatedRequest, res) => {
    const listingId = asParam(req.params.listingId);
    const favorite = await engagementStore.createFavorite({
      userId: req.user?.sub ?? "",
      listingId,
    });
    res.status(201).json(favorite);
  });

  router.delete("/me/favorites/:listingId", async (req: AuthenticatedRequest, res) => {
    const listingId = asParam(req.params.listingId);
    const removed = await engagementStore.deleteFavorite({ userId: req.user?.sub ?? "", listingId });
    if (!removed) {
      res.status(404).json({ message: "Favorite not found." });
      return;
    }
    res.status(204).send();
  });

  router.get("/me/favorites", async (req: AuthenticatedRequest, res) => {
    const favorites = await engagementStore.listFavorites(req.user?.sub ?? "");
    res.status(200).json({ items: favorites });
  });

  router.post("/listings/:listingId/inquiries", validateBody(inquirySchema), async (req: AuthenticatedRequest, res) => {
    const listingId = asParam(req.params.listingId);
    const inquiry = await engagementStore.createInquiry({
      listingId,
      buyerId: req.user?.sub ?? "",
      message: req.body.message,
    });
    res.status(201).json(inquiry);
  });

  router.post("/listings/:listingId/tour-requests", validateBody(tourSchema), async (req: AuthenticatedRequest, res) => {
    const listingId = asParam(req.params.listingId);
    const tour = await engagementStore.createOrUpdateTourRequest({
      listingId,
      buyerId: req.user?.sub ?? "",
      preferredTime: new Date(req.body.preferredTime),
    });
    res.status(201).json(tour);
  });

  router.post("/agents/:agentId/reviews", validateBody(reviewSchema), async (req: AuthenticatedRequest, res) => {
    const agentId = asParam(req.params.agentId);
    const review = await engagementStore.createAgentReview({
      agentId,
      reviewerId: req.user?.sub ?? "",
      rating: req.body.rating,
      comment: req.body.comment,
    });
    res.status(201).json(review);
  });

  router.post("/listings/:listingId/reviews", validateBody(listingReviewSchema), async (req: AuthenticatedRequest, res) => {
    try {
      const listingId = asParam(req.params.listingId);
      const review = await engagementStore.createListingReview({
        listingId,
        reviewerId: req.user?.sub ?? "",
        rating: req.body.rating,
        comment: req.body.comment,
      });
      res.status(201).json(review);
    } catch (_error: unknown) {
      res.status(404).json({ message: "Listing not found." });
    }
  });

  router.post("/me/notifications/:listingId/preferences", validateBody(notificationSchema), async (req: AuthenticatedRequest, res) => {
    const listingId = asParam(req.params.listingId);
    const preference = await engagementStore.upsertNotificationPreference({
      userId: req.user?.sub ?? "",
      listingId,
      onPriceDrop: parseBoolean(req.body.onPriceDrop, true),
      onStatusChange: parseBoolean(req.body.onStatusChange, true),
    });
    res.status(201).json(preference);
  });

  router.get("/me/notifications/events", async (req: AuthenticatedRequest, res) => {
    const items = await engagementStore.listNotificationEventsForUser(req.user?.sub ?? "");
    res.status(200).json({ items });
  });

  router.get("/me/messages/threads", async (req: AuthenticatedRequest, res) => {
    const items = await engagementStore.listThreadsForUser(req.user?.sub ?? "");
    res.status(200).json({ items });
  });

  router.get("/me/messages/threads/:threadId", async (req: AuthenticatedRequest, res) => {
    const threadId = asParam(req.params.threadId);
    const items = await engagementStore.listMessagesForThread(threadId, req.user?.sub ?? "");
    res.status(200).json({ items });
  });

  router.post("/me/messages/threads/:threadId", validateBody(messageSchema), async (req: AuthenticatedRequest, res) => {
    try {
      const message = await engagementStore.sendMessage({
        threadId: asParam(req.params.threadId),
        senderId: req.user?.sub ?? "",
        content: req.body.content,
      });
      res.status(201).json(message);
    } catch (error: unknown) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Unable to send message." });
    }
  });

  return router;
};
