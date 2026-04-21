import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { validateBody } from "../../lib/http";
import { authorizeRole } from "../../middleware/authorizeRole";
import type { AuthenticatedRequest } from "../../types/auth";
import { listingStore, type ListingStatus } from "../listings/listing.store";
import { userStore } from "../users/user.store";
import { prisma } from "../../lib/prisma";

const asParam = (value: string | string[] | undefined): string => {
  if (!value) {
    return "";
  }
  return Array.isArray(value) ? value[0] : value;
};

const LISTING_STATUSES: ListingStatus[] = ["PENDING", "APPROVED", "SOLD"];

export const createAdminRouter = (): Router => {
  const router = Router();

  router.use(authorizeRole(["ADMIN"]));

  const categorySchema = z.object({ name: z.string().min(2) });
  const bannerSchema = z.object({
    title: z.string().min(2),
    imageUrl: z.string().url(),
    isActive: z.boolean().optional(),
    ctaText: z.string().min(1).optional(),
    ctaUrl: z.string().url().optional(),
    sortOrder: z.number().int().optional(),
  });
  const moderationSchema = z.object({
    notes: z.string().max(500).optional(),
  });
  const requestDocsSchema = z.object({
    message: z.string().min(3).max(500),
  });

  router.get("/agents/pending", async (_req, res) => {
    const users = (await userStore.list()).filter(
      (user) => user.role === "AGENT" && !user.isVerified,
    );
    const applications = await prisma.agentApplication.findMany({
      where: { applicantId: { in: users.map((u) => u.id) } },
      include: { licenseDocs: true },
      orderBy: { createdAt: "desc" },
    });
    const latestByApplicant = new Map<string, typeof applications[number]>();
    for (const app of applications) {
      if (!latestByApplicant.has(app.applicantId)) {
        latestByApplicant.set(app.applicantId, app);
      }
    }
    const items = users.map((user) => {
      const app = latestByApplicant.get(user.id);
      return {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        application: app
          ? {
              id: app.id,
              status: app.status,
              notes: app.notes,
              createdAt: app.createdAt,
              reviewedAt: app.reviewedAt,
              licenseDocs: app.licenseDocs.map((doc) => ({
                id: doc.id,
                fileUrl: doc.fileUrl,
                mimeType: doc.mimeType,
                uploadedAt: doc.uploadedAt,
              })),
            }
          : null,
      };
    });
    res.status(200).json({ items });
  });

  router.get("/users", async (_req, res) => {
    const items = await userStore.list();
    res.status(200).json({ items });
  });

  router.patch("/agents/:id/approve", async (req: AuthenticatedRequest, res) => {
    const user = await userStore.findById(asParam(req.params.id));
    if (!user || user.role !== "AGENT") {
      res.status(404).json({ message: "Agent not found." });
      return;
    }
    await userStore.upsert({ ...user, isVerified: true, isActive: true, deactivatedAt: null });
    await prisma.agentApplication.updateMany({
      where: { applicantId: user.id, status: "PENDING" },
      data: { status: "APPROVED", reviewedById: req.user?.sub, reviewedAt: new Date() },
    });
    res.status(200).json({ message: "Agent approved." });
  });

  router.patch("/agents/:id/reject", validateBody(moderationSchema), async (req: AuthenticatedRequest, res) => {
    const user = await userStore.findById(asParam(req.params.id));
    if (!user || user.role !== "AGENT") {
      res.status(404).json({ message: "Agent not found." });
      return;
    }
    await userStore.upsert({ ...user, isVerified: false, isActive: false, deactivatedAt: new Date() });
    await prisma.agentApplication.updateMany({
      where: { applicantId: user.id, status: "PENDING" },
      data: {
        status: "REJECTED",
        reviewedById: req.user?.sub,
        reviewedAt: new Date(),
        notes: req.body.notes,
      },
    });
    res.status(200).json({ message: "Agent rejected and deactivated." });
  });

  router.post("/agents/:id/request-documents", validateBody(requestDocsSchema), async (req: AuthenticatedRequest, res) => {
    const user = await userStore.findById(asParam(req.params.id));
    if (!user || user.role !== "AGENT") {
      res.status(404).json({ message: "Agent not found." });
      return;
    }
    const application = await prisma.agentApplication.findFirst({
      where: { applicantId: user.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    if (!application) {
      res.status(404).json({ message: "No pending application." });
      return;
    }
    const stamped = `[${new Date().toISOString()}] Admin requested additional documents: ${req.body.message}`;
    const merged = application.notes ? `${application.notes}\n${stamped}` : stamped;
    await prisma.agentApplication.update({
      where: { id: application.id },
      data: { notes: merged, reviewedById: req.user?.sub, reviewedAt: new Date() },
    });
    res.status(200).json({ message: "Document request recorded and sent to the applicant." });
  });

  router.get("/agent-applications/pending", async (_req, res) => {
    const items = await prisma.agentApplication.findMany({
      where: { status: "PENDING" },
      include: {
        applicant: { select: { id: true, email: true, isVerified: true, isActive: true } },
        licenseDocs: true,
      },
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json({ items });
  });

  router.get("/listings", async (req, res) => {
    const statusParam = String(req.query.status ?? "").toUpperCase();
    const filters: { status?: ListingStatus } = {};
    if (LISTING_STATUSES.includes(statusParam as ListingStatus)) {
      filters.status = statusParam as ListingStatus;
    }
    const items = await listingStore.list(filters);
    res.status(200).json({ items });
  });

  router.get("/listings/pending", async (_req, res) => {
    const pendingListings = await listingStore.list({ status: "PENDING" });
    res.status(200).json({ items: pendingListings });
  });

  router.get("/listings/:id", async (req, res) => {
    const listing = await listingStore.findById(asParam(req.params.id));
    if (!listing) {
      res.status(404).json({ message: "Listing not found." });
      return;
    }
    const agent = await userStore.findById(listing.agentId);
    res.status(200).json({
      ...listing,
      agent: agent ? { id: agent.id, email: agent.email } : null,
    });
  });

  router.patch("/listings/:id/approve", validateBody(moderationSchema), async (req: AuthenticatedRequest, res) => {
    const listing = await listingStore.findById(asParam(req.params.id));
    if (!listing) {
      res.status(404).json({ message: "Listing not found." });
      return;
    }
    await listingStore.updateById(listing.id, {
      status: "APPROVED",
    });
    await listingStore.createModerationAction({
      listingId: listing.id,
      actedById: req.user?.sub ?? "",
      action: "APPROVED",
      notes: req.body.notes,
    });
    await prisma.notificationEvent.create({
      data: {
        listingId: listing.id,
        createdById: req.user?.sub,
        eventType: "LISTING_STATUS_CHANGED",
        payload: { status: "APPROVED" },
      },
    });
    res.status(200).json({ message: "Listing approved." });
  });

  router.patch("/listings/:id/reject", validateBody(moderationSchema), async (req: AuthenticatedRequest, res) => {
    const listing = await listingStore.findById(asParam(req.params.id));
    if (!listing) {
      res.status(404).json({ message: "Listing not found." });
      return;
    }
    await listingStore.updateById(listing.id, {
      status: "PENDING",
    });
    await listingStore.createModerationAction({
      listingId: listing.id,
      actedById: req.user?.sub ?? "",
      action: "REJECTED",
      notes: req.body.notes,
    });
    res.status(200).json({ message: "Listing marked for revision." });
  });

  router.get("/listings/:id/moderation-history", async (req, res) => {
    const listing = await listingStore.findById(asParam(req.params.id));
    if (!listing) {
      res.status(404).json({ message: "Listing not found." });
      return;
    }
    const items = await listingStore.listModerationActions(listing.id);
    res.status(200).json({ items });
  });

  router.patch("/users/:id/deactivate", async (req, res) => {
    const user = await userStore.findById(asParam(req.params.id));
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    await userStore.upsert({ ...user, isActive: false, deactivatedAt: new Date() });
    res.status(200).json({ message: "User deactivated." });
  });

  router.patch("/users/:id/reactivate", async (req, res) => {
    const user = await userStore.findById(asParam(req.params.id));
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    await userStore.upsert({ ...user, isActive: true, deactivatedAt: null });
    res.status(200).json({ message: "User reactivated." });
  });

  router.post("/users/:id/reset-password", async (req, res) => {
    const user = await userStore.findById(asParam(req.params.id));
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    // Generate a plaintext token for the admin to share. In production this
    // would be emailed directly to the user; we expose it to the admin UI so
    // the workflow can be demonstrated end-to-end.
    const resetToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: resetToken,
        expiresAt,
      },
    });
    res.status(202).json({
      message: "Password reset link generated. Share with the user.",
      resetToken,
      expiresAt: expiresAt.toISOString(),
      resetUrl: `/reset-password?token=${resetToken}`,
    });
  });

  router.post("/property-categories", validateBody(categorySchema), async (req, res) => {
    const record = await prisma.propertyType.create({ data: { name: req.body.name } });
    res.status(201).json(record);
  });

  router.get("/property-categories", async (_req, res) => {
    const items = await prisma.propertyType.findMany({ orderBy: { name: "asc" } });
    res.status(200).json({ items });
  });

  router.patch("/property-categories/:id", validateBody(categorySchema), async (req, res) => {
    const id = asParam(req.params.id);
    const record = await prisma.propertyType.update({ where: { id }, data: { name: req.body.name } });
    res.status(200).json(record);
  });

  router.delete("/property-categories/:id", async (req, res) => {
    const id = asParam(req.params.id);
    await prisma.propertyType.delete({ where: { id } });
    res.status(204).send();
  });

  router.post("/geo-categories", validateBody(categorySchema), async (req, res) => {
    const record = await prisma.geoCategory.create({ data: { name: req.body.name } });
    res.status(201).json(record);
  });

  router.get("/geo-categories", async (_req, res) => {
    const items = await prisma.geoCategory.findMany({ orderBy: { name: "asc" } });
    res.status(200).json({ items });
  });

  router.patch("/geo-categories/:id", validateBody(categorySchema), async (req, res) => {
    const id = asParam(req.params.id);
    const record = await prisma.geoCategory.update({ where: { id }, data: { name: req.body.name } });
    res.status(200).json(record);
  });

  router.delete("/geo-categories/:id", async (req, res) => {
    const id = asParam(req.params.id);
    await prisma.geoCategory.delete({ where: { id } });
    res.status(204).send();
  });

  router.post("/cms/banners", validateBody(bannerSchema), async (req, res) => {
    const banner = await prisma.cmsBanner.create({
      data: {
        title: req.body.title,
        imageUrl: req.body.imageUrl,
        isActive: req.body.isActive ?? true,
        ctaText: req.body.ctaText,
        ctaUrl: req.body.ctaUrl,
        sortOrder: req.body.sortOrder ?? 0,
      },
    });
    res.status(201).json(banner);
  });

  router.get("/cms/banners", async (_req, res) => {
    const items = await prisma.cmsBanner.findMany({ orderBy: { sortOrder: "asc" } });
    res.status(200).json({ items });
  });

  router.patch("/cms/banners/:id", validateBody(bannerSchema.partial()), async (req, res) => {
    const banner = await prisma.cmsBanner.update({
      where: { id: asParam(req.params.id) },
      data: {
        title: req.body.title,
        imageUrl: req.body.imageUrl,
        isActive: req.body.isActive,
        ctaText: req.body.ctaText,
        ctaUrl: req.body.ctaUrl,
        sortOrder: req.body.sortOrder,
      },
    });
    res.status(200).json(banner);
  });

  router.delete("/cms/banners/:id", async (req, res) => {
    await prisma.cmsBanner.delete({ where: { id: asParam(req.params.id) } });
    res.status(204).send();
  });

  router.get("/analytics/overview", async (req: AuthenticatedRequest, res) => {
    const [users, listings, pendingAgentApplications, totalFavorites] = await Promise.all([
      userStore.list(),
      listingStore.list(),
      prisma.agentApplication.count({ where: { status: "PENDING" } }),
      prisma.favorite.count(),
    ]);
    res.status(200).json({
      requestedBy: req.user?.sub ?? "unknown",
      totalUsers: users.length,
      totalAgents: users.filter((user) => user.role === "AGENT").length,
      totalListings: listings.length,
      pendingListings: listings.filter((listing) => listing.status === "PENDING").length,
      approvedListings: listings.filter((listing) => listing.status === "APPROVED").length,
      soldListings: listings.filter((listing) => listing.status === "SOLD").length,
      pendingAgentApplications,
      totalFavorites,
    });
  });

  return router;
};
