import Redis from "ioredis";
import { HotelOffer } from "./types";

export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  lazyConnect: false
});

const offersKey = (city: string) => `hotels:${city.toLowerCase()}:by-price`;
const dataKey = (city: string) => `hotels:${city.toLowerCase()}:data`;

export async function saveOffers(city: string, offers: HotelOffer[]): Promise<void> {
  const zkey = offersKey(city);
  const hkey = dataKey(city);
  const pipeline = redis.pipeline();
  pipeline.del(zkey, hkey);
  for (const offer of offers) {
    // Hotel names are unique after workflow deduplication; use the name as the sorted-set member.
    pipeline.zadd(zkey, offer.price, offer.name);
    pipeline.hset(hkey, offer.name, JSON.stringify(offer));
  }
  await pipeline.exec();
}

export async function getOffers(
  city: string,
  minPrice?: number,
  maxPrice?: number
): Promise<HotelOffer[]> {
  const min = minPrice ?? "-inf";
  const max = maxPrice ?? "+inf";
  // Filtering is performed by Redis, not in application memory.
  const names = await redis.zrangebyscore(offersKey(city), min, max);
  if (!names.length) return [];
  const values = await redis.hmget(dataKey(city), ...names);
  return values.filter((value): value is string => value !== null).map((value) => JSON.parse(value) as HotelOffer);
}

export async function redisHealth(): Promise<"ok" | "error"> {
  try {
    return (await redis.ping()) === "PONG" ? "ok" : "error";
  } catch {
    return "error";
  }
}
