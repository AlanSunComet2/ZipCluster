import { Router } from "express";
import { listingStore } from "./listing.store";

export const createPublicListingRouter = (): Router => {
  const router = Router();

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

  return router;
};
