import { Router } from "express";
import { listingStore } from "./listing.store";
import { userStore } from "../users/user.store";
import { prisma } from "../../lib/prisma";

export const createPublicListingRouter = (): Router => {
  const router = Router();

  router.get("/agents", async (_req, res) => {
    const users = await userStore.list();
    const agents = users
      .filter((u) => u.role === "AGENT" && u.isVerified && u.isActive)
      .map((u) => ({ id: u.id, email: u.email, createdAt: u.createdAt }));
    res.status(200).json({ items: agents });
  });

  router.get("/agents/:agentId/reviews", async (req, res) => {
    const { agentId } = req.params;
    const reviews = await prisma.review.findMany({
      where: { agentId },
      include: { reviewer: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    });
    const items = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      reviewerEmail: r.reviewer.email,
      createdAt: r.createdAt,
    }));
    const avgRating = items.length
      ? Math.round((items.reduce((s, r) => s + r.rating, 0) / items.length) * 10) / 10
      : null;
    res.status(200).json({ items, avgRating, totalReviews: items.length });
  });

  router.get("/", async (req, res) => {
    const priceMin = Number(req.query.priceMin ?? 0);
    const priceMax = Number(req.query.priceMax ?? Number.MAX_SAFE_INTEGER);
    const location = String(req.query.location ?? "").toLowerCase();
    const propertyType = String(req.query.propertyType ?? "").toLowerCase();

    const items = await listingStore.list({
      status: "APPROVED",
      priceMin,
      priceMax,
      locationContains: location || undefined,
      propertyType: propertyType || undefined,
    });

    res.status(200).json({
      items,
      pagination: { page: Number(req.query.page ?? 1), pageSize: Number(req.query.pageSize ?? 20) },
    });
  });

  router.get("/:id", async (req, res) => {
    const listing = await listingStore.findById(req.params.id);
    if (!listing || listing.status !== "APPROVED") {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    res.status(200).json(listing);
  });

  router.get("/:id/agent", async (req, res) => {
    const listing = await listingStore.findById(req.params.id);
    if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }
    const agent = await userStore.findById(listing.agentId);
    if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }
    const reviews = await prisma.review.findMany({
      where: { agentId: listing.agentId },
      include: { reviewer: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    });
    const avgRating = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;
    res.status(200).json({
      id: agent.id,
      email: agent.email,
      memberSince: agent.createdAt,
      avgRating,
      totalReviews: reviews.length,
      recentReviews: reviews.map(r => ({ rating: r.rating, reviewerEmail: r.reviewer.email, createdAt: r.createdAt })),
    });
  });

  return router;
};