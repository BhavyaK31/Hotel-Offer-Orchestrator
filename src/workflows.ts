import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "./activities";
import { HotelOffer, SupplierHotel } from "./types";

const { fetchSupplierA, fetchSupplierB, cacheOffers } = proxyActivities<typeof activities>({
  startToCloseTimeout: "15 seconds",
  retry: { maximumAttempts: 3, initialInterval: "1 second" }
});

function bestOffers(a: SupplierHotel[], b: SupplierHotel[]): HotelOffer[] {
  const byName = new Map<string, SupplierHotel>();
  for (const hotel of [...a, ...b]) {
    const key = hotel.name.trim().toLocaleLowerCase();
    const current = byName.get(key);
    if (!current || hotel.price < current.price) byName.set(key, hotel);
  }

  return [...byName.values()]
    .map(({ name, price, supplier, commissionPct }) => ({ name, price, supplier, commissionPct }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function hotelOfferWorkflow(city: string): Promise<HotelOffer[]> {
  // Temporal schedules both supplier activities concurrently.
  const [supplierA, supplierB] = await Promise.all([
    fetchSupplierA(city),
    fetchSupplierB(city)
  ]);
  const offers = bestOffers(supplierA, supplierB);
  await cacheOffers(city, offers);
  return offers;
}
