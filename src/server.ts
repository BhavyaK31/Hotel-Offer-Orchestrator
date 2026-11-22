import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { getSupplierA, getSupplierB } from "./suppliers";
import { getOffers, redisHealth } from "./redis";
import { getTemporalClient } from "./temporal";
import { hotelOfferWorkflow } from "./workflows";
import { checkSupplierA, checkSupplierB } from "./activities";

const app = express();
app.use(express.json());

const querySchema = z.object({
  city: z.string().trim().min(1),
  minPrice: z.coerce.number().finite().nonnegative().optional(),
  maxPrice: z.coerce.number().finite().nonnegative().optional()
}).refine((query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice, {
  message: "minPrice must be less than or equal to maxPrice"
});

app.get("/supplierA/hotels", (req, res) => {
  const city = String(req.query.city ?? "").trim();
  if (!city) return res.status(400).json({ error: "city query parameter is required" });
  return res.json(getSupplierA(city));
});

app.get("/supplierB/hotels", (req, res) => {
  const city = String(req.query.city ?? "").trim();
  if (!city) return res.status(400).json({ error: "city query parameter is required" });
  return res.json(getSupplierB(city));
});

app.get("/api/hotels", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid query parameters" });
    const { city, minPrice, maxPrice } = parsed.data;

    const client = await getTemporalClient();
    const workflowId = `hotel-offers-${city.toLowerCase()}-${Date.now()}`;
    const handle = await client.workflow.start(hotelOfferWorkflow, {
      taskQueue: process.env.TEMPORAL_TASK_QUEUE ?? "hotel-offer-task-queue",
      workflowId,
      args: [city.toLowerCase()]
    });
    // Wait for workflow completion; it fetches both suppliers, selects winners and caches them.
    await handle.result();

    const offers = await getOffers(city, minPrice, maxPrice);
    return res.json(offers);
  } catch (error) {
    return next(error);
  }
});

app.get("/health", async (_req, res) => {
  const [supplierA, supplierB, redis] = await Promise.all([
    checkSupplierA(), checkSupplierB(), redisHealth()
  ]);
  const healthy = supplierA && supplierB && redis === "ok";
  return res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    suppliers: { supplierA: supplierA ? "ok" : "error", supplierB: supplierB ? "ok" : "error" },
    redis
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  return res.status(500).json({ error: "Unable to retrieve hotel offers", detail: error instanceof Error ? error.message : "Unknown error" });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Hotel Offer Orchestrator listening on ${port}`));
